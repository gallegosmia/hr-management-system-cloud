import { hashPassword, verifyPassword, hasPermission } from '@/lib/auth';

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

        it('should handle unlisted roles or actions gracefully', () => {
            expect(hasPermission('UnknownRole', 'read')).toBe(false);
            expect(hasPermission('Admin', 'unknownAction')).toBe(false);
        });
    });
});
