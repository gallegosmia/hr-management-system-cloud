'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store session
                localStorage.setItem('sessionId', data.sessionId);
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Panel: Branding */}
            <div className="login-brand-section">
                <div className="login-brand-bg-image"></div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="login-form-section">
                <div className="login-form-wrapper">
                    <div className="login-header">
                        <div className="login-logo-container">
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'white',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="10" y="50" width="20" height="40" rx="4" fill="#8B2635" />
                                    <rect x="40" y="30" width="20" height="60" rx="4" fill="#D2691E" />
                                    <rect x="70" y="10" width="20" height="80" rx="4" fill="#E74C3C" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="login-welcome-title">Melann HR Management System</h2>
                        <p className="login-welcome-subtitle">Managed by Melann Lending Investor Corp.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="form-error" style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '0.5rem', color: '#b91c1c' }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="login-input-group">
                            <label className="form-label" htmlFor="username">Username or Email</label>
                            <input
                                id="username"
                                type="text"
                                className="form-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter your username"
                                style={{ paddingRight: '1rem' }}
                            />
                        </div>

                        <div className="login-input-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                                style={{ paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setIsForgotModalOpen(true)}
                                style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--primary-600)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-button"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Don't have an account?{' '}
                            <button
                                onClick={() => router.push('/register')}
                                style={{
                                    color: 'var(--primary-600)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    padding: 0
                                }}
                            >
                                Create Account
                            </button>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            &copy; {new Date().getFullYear()} Melann Lending Investor Corp.
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isForgotModalOpen}
                onClose={() => setIsForgotModalOpen(false)}
                title="Forgot Password"
                message="Password reset is handled by the administrator. Please contact your administrator to change your password."
            />
        </div>
    );
}
