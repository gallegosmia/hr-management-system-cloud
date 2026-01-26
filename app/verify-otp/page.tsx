'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyOTPPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUsername = sessionStorage.getItem('resetUsername');
        const storedMaskedEmail = sessionStorage.getItem('maskedEmail');
        if (!storedUsername) {
            router.push('/forgot-password');
        } else {
            setUsername(storedUsername);
            setMaskedEmail(storedMaskedEmail || 'registered email');
        }
    }, [router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, otp }),
            });

            const data = await response.json();

            if (response.ok) {
                // Keep username for the reset step
                sessionStorage.setItem('resetOTP', otp);
                router.push('/reset-password');
            } else {
                setError(data.error || 'Verification failed');
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
                        <span style={{ fontSize: '2.5rem' }}>📧</span>
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        fontFamily: 'Poppins, sans-serif'
                    }}>
                        Verify OTP
                    </h1>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        Enter the 6-digit code sent to<br /><strong style={{ color: '#ecfdf5' }}>{maskedEmail}</strong>
                    </p>
                </div>

                <div style={{ padding: '2rem' }}>
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
                                Security Code
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                placeholder="000000"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    fontSize: '1.5rem',
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    transition: 'all 150ms',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: 'white',
                                background: (loading || otp.length !== 6) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                                transition: 'all 150ms'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify & Continue'}
                        </button>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => router.push('/forgot-password')}
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Incorrect account? Go back
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
