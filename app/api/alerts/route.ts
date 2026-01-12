import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/database';
import { differenceInDays } from 'date-fns';

interface Alert {
    id: string;
    employee_id: number;
    employee_name: string;
    type: 'incomplete_201' | 'missing_documents' | 'probation_ending' | 'contract_expiring';
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
                { field: 'employment_records_complete', label: 'Employment Records' },
                { field: 'attendance_records_complete', label: 'Attendance Records' },
                { field: 'payroll_records_complete', label: 'Payroll Records' }
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
                    message: `${missingItems.length} document(s) missing from 201 file`,
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
