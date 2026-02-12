
import {
    normalizeBranchName,
    isSuperAdmin,
    isHR,
    isEmployee,
    isHRApproved,
    canAccessHRModules,
    canAccessBranch,
    validateBranchAccess,
    filterByBranch,
    canModifyBranch,
    getAccessibleBranches
} from '../../lib/branch-access';

// Mock database query
jest.mock('../../lib/database', () => ({
    query: jest.fn()
}));

describe('Branch Access Control Library', () => {

    describe('normalizeBranchName', () => {
        it('should normalize branch names correctly', () => {
            expect(normalizeBranchName('Naval')).toBe('NAVAL');
            expect(normalizeBranchName('naval')).toBe('NAVAL');
            expect(normalizeBranchName('Naval Branch')).toBe('NAVAL');
            expect(normalizeBranchName(' Naval Branch ')).toBe('NAVAL');
            expect(normalizeBranchName('HeAd OfFiCe')).toBe('HEAD OFFICE');
        });

        it('should handle empty or null inputs', () => {
            expect(normalizeBranchName('')).toBe('');
            expect(normalizeBranchName(null)).toBe('');
            expect(normalizeBranchName(undefined)).toBe('');
        });
    });

    describe('Role Checks', () => {
        it('isSuperAdmin should return true for President and Vice President', () => {
            expect(isSuperAdmin('President')).toBe(true);
            expect(isSuperAdmin('Vice President')).toBe(true);
            expect(isSuperAdmin('HR')).toBe(false);
            expect(isSuperAdmin('Employee')).toBe(false);
        });

        it('isHR should return true for HR', () => {
            expect(isHR('HR')).toBe(true);
            expect(isHR('President')).toBe(false);
        });

        it('isEmployee should return true for Employee', () => {
            expect(isEmployee('Employee')).toBe(true);
            expect(isEmployee('HR')).toBe(false);
        });
    });

    describe('HR Approval Logic', () => {
        it('isHRApproved should return true for non-HR users', () => {
            expect(isHRApproved({ role: 'Employee' })).toBe(true);
            expect(isHRApproved({ role: 'President' })).toBe(true);
        });

        it('isHRApproved should check status for HR users', () => {
            expect(isHRApproved({ role: 'HR', hr_approval_status: 'APPROVED' })).toBe(true);
            expect(isHRApproved({ role: 'HR', hr_approval_status: 'PENDING' })).toBe(false);
            expect(isHRApproved({ role: 'HR', hr_approval_status: 'REJECTED' })).toBe(false);
            expect(isHRApproved({ role: 'HR' })).toBe(false); // Undefined status
        });

        it('canAccessHRModules should logic correctly', () => {
            // Super Admin always access
            expect(canAccessHRModules({ role: 'President' })).toBe(true);

            // HR needs approval
            expect(canAccessHRModules({ role: 'HR', hr_approval_status: 'APPROVED' })).toBe(true);
            expect(canAccessHRModules({ role: 'HR', hr_approval_status: 'PENDING' })).toBe(false);

            // Employee never access
            expect(canAccessHRModules({ role: 'Employee' })).toBe(false);
        });
    });

    describe('Branch Access Logic', () => {
        it('canAccessBranch should allow Super Admins everywhere', () => {
            expect(canAccessBranch('President', 'Naval', 'Ormoc')).toBe(true);
        });

        it('canAccessBranch should restrict Regular Users to assigned branch', () => {
            expect(canAccessBranch('HR', 'Naval', 'Naval')).toBe(true);
            expect(canAccessBranch('HR', 'Naval', 'Ormoc')).toBe(false);
            expect(canAccessBranch('Employee', 'Head Office', 'Head Office')).toBe(true);
        });

        it('canAccessBranch should handle normalization', () => {
            expect(canAccessBranch('HR', 'Naval Branch', 'Naval')).toBe(true);
        });

        it('canAccessBranch should deny if user has no branch', () => {
            expect(canAccessBranch('HR', undefined, 'Naval')).toBe(false);
        });
    });

    describe('validateBranchAccess', () => {
        it('should allow Super Admin always', () => {
            const result = validateBranchAccess('President', 'Naval', 'Ormoc', 'Anywhere');
            expect(result.allowed).toBe(true);
        });

        it('should validate session and user branch match', () => {
            const result = validateBranchAccess('HR', 'Naval', 'Ormoc', 'Naval');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('does not match user assigned branch');
        });

        it('should validate data branch matches session branch', () => {
            // User assigned Naval, Session Naval, accessing Ormoc data
            const result = validateBranchAccess('HR', 'Naval', 'Naval', 'Ormoc');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Data belongs to Ormoc');
        });

        it('should allow valid access', () => {
            const result = validateBranchAccess('HR', 'Naval', 'Naval', 'Naval');
            expect(result.allowed).toBe(true);
        });
    });

    describe('filterByBranch', () => {
        const items = [
            { id: 1, branch: 'Naval' },
            { id: 2, branch: 'Ormoc' },
            { id: 3, branch: 'Head Office' }
        ];

        it('should return all items for Super Admin selecting All', () => {
            const result = filterByBranch(items, 'President', 'All');
            expect(result).toHaveLength(3);
        });

        it('should filter items for Regular User', () => {
            const result = filterByBranch(items, 'HR', 'Naval');
            expect(result).toHaveLength(1);
            expect(result[0].branch).toBe('Naval');
        });

        it('should handle empty or null branch for Regular User', () => {
            const result = filterByBranch(items, 'HR', null);
            expect(result).toHaveLength(0);
        });
    });

    describe('canModifyBranch', () => {
        it('should allow Super Admin to modify any branch', () => {
            expect(canModifyBranch('President', 'Naval', 'Ormoc').allowed).toBe(true);
        });

        it('should restrict Regular User to assigned branch', () => {
            expect(canModifyBranch('HR', 'Naval', 'Naval').allowed).toBe(true);
            expect(canModifyBranch('HR', 'Naval', 'Ormoc').allowed).toBe(false);
        });
    });

    describe('getAccessibleBranches', () => {
        const allBranches = ['Naval', 'Ormoc', 'Head Office'];

        it('should return all branches for Super Admin', () => {
            const result = getAccessibleBranches('President', 'Naval', allBranches);
            expect(result).toEqual(allBranches);
        });

        it('should return only assigned branch for Regular User', () => {
            const result = getAccessibleBranches('HR', 'Naval', allBranches);
            expect(result).toEqual(['Naval']);
        });
    });

});
