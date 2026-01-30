import { NextRequest, NextResponse } from 'next/server';
import { getBranches } from '@/lib/data';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { getAccessibleBranches } from '@/lib/branch-access';

export async function GET(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }
        const { user } = validation;

        const allBranches = await getBranches();
        const accessibleBranches = getAccessibleBranches(user!.role, user!.assigned_branch, allBranches);

        return NextResponse.json(accessibleBranches);
    } catch (error) {
        console.error('Get branches error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches' },
            { status: 500 }
        );
    }
}
