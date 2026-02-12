import {
    hashPassword,
    verifyPassword,
    hasPermission,
    createSession,
    getSession,
    deleteSession,
    updateSessionBranch
} from '@/lib/auth';
import { query } from '@/lib/database';

// Mock database
jest.mock('@/lib/database', () => ({
    query: jest.fn(),
    getAll: jest.fn(),
    insert: jest.fn(),
    remove: jest.fn()
}));

describe('Auth Utilities', () => {
    describe('Password Hashing', () => {
        it('should hash a password and verify it correctly', () => {
            const password = 'test-password';
            const hash = hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(verifyPassword(password, hash)).toBe(true);
            expect(verifyPassword('wrong-password', hash)).toBe(false);
        });
    });

    describe('Permissions', () => {
        it('should grant Admin all permissions', () => {
            expect(hasPermission('Admin', 'create')).toBe(true);
            expect(hasPermission('Admin', 'delete')).toBe(true);
            expect(hasPermission('Admin', 'manage_users')).toBe(true);
        });

        it('should restrict Employee permissions', () => {
            expect(hasPermission('Employee', 'read')).toBe(true);
            expect(hasPermission('Employee', 'delete')).toBe(false);
            expect(hasPermission('Employee', 'manage_users')).toBe(false);
        });

        it('should grant HR specific permissions', () => {
            expect(hasPermission('HR', 'create')).toBe(true);
            expect(hasPermission('HR', 'delete')).toBe(true);
            expect(hasPermission('HR', 'manage_users')).toBe(false);
        });

        it('should handle unlisted roles or actions gracefully', () => {
            expect(hasPermission('UnknownRole', 'read')).toBe(false);
            expect(hasPermission('Admin', 'unknownAction')).toBe(false);
        });
    });

    describe('Session Management', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('createSession should generate ID and store in DB', async () => {
            const user: any = { id: 1, role: 'HR', assigned_branch: 'Naval' };
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const sessionId = await createSession(user);

            expect(sessionId).toHaveLength(32);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO sessions'),
                expect.arrayContaining([sessionId, 1, 'Naval'])
            );
        });

        it('getSession should return null if session not found', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Session query

            const result = await getSession('invalid-id');
            expect(result).toBeNull();
        });

        it('getSession should return null and delete if expired', async () => {
            const expiredDate = new Date(Date.now() - 10000).toISOString();
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 'sess-1', user_id: 1, expires_at: expiredDate }]
            });

            const result = await getSession('sess-1');

            expect(result).toBeNull();
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM sessions'),
                ['sess-1']
            );
        });

        it('getSession should return user and session data if valid', async () => {
            const futureDate = new Date(Date.now() + 10000).toISOString();
            // Mock session query
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 'sess-1', user_id: 1, expires_at: futureDate, selected_branch: 'Naval' }]
            });
            // Mock user query
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 1, username: 'testuser', role: 'HR', assigned_branch: 'Naval' }]
            });

            const result = await getSession('sess-1');

            expect(result).not.toBeNull();
            expect(result?.user.username).toBe('testuser');
            expect(result?.selectedBranch).toBe('Naval');
        });

        it('deleteSession should remove from DB', async () => {
            await deleteSession('sess-1');
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM sessions'),
                ['sess-1']
            );
        });

        it('updateSessionBranch should update DB', async () => {
            await updateSessionBranch('sess-1', 'Ormoc');
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE sessions'),
                ['Ormoc', 'sess-1']
            );
        });
    });
});
