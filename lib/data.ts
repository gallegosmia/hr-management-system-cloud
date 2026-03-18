import { getAll, getById, insert, update, query, remove, resetTableSequence, isPostgres } from './database';
import { normalizeBranchName } from './branch-access';

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

    disciplinary_records: number;
    training_records: number;
    separation_records: number;
    file_completion_status: string;
    last_updated: string;
    remarks?: string;
    training_details?: string;
    disciplinary_details?: string;
    leave_credits?: number;
    loan_balance?: number;
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
    emergency_contact_relationship?: string;
    emergency_contact_address?: string;
    citizen_id_address?: string;
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
    disciplinary_records?: number;
    training_records?: number;
    separation_records?: number;
    training_details?: string;
    disciplinary_details?: string;
    loan_balance?: number;
}

export interface EmergencyLoan {
    id: number;
    employee_id: number;
    requested_amount: number;
    approved_amount?: number;
    reason: string;
    category: string;
    status: string; // Draft, Submitted, Under Review, Approved, Disapproved, Released, Closed
    filing_date: string;
    disapproval_reason?: string;
    current_approval_level: number;
    approvals: any;
    attachments: any;
    deduction_amount?: number;
    total_released_amount?: number;

    // Enhanced Release Tracking
    release_type?: 'FULL' | 'STAGGERED';
    released_amount?: number;
    remaining_balance?: number;
    tracker_status?: string;
    first_release_amount?: number;
    second_release_amount?: number;
    last_release_amount?: number;

    metadata: any;
    created_at: string;
    updated_at: string;
    employee_name?: string;
    position?: string;
    branch?: string;
    department?: string;
    salary_info?: any;
}

export interface AuditLog {
    id: number;
    user_id: number;
    action: string;
    details: any;
    ip_address?: string;
    created_at: string;
}

export interface Announcement {
    id: number;
    title: string;
    content: string;
    author_id: number;
    category: 'Announcement' | 'Memo' | 'Policy';
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    target_branch: string;
    target_department: string;
    target_employee_id?: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    author_name?: string;
    target_employee_name?: string;
}

export interface LeaveSettings {

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

export async function getEmployeePayslips(employeeId: number): Promise<any[]> {
    const res = await query(`
        SELECT pi.*, pr.run_number, pr.payroll_period_start, pr.payroll_period_end, pr.created_at as run_date, pr.status as run_status
        FROM payroll_items pi
        JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
        WHERE pi.employee_id = $1
        ORDER BY pr.payroll_period_end DESC
    `, [employeeId]);
    return res.rows;
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

export async function getDashboardStats(branch?: string) {
    let employees = await getAll('employees');

    if (branch && branch !== 'All') {
        const normalizedBranch = normalizeBranchName(branch);
        employees = employees.filter((emp: any) => normalizeBranchName(emp.branch) === normalizedBranch);
    }

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

    let leaveSql = "SELECT COUNT(*) FROM leave_requests l JOIN employees e ON l.employee_id = e.id WHERE l.status LIKE 'Pending%'";
    const leaveParams = [];
    if (branch && branch !== 'All') {
        leaveSql += " AND e.branch = $1";
        leaveParams.push(branch);
    }
    const leavesRes = await query(leaveSql, leaveParams);
    const pendingLeaves = parseInt(leavesRes.rows[0].count);

    const pendingUsersRes = await query("SELECT COUNT(*) FROM users WHERE is_active = 0");
    const pendingUsers = parseInt(pendingUsersRes.rows[0].count);

    // Get Today's Attendance Stats
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let attendanceSql = "SELECT a.status FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date = $1";
    const attendanceParams = [todayStr];
    if (branch && branch !== 'All') {
        attendanceSql += " AND e.branch = $2";
        attendanceParams.push(branch);
    }
    const attendanceRes = await query(attendanceSql, attendanceParams);
    const todayRecords = attendanceRes.rows;

    const todayPresents = todayRecords.filter((r: any) =>
        ['present', 'late', 'on time', 'official business', 'training / seminar'].includes(r.status.toLowerCase())
    ).length;

    const todayAbsents = todayRecords.filter((r: any) =>
        ['absent', 'walk-in', 'leave without pay'].includes(r.status.toLowerCase())
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

    if (branch && branch !== 'All Branches' && branch !== 'All') {
        const normalizedBranch = normalizeBranchName(branch);
        activeEmployees = activeEmployees.filter((emp: any) => normalizeBranchName(emp.branch) === normalizedBranch);
    }

    const now = new Date();
    const start = dateRange?.start ? new Date(dateRange.start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = dateRange?.end ? new Date(dateRange.end) : now;

    // Use ISO strings for safer DB queries (fixes local JSON date comparisons)
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const attRes = await query("SELECT * FROM attendance WHERE date >= $1 AND date <= $2", [startStr, endStr]);
    const attendance = attRes.rows;

    const leaveRes = await query("SELECT * FROM leave_requests WHERE status = 'Approved'");
    const leaves = leaveRes.rows;

    // 1. Attendance
    const attendanceSummary = activeEmployees.map((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);
        const present = empAttendance.filter((a: any) => a.status?.toLowerCase() === 'present').length;
        const late = empAttendance.filter((a: any) => a.status?.toLowerCase() === 'late').length;
        const absent = empAttendance.filter((a: any) => a.status?.toLowerCase() === 'absent').length;

        // Calculate onLeave (Training/Seminar/Leaves) from attendance
        const attendanceOnLeave = empAttendance.filter((a: any) =>
            ['sick leave', 'vacation leave', 'birthday leave', 'official business', 'training / seminar', 'leave without pay'].includes(a.status?.toLowerCase())
        ).length;

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
    const currentYearStartStr = currentYearStart.toISOString().split('T')[0];
    const yearlyLeaveRes = await query(
        "SELECT employee_id, COUNT(*) as count FROM attendance WHERE (LOWER(status) = 'sick leave' OR LOWER(status) = 'vacation leave' OR LOWER(status) = 'emergency leave' OR LOWER(status) = 'on leave' OR LOWER(status) = 'leave without pay') AND date >= $1 GROUP BY employee_id",
        [currentYearStartStr]
    );
    const yearlyAttendanceLeaveMap = new Map(yearlyLeaveRes.rows.map((r: any) => [Number(r.employee_id), parseInt(r.count)]));
    const yearlyBirthdayRes = await query(
        "SELECT employee_id, COUNT(*) as count FROM attendance WHERE LOWER(status) = 'birthday leave' AND date >= $1 GROUP BY employee_id",
        [currentYearStartStr]
    );
    const yearlyAttendanceBirthdayMap = new Map(yearlyBirthdayRes.rows.map((r: any) => [Number(r.employee_id), parseInt(r.count)]));

    const leaveUsage = activeEmployees.map((emp: any) => {
        const empLeavesFiled = leaves.filter((l: any) => l.employee_id === emp.id);

        // Attendance records are the primary truth for usage
        const used = yearlyAttendanceLeaveMap.get(emp.id) || 0;
        const attendanceBirthdayUsed = yearlyAttendanceBirthdayMap.get(emp.id) || 0;

        // Validation: We can compare filed vs logs if needed, but 'used' is attendance-based
        const filedCount = empLeavesFiled.reduce((acc: number, curr: any) => acc + Number(curr.days_count), 0);

        const byType = empLeavesFiled.reduce((acc: any, curr: any) => {
            acc[curr.leave_type] = (acc[curr.leave_type] || 0) + Number(curr.days_count);
            return acc;
        }, {});

        // Specific count for Birthday Leave - preferring attendance if available
        const birthdayLeaveCount = Math.max(byType['Birthday Leave'] || 0, attendanceBirthdayUsed);

        const entitlement = Number(emp.leave_credits) || 5;
        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch,
            entitlement,
            used,           // Counts 'On Leave', 'Sick Leave', etc. in attendance for the current year
            remaining: entitlement - used,
            details: byType,
            birthdayLeaveUsed: birthdayLeaveCount,
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
            .filter(log => log.status?.toLowerCase() === 'late' || log.status?.toLowerCase() === 'absent' || log.late_minutes > 0);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 9. Lates and Absences Summary (Threshold: 5 lates or 10 absences)
    const latesAbsencesSummary = activeEmployees.map((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);
        const lateCount = empAttendance.filter(a => a.status?.toLowerCase() === 'late').length;
        const absentCount = empAttendance.filter(a => a.status?.toLowerCase() === 'absent').length;

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
    const res = await query(
        "SELECT a.*, e.branch, e.first_name || ' ' || e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date = $1",
        [date]
    );
    return res.rows;
}

export async function getEmployeeAttendance(employeeId: number, startDate: string, endDate: string): Promise<Attendance[]> {
    const res = await query(
        "SELECT a.*, e.branch, e.first_name || ' ' || e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.employee_id = $1 AND a.date >= $2 AND a.date <= $3",
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
    // Leaves are explicitly set in the UI or come from approved requests.
    if (!data.status) {
        data.status = 'Absent';
    }

    const isLeave = data.status.toLowerCase().includes('leave');

    // Check if record already exists
    const res = await query("SELECT id, status FROM attendance WHERE employee_id = $1 AND date = $2", [data.employee_id, data.date]);
    const existingRecord = res.rows[0];

    if (isLeave) {
        // If we are changing to leave or creating a new leave record
        if (!existingRecord || !existingRecord.status.toLowerCase().includes('leave')) {
            // EXEMPT Birthday Leave from the 5-day limit
            if (data.status !== 'Birthday Leave') {
                const year = new Date(data.date).getFullYear();
                const used = await getEmployeeLeaveCount(data.employee_id, year);
                if (used >= 5) {
                    throw new Error(`Leave limit exceeded for this year (Max 5 days). Current used: ${used}`);
                }
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

    if (isPostgres()) {
        // Optimization: Single batch query for Postgres
        const values: any[] = [];
        const placeholders: string[] = [];

        records.forEach((record, index) => {
            const i = index * 6;
            placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`);
            values.push(
                record.employee_id,
                record.date,
                record.time_in || null,
                record.time_out || null,
                record.status,
                record.remarks || null
            );
        });

        const sql = `
            INSERT INTO attendance (employee_id, date, time_in, time_out, status, remarks)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (employee_id, date) 
            DO UPDATE SET 
                time_in = EXCLUDED.time_in,
                time_out = EXCLUDED.time_out,
                status = EXCLUDED.status,
                remarks = EXCLUDED.remarks,
                updated_at = CURRENT_TIMESTAMP
        `;

        await query(sql, values);
    } else {
        // Use loop for other DBs or fallback
        for (const record of records) {
            await recordAttendance(record);
        }
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

export async function getEmployeeLeaveCount(employeeId: number, year: number): Promise<number> {
    const res = await query("SELECT * FROM attendance WHERE employee_id = $1", [employeeId]);
    return res.rows.filter((row: any) => {
        // Date check
        const d = new Date(row.date);
        if (d.getFullYear() !== year) return false;

        // Status check (case-insensitive)
        const s = (row.status || '').toLowerCase();
        // Count all standard leaves (including legacy 'on leave'), but EXCLUDE birthday leave
        return (s === 'on leave' || s === 'vacation leave' || s === 'sick leave' || s === 'emergency leave') && s !== 'birthday leave';
    }).length;
}

export async function getEmployeeLateCount(employeeId: number, month: number, year: number): Promise<number> {
    const res = await query("SELECT * FROM attendance WHERE employee_id = $1", [employeeId]);
    return res.rows.filter((row: any) => {
        const d = new Date(row.date);
        // JS getMonth is 0-indexed
        if (d.getFullYear() !== year || d.getMonth() !== month) return false;

        const s = (row.status || '').toLowerCase();
        return s === 'late';
    }).length;
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

// Emergency Loan Functions
export async function getEmergencyLoans(filters: { employee_id?: number, status?: string } = {}): Promise<EmergencyLoan[]> {
    const activePool = isPostgres();
    if (activePool) {
        let sql = "SELECT l.*, (e.first_name || ' ' || e.last_name) as employee_name, e.branch FROM emergency_loans l JOIN employees e ON l.employee_id = e.id WHERE 1=1";
        const params = [];

        if (filters.employee_id) {
            params.push(filters.employee_id);
            sql += ` AND l.employee_id = $${params.length}`;
        }
        if (filters.status) {
            params.push(filters.status);
            sql += ` AND l.status = $${params.length}`;
        }

        sql += " ORDER BY l.created_at DESC";
        const res = await query(sql, params);
        return res.rows as EmergencyLoan[];
    } else {
        // Local JSON Fallback
        const loans = await getAll('emergency_loans');
        const employees = await getAll('employees');
        let filtered = loans.map(loan => {
            const emp = employees.find(e => e.id == loan.employee_id);
            return {
                ...loan,
                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                branch: emp ? emp.branch : 'Unknown'
            };
        });

        if (filters.employee_id) filtered = filtered.filter(l => l.employee_id === filters.employee_id);
        if (filters.status) filtered = filtered.filter(l => l.status === filters.status);

        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
}

export async function getEmergencyLoanById(id: number): Promise<EmergencyLoan | null> {
    const activePool = isPostgres();
    if (activePool) {
        const res = await query(
            "SELECT l.*, (e.first_name || ' ' || e.last_name) as employee_name, e.position, e.branch, e.department, e.salary_info FROM emergency_loans l JOIN employees e ON l.employee_id = e.id WHERE l.id = $1",
            [id]
        );
        return (res.rows[0] as EmergencyLoan) || null;
    } else {
        const loan = await getById('emergency_loans', id);
        if (!loan) return null;
        const emp = await getById('employees', loan.employee_id);
        return {
            ...loan,
            employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
            position: emp?.position,
            branch: emp?.branch,
            department: emp?.department,
            salary_info: emp?.salary_info
        };
    }
}

export async function createEmergencyLoan(data: any): Promise<number> {
    return await insert('emergency_loans', data);
}

export async function updateEmergencyLoan(id: number, data: any): Promise<void> {
    await update('emergency_loans', id, data);
}

export async function getLoanConfig() {
    const res = await query("SELECT value FROM settings WHERE key = 'loan_config'");
    if (res.rows.length > 0) {
        // Handle both object and stringified JSON
        const val = res.rows[0].value;
        return typeof val === 'string' ? JSON.parse(val) : val;
    }
    return { max_total_company_loan: 30000 };
}

export async function getEmployeeLoanBalance(employeeId: number): Promise<number> {
    if (isPostgres()) {
        const res = await query(
            "SELECT SUM(balance) as total FROM employee_loans WHERE employee_id = $1 AND status IN ('Active', 'Ongoing', 'Approved') AND balance > 0",
            [employeeId]
        );
        return Number(res.rows[0]?.total || 0);
    } else {
        // Local JSON Fallback
        const loans = await getAll('employee_loans');
        return loans
            .filter(l => l.employee_id === employeeId && ['Active', 'Ongoing', 'Approved'].includes(l.status) && Number(l.balance) > 0)
            .reduce((sum, l) => sum + Number(l.balance || 0), 0);
    }
}

export async function addLoanToLedger(data: {
    employee_id: number;
    loan_type: string;
    principal: number;
    balance: number;
    status: string;
}) {
    return await insert('employee_loans', {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
}

export function computeLoanEligibility(category: string, currentBalance: number = 0, globalMax: number = 30000) {
    const categoryLimits: Record<string, number> = {
        'Medical – Employee': 10000,
        'Medical – Spouse/Children': 20000,
        'Medical – Parents/In-laws': 20000,
        'House Repair': 30000,
        'Vehicle Repair': 30000,
        'Bereavement': 25000,
        'Education': 25000,
        'Other Emergency': 15000
    };

    const catLimit = categoryLimits[category] || 10000;
    // Hard ceiling is the globalMax
    const maxAllowable = globalMax;
    const remaining = Math.max(0, globalMax - currentBalance);

    // We also consider the category limit for the SPECIFIC request, but the available limit is governed by the global 30k.
    const requestLimit = Math.min(catLimit, remaining);

    return { maxAllowable, currentBalance, remaining, requestLimit };
}

export function getLoanDeduction(amount: number) {
    if (amount <= 10000) return 500;
    if (amount <= 15000) return 600;
    if (amount <= 20000) return 800;
    if (amount <= 25000) return 900;
    return 1000;
}


export async function getAnnouncements(filters: { is_active?: boolean, branch?: string, department?: string, employee_id?: number } = {}): Promise<Announcement[]> {
    const activePool = isPostgres();
    if (activePool) {
        let sql = `
            SELECT a.*, u.username as author_name, e.first_name || ' ' || e.last_name as target_employee_name 
            FROM announcements a 
            LEFT JOIN users u ON a.author_id = u.id 
            LEFT JOIN employees e ON a.target_employee_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.is_active !== undefined) {
            params.push(filters.is_active);
            sql += ` AND a.is_active = $${params.length}`;
        }

        if (filters.employee_id) {
            // For a specific employee: show public ones (target_employee_id is null) AND private ones for them
            params.push(filters.employee_id);
            sql += ` AND (a.target_employee_id IS NULL OR a.target_employee_id = $${params.length})`;

            // Still respect branch/dept filters if they are public
            if (filters.branch && filters.branch !== 'All') {
                params.push(filters.branch);
                sql += ` AND (a.target_employee_id IS NOT NULL OR a.target_branch = $${params.length} OR a.target_branch = 'All')`;
            }
        } else {
            // If no employee_id filter (likely a manager view), show all
            if (filters.branch && filters.branch !== 'All') {
                params.push(filters.branch);
                sql += ` AND (a.target_branch = $${params.length} OR a.target_branch = 'All')`;
            }
        }

        if (filters.department && filters.department !== 'All') {
            params.push(filters.department);
            sql += ` AND (a.target_department = $${params.length} OR a.target_department = 'All')`;
        }

        sql += " ORDER BY a.created_at DESC";
        const res = await query(sql, params);
        return res.rows as Announcement[];
    } else {
        const announcements = await getAll('announcements');
        const users = await getAll('users');
        const employees = await getAll('employees');
        let filtered = announcements.map(a => {
            const user = users.find(u => u.id == a.author_id);
            const targetEmp = a.target_employee_id ? employees.find(e => e.id == a.target_employee_id) : null;
            return {
                ...a,
                author_name: user ? user.username : 'Unknown',
                target_employee_name: targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : undefined
            };
        });

        if (filters.is_active !== undefined) filtered = filtered.filter(a => a.is_active === filters.is_active);

        if (filters.employee_id) {
            filtered = filtered.filter(a => !a.target_employee_id || a.target_employee_id == filters.employee_id);
            // Re-apply branch filter for public ones
            if (filters.branch && filters.branch !== 'All') {
                const normalizedFilterBranch = normalizeBranchName(filters.branch);
                filtered = filtered.filter(a => a.target_employee_id || normalizeBranchName(a.target_branch) === normalizedFilterBranch || a.target_branch === 'All');
            }
        } else {
            if (filters.branch && filters.branch !== 'All') {
                const normalizedFilterBranch = normalizeBranchName(filters.branch);
                filtered = filtered.filter(a => normalizeBranchName(a.target_branch) === normalizedFilterBranch || a.target_branch === 'All');
            }
        }

        if (filters.department && filters.department !== 'All') {
            filtered = filtered.filter(a => a.target_department === filters.department || a.target_department === 'All');
        }

        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
}

export async function createAnnouncement(data: Partial<Announcement>): Promise<number> {
    return await insert('announcements', {
        ...data,
        is_active: data.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
}

export async function updateAnnouncement(id: number, data: Partial<Announcement>): Promise<void> {
    await update('announcements', id, {
        ...data,
        updated_at: new Date().toISOString()
    });
}

export async function deleteAnnouncement(id: number): Promise<void> {
    await remove('announcements', id);
}
