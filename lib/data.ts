import { getAll, getById, insert, update, query, remove, resetTableSequence } from './database';

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
    date_separated?: string;
    contact_number?: string;
    email_address?: string;
    address?: string;
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
    await remove('employees', id);
}

export async function searchEmployees(searchQuery: string): Promise<Employee[]> {
    const q = `%${searchQuery.toLowerCase()}%`;
    const res = await query(
        `SELECT * FROM employees 
         WHERE LOWER(employee_id) LIKE $1 
         OR LOWER(last_name) LIKE $1 
         OR LOWER(first_name) LIKE $1 
         OR LOWER(department) LIKE $1 
         OR LOWER(position) LIKE $1`,
        [q]
    );
    return res.rows;
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

    const now = new Date();
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
        completeFiles,
        partialFiles,
        incompleteFiles,
        pendingLeaves,
        upcomingBirthdays,
        byDepartment,
        byStatus
    };
}

export async function getDepartments(): Promise<string[]> {
    const res = await query("SELECT DISTINCT department FROM employees ORDER BY department");
    return res.rows.map(r => r.department).filter(Boolean);
}

export interface DetailedReportsData {
    attendanceSummary: {
        id: number;
        name: string;
        department: string;
        present: number;
        late: number;
        absent: number;
        tardinessRate: number;
    }[];
    leaveUsage: {
        id: number;
        name: string;
        department: string;
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
        status: string;
        missingFields: string[];
    }[];
    tenureData: {
        id: number;
        name: string;
        department: string;
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
        total: number;
        growthThisYear: number;
    };
}

export async function getDetailedReportsData(dateRange?: { start: string, end: string }): Promise<DetailedReportsData> {
    const employees = await getAll('employees');
    const activeEmployees = employees.filter((emp: any) => emp.employment_status !== 'Resigned');

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

    // 2. Leave
    const leaveUsage = activeEmployees.map((emp: any) => {
        const empLeaves = leaves.filter((l: any) => l.employee_id === emp.id);
        const used = empLeaves.reduce((acc: number, curr: any) => acc + Number(curr.days_count), 0);
        const byType = empLeaves.reduce((acc: any, curr: any) => {
            acc[curr.leave_type] = (acc[curr.leave_type] || 0) + Number(curr.days_count);
            return acc;
        }, {});

        return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            branch: emp.branch, // Added branch
            entitlement: 5,
            used,
            remaining: 5 - used,
            details: byType
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
            dateHired: emp.date_hired,
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

    const thisYear = now.getFullYear();
    const joinedThisYear = activeEmployees.filter((emp: any) => {
        const hired = new Date(emp.date_hired);
        return hired.getFullYear() === thisYear;
    }).length;

    return {
        attendanceSummary,
        leaveUsage,
        payrollSummary,
        complianceAudit,
        tenureData,
        governmentRemittance,
        headcount: {
            byDepartment: Object.entries(headcountByDept).map(([name, count]) => ({ name, count: count as number })),
            total: activeEmployees.length,
            growthThisYear: joinedThisYear
        }
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
    status: string;
    remarks?: string;
}): Promise<void> {
    const res = await query("SELECT id FROM attendance WHERE employee_id = $1 AND date = $2", [data.employee_id, data.date]);

    if (res.rows.length > 0) {
        await update('attendance', res.rows[0].id, data);
    } else {
        await insert('attendance', data);
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
    return res.rows;
}

export async function createPayslip(data: Omit<Payslip, 'id' | 'generated_at'>): Promise<number> {
    return await insert('payslips', {
        ...data,
        deduction_details: JSON.stringify(data.deduction_details),
        allowance_details: JSON.stringify(data.allowance_details)
    });
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

