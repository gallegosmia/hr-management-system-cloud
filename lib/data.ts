import { getAll, getById, insert, update, query, remove, resetTableSequence, isPostgres } from './database';

export interface SalaryInfo {
    basic_salary: number;
    allowances: {
        special: number;
    };
    daily_rate: number;
    hourly_rate: number;
    pay_frequency: 'Semi-Monthly' | 'Monthly';
    deductions: {
        sss_contribution: number;
        philhealth_contribution: number;
        pagibig_contribution: number;
        company_cash_fund: number;
        company_loan: {
            balance: number;
            amortization: number;
        };
        sss_loan: {
            balance: number;
            amortization: number;
        };
        pagibig_loan: {
            balance: number;
            amortization: number;
        };
        cash_advance: number;
        other_deductions: {
            name: string;
            amount: number;
        }[];
    };
}

export interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    branch?: string;
    employment_status: string;
    date_hired: string;
    date_of_birth?: string;
    date_separated?: string;
    contact_number?: string;
    email_address?: string;
    address?: string;
    gender?: string;
    religion?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    profile_picture?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    civil_status?: string;
    salary_info?: SalaryInfo;
    personal_info_complete: number;
    preemployment_req_complete: number;
    government_docs_complete: number;
    employment_records_complete: number;
    attendance_records_complete: number;
    payroll_records_complete: number;
    disciplinary_records: number;
    training_records: number;
    separation_records: number;
    file_completion_status: string;
    last_updated: string;
    remarks?: string;
    training_details?: string;
    disciplinary_details?: string;
}

export interface Education {
    id: number;
    employee_id: number;
    level: string;
    school_name: string;
    degree_course?: string;
    year_graduated: string;
    honors_awards?: string;
}

export interface EmployeeFormData {
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    branch?: string;
    employment_status: string;
    date_hired: string;
    date_of_birth?: string;
    gender?: string;
    religion?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    profile_picture?: string;
    date_separated?: string;
    contact_number?: string;
    email_address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    civil_status?: string;
    salary_info?: SalaryInfo;
    remarks?: string;
    personal_info_complete?: number;
    preemployment_req_complete?: number;
    government_docs_complete?: number;
    employment_records_complete?: number;
    attendance_records_complete?: number;
    payroll_records_complete?: number;
    disciplinary_records?: number;
    training_records?: number;
    separation_records?: number;
    training_details?: string;
    disciplinary_details?: string;
}

export interface PayrollRun {
    id: number;
    period_start: string;
    period_end: string;
    total_amount: number;
    status: 'Draft' | 'Pending Manager' | 'Pending EVP' | 'Finalized';
    created_at: string;
    created_by: number;
    manager_approved_by?: number;
    manager_approved_at?: string;
    evp_approved_by?: number;
    evp_approved_at?: string;
}

export interface Payslip {
    id: number;
    payroll_run_id: number;
    employee_id: number;
    gross_pay: number;
    net_pay: number;
    total_deductions: number;
    total_allowances: number;
    days_present: number;
    double_pay_days: number;
    double_pay_amount: number;
    deduction_details: any;
    allowance_details: any;
    generated_at: string;
}

export interface LeaveSettings {
    payroll_cutoff_day: number;
    filing_cutoff_days: number;
    approval_levels: {
        level1_enabled: boolean;
        level2_enabled: boolean;
        level3_enabled: boolean;
    };
}

export async function getLeaveSettings(): Promise<LeaveSettings> {
    const res = await query("SELECT value FROM settings WHERE key = 'leave_config'");
    if (res.rows.length > 0) return res.rows[0].value;

    return {
        payroll_cutoff_day: 15,
        filing_cutoff_days: 3,
        approval_levels: {
            level1_enabled: true,
            level2_enabled: true,
            level3_enabled: false
        }
    };
}

export async function updateLeaveSettings(settings: LeaveSettings): Promise<void> {
    const res = await query("SELECT id FROM settings WHERE key = 'leave_config'");
    if (res.rows.length > 0) {
        await update('settings', res.rows[0].id, { value: settings });
    } else {
        await insert('settings', { key: 'leave_config', value: settings });
    }
}

export function calculateCompletionStatus(employee: Employee): string {
    const requiredFields = [
        employee.personal_info_complete,
        employee.preemployment_req_complete,
        employee.government_docs_complete,
        employee.employment_records_complete,
        employee.attendance_records_complete,
        employee.payroll_records_complete
    ];

    const completedCount = requiredFields.filter(field => field === 1).length;
    const totalRequired = requiredFields.length;

    if (completedCount === totalRequired) return 'Complete';
    if (completedCount === 0) return 'Incomplete';
    return 'Partial';
}

export async function getAllEmployees(): Promise<Employee[]> {
    const employees = await getAll('employees');
    return employees.sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

export async function getEmployeeById(id: number): Promise<Employee | undefined> {
    return await getById('employees', id) as Employee | undefined;
}

export async function getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const res = await query("SELECT * FROM employees WHERE employee_id = $1", [employeeId]);
    return res.rows[0] as Employee | undefined;
}

export async function getNextEmployeeId(year?: string): Promise<string> {
    const targetYear = year || new Date().getFullYear().toString();
    const res = await query("SELECT employee_id FROM employees WHERE employee_id LIKE $1", [`${targetYear}-%`]);

    if (res.rows.length === 0) {
        return `${targetYear}-0001`;
    }

    const sequences = res.rows.map((row: any) => {
        const parts = row.employee_id.split('-');
        return parts.length > 1 ? parseInt(parts[1]) : 0;
    });

    const maxSequence = Math.max(...sequences);
    const nextSequence = maxSequence + 1;

    return `${targetYear}-${nextSequence.toString().padStart(4, '0')}`;
}

export async function createEmployee(data: EmployeeFormData, userId: number): Promise<number> {
    const nextId = await getNextEmployeeId(data.date_hired ? data.date_hired.split('-')[0] : undefined);
    const employeeData = {
        ...data,
        employee_id: data.employee_id || nextId,
        personal_info_complete: data.personal_info_complete ?? 0,
        preemployment_req_complete: data.preemployment_req_complete ?? 0,
        government_docs_complete: data.government_docs_complete ?? 0,
        employment_records_complete: data.employment_records_complete ?? 0,
        attendance_records_complete: data.attendance_records_complete ?? 0,
        payroll_records_complete: data.payroll_records_complete ?? 0,
        disciplinary_records: data.disciplinary_records ?? 0,
        training_records: data.training_records ?? 0,
        separation_records: data.separation_records ?? 0,
        file_completion_status: 'Incomplete',
        created_by: userId
    };

    employeeData.file_completion_status = calculateCompletionStatus(employeeData as any);
    try {
        return await insert('employees', employeeData);
    } catch (error: any) {
        // Auto-heal: If Primary Key violation, reset sequence and retry
        if (error?.code === '23505' && error?.constraint === 'employees_pkey') {
            console.warn('❌ Primary Key collision detected. Attempting to auto-heal sequence...');
            await resetTableSequence('employees');
            return await insert('employees', employeeData);
        }
        throw error;
    }
}

export async function updateEmployee(id: number, data: Partial<EmployeeFormData>): Promise<void> {
    await update('employees', id, data);
}

export async function update201Checklist(id: number, checklist: Record<string, number>): Promise<void> {
    const employee = await getEmployeeById(id);
    if (!employee) return;

    const updatedEmployee = { ...employee, ...checklist };
    const status = calculateCompletionStatus(updatedEmployee as Employee);

    await update('employees', id, { ...checklist, file_completion_status: status });
}

export async function archiveEmployee(id: number): Promise<void> {
    await update('employees', id, { employment_status: 'Resigned' });
}

export async function deleteEmployee(id: number): Promise<void> {
    // Delete related records without ON DELETE CASCADE
    await query(`DELETE FROM payslips WHERE employee_id = $1`, [id]);

    // Now delete the employee
    await remove('employees', id);
}

export async function searchEmployees(searchQuery: string): Promise<Employee[]> {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return getAllEmployees();

    const q = `%${trimmedQuery}%`;

    if (isPostgres()) {
        const res = await query(
            `SELECT *, 
              (CASE 
                WHEN LOWER(employee_id) = $2 THEN 1
                WHEN LOWER(email_address) = $2 THEN 1
                WHEN LOWER(first_name || ' ' || last_name) = $2 THEN 1
                WHEN LOWER(last_name || ', ' || first_name) = $2 THEN 1
                WHEN LOWER(last_name) = $2 THEN 2
                WHEN LOWER(first_name) = $2 THEN 2
                WHEN LOWER(last_name) LIKE $1 AND LOWER(first_name) LIKE $1 THEN 2
                WHEN LOWER(last_name) LIKE $1 THEN 3
                WHEN LOWER(first_name) LIKE $1 THEN 3
                WHEN LOWER(employee_id) LIKE $1 THEN 3
                WHEN LOWER(email_address) LIKE $1 THEN 3
                ELSE 4
              END) as relevance
             FROM employees 
             WHERE LOWER(employee_id) LIKE $1 
             OR LOWER(last_name) LIKE $1 
             OR LOWER(first_name) LIKE $1 
             OR LOWER(email_address) LIKE $1
             OR LOWER(first_name || ' ' || last_name) LIKE $1
             OR LOWER(last_name || ', ' || first_name) LIKE $1
             OR LOWER(department) LIKE $1 
             OR LOWER(position) LIKE $1
             ORDER BY relevance ASC, last_name ASC, first_name ASC`,
            [q, trimmedQuery]
        );
        return res.rows;
    }

    const res = await query(
        `SELECT * FROM employees 
         WHERE LOWER(employee_id) LIKE $1 
         OR LOWER(last_name) LIKE $1 
         OR LOWER(first_name) LIKE $1 
         OR LOWER(department) LIKE $1 
         OR LOWER(position) LIKE $1 
         OR LOWER(email_address) LIKE $1`,
        [q]
    );

    // Simple relevance sort for local JSON
    return res.rows.sort((a, b) => {
        const aFull = `${a.first_name} ${a.last_name}`.toLowerCase();
        const bFull = `${b.first_name} ${b.last_name}`.toLowerCase();
        const aMatch = a.employee_id.toLowerCase() === trimmedQuery || a.email_address?.toLowerCase() === trimmedQuery || aFull === trimmedQuery;
        const bMatch = b.employee_id.toLowerCase() === trimmedQuery || b.email_address?.toLowerCase() === trimmedQuery || bFull === trimmedQuery;

        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
    });
}

export async function filterEmployees(filters: {
    department?: string;
    employment_status?: string;
    file_completion_status?: string;
}): Promise<Employee[]> {
    let sql = "SELECT * FROM employees WHERE 1=1";
    const params = [];

    if (filters.department) {
        params.push(filters.department);
        sql += ` AND department = $${params.length}`;
    }
    if (filters.employment_status) {
        params.push(filters.employment_status);
        sql += ` AND employment_status = $${params.length}`;
    }
    if (filters.file_completion_status) {
        params.push(filters.file_completion_status);
        sql += ` AND file_completion_status = $${params.length}`;
    }

    const res = await query(sql, params);
    return res.rows;
}

export async function getDashboardStats() {
    const employees = await getAll('employees');
    const activeEmployees = employees.filter((emp: any) => emp.employment_status !== 'Resigned');

    const completeFiles = employees.filter((emp: any) => emp.file_completion_status === 'Complete').length;
    const partialFiles = employees.filter((emp: any) => emp.file_completion_status === 'Partial').length;
    const incompleteFiles = employees.filter((emp: any) => emp.file_completion_status === 'Incomplete').length;

    const deptMap = new Map<string, number>();
    activeEmployees.forEach((emp: any) => {
        deptMap.set(emp.department, (deptMap.get(emp.department) || 0) + 1);
    });
    const byDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({ department, count }));

    const statusMap = new Map<string, number>();
    employees.forEach((emp: any) => {
        statusMap.set(emp.employment_status, (statusMap.get(emp.employment_status) || 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries()).map(([employment_status, count]) => ({ employment_status, count }));

    const leavesRes = await query("SELECT COUNT(*) FROM leave_requests WHERE status LIKE 'Pending%'");
    const pendingLeaves = parseInt(leavesRes.rows[0].count);

    const pendingUsersRes = await query("SELECT COUNT(*) FROM users WHERE is_active = 0");
    const pendingUsers = parseInt(pendingUsersRes.rows[0].count);

    // Get Today's Attendance Stats
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const attendanceRes = await query("SELECT status FROM attendance WHERE date = $1", [todayStr]);
    const todayRecords = attendanceRes.rows;

    const todayPresents = todayRecords.filter((r: any) =>
        ['present', 'late', 'on time'].includes(r.status.toLowerCase())
    ).length;

    const todayAbsents = todayRecords.filter((r: any) =>
        ['absent', 'walk-in'].includes(r.status.toLowerCase())
    ).length;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonth = today.getMonth();
    const nextMonth = (currentMonth + 1) % 12;
    const currentYear = today.getFullYear();

    const upcomingBirthdays = activeEmployees
        .filter((emp: any) => {
            if (!emp.date_of_birth) return false;
            // Handle both string and Date objects from Postgres
            const bday = new Date(emp.date_of_birth);
            const bdayMonth = bday.getMonth();
            const bdayDay = bday.getDate();

            if (bdayMonth === currentMonth) {
                return bdayDay >= today.getDate();
            }
            return bdayMonth === nextMonth;
        })
        .map((emp: any) => {
            const bday = new Date(emp.date_of_birth);
            const bdayMonth = bday.getMonth();
            const bdayDay = bday.getDate();

            let bdayYear = currentYear;
            if (bdayMonth < currentMonth || (bdayMonth === currentMonth && bdayDay < today.getDate())) {
                bdayYear = currentYear + 1;
            }

            const nextBday = new Date(bdayYear, bdayMonth, bdayDay);
            const diffTime = nextBday.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                date: emp.date_of_birth,
                daysUntil: diffDays,
                department: emp.department,
                monthName: nextBday.toLocaleString('default', { month: 'long' })
            };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

    return {
        totalEmployees: activeEmployees.length,
        totalDepartments: byDepartment.length,
        todayPresents,
        todayAbsents,
        completeFiles,
        partialFiles,
        incompleteFiles,
        pendingLeaves,
        pendingUsers,
        upcomingBirthdays,
        byDepartment,
        byStatus,
        // Mock Comparison data for UI (since YoY requires historical tables/snapshots)
        comparisons: {
            employees: { value: 12, positive: true },
            departments: { value: 0, positive: true },
            attendance: { value: 5, positive: true }
        }
    };
}

export async function getDepartments(): Promise<string[]> {
    const res = await query("SELECT DISTINCT department FROM employees ORDER BY department");
    const departments = res.rows.map(r => r.department).filter(Boolean);
    return Array.from(new Set(departments)).sort();
}

export async function getBranches(): Promise<string[]> {
    const res = await query("SELECT DISTINCT branch FROM employees ORDER BY branch");
    const branches = res.rows.map(r => r.branch).filter(Boolean);
    return Array.from(new Set(branches)).sort();
}

export interface DetailedReportsData {
    attendanceSummary: {
        id: number;
        name: string;
        department: string;
        branch?: string;
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        tardinessRate: number;
    }[];
    leaveUsage: {
        id: number;
        name: string;
        department: string;
        branch?: string;
        entitlement: number;
        used: number;
        remaining: number;
        details: Record<string, number>;
    }[];
    payrollSummary: {
        totalBasicRate: number;
        totalAllowances: number;
        totalSSS: number;
        totalPhilHealth: number;
        totalPagIBIG: number;
        employeeCount: number;
    };
    complianceAudit: {
        id: number;
        name: string;
        department: string;
        branch?: string;
        status: string;
        missingFields: string[];
    }[];
    tenureData: {
        id: number;
        name: string;
        department: string;
        branch?: string;
        dateHired: string;
        tenure: string;
        yearsInCompany: number;
        daysToAnniversary: number;
    }[];
    governmentRemittance: {
        sss: number;
        philhealth: number;
        pagibig: number;
        total: number;
    };
    headcount: {
        byDepartment: { name: string, count: number }[];
        byBranch: { name: string, count: number }[];
        total: number;
        growthThisYear: number;
    };
    latesAbsencesLog: {
        date: string;
        employee_id: number;
        name: string;
        department: string;
        branch?: string;
        time_in?: string;
        time_out?: string;
        status: string;
        late_minutes: number;
    }[];
    latesAbsencesSummary: {
        id: number;
        name: string;
        department: string;
        lateCount: number;
        absentCount: number;
        isThresholdExceeded: boolean;
    }[];
}

export async function getDetailedReportsData(dateRange?: { start: string, end: string }, branch?: string): Promise<DetailedReportsData> {
    const employees = await getAll('employees');
    let activeEmployees = employees.filter((emp: any) => emp.employment_status !== 'Resigned');

    if (branch && branch !== 'All Branches') {
        activeEmployees = activeEmployees.filter((emp: any) => emp.branch === branch);
    }

    const now = new Date();
    const start = dateRange?.start ? new Date(dateRange.start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = dateRange?.end ? new Date(dateRange.end) : now;

    const attRes = await query("SELECT * FROM attendance WHERE date >= $1 AND date <= $2", [start, end]);
    const attendance = attRes.rows;

    const leaveRes = await query("SELECT * FROM leave_requests WHERE status = 'Approved'");
    const leaves = leaveRes.rows;

    // 1. Attendance
    const attendanceSummary = activeEmployees.map((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);
        const present = empAttendance.filter((a: any) => a.status === 'Present').length;
        const late = empAttendance.filter((a: any) => a.status === 'Late').length;
        const absent = empAttendance.filter((a: any) => a.status === 'Absent').length;

        // Calculate onLeave from attendance OR approved leave requests
        const attendanceOnLeave = empAttendance.filter((a: any) => a.status === 'On Leave').length;

        // Also check leave requests falling in this period
        const empLeaves = leaves.filter((l: any) => l.employee_id === emp.id);
        const leaveDaysInPeriod = empLeaves.reduce((acc: number, l: any) => {
            const lStart = new Date(l.start_date);
            const lEnd = new Date(l.end_date);
            // Simple overlap check
            if (lStart <= end && lEnd >= start) {
                // Approximate for simplicity: if overlap, count days. 
                // For exact days, we'd iterate dates. But 'days_count' is usually good enough for summary
                return acc + Number(l.days_count);
            }
            return acc;
        }, 0);

        // Avoid double counting if attendance already marks them as "On Leave"
        // If we strictly rely on attendance for the daily report, just use attendanceOnLeave for "days marked"
        // But the user wants "Used Leave" table. Let's use the explicit attendance status as the primary source for the "Attendance Summary" table context
        // to stay consistent with present/late/absent columns which come from daily logs.
        const onLeave = attendanceOnLeave;

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch, // Added branch
            present,
            late,
            absent,
            onLeave, // Add this field
            tardinessRate: empAttendance.length > 0 ? Math.round((late / empAttendance.length) * 100) : 0
        };
    });

    // 2. Leave - Computation based primarily on Attendance 'On Leave' status
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const yearlyLeaveRes = await query(
        "SELECT employee_id, COUNT(*) as count FROM attendance WHERE status = 'On Leave' AND date >= $1 GROUP BY employee_id",
        [currentYearStart]
    );
    const yearlyAttendanceLeaveMap = new Map(yearlyLeaveRes.rows.map((r: any) => [Number(r.employee_id), parseInt(r.count)]));

    const leaveUsage = activeEmployees.map((emp: any) => {
        const empLeavesFiled = leaves.filter((l: any) => l.employee_id === emp.id);

        // Attendance records are the primary truth for usage
        const used = yearlyAttendanceLeaveMap.get(emp.id) || 0;

        // Validation: We can compare filed vs logs if needed, but 'used' is attendance-based
        const filedCount = empLeavesFiled.reduce((acc: number, curr: any) => acc + Number(curr.days_count), 0);

        const byType = empLeavesFiled.reduce((acc: any, curr: any) => {
            acc[curr.leave_type] = (acc[curr.leave_type] || 0) + Number(curr.days_count);
            return acc;
        }, {});

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch,
            entitlement: 5, // Yearly entitlement
            used,           // Counts 'On Leave' in attendance for the current year
            remaining: 5 - used,
            details: byType,
            filedValidation: filedCount // Retained for background validation
        };
    });

    // 3. Payroll
    const payrollSummary = {
        totalBasicRate: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.basic_salary) || 0), 0),
        totalAllowances: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.allowances?.special) || 0), 0),
        totalSSS: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.deductions?.sss_contribution) || 0), 0),
        totalPhilHealth: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.deductions?.philhealth_contribution) || 0), 0),
        totalPagIBIG: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.deductions?.pagibig_contribution) || 0), 0),
        totalPagIBIGMP2: activeEmployees.reduce((acc, emp) => acc + (Number(emp.salary_info?.deductions?.pagibig_mp2) || 0), 0),
        employeeCount: activeEmployees.length
    };

    // 4. Compliance
    const complianceAudit = activeEmployees.map((emp: any) => {
        const missing = [];
        if (!emp.sss_number) missing.push('SSS');
        if (!emp.philhealth_number) missing.push('PhilHealth');
        if (!emp.pagibig_number) missing.push('Pag-IBIG');
        if (!emp.tin) missing.push('TIN');
        if (!emp.date_of_birth) missing.push('Birth Date');

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch, // Added branch
            status: emp.file_completion_status,
            missingFields: missing
        };
    });

    // 5. Tenure
    const tenureData = activeEmployees.map((emp: any) => {
        const hired = new Date(emp.date_hired);
        const diff = now.getTime() - hired.getTime();
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

        const nextAnniversary = new Date(now.getFullYear(), hired.getMonth(), hired.getDate());
        if (nextAnniversary < now) {
            nextAnniversary.setFullYear(now.getFullYear() + 1);
        }
        const daysUntilAnniversary = Math.ceil((nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch, // Added branch
            dateHired: emp.date_hired ? new Date(emp.date_hired).toISOString().split('T')[0] : '-',
            tenure: `${years}y ${months}m`,
            yearsInCompany: years,
            daysToAnniversary: daysUntilAnniversary
        };
    }).sort((a, b) => a.daysToAnniversary - b.daysToAnniversary);

    // 6. Government
    const governmentRemittance = {
        sss: payrollSummary.totalSSS,
        philhealth: payrollSummary.totalPhilHealth,
        pagibig: payrollSummary.totalPagIBIG,
        total: payrollSummary.totalSSS + payrollSummary.totalPhilHealth + payrollSummary.totalPagIBIG
    };

    // 7. Headcount
    const headcountByDept = activeEmployees.reduce((acc: any, emp: any) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
    }, {});

    const headcountByBranch = activeEmployees.reduce((acc: any, emp: any) => {
        const branchName = emp.branch || 'Not Assigned';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
    }, {});

    const thisYear = now.getFullYear();
    const joinedThisYear = activeEmployees.filter((emp: any) => {
        const hired = new Date(emp.date_hired);
        return hired.getFullYear() === thisYear;
    }).length;

    const headcount = {
        byDepartment: Object.entries(headcountByDept).map(([name, count]) => ({ name, count: count as number })),
        byBranch: Object.entries(headcountByBranch).map(([name, count]) => ({ name, count: count as number })),
        total: activeEmployees.length,
        growthThisYear: joinedThisYear
    };

    // 8. Lates and Absences Log
    const settingsRows = await query("SELECT value FROM settings WHERE key = 'attendance_cutoff'");
    const scheduledIn = settingsRows.rows[0]?.value || '08:00';

    const latesAbsencesLog = activeEmployees.flatMap((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);

        return empAttendance
            .map((a: any) => {
                let lateMinutes = 0;
                const timeInStr = String(a.time_in || '');
                const schedInStr = String(scheduledIn || '08:00');

                if (timeInStr && timeInStr.includes(':')) {
                    const [h1, m1] = timeInStr.split(':').map(Number);
                    const [h2, m2] = schedInStr.split(':').map(Number);
                    const actualMin = h1 * 60 + m1;
                    const schedMin = h2 * 60 + m2;
                    lateMinutes = Math.max(0, actualMin - schedMin);
                }

                return {
                    date: typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0],
                    employee_id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    department: emp.department,
                    branch: emp.branch,
                    time_in: a.time_in || '-',
                    time_out: a.time_out || '-',
                    status: a.status,
                    late_minutes: lateMinutes
                };
            })
            .filter(log => log.status === 'Late' || log.status === 'Absent' || log.late_minutes > 0);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 9. Lates and Absences Summary (Threshold: 5 lates or 10 absences)
    const latesAbsencesSummary = activeEmployees.map((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);
        const lateCount = empAttendance.filter(a => a.status === 'Late').length;
        const absentCount = empAttendance.filter(a => a.status === 'Absent').length;

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch,
            lateCount,
            absentCount,
            isThresholdExceeded: lateCount >= 5 || absentCount >= 10
        };
    });

    return {
        attendanceSummary,
        leaveUsage,
        payrollSummary,
        complianceAudit,
        tenureData,
        governmentRemittance,
        headcount,
        latesAbsencesLog,
        latesAbsencesSummary
    };
}

// Document operations
export interface Document {
    id: number;
    employee_id: number;
    category: string;
    document_name: string;
    file_path: string;
    file_size: number;
    uploaded_by: number;
    uploaded_at: string;
}

export async function getEmployeeDocuments(employeeId: number): Promise<Document[]> {
    const res = await query("SELECT * FROM documents WHERE employee_id = $1", [employeeId]);
    return res.rows;
}

export async function getEducationByEmployeeId(employeeId: number): Promise<Education[]> {
    const res = await query("SELECT * FROM education WHERE employee_id = $1 ORDER BY year_graduated DESC", [employeeId]);
    return res.rows;
}

export async function addEducation(data: Omit<Education, 'id'>): Promise<number> {
    return await insert('education', data);
}

export async function deleteEducation(id: number): Promise<void> {
    await remove('education', id);
}

export async function replaceEmployeeEducation(employeeId: number, educationList: Omit<Education, 'id'>[]): Promise<void> {
    // Get existing to delete
    const res = await query("SELECT id FROM education WHERE employee_id = $1", [employeeId]);
    const existingIds = res.rows.map(r => r.id);

    // Delete all existing
    for (const id of existingIds) {
        await remove('education', id);
    }

    // Insert new
    for (const edu of educationList) {
        await insert('education', { ...edu, employee_id: employeeId });
    }
}

export async function addDocument(data: {
    employee_id: number;
    category: string;
    document_name: string;
    file_path: string;
    file_size: number;
    uploaded_by: number;
}): Promise<number> {
    return await insert('documents', data);
}

export async function deleteDocument(id: number): Promise<void> {
    await remove('documents', id);
}

// Attendance operations
export interface Attendance {
    id: number;
    employee_id: number;
    date: string;
    time_in?: string;
    time_out?: string;
    status: string;
    remarks?: string;
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
    const res = await query("SELECT * FROM attendance WHERE date = $1", [date]);
    return res.rows;
}

export async function getEmployeeAttendance(employeeId: number, startDate: string, endDate: string): Promise<Attendance[]> {
    const res = await query(
        "SELECT * FROM attendance WHERE employee_id = $1 AND date >= $2 AND date <= $3",
        [employeeId, startDate, endDate]
    );
    return res.rows;
}

export async function recordAttendance(data: {
    employee_id: number;
    date: string;
    time_in?: string;
    time_out?: string;
    morning_in?: string;
    morning_out?: string;
    afternoon_in?: string;
    afternoon_out?: string;
    total_hours?: number;
    status: string;
    remarks?: string;
}): Promise<void> {
    // Auto-determine Leave vs Absent if no times are provided
    if (!data.morning_in && !data.afternoon_in && !data.time_in && !data.morning_out && !data.afternoon_out) {
        const year = new Date(data.date).getFullYear();
        try {
            const used = await getEmployeeLeaveCount(data.employee_id, year);
            if (used < 5) {
                data.status = 'On Leave';
            } else {
                data.status = 'Absent';
            }
        } catch (e) {
            console.error('Failed to auto-calc leave status:', e);
            data.status = 'Absent'; // Fallback
        }
    }

    const isLeave = data.status.toLowerCase().includes('leave');

    // Check if record already exists
    const res = await query("SELECT id, status FROM attendance WHERE employee_id = $1 AND date = $2", [data.employee_id, data.date]);
    const existingRecord = res.rows[0];

    if (isLeave) {
        // If we are changing to leave or creating a new leave record
        if (!existingRecord || !existingRecord.status.toLowerCase().includes('leave')) {
            const year = new Date(data.date).getFullYear();
            const used = await getEmployeeLeaveCount(data.employee_id, year);
            if (used >= 5) {
                throw new Error(`Leave limit exceeded for this year (Max 5 days). Current used: ${used}`);
            }
        }
    }

    if (existingRecord) {
        await update('attendance', existingRecord.id, data);
    } else {
        await insert('attendance', data);
    }
}

export async function batchRecordAttendance(records: {
    employee_id: number;
    date: string;
    time_in?: string;
    time_out?: string;
    morning_in?: string;
    morning_out?: string;
    afternoon_in?: string;
    afternoon_out?: string;
    total_hours?: number;
    status: string;
    remarks?: string;
}[]): Promise<void> {
    if (records.length === 0) return;

    // Use loop to ensure recordAttendance logic (like leave limit check) is run for each
    for (const record of records) {
        await recordAttendance(record);
    }
}

// Leave operations
export interface LeaveApproval {
    level: number;
    approver_id: number;
    status: 'Approved' | 'Rejected' | 'Returned';
    date: string;
    remarks?: string;
}

export interface LeaveRequest {
    id: number;
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    status: string;
    approvals: LeaveApproval[];
    current_approval_level: number;
    created_at: string;
    updated_at: string;
}

export async function getLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    if (status) {
        const q = status === 'Pending' ? 'Pending%' : status;
        const res = await query("SELECT * FROM leave_requests WHERE status LIKE $1 ORDER BY created_at DESC", [q]);
        return res.rows;
    }
    return await getAll('leave_requests');
}

export async function getEmployeeLeaveRequests(employeeId: number): Promise<LeaveRequest[]> {
    const res = await query("SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC", [employeeId]);
    return res.rows;
}

export async function createLeaveRequest(data: {
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
}): Promise<number> {
    return await insert('leave_requests', {
        ...data,
        status: 'Pending Branch Manager',
        approvals: JSON.stringify([]),
        current_approval_level: 1
    });
}

export async function updateLeaveStatus(id: number, status: string, approverId: number, remarks?: string): Promise<void> {
    const request = await getById('leave_requests', id) as LeaveRequest;
    if (!request) return;

    const level = request.current_approval_level;
    const newApproval: LeaveApproval = {
        level: level,
        approver_id: approverId,
        status: status === 'Rejected' ? 'Rejected' : 'Approved',
        date: new Date().toISOString(),
        remarks: remarks
    };

    // Handle JSONB column safely
    const currentApprovals = Array.isArray(request.approvals) ? request.approvals : [];
    const updatedApprovals = [...currentApprovals, newApproval];

    await update('leave_requests', id, {
        status,
        approvals: JSON.stringify(updatedApprovals)
    });
}

export async function advanceApprovalLevel(id: number, nextLevel: number): Promise<void> {
    await update('leave_requests', id, {
        status: `Pending Level ${nextLevel}`,
        current_approval_level: nextLevel
    });
}

export async function getAllPayrollRuns(): Promise<PayrollRun[]> {
    return await getAll('payroll_runs');
}

export async function getPayrollRunById(id: number): Promise<PayrollRun | undefined> {
    return await getById('payroll_runs', id);
}

export async function createPayrollRun(data: Omit<PayrollRun, 'id' | 'created_at'>): Promise<number> {
    return await insert('payroll_runs', data);
}

export async function getPayslipsByRunId(runId: number): Promise<Payslip[]> {
    const res = await query("SELECT * FROM payslips WHERE payroll_run_id = $1", [runId]);
    return res.rows.map(row => ({
        ...row,
        deduction_details: typeof row.deduction_details === 'string' ? JSON.parse(row.deduction_details) : row.deduction_details,
        allowance_details: typeof row.allowance_details === 'string' ? JSON.parse(row.allowance_details) : row.allowance_details
    }));
}

export async function getEmployeePayslips(employeeId: number): Promise<any[]> {
    const sql = `
        SELECT p.*, pr.period_start, pr.period_end, pr.status as run_status
        FROM payslips p
        JOIN payroll_runs pr ON p.payroll_run_id = pr.id
        WHERE p.employee_id = $1
        ORDER BY pr.period_end DESC
    `;
    const res = await query(sql, [employeeId]);
    return res.rows.map(row => ({
        ...row,
        deduction_details: typeof row.deduction_details === 'string' ? JSON.parse(row.deduction_details) : row.deduction_details,
        allowance_details: typeof row.allowance_details === 'string' ? JSON.parse(row.allowance_details) : row.allowance_details
    }));
}

export async function getEmployeeLeaveCount(employeeId: number, year: number): Promise<number> {
    const res = await query(
        "SELECT COUNT(*) FROM attendance WHERE employee_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND status ILIKE 'Leave%'",
        [employeeId, year]
    );
    return parseInt(res.rows[0].count);
}

export async function createPayslip(data: Omit<Payslip, 'id' | 'generated_at'>): Promise<number> {
    return await insert('payslips', {
        ...data,
        // Don't manually stringify for Postgres JSONB or Local JSON
        deduction_details: data.deduction_details,
        allowance_details: data.allowance_details
    });
}

export async function batchCreatePayslips(items: Omit<Payslip, 'id' | 'generated_at'>[]): Promise<void> {
    if (items.length === 0) return;

    if (isPostgres()) {
        const values: any[] = [];
        let placeholderIndex = 1;
        const valueStrings: string[] = [];

        for (const item of items) {
            valueStrings.push(`($${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++})`);
            values.push(
                item.payroll_run_id,
                item.employee_id,
                item.gross_pay,
                item.net_pay,
                item.total_deductions,
                item.total_allowances,
                item.days_present,
                item.double_pay_days,
                item.double_pay_amount,
                item.deduction_details,
                item.allowance_details
            );
        }

        const sql = `
            INSERT INTO payslips (
                payroll_run_id, employee_id, gross_pay, net_pay, 
                total_deductions, total_allowances, days_present, 
                double_pay_days, double_pay_amount, deduction_details, allowance_details
            ) VALUES ${valueStrings.join(', ')}
        `;
        await query(sql, values);
    } else {
        for (const item of items) {
            await createPayslip(item);
        }
    }
}

export async function batchUpdateEmployees(updates: { id: number, data: Partial<EmployeeFormData> }[]): Promise<void> {
    if (updates.length === 0) return;

    // For simplicity, we loop updates but this is still cleaner in the route
    // and can be further optimized if needed.
    for (const update of updates) {
        await updateEmployee(update.id, update.data);
    }
}

export async function logAudit(data: {
    user_id: number;
    action: string;
    table_name?: string;
    record_id?: number;
    old_value?: string;
    new_value?: string;
    ip_address?: string;
}): Promise<number> {
    return await insert('audit_logs', {
        user_id: data.user_id,
        action: data.action,
        ip_address: data.ip_address,
        details: JSON.stringify({
            table_name: data.table_name,
            record_id: data.record_id,
            old_value: data.old_value,
            new_value: data.new_value
        })
    });
}

export async function updatePayrollRun(id: number, data: Partial<PayrollRun>): Promise<void> {
    await update('payroll_runs', id, data);
}

export async function deletePayrollRun(id: number): Promise<void> {
    await remove('payroll_runs', id);
}

