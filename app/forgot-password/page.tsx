'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store username (returned from server) and masked email
                sessionStorage.setItem('resetUsername', data.username);
                sessionStorage.setItem('maskedEmail', data.maskedEmail);
                router.push('/verify-otp');
            } else {
                setError(data.error || 'Failed to process request');
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
                {/* Header */}
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
                        <span style={{ fontSize: '2.5rem' }}>🔐</span>
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        fontFamily: 'Poppins, sans-serif'
                    }}>
                        Forgot Password
                    </h1>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        Enter the username or email you used during registration
                    </p>
                </div>

                {/* Form */}
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
                                Username or Email
                            </label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                placeholder="Username or email used at registration"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    fontSize: '0.875rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    transition: 'all 150ms',
                                    fontFamily: 'Inter, sans-serif'
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
                                transition: 'all 150ms',
                                fontFamily: 'Inter, sans-serif',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            {loading ? 'Processing...' : 'Verify Identity'}
                        </button>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
