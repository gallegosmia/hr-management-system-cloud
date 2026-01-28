'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'leave' | 'alert' | 'info';
    severity: 'high' | 'medium' | 'low';
    url: string;
    timestamp: string;
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initial load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('read_notifications');
        if (stored) {
            try {
                setReadIds(new Set(JSON.parse(stored)));
            } catch (e) {
                console.error('Failed to parse read notifications');
            }
        }
    }, []);

    // Persist readIds to localStorage
    useEffect(() => {
        localStorage.setItem('read_notifications', JSON.stringify(Array.from(readIds)));
    }, [readIds]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!isOpen && notifications.length > 0) return; // Only fetch if open or empty
        setLoading(true);
        try {
            const [alertsRes, leavesRes] = await Promise.all([
                fetch('/api/alerts'),
                fetch('/api/leave?status=Pending')
            ]);

            const alertsData = await alertsRes.json();
            const leavesData = await leavesRes.json();

            const combined: Notification[] = [];

            // Add Pending Leaves
            (leavesData || []).forEach((leave: any) => {
                combined.push({
                    id: `leave-${leave.id}`,
                    title: 'New Leave Request',
                    message: `${leave.employee_name} requested ${leave.leave_type} leave.`,
                    type: 'leave',
                    severity: 'medium',
                    url: '/leave',
                    timestamp: leave.created_at || new Date().toISOString()
                });
            });

            // Add High/Medium Severity Alerts
            (alertsData.alerts || []).forEach((alert: any) => {
                combined.push({
                    id: alert.id,
                    title: alert.type.replace(/_/g, ' ').toUpperCase(),
                    message: alert.message,
                    type: 'alert',
                    severity: alert.severity,
                    url: alert.type === 'NEW_USER_REGISTRATION' ? '/users' : `/employees/${alert.employee_id}`,
                    timestamp: alert.created_at || new Date().toISOString()
                });
            });

            // Sort by timestamp
            combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(combined);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch every minute
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = (id: string) => {
        setReadIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const markAllAsRead = () => {
        setReadIds(new Set(notifications.map(n => n.id)));
    };

    const unreadNotifications = notifications.filter(n => !readIds.has(n.id));
    const unreadCount = unreadNotifications.length;

    return (
        <div className="notification-container" ref={dropdownRef}>
            <button className="notif-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notif-dropdown glass-effect">
                    <div className="notif-header">
                        <div className="notif-header-left">
                            <h3>Notifications</h3>
                            <span className="notif-count">{unreadCount} Unread</span>
                        </div>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {loading && notifications.length === 0 ? (
                            <div className="notif-loading">Loading...</div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notif) => {
                                const isRead = readIds.has(notif.id);
                                return (
                                    <Link
                                        key={notif.id}
                                        href={notif.url}
                                        className={`notif-item ${notif.severity} ${isRead ? 'read' : 'unread'}`}
                                        onClick={() => {
                                            markAsRead(notif.id);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="notif-icon">
                                            {notif.type === 'leave' ? '🏖️' : notif.type === 'alert' ? '⚠️' : 'ℹ️'}
                                        </div>
                                        <div className="notif-content">
                                            <div className="notif-top-row">
                                                <div className="notif-title">{notif.title}</div>
                                                {!isRead && <div className="unread-dot"></div>}
                                            </div>
                                            <div className="notif-message">{notif.message}</div>
                                            <div className="notif-time">{new Date(notif.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="notif-empty">
                                <span className="empty-icon">✨</span>
                                <p>All caught up!</p>
                            </div>
                        )}
                    </div>

                    <div className="notif-footer">
                        <Link href="/dashboard" onClick={() => setIsOpen(false)}>View all activity</Link>
                    </div>
                </div>
            )}

            <style jsx>{`
                .notification-container {
                    position: relative;
                }
                .notif-btn {
                    position: relative;
                    background: #f1f5f9;
                    border: none;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                }
                .notif-btn:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                    transform: translateY(-1px);
                }
                .notif-btn:active {
                    transform: translateY(0);
                }
                .notif-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: bold;
                    min-width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
                }
                .notif-dropdown {
                    position: absolute;
                    top: calc(100% + 15px);
                    right: 0;
                    width: 320px;
                    max-height: 500px;
                    border-radius: 20px;
                    z-index: 1000;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    background: white;
                    animation: dropdownSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    transform-origin: top right;
                }
                @keyframes dropdownSlide {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @media (max-width: 640px) {
                    .notif-dropdown {
                        position: fixed;
                        top: 70px;
                        left: 20px;
                        right: 20px;
                        width: auto;
                        max-height: calc(100vh - 100px);
                    }
                }
                .notif-header {
                    padding: 15px 20px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.8);
                }
                .notif-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .mark-all-btn {
                    background: transparent;
                    border: none;
                    color: #3b82f6;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .mark-all-btn:hover {
                    background: rgba(59, 130, 246, 0.05);
                }
                .notif-header h3 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .notif-count {
                    font-size: 0.7rem;
                    background: #fee2e2;
                    color: #ef4444;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 700;
                }
                .notif-list {
                    overflow-y: auto;
                    flex: 1;
                    background: white;
                }
                .notif-loading, .notif-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 0.875rem;
                }
                .empty-icon {
                    font-size: 2rem;
                    display: block;
                    margin-bottom: 10px;
                }
                .notif-item {
                    display: flex;
                    gap: 12px;
                    padding: 15px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                    position: relative;
                }
                .notif-item.unread {
                    background: #fdf2f222;
                }
                .notif-item.read {
                    opacity: 0.7;
                    background: white;
                }
                .notif-item:hover {
                    background: #f8fafc;
                    opacity: 1;
                }
                .notif-item.high {
                    border-left: 4px solid #ef4444;
                }
                .notif-top-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .unread-dot {
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
                }
                .notif-icon {
                    font-size: 1.25rem;
                    padding-top: 2px;
                }
                .notif-content {
                    flex: 1;
                }
                .notif-title {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #1e293b;
                }
                .notif-message {
                    font-size: 0.75rem;
                    color: #475569;
                    line-height: 1.4;
                    margin-bottom: 6px;
                }
                .notif-time {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .notif-footer {
                    padding: 12px;
                    text-align: center;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                }
                .notif-footer a {
                    font-size: 0.8rem;
                    color: #3b82f6;
                    font-weight: 600;
                    text-decoration: none;
                }
            `}</style>
        </div>
    );
}
