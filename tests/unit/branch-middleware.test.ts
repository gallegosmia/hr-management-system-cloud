
/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
import { validateBranchRequest, requireBranchAuth, canModifyBranchData } from '@/lib/middleware/branch-auth';
import { getSession } from '@/lib/auth';
import { validateBranchAccess, logAccessAttempt, isSuperAdmin, normalizeBranchName } from '@/lib/branch-access';

jest.mock('@/lib/auth', () => ({
    getSession: jest.fn()
}));

jest.mock('@/lib/branch-access', () => ({
    validateBranchAccess: jest.fn(),
    logAccessAttempt: jest.fn(),
    getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    isSuperAdmin: jest.fn(),
    normalizeBranchName: jest.fn((name) => name ? name.toUpperCase() : '')
}));

describe('Branch Auth Middleware', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateBranchRequest', () => {
        it('should return 401 if no session ID provided', async () => {
            const req = new NextRequest('http://localhost/api/test');
            const result = await validateBranchRequest(req);
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe(401);
        });

        it('should return 401 if session invalid', async () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'x-session-id': 'invalid' }
            });
            (getSession as jest.Mock).mockResolvedValue(null);

            const result = await validateBranchRequest(req);
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe(401);
        });

        it('should enforce strict branch for non-SuperAdmin', async () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'x-session-id': 'valid' }
            });
            const session = {
                user: { id: 1, role: 'HR', assigned_branch: 'Naval' },
                selectedBranch: 'Ormoc' // Attempting to use Ormoc context
            };
            (getSession as jest.Mock).mockResolvedValue(session);
            (isSuperAdmin as jest.Mock).mockReturnValue(false);

            // Mock validateBranchAccess to fail (mismatch)
            (validateBranchAccess as jest.Mock).mockReturnValue({ allowed: false, reason: 'Mismatch' });

            const result = await validateBranchRequest(req, 'Ormoc'); // Required branch

            expect(result.valid).toBe(false);
        });

        it('should allow valid access', async () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'x-session-id': 'valid' }
            });
            const session = {
                user: { id: 1, role: 'HR', assigned_branch: 'Naval' },
                selectedBranch: 'Naval'
            };
            (getSession as jest.Mock).mockResolvedValue(session);
            (isSuperAdmin as jest.Mock).mockReturnValue(false);
            (validateBranchAccess as jest.Mock).mockReturnValue({ allowed: true });

            const result = await validateBranchRequest(req, 'Naval');

            expect(result.valid).toBe(true);
            expect(result.selectedBranch).toBe('Naval');
        });
    });

    describe('canModifyBranchData', () => {
        it('should allow Super Admin to modify any branch', async () => {
            const req = new NextRequest('http://localhost/api/test', { headers: { 'x-session-id': 'super' } });
            (getSession as jest.Mock).mockResolvedValue({
                user: { id: 99, role: 'President' },
                selectedBranch: 'All'
            });
            (isSuperAdmin as jest.Mock).mockReturnValue(true);

            const result = await canModifyBranchData(req, 'Ormoc');
            expect(result.valid).toBe(true);
        });

        it('should deny Regular User modifying different branch', async () => {
            const req = new NextRequest('http://localhost/api/test', { headers: { 'x-session-id': 'hr' } });
            (getSession as jest.Mock).mockResolvedValue({
                user: { id: 1, role: 'HR', assigned_branch: 'Naval' },
                selectedBranch: 'Naval'
            });
            (isSuperAdmin as jest.Mock).mockReturnValue(false);

            const result = await canModifyBranchData(req, 'Ormoc');
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe(403);
            expect(logAccessAttempt).toHaveBeenCalledWith(expect.objectContaining({ status: 'DENIED' }));
        });
    });
});
