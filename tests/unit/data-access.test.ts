
import {
    getAllEmployees,
    getEmployeeById,
    getEmployeeByEmployeeId,
    getNextEmployeeId,
    createEmployee,
    calculateCompletionStatus,
    getLeaveSettings
} from '@/lib/data';
import { getAll, getById, query, insert } from '@/lib/database';

jest.mock('@/lib/database', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    query: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
}));

const mockEmployee = {
    id: 1,
    employee_id: '2024-0001',
    first_name: 'John',
    last_name: 'Doe',
    department: 'IT',
    position: 'Developer',
    branch: 'Naval',
    employment_status: 'Regular',
    date_hired: '2024-01-01',
    personal_info_complete: 1,
    preemployment_req_complete: 1,
    government_docs_complete: 1,
    employment_records_complete: 1,
    attendance_records_complete: 1,
    payroll_records_complete: 1,
    disciplinary_records: 0,
    training_records: 0,
    separation_records: 0,
    file_completion_status: 'Complete',
    last_updated: '2024-01-01',
    salary_info: {
        basic_salary: 20000,
        allowances: { special: 1000 },
        daily_rate: 1000,
        hourly_rate: 125,
        pay_frequency: 'Semi-Monthly',
        deductions: {}
    }
};

describe('Data Access Layer', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateCompletionStatus', () => {
        it('should return Complete when all required fields are 1', () => {
            const emp = { ...mockEmployee } as any;
            expect(calculateCompletionStatus(emp)).toBe('Complete');
        });

        it('should return Incomplete when all required fields are 0', () => {
            const emp = {
                ...mockEmployee,
                personal_info_complete: 0,
                preemployment_req_complete: 0,
                government_docs_complete: 0,
                employment_records_complete: 0,
                attendance_records_complete: 0,
                payroll_records_complete: 0
            } as any;
            expect(calculateCompletionStatus(emp)).toBe('Incomplete');
        });

        it('should return Partial when some fields are 1 and some 0', () => {
            const emp = {
                ...mockEmployee,
                personal_info_complete: 1,
                preemployment_req_complete: 0
            } as any;
            expect(calculateCompletionStatus(emp)).toBe('Partial');
        });
    });

    describe('Employee Retrieval', () => {
        it('getAllEmployees should return sorted employees', async () => {
            const employees = [
                { ...mockEmployee, first_name: 'Zack', last_name: 'Zane' },
                { ...mockEmployee, first_name: 'Adam', last_name: 'Ant' }
            ];
            (getAll as jest.Mock).mockResolvedValue(employees);

            const result = await getAllEmployees();

            expect(result).toHaveLength(2);
            expect(result[0].first_name).toBe('Adam'); // Sorted by name
            expect(getAll).toHaveBeenCalledWith('employees');
        });

        it('getEmployeeById should return employee', async () => {
            (getById as jest.Mock).mockResolvedValue(mockEmployee);
            const result = await getEmployeeById(1);
            expect(result).toEqual(mockEmployee);
        });

        it('getEmployeeByEmployeeId should query by employee_id', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockEmployee] });
            const result = await getEmployeeByEmployeeId('2024-0001');
            expect(result).toEqual(mockEmployee);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE employee_id = $1'),
                ['2024-0001']
            );
        });
    });

    describe('ID Generation', () => {
        it('getNextEmployeeId should start at 0001 for new year', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const year = new Date().getFullYear().toString();
            const result = await getNextEmployeeId();
            expect(result).toBe(`${year}-0001`);
        });

        it('getNextEmployeeId should increment from max ID', async () => {
            // Mock returning existing IDs
            (query as jest.Mock).mockResolvedValue({
                rows: [{ employee_id: '2024-0005' }, { employee_id: '2024-0010' }]
            });
            const result = await getNextEmployeeId('2024');
            // Logic finds max (10) and adds 1 -> 0011
            expect(result).toBe('2024-0011');
        });
    });

    describe('Create Employee', () => {
        it('should generate ID and insert employee', async () => {
            // Mock ID generation query (no existing)
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            // Mock Insert return
            (insert as jest.Mock).mockResolvedValue(123);

            const formData: any = {
                first_name: 'New',
                last_name: 'User',
                date_hired: '2025-01-01',
                department: 'IT',
                position: 'Dev',
                employment_status: 'Probationary'
            };

            const newId = await createEmployee(formData, 1);

            expect(newId).toBe(123);
            expect(insert).toHaveBeenCalledWith('employees', expect.objectContaining({
                employee_id: '2025-0001',
                file_completion_status: 'Incomplete'
            }));
        });
    });

    describe('Settings', () => {
        it('getLeaveSettings should return default if not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const result = await getLeaveSettings();
            expect(result.payroll_cutoff_day).toBe(15);
        });

        it('getLeaveSettings should return stored settings', async () => {
            const stored = { payroll_cutoff_day: 20, filing_cutoff_days: 5, approval_levels: { level1_enabled: true } };
            (query as jest.Mock).mockResolvedValue({ rows: [{ value: stored }] });
            const result = await getLeaveSettings();
            expect(result.payroll_cutoff_day).toBe(20);
        });
    });
});
