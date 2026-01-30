'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Employee');
    const [assignedBranch, setAssignedBranch] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role, assigned_branch: assignedBranch || null }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Panel: Branding (Hidden on mobile via globals.css) */}
            <div className="login-brand-section">
                <div className="login-brand-bg-image"></div>
            </div>

            {/* Right Panel: Registration Form */}
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
                        <p className="login-welcome-subtitle">Join our team - Managed by Melann Lending</p>
                    </div>

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ marginBottom: '1.5rem', color: 'var(--success-500)' }}>
                                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Registration Successful!</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                Your account has been created and is pending approval from the administrator.
                            </p>
                            <button
                                onClick={() => router.push('/')}
                                className="btn btn-primary login-button"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="form-error" style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '0.5rem', color: '#b91c1c' }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <div className="login-input-group">
                                <label className="form-label">Username</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder="Choose a username"
                                />
                            </div>

                            <div className="login-input-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="yourname@example.com"
                                />
                            </div>

                            <div className="login-input-group">
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Create a strong password"
                                        style={{ paddingRight: '45px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.25rem',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#64748b',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? '👁️‍🗨️' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <div className="login-input-group">
                                <label className="form-label">Desired Role</label>
                                <select
                                    className="form-select"
                                    value={role}
                                    onChange={(e) => {
                                        setRole(e.target.value);
                                        // Clear branch if switching to/from Super Admin
                                        if (e.target.value === 'President' || e.target.value === 'Vice President') {
                                            setAssignedBranch('');
                                        }
                                    }}
                                    required
                                >
                                    <option value="Employee">Employee</option>
                                    <option value="HR">HR Officer</option>
                                    <option value="President">President (Super Admin)</option>
                                    <option value="Vice President">Vice President (Super Admin)</option>
                                </select>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                    {role === 'HR' && '⚠️ HR role requires Super Admin approval'}
                                    {(role === 'President' || role === 'Vice President') && '⚠️ Super Admin roles require security review'}
                                    {role === 'Employee' && 'ℹ️ Employee role has limited system access'}
                                </p>
                            </div>

                            {/* Show Branch Dropdown only for HR and Employee roles */}
                            {(role === 'HR' || role === 'Employee') && (
                                <div className="login-input-group">
                                    <label className="form-label">
                                        Assigned Branch {role === 'HR' && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    <select
                                        className="form-select"
                                        value={assignedBranch}
                                        onChange={(e) => setAssignedBranch(e.target.value)}
                                        required={role === 'HR'}
                                    >
                                        <option value="">Select Branch</option>
                                        <option value="Naval">Naval Branch</option>
                                        <option value="Ormoc">Ormoc Branch</option>
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                        {role === 'HR' ? '⚠️ Required: You will only access employees from this branch' : 'ℹ️ Optional: Your home branch location'}
                                    </p>
                                </div>
                            )}

                            {/* Show message for Super Admin */}
                            {(role === 'President' || role === 'Vice President') && (
                                <div style={{
                                    padding: '1rem',
                                    background: '#fef3c7',
                                    borderRadius: '0.75rem',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.8125rem',
                                    color: '#92400e',
                                    border: '1px solid #fde68a'
                                }}>
                                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>👑 Super Admin Access</p>
                                    <p style={{ margin: 0 }}>Super Admins have access to ALL branches and ALL modules. This role requires security review and manual approval.</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                                <label className="ios-switch">
                                    <input
                                        type="checkbox"
                                        checked={showPasswordRequirements}
                                        onChange={(e) => setShowPasswordRequirements(e.target.checked)}
                                    />
                                    <span className="ios-slider"></span>
                                </label>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Show password requirements
                                </span>
                            </div>

                            {showPasswordRequirements && (
                                <div style={{
                                    padding: '1rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: '0.75rem',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Password must contain:</p>
                                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <li>At least 8 characters long</li>
                                        <li>At least one uppercase letter</li>
                                        <li>At least one number or special character</li>
                                    </ul>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary login-button"
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Already have an account?{' '}
                            <button
                                onClick={() => router.push('/')}
                                style={{
                                    color: 'var(--primary-600)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    padding: 0
                                }}
                            >
                                Sign in
                            </button>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            &copy; {new Date().getFullYear()} Melann Lending Investor Corp.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* iOS Style Toggle - Copied from Preview Component for local use */
                .ios-switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 22px;
                }

                .ios-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .ios-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #e2e8f0;
                    transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 34px;
                }

                .ios-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                input:checked + .ios-slider {
                    background-color: var(--primary-500);
                }

                input:checked + .ios-slider:before {
                    transform: translateX(18px);
                }
            `}</style>
        </div>
    );
}
