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

    if (status === 'This account is not linked to an employee record. Please contact HR.') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#f8fafc',
                gap: '1.5rem',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#fee2e2',
                    color: '#ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px'
                }}>⚠️</div>
                <h2 style={{ color: '#1e293b', fontWeight: 700, fontSize: '1.5rem' }}>Account Not Linked</h2>
                <p style={{ color: '#64748b', maxWidth: '400px' }}>{status}</p>
                <button 
                    onClick={() => {
                        localStorage.removeItem('sessionId');
                        localStorage.removeItem('user');
                        router.push('/');
                    }}
                    style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Return to Login
                </button>
            </div>
        );
    }

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
