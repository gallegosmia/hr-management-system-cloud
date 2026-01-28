'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default function ProfilePage() {
    const router = useRouter();
    const [status, setStatus] = useState('Identifying account...');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.employee_id) {
                    setStatus(`Mapping profile for ${user.username}...`);
                    router.push(`/employees/${user.employee_id}`);
                } else {
                    setStatus('This account is not linked to an employee record. Please contact HR.');
                }
            } catch (e) {
                console.error("Failed to parse user data", e);
                router.push('/');
            }
        } else {
            router.push('/');
        }
    }, [router]);

    return (
        <DashboardLayout>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                gap: '1.5rem',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #f3f4f6',
                    borderTopColor: '#10b981',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <h2 style={{ color: '#064e3b', fontWeight: 700 }}>{status}</h2>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
