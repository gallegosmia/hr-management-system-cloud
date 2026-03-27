'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav({ user }: { user: any }) {
    const pathname = usePathname();

    if (!user) return null; // Don't show if not logged in

    const isHROrAdmin = user.username === 'superadmin' || ['HR', 'Admin'].includes(user.role);

    const navItems = [
        { name: 'Home', href: '/dashboard', icon: '🏠', roles: ['HR', 'President', 'Vice President', 'Employee', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Scanner', href: '/mobile/attendance', icon: '📷', roles: ['HR', 'Admin'] },
        { name: 'Attendance', href: '/attendance', icon: '⏰', roles: ['President', 'Vice President', 'Manager', 'Operations Manager', 'Employee'] },
        { name: 'Employees', href: '/employees', icon: '👥', roles: ['HR', 'President', 'Vice President', 'Admin', 'Manager', 'Operations Manager'] },
        { name: 'Payroll', href: '/payroll', icon: '💰', roles: ['HR', 'President', 'Vice President', 'Admin', 'Finance', 'Operations Manager', 'Manager', 'Employee'] },
    ];

    // Filter items based on user role (superadmin sees everything)
    const visibleItems = navItems.filter(item => 
        user.username === 'superadmin' || item.roles.includes(user.role)
    );

    // If no items are visible, don't show the bar
    if (visibleItems.length === 0) return null;

    return (
        <>
            <div className="mobile-bottom-nav">
                {visibleItems.map(item => {
                    // Because Employees and Attendance have sub-paths (kiosk, add, etc.), a simple startsWith is better for active
                    // But for exact matches or home, we do strict.
                    const isActive = pathname === item.href || (item.name !== 'Home' && pathname.startsWith(item.href));
                    
                    return (
                        <Link 
                            key={item.href} 
                            href={item.href} 
                            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="bottom-nav-icon">{item.icon}</span>
                            <span className="bottom-nav-label">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
            
            <style jsx>{`
                .mobile-bottom-nav {
                    display: none;
                }

                @media (max-width: 768px) {
                    .mobile-bottom-nav {
                        display: flex;
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        border-top: 1px solid #e2e8f0;
                        padding-bottom: env(safe-area-inset-bottom, 0px); /* iPhone safe area */
                        z-index: 1000;
                        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
                        justify-content: space-around;
                        align-items: center;
                        height: 65px;
                    }

                    .bottom-nav-item {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        color: #64748b;
                        text-decoration: none;
                        height: 100%;
                        transition: all 0.2s ease-in-out;
                    }

                    .bottom-nav-icon {
                        font-size: 1.25rem;
                        transition: transform 0.2s;
                        filter: grayscale(100%);
                        opacity: 0.7;
                    }

                    .bottom-nav-label {
                        font-size: 0.65rem;
                        font-weight: 600;
                        letter-spacing: 0.02em;
                    }

                    .bottom-nav-item.active {
                        color: #0f172a;
                    }

                    .bottom-nav-item.active .bottom-nav-icon {
                        filter: grayscale(0%);
                        opacity: 1;
                        transform: translateY(-2px);
                    }

                    .bottom-nav-item.active .bottom-nav-label {
                        color: #3b82f6;
                        font-weight: 700;
                    }
                }
            `}</style>
        </>
    );
}
