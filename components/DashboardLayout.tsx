'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';
import MobileBottomNav from './MobileBottomNav';

interface LayoutProps {
    children: ReactNode;
    hideSidebar?: boolean;
    hideNavbar?: boolean;
}

export default function DashboardLayout({ children, hideSidebar = false, hideNavbar = false }: LayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('Preparing system...');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoadingStatus('Checking session...');
        try {
            const sessionId = localStorage.getItem('sessionId');
            const userData = localStorage.getItem('user');
            const savedBranch = localStorage.getItem('selectedBranch');

            if (!sessionId || !userData || userData === 'undefined' || userData === 'null') {
                setLoadingStatus('No active session. Redirecting...');
                router.push('/');
                return;
            }

            const parsedUser = JSON.parse(userData);
            if (!parsedUser) {
                setLoadingStatus('Invalid session. Redirecting...');
                router.push('/');
                return;
            }

            setLoadingStatus('Welcome, ' + parsedUser.username);
            setUser(parsedUser);

            // STRICT BRANCH ENFORCEMENT
            const isSuper = parsedUser.username === 'superadmin' || parsedUser.role === 'President' || parsedUser.role === 'Vice President';

            if (!isSuper && parsedUser.role === 'HR') {
                // Force strict assignment
                const forced = parsedUser.assigned_branch || 'Head Office';
                setSelectedBranch(forced);
                localStorage.setItem('selectedBranch', forced);
            } else {
                // Normal logic for Super Users
                if (savedBranch) {
                    setSelectedBranch(savedBranch);
                } else {
                    setSelectedBranch(isSuper ? 'All' : (parsedUser.assigned_branch || 'All'));
                }
            }
        } catch (error) {
            console.error('Session error:', error);
            setLoadingStatus('Session error. Redirecting...');
            router.push('/');
        }
    }, [router]);

    const handleBranchChange = async (branch: string) => {
        setIsUpdatingBranch(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/auth/branch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({ branch })
            });

            if (response.ok) {
                setSelectedBranch(branch);
                localStorage.setItem('selectedBranch', branch);
                // Refresh data by reloading or notifying children
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to update branch:', error);
        } finally {
            setIsUpdatingBranch(false);
        }
    };

    const isAuthorizedForBranchSwitch = user?.role === 'HR' ||
        user?.role === 'President' ||
        user?.role === 'Vice President' ||
        user?.username === 'superadmin';

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

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        const timer = setTimeout(async () => {
            if (trimmedQuery.length > 1) {
                setIsSearching(true);
                try {
                    const sessionId = localStorage.getItem('sessionId');
                    const res = await fetch(`/api/employees?search=${encodeURIComponent(trimmedQuery)}`, {
                        headers: { 'x-session-id': sessionId || '' }
                    });
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setSearchResults(data.slice(0, 5));
                    } else {
                        setSearchResults([]);
                    }
                } catch (error) {
                    console.error("Search error:", error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '1rem'
                }}></div>
                <div style={{ color: '#64748b', fontWeight: 600 }}>{loadingStatus}</div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'My Profile', href: '/profile', icon: '👤', roles: ['Employee', 'HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'TRACKER', href: '/tracker', icon: '🛰️', roles: ['Employee'] },
        { name: '201 Files', href: '/employees', icon: '📋', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Attendance', href: '/attendance', icon: '⏰', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Leave Requests', href: '/leave', icon: '🏖️', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Emergency Loans', href: '/loans', icon: '💰', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Employee Bonuses', href: '/bonuses', icon: '🎁', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Payroll', href: '/payroll', icon: '💰', roles: ['HR', 'President', 'Vice President', 'Admin', 'Finance', 'Operations Manager', 'Manager'] },
        { name: 'Gov Contributions', href: '/gov-contributions', icon: '🏛️', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Transportation Allowance', href: '/transportation', icon: '🚗', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Reports', href: '/reports', icon: '📈', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Memos & Announcements', href: '/announcements', icon: '📢', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Kiosk Scanner', href: '/attendance/kiosk', icon: '📱', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Settings', href: '/settings', icon: '⚙️', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'User Management', href: '/users', icon: '👥', roles: ['President', 'Vice President', 'Admin'] },
    ];

    const filteredNavigation = navigation.filter(item => {
        // User Management is ONLY for superadmin account
        if (item.name === 'User Management') {
            return user.username === 'superadmin';
        }

        // Hide My Profile and TRACKER for superadmin, President, and VP
        if (item.name === 'My Profile' || item.name === 'TRACKER') {
            if (user.username === 'superadmin' || user.role === 'President' || user.role === 'Vice President') {
                return false;
            }
        }

        // All other items filtered by role
        return item.roles.includes(user.role) || user.username === 'superadmin';
    });

    return (
        <div className="premium-dashboard-container">
            {/* Mobile Sidebar Backdrop */}
            {!hideSidebar && sidebarOpen && (
                <div
                    className="mobile-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            {!hideSidebar && (
                <aside className={`main-sidebar hr-pulse-sidebar${sidebarOpen ? ' sidebar-mobile-open' : ''}`} style={{ width: '260px', background: '#022c22', borderRight: '1px solid #064e3b', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>

                    {/* Branding */}
                    <div className="sidebar-branding" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '180px',
                            background: 'white',
                            borderRadius: '16px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
                        }}>
                            <img src="/images/logo.jpg" alt="Melann Lending" style={{ width: '100%', height: 'auto', borderRadius: '4px' }} />
                        </div>
                        <div style={{ color: '#6ee7b7', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '4px' }}>
                            HR MANAGEMENT SYSTEM
                        </div>
                    </div>

                    {/* Sidebar Search */}
                    <div className="sidebar-search" style={{ marginBottom: '24px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#34d399', opacity: 0.7 }}>🔍</div>
                        <input
                            type="text"
                            placeholder="Search menu..."
                            style={{
                                width: '100%',
                                background: 'rgba(6, 78, 59, 0.6)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                padding: '10px 10px 10px 36px',
                                borderRadius: '8px',
                                color: '#ecfdf5',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.background = 'rgba(6, 78, 59, 1)'}
                            onBlur={(e) => e.target.style.background = 'rgba(6, 78, 59, 0.6)'}
                        />
                    </div>

                    {/* Navigation */}
                    <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
                        <ul className="nav-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filteredNavigation.map((item, idx) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={idx} style={{ position: 'relative' }}>
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute', left: '-16px', top: '50%', transform: 'translateY(-50%)',
                                                width: '4px', height: '24px', background: 'white', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'
                                            }} />
                                        )}
                                        <Link href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}
                                            onClick={() => setSidebarOpen(false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                                color: isActive ? 'white' : '#d1fae5',
                                                fontWeight: isActive ? 600 : 500,
                                                marginBottom: '2px',
                                                borderLeft: isActive ? '4px solid transparent' : 'none'
                                            }}
                                        >
                                            <span className="nav-icon" style={{ marginRight: '12px', fontSize: '1.1rem', opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
                                            <span className="nav-label">{item.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* User Profile Footer */}
                    <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px',
                            background: '#064e3b',
                            borderRadius: '12px',
                            border: '1px solid #065f46'
                        }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: '#f8cfae', borderRadius: '50%', // Skin tone placeholder
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1rem', overflow: 'hidden'
                                }}>
                                    <img src={`https://ui-avatars.com/api/?name=${user?.username}&background=f8cfae&color=78350f`} alt="" style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: '10px', height: '10px',
                                    background: '#10b981',
                                    borderRadius: '50%',
                                    border: '2px solid #064e3b'
                                }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
                                <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{user?.role === 'superadmin' ? 'HR Administrator' : user?.role}</div>
                            </div>
                            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Logout">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </aside>
            )}


            {/* Main Area */}
            <main className="main-viewport" style={{ padding: hideSidebar ? 0 : '20px' }}>
                {/* Fixed Top Nav */}
                {!hideNavbar && (
                    <header className="premium-header glass-effect">
                        <div className="header-top-row">
                            <div className="header-left">
                                {/* Hamburger button - only visible on mobile */}
                                {!hideSidebar && (
                                    <button
                                        className="mobile-hamburger-btn"
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        aria-label="Toggle menu"
                                    >
                                        <span /><span /><span />
                                    </button>
                                )}
                                <div className="header-search-container" ref={searchRef}>
                                    <div className={`search-wrapper ${isSearchOpen ? 'open' : ''}`}>
                                        <button className="search-trigger" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                                            <span className="search-icon">🔍</span>
                                        </button>
                                        {isSearchOpen && (
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Search employees..."
                                                autoFocus
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && searchResults.length > 0) {
                                                        router.push(`/employees/${searchResults[0].id}`);
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Search Results Area - Moved inside ref to prevent premature closing */}
                                    {isSearchOpen && (searchQuery.length > 1 || isSearching) && (
                                        <div className="search-results-area glass-effect">
                                            <div className="search-results-inner">
                                                {isSearching ? (
                                                    <div className="search-status">Searching for "{searchQuery}"...</div>
                                                ) : searchResults.length > 0 ? (
                                                    <div className="results-list">
                                                        {searchResults.map((emp) => (
                                                            <Link
                                                                key={emp.id}
                                                                href={`/employees/${emp.id}`}
                                                                className="search-result-item"
                                                                onClick={() => {
                                                                    setIsSearchOpen(false);
                                                                    setSearchQuery('');
                                                                }}
                                                            >
                                                                <div className="result-main">
                                                                    <div className="result-avatar" style={{ overflow: 'hidden' }}>
                                                                        {emp.profile_picture ? (
                                                                            <img src={emp.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        ) : (
                                                                            <>{emp.first_name[0]}{emp.last_name[0]}</>
                                                                        )}
                                                                    </div>
                                                                    <div className="result-info">
                                                                        <div className="result-name-row">
                                                                            <span className="result-name">{emp.first_name} {emp.last_name}</span>
                                                                            <span className="result-id">#{emp.employee_id}</span>
                                                                        </div>
                                                                        <div className="result-meta">
                                                                            <span className="meta-pos">{emp.position}</span>
                                                                            <span className="meta-dot">•</span>
                                                                            <span className="meta-dept">{emp.department}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="result-actions">
                                                                    <span className={`status-badge ${emp.employment_status?.toLowerCase()}`}>
                                                                        {emp.employment_status || 'Active'}
                                                                    </span>
                                                                    <div className="view-feature-btn">
                                                                        View ↗
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="search-status">No employees found matching "{searchQuery.trim()}"</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="header-right">
                                {/* Branch Selector - Strict Logic */}
                                {user && (user.role === 'HR' || user.role === 'President' || user.role === 'Vice President' || user.username === 'superadmin') && (
                                    <div className="branch-context-selector">
                                        <div className="branch-label">Target Branch:</div>

                                        {(user.username === 'superadmin' || user.role === 'President' || user.role === 'Vice President') ? (
                                            <select
                                                className="nav-branch-select"
                                                value={selectedBranch}
                                                onChange={(e) => handleBranchChange(e.target.value)}
                                                disabled={isUpdatingBranch}
                                            >
                                                <option value="All">🌐 All Branches</option>
                                                <option value="Head Office">📍 Head Office</option>
                                                <option value="Naval">📍 Naval</option>
                                                <option value="Ormoc">📍 Ormoc</option>
                                            </select>
                                        ) : (
                                            <div className="branch-read-only">
                                                📍 {user.assigned_branch || 'Unassigned'}
                                                <span className="lock-icon">🔒</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="team-avatars">
                                    <div className="avatar-group">
                                        <div className="avatar-mini" style={{ background: '#f87171' }}>M</div>
                                        <div className="avatar-mini" style={{ background: '#60a5fa' }}>E</div>
                                        <div className="avatar-mini" style={{ background: '#fbbf24' }}>L</div>
                                        <div className="avatar-count">+8</div>
                                    </div>
                                </div>

                                <Link href="/employees/add" className="add-employee-btn">
                                    <span className="plus">+</span> Add Employee
                                </Link>

                                <div className="user-profile-widget">
                                    <div className="user-text">
                                        <span className="u-name">{user.username}</span>
                                    </div>
                                    <div className="u-avatar">
                                        {user.username.substring(0, 1).toUpperCase()}
                                    </div>
                                    <NotificationDropdown />
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Content */}
                <div className="scroll-content dashboard-content">
                    {children}
                </div>
            </main>

            <style jsx global>{`
                .premium-dashboard-container {
                    display: flex;
                    height: 100vh;
                    background: var(--dashboard-bg);
                    overflow: hidden;
                }

                .main-sidebar.original-sidebar {
                    width: 240px;
                    height: 100vh;
                    background: #022c22; /* Dark Emerald Green */
                    display: flex;
                    flex-direction: column;
                    z-index: 100;
                    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
                }

                .sidebar-branding {
                    padding: 24px 16px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .sidebar-logo-icon {
                    width: 40px;
                    height: 40px;
                    background: white;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    flex-shrink: 0;
                }

                .sidebar-text-brand {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.1;
                }

                .brand-line {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: white;
                    font-family: var(--font-display);
                }
/* ... */
                .main-viewport {
                    flex: 1;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                }

                .premium-header {
                    min-height: 60px;
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 12px;
                    transition: height 0.3s ease;
                    position: relative;
                    z-index: 2000;
                    overflow: visible; /* Prevent clipping of dropdowns/badges */
                }

                .header-top-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }

                /* Mobile Layout Upgrades */
                .mobile-hamburger-btn {
                    display: none;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .mobile-hamburger-btn span {
                    display: block;
                    width: 24px;
                    height: 2px;
                    background-color: #1e293b;
                    border-radius: 2px;
                }
                .mobile-sidebar-backdrop {
                    display: none;
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 900;
                    backdrop-filter: blur(2px);
                }

                @media (max-width: 1024px) {
                    .mobile-hamburger-btn {
                        display: flex;
                    }
                    .main-sidebar {
                        position: fixed;
                        top: 0;
                        left: -260px;
                        height: 100vh;
                        z-index: 1000;
                        transition: left 0.3s ease;
                    }
                    .sidebar-mobile-open {
                        left: 0 !important;
                    }
                    .mobile-sidebar-backdrop {
                        display: block;
                    }
                    .main-viewport {
                        padding: 10px 10px 80px 10px !important; /* Extra bottom padding for BottomNav */
                    }
                    .premium-header {
                        padding: 8px;
                        border-radius: 12px;
                    }
                    .header-left {
                        gap: 10px;
                    }
                    .branch-context-selector, .team-avatars {
                        display: none !important;
                    }
                    .add-employee-btn {
                        padding: 8px;
                        font-size: 0;
                    }
                    .add-employee-btn .plus {
                        font-size: 1.2rem;
                    }
                    .search-wrapper.open {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: calc(100vw - 40px);
                        z-index: 2001;
                    }
                    .u-name {
                        display: none;
                    }
                    .user-profile-widget {
                        padding-left: 10px;
                        gap: 10px;
                    }
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 30px;
                    flex: 1;
                }
                
                /* Nav Link styles handled inline for Sidebar Redesign Phase 6 */
                .nav-link {
                    transition: all 0.2s;
                }
                .nav-link:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                    color: white !important;
                }

                .header-tabs {
                    display: flex;
                    background: #f1f5f9;
                    padding: 5px;
                    border-radius: 16px;
                }

                .header-tab {
                    padding: 8px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #64748b;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .header-tab.active {
                    background: white;
                    color: #1e293b;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
                }

                .header-search-container {
                    position: relative;
                    margin-left: 10px;
                    width: 100%;
                }

                .search-wrapper {
                    display: flex;
                    align-items: center;
                    background: #f1f5f9;
                    border-radius: 12px;
                    padding: 4px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 40px;
                    overflow: hidden;
                    border: 1px solid transparent;
                }

                .search-wrapper.open {
                    width: 100%;
                    max-width: 550px;
                    background: white;
                    border-color: #3b82f6;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                }

                .search-wrapper.open .search-icon {
                    color: #3b82f6;
                }

                .search-trigger {
                    background: transparent;
                    border: none;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    flex-shrink: 0;
                }

                .search-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    background: transparent;
                    padding: 0 10px;
                    font-size: 0.875rem;
                    color: #1e293b;
                }

                .search-results-area {
                    margin-top: 15px;
                    width: 100%;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.12);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 50;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .results-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1px;
                    background: #f1f5f9;
                }

                .search-result-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 15px 20px;
                    background: white;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .search-result-item:hover {
                    background: #f8fafc;
                    transform: translateX(5px);
                }

                .result-main {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .result-name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 2px;
                }

                .result-id {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    background: #f1f5f9;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .result-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .status-badge {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 4px 8px;
                    border-radius: 6px;
                    letter-spacing: 0.02em;
                }

                .status-badge.regular { background: #dcfce7; color: #15803d; }
                .status-badge.probationary { background: #fef9c3; color: #a16207; }
                .status-badge.contractual { background: #e0f2fe; color: #0369a1; }
                
                .view-feature-btn {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .view-feature-btn:hover {
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transform: scale(1.05);
                }

                .view-feature-btn:active {
                    transform: scale(0.95);
                }

                .result-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #475569;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                }

                .result-name {
                    font-size: 0.9375rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .result-meta {
                    font-size: 0.8rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .meta-dot {
                    color: #cbd5e1;
                }

                .search-status {
                    padding: 20px;
                    text-align: center;
                    font-size: 0.875rem;
                    color: #94a3b8;
                    background: white;
                }

                .header-search {
                    color: #64748b;
                    cursor: pointer;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex-shrink: 0;
                }

                .avatar-group {
                    display: flex;
                    align-items: center;
                }

                .avatar-mini {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid white;
                    margin-left: -10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    color: white;
                    font-weight: bold;
                }

                .avatar-mini:first-child { margin-left: 0; }

                .avatar-count {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #94a3b8;
                    margin-left: 8px;
                }

                .add-employee-btn {
                    padding: 10px 18px;
                    background: #f1f5f9;
                    border-radius: 16px;
                    color: #1e293b;
                    font-size: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }

                .branch-context-selector {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 6px 14px;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                }

                .branch-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .nav-branch-select {
                    background: transparent;
                    border: none;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #1e293b;
                    outline: none;
                    cursor: pointer;
                    padding: 2px 4px;
                }

                .nav-branch-select:hover {
                    color: #3b82f6;
                }

                .branch-read-only {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #e0f2fe;
                    padding: 2px 8px;
                    border-radius: 6px;
                    border: 1px solid #bae6fd;
                }

                .lock-icon {
                    font-size: 0.7rem;
                    color: #0284c7;
                }
                    font-weight: 500;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid transparent;
                }

                .add-employee-btn:hover {
                    background: #e2e8f0;
                }

                .user-profile-widget {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding-left: 20px;
                    border-left: 1px solid #e2e8f0;
                    overflow: visible;
                }

                .u-name {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #1e293b;
                }

                .u-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    background: #6366f1;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }

                .scroll-content {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 5px;
                }

                .scroll-content::-webkit-scrollbar { width: 6px; }
                .scroll-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

                .loading-screen {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--dashboard-bg);
                    color: var(--text-secondary);
                }
            `}</style>
            {!hideNavbar && user && (
                <MobileBottomNav user={user} />
            )}
        </div >
    );
}
