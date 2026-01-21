import { batchRecordAttendance } from '@/lib/data';
import * as database from '@/lib/database';

// Mock the database query function
jest.mock('@/lib/database', () => ({
    query: jest.fn(),
    isPostgres: true,
    // Include other exports if needed by lib/data
    getAll: jest.fn(),
    getById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    resetTableSequence: jest.fn()
}));

describe('Attendance Batch Saving Performance Optimization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call database.query exactly once for multiple attendance records when in Postgres mode', async () => {
        const mockRecords = [
            { employee_id: 1, date: '2026-01-21', status: 'Present', time_in: '08:00', time_out: '17:00' },
            { employee_id: 2, date: '2026-01-21', status: 'Late', time_in: '08:30', time_out: '17:00' },
            { employee_id: 3, date: '2026-01-21', status: 'Absent' }
        ];

        await batchRecordAttendance(mockRecords);

        // Verification: Ensure query was called ONLY ONCE
        expect(database.query).toHaveBeenCalledTimes(1);

        // Check if the SQL contains the batch INSERT and the EXCLUDED keyword used in UPSERT
        const [sql, params] = (database.query as jest.Mock).mock.calls[0];

        expect(sql).toContain('INSERT INTO attendance');
        expect(sql).toContain('ON CONFLICT (employee_id, date)');
        expect(sql).toContain('DO UPDATE SET');
        expect(sql).toContain('EXCLUDED.status');

        // Verify we have the correct number of placeholders ($1 to $18 for 3 records with 6 cols each)
        expect(params).toHaveLength(mockRecords.length * 6);
        expect(params[0]).toBe(1); // First employee_id
        expect(params[5]).toBe(null); // First remarks
        expect(params[6]).toBe(2); // Second employee_id
    });

    it('should not call database.query if the records array is empty', async () => {
        await batchRecordAttendance([]);
        expect(database.query).not.toHaveBeenCalled();
    });
});
