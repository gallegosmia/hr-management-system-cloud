'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UserManagementSystem from '@/components/UserManagementSystem';

export default function UserManagementPage() {
    return (
        <DashboardLayout>
            <div style={{ padding: '20px' }}>
                <UserManagementSystem />
            </div>
        </DashboardLayout>
    );
}
