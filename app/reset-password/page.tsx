'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const storedUsername = sessionStorage.getItem('resetUsername');
        const storedOTP = sessionStorage.getItem('resetOTP');
        if (!storedUsername || !storedOTP) {
            router.push('/forgot-password');
        } else {
            setUsername(storedUsername);
            setOtp(storedOTP);
        }
    }, [router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, otp, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                sessionStorage.removeItem('resetUsername');
                sessionStorage.removeItem('resetOTP');
                sessionStorage.removeItem('maskedEmail');
            } else {
                setError(data.error || 'Reset failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)',
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '450px',
                overflow: 'hidden'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1rem',
                        background: 'white',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                    }}>
                        <span style={{ fontSize: '2.5rem' }}>🔄</span>
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        fontFamily: 'Poppins, sans-serif'
                    }}>
                        Reset Password
                    </h1>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        Create a new secure password for <strong>{username}</strong>
                    </p>
                </div>

                <div style={{ padding: '2rem' }}>
                    {success ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#059669', fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Success!</h2>
                            <p style={{ color: '#4b5563', marginBottom: '2rem' }}>Your password has been updated. You can now log in.</p>
                            <button
                                onClick={() => router.push('/')}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #059669, #10b981)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    marginBottom: '0.5rem'
                                }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="At least 6 characters"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        fontSize: '0.875rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        transition: 'all 150ms'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    marginBottom: '0.5rem'
                                }}>
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Repeat your new password"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        fontSize: '0.875rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        transition: 'all 150ms'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: 'white',
                                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 150ms'
                                }}
                            >
                                {loading ? 'Updating...' : 'Set New Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
