'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface LayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const userData = localStorage.getItem('user');

            if (!sessionId || !userData || userData === 'undefined' || userData === 'null') {
                console.log('No session found, redirecting to login');
                router.push('/');
                return;
            }

            const parsedUser = JSON.parse(userData);
            if (!parsedUser) {
                console.log('Invalid user data, redirecting to login');
                router.push('/');
                return;
            }

            setUser(parsedUser);
        } catch (error) {
            console.error('Session check error:', error);
            router.push('/');
        }
    }, [router]);

    const handleLogout = async () => {
        const sessionId = localStorage.getItem('sessionId');

        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });

        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        router.push('/');
    };

    if (!user) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--primary-200)',
                        borderTopColor: 'var(--primary-600)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President', 'Employee'] },
        { name: '201 Files', href: '/employees', icon: '📋', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Compensation & Benefits', href: '/compensation', icon: '💰', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Attendance', href: '/attendance', icon: '⏰', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Leave Requests', href: '/leave', icon: '🏖️', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President', 'Employee'] },
        { name: 'Payroll', href: '/payroll', icon: '🧾', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Employee Bonuses', href: '/bonuses', icon: '🎁', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Transportation Allowance', href: '/transportation', icon: '🚗', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Reports', href: '/reports', icon: '📈', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
        { name: 'Settings', href: '/settings', icon: '⚙️', roles: ['Admin', 'HR', 'Manager', 'President', 'Vice President'] },
    ];

    const filteredNavigation = navigation.filter(item =>
        item.roles.includes(user.role)
    );

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon" style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="50" width="20" height="40" rx="4" fill="#8B2635" />
                                <rect x="40" y="30" width="20" height="60" rx="4" fill="#D2691E" />
                                <rect x="70" y="10" width="20" height="80" rx="4" fill="#E74C3C" />
                            </svg>
                        </div>
                        <span>Melann Lending Investor</span>
                    </div>
                </div>

                <nav>
                    <ul className="sidebar-nav">
                        {filteredNavigation.map((item) => (
                            <li key={item.name} className="sidebar-nav-item">
                                <Link
                                    href={item.href}
                                    className={`sidebar-nav-link ${pathname === item.href ? 'active' : ''}`}
                                >
                                    <span className="sidebar-nav-icon">{item.icon}</span>
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div style={{
                    marginTop: 'auto',
                    padding: 'var(--spacing-lg)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <button
                        onClick={handleLogout}
                        className="sidebar-nav-link"
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}
                    >
                        <span className="sidebar-nav-icon">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Bar */}
                <header className="topbar">
                    <div className="topbar-left">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="btn btn-icon btn-secondary"
                            style={{ marginRight: 'var(--spacing-md)', display: 'none' }}
                            id="mobile-menu-btn"
                        >
                            ☰
                        </button>
                        <h1 className="topbar-title">
                            {navigation.find(item => item.href === pathname)?.name || 'HR Management'}
                        </h1>
                    </div>

                    <div className="topbar-right">
                        <div className="user-menu">
                            <div className="user-avatar">
                                {user.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{user.username}</div>
                                <div className="user-role">{user.role}</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="content-area">
                    {children}
                </main>
            </div>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          #mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
        </div>
    );
}
