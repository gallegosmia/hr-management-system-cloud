import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/database';
import { differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

interface Alert {
    id: string;
    employee_id: number;
    employee_name: string;
    type: 'incomplete_201' | 'missing_documents' | 'probation_ending' | 'contract_expiring' | 'excessive_lates';
    severity: 'high' | 'medium' | 'low';
    message: string;
    missing_items?: string[];
    days_since_hire?: number;
    created_at: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const severity = searchParams.get('severity');

        const employees = await getAll('employees');
        const alerts: Alert[] = [];

        employees.forEach((emp: any) => {
            const daysSinceHire = differenceInDays(new Date(), new Date(emp.date_hired));
            const missingItems: string[] = [];

            // Check 201 file completion
            const checklistFields = [
                { field: 'personal_info_complete', label: 'Personal Information' },
                { field: 'preemployment_req_complete', label: 'Pre-Employment Requirements' },
                { field: 'government_docs_complete', label: 'Government Documents' },
                { field: 'employment_records_complete', label: 'Employment Records' }
            ];

            checklistFields.forEach(item => {
                if (emp[item.field] !== 1) {
                    missingItems.push(item.label);
                }
            });

            // Alert: Incomplete 201 file
            if (missingItems.length > 0) {
                const alertSeverity =
                    daysSinceHire > 30 ? 'high' :
                        daysSinceHire > 14 ? 'medium' : 'low';

                alerts.push({
                    id: `201-${emp.id}`,
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    type: 'incomplete_201',
                    severity: alertSeverity,
                    message: `${missingItems.length} document(s) missing: ${missingItems.join(', ')}`,
                    missing_items: missingItems,
                    days_since_hire: daysSinceHire,
                    created_at: new Date().toISOString()
                });
            }

            // Alert: New hire without complete documents (>7 days)
            if (daysSinceHire > 7 && emp.file_completion_status === 'Incomplete') {
                alerts.push({
                    id: `new-hire-${emp.id}`,
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    type: 'missing_documents',
                    severity: 'high',
                    message: `New hire (${daysSinceHire} days) - 201 file still incomplete`,
                    missing_items: missingItems,
                    days_since_hire: daysSinceHire,
                    created_at: new Date().toISOString()
                });
            }

            // Alert: Probationary period ending (within 30 days of 6 months)
            if (emp.employment_status === 'Probationary') {
                const probationEndDate = new Date(emp.date_hired);
                probationEndDate.setMonth(probationEndDate.getMonth() + 6);
                const daysUntilEnd = differenceInDays(probationEndDate, new Date());

                if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
                    alerts.push({
                        id: `probation-${emp.id}`,
                        employee_id: emp.id,
                        employee_name: `${emp.first_name} ${emp.last_name}`,
                        type: 'probation_ending',
                        severity: 'medium',
                        message: `Probationary period ending in ${daysUntilEnd} days`,
                        created_at: new Date().toISOString()
                    });
                }
            }
            // Alert: Probation ending soon (within 30 days) for 'Probationary' status
            if (emp.employment_status === 'Probationary' && daysSinceHire > 150 && daysSinceHire < 180) {
                alerts.push({
                    id: `probation-${emp.id}`,
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    type: 'probation_ending',
                    severity: 'medium',
                    message: 'Probationary period ending soon',
                    created_at: new Date().toISOString()
                });
            }
        });

        // Check for Excessive Lates (5+ in current month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // We use getAll('attendance') then filter because existing query function might be limited in complex joins/grouping
        // In a real DB we would use COUNT(*) ... GROUP BY ... WHERE date BETWEEN ... AND status='Late'
        const allAttendance = await getAll('attendance');
        const currentMonthAttendance = allAttendance.filter((a: any) => {
            let recordDate = typeof a.date === 'string' ? a.date.split('T')[0] : a.date instanceof Date ? a.date.toISOString().split('T')[0] : '';
            return recordDate && recordDate >= startOfMonth && recordDate <= endOfMonth && a.status === 'Late';
        });

        const latesMap = new Map<number, number>();
        currentMonthAttendance.forEach((att: any) => {
            latesMap.set(att.employee_id, (latesMap.get(att.employee_id) || 0) + 1);
        });

        latesMap.forEach((count, employeeId) => {
            if (count >= 5) {
                const emp = employees.find((e: any) => e.id === employeeId);
                if (emp) {
                    alerts.unshift({
                        id: `lates-${emp.id}-${now.getMonth()}`,
                        employee_id: emp.id,
                        employee_name: `${emp.first_name} ${emp.last_name}`,
                        type: 'excessive_lates',
                        severity: 'high',
                        message: `Employee has ${count} lates this month. Candidate for warning.`,
                        created_at: new Date().toISOString()
                    });
                }
            }
        });

        // Filter by severity if requested
        const filteredAlerts = severity
            ? alerts.filter(a => a.severity === severity)
            : alerts;

        // Sort by severity (high -> medium -> low)
        const severityOrder = { high: 0, medium: 1, low: 2 };
        filteredAlerts.sort((a: any, b: any) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

        return NextResponse.json({
            total: filteredAlerts.length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
            alerts: filteredAlerts
        });
    } catch (error) {
        console.error('Alerts error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}
