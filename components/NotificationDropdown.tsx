'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { format, isToday, isYesterday, subDays } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    url: string;
    timestamp: string;
    actionLabel?: string;
    secondaryActionLabel?: string;
    is_read?: boolean;
    reference_id?: string;
    source?: 'db' | 'dynamic';
}

function isReadValue(value: any): boolean {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
        return ['1', 'true', 't', 'yes'].includes(value.trim().toLowerCase());
    }
    return false;
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<any>(null);
    // Track unread count separately to ensure it matches DB
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fetchRequestIdRef = useRef(0);

    // Initial load user
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error('Failed to parse user data');
            }
        }
    }, []);

    const fetchNotifications = useCallback(async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) return;

        const requestId = fetchRequestIdRef.current + 1;
        fetchRequestIdRef.current = requestId;

        if (showLoading) setLoading(true);
        try {
            // Use current user from state to get branch
            const userBranch = user?.username === 'superadmin' ? 'All' : (user?.assigned_branch || 'All');

            // Fetch multiple sources independently
            const fetchSource = async (url: string) => {
                try {
                    const sessionId = localStorage.getItem('sessionId');
                    const headers: any = {};
                    if (sessionId) headers['x-session-id'] = sessionId;

                    const res = await fetch(url, { headers });
                    if (!res.ok) return null;
                    return await res.json();
                } catch (e) {
                    console.error(`Failed to fetch source: ${url}`, e);
                    return null;
                }
            };

            const announcementUrl = `/api/announcements?is_active=true&branch=${encodeURIComponent(userBranch)}${user?.employee_id ? `&employee_id=${user.employee_id}` : ''}`;

            const [alertsData, leavesData, annData, notifData, loansData, cashAdvancesData, govReportsData] = await Promise.all([
                fetchSource('/api/alerts'),
                fetchSource('/api/leave?limit=50'),
                fetchSource(announcementUrl),
                fetchSource('/api/notifications?limit=50'),
                fetchSource('/api/loans'),
                fetchSource('/api/cash-advance'),
                fetchSource('/api/gov-contributions')
            ]);

            const combined: Notification[] = [];
            const readReferenceIds = new Set<string>();
            if (notifData && Array.isArray(notifData.referenceIds)) {
                notifData.referenceIds.forEach((ref: any) => {
                    if (ref !== undefined && ref !== null) {
                        readReferenceIds.add(String(ref));
                    }
                });
            }
            const hasReadReference = (...refs: Array<string | number | undefined | null>) =>
                refs.filter(ref => ref !== undefined && ref !== null).some(ref => readReferenceIds.has(String(ref)));

            // 1. Process DB Notifications first
            if (notifData && Array.isArray(notifData.notifications)) {
                // setUnreadCount(notifData.unreadCount || 0); // We'll calculate total unread after merging

                notifData.notifications.forEach((n: any) => {
                    const notifItem: Notification = {
                        id: n.id.toString(), // DB ID
                        title: n.title,
                        message: n.message,
                        type: n.type || 'system',
                        severity: n.severity || 'medium',
                        url: n.link || '#',
                        timestamp: n.created_at,
                        is_read: isReadValue(n.is_read),
                        reference_id: n.reference_id,
                        source: 'db'
                    };
                    combined.push(notifItem);

                    if (n.reference_id) {
                        readReferenceIds.add(n.reference_id.toString());
                    }

                    if (n.type?.startsWith('PAYROLL_')) {
                        notifItem.actionLabel = 'View Payroll';
                    } else if (n.type?.startsWith('CASH_ADVANCE_')) {
                        notifItem.actionLabel = 'View Cash Advance';
                    } else if (n.type?.startsWith('GOV_CONTRIBUTION_')) {
                        notifItem.actionLabel = 'View Contributions';
                    } else if (n.type?.startsWith('LEAVE_')) {
                        notifItem.actionLabel = 'View Leave';
                    } else if (n.type?.startsWith('LOAN_')) {
                        notifItem.actionLabel = 'View Loan';
                    }
                });
            }

            // 2. Add Leaves (Dynamic)
            if (Array.isArray(leavesData)) {
                leavesData.forEach((leave: any) => {
                    const isOwner = user?.employee_id === leave.employee_id;
                    const canApprove = user?.role === 'Admin' || user?.role === 'HR' || user?.role === 'Manager' || user?.role === 'President' || user?.role === 'Vice President';
                    const isHR = user?.role === 'Admin' || user?.role === 'HR';

                    let notifTitle = '';
                    let notifMsg = '';
                    let actionLabel = '';
                    let refId = '';
                    let type = 'leave';

                    if (leave.status.toLowerCase().includes('pending') && canApprove) {
                        refId = `leave-pending-${leave.id}`;
                        notifTitle = 'Leave Request Pending';
                        notifMsg = `${leave.employee_name} requested ${leave.leave_type} leave.`;
                        actionLabel = 'Review Request';
                    } else if (leave.status === 'Approved' && isOwner) {
                        refId = `leave-approved-owner-${leave.id}`;
                        notifTitle = 'Leave Approved';
                        notifMsg = `Your ${leave.leave_type} request has been approved.`;
                        actionLabel = 'View Leave';
                        type = 'info';
                    } else if (leave.status === 'Approved' && isHR) {
                        refId = `leave-approved-hr-${leave.id}`;
                        notifTitle = 'Leave Request Approved';
                        notifMsg = `${leave.employee_name}'s ${leave.leave_type} was approved.`;
                        actionLabel = 'View Leave';
                        type = 'info';
                    } else if (leave.status === 'Rejected' && isOwner) {
                        refId = `leave-rejected-owner-${leave.id}`;
                        notifTitle = 'Leave Request Rejected';
                        notifMsg = `Your ${leave.leave_type} request has been rejected.`;
                        actionLabel = 'View Leave';
                        type = 'alert';
                    }

                    // Only add if not already in DB notifications (persisted)
                    if (notifTitle && refId && !hasReadReference(refId)) {
                        combined.push({
                            id: refId,
                            title: notifTitle,
                            message: notifMsg,
                            type: type,
                            severity: 'medium',
                            url: '/leave',
                            timestamp: leave.updated_at || leave.created_at || new Date().toISOString(),
                            actionLabel: actionLabel,
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 3. Add Alerts (Dynamic)
            if (alertsData && Array.isArray(alertsData.alerts)) {
                alertsData.alerts.forEach((alert: any) => {
                    const refId = String(alert.id);
                    // Only add if not already in DB notifications
                    if (!hasReadReference(refId)) {
                        let type: any = 'alert';
                        if (alert.type?.includes('INFO')) type = 'info';

                        combined.push({
                            id: refId,
                            title: alert.type.replace(/_/g, ' ').toUpperCase(),
                            message: alert.message,
                            type: type,
                            severity: alert.severity,
                            url: alert.type === 'NEW_USER_REGISTRATION' ? '/users' : `/employees/${alert.employee_id}`,
                            timestamp: alert.created_at || new Date().toISOString(),
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 4. Add Announcements (Dynamic)
            if (Array.isArray(annData)) {
                annData.forEach((ann: any) => {
                    const refId = `ann-${ann.id}`;
                    if (!hasReadReference(refId)) {
                        combined.push({
                            id: refId,
                            title: ann.title,
                            message: ann.content,
                            type: 'system',
                            severity: ann.priority === 'Urgent' ? 'high' : ann.priority === 'High' ? 'medium' : 'low',
                            url: '/announcements',
                            timestamp: ann.created_at,
                            actionLabel: 'View Announcement',
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 5. Add Emergency Loans (Dynamic)
            if (Array.isArray(loansData)) {
                loansData.forEach((loan: any) => {
                    // Check if current user needs to act on this
                    const isOwner = user?.employee_id === loan.employee_id;
                    const canApproveLvl1 = (user?.role === 'Manager' || user?.role === 'Admin') && loan.current_approval_level === 1 && (loan.status === 'Submitted' || loan.status === 'Under Review');
                    const canApproveLvl2 = (user?.role === 'Vice President' || user?.role === 'Admin') && loan.current_approval_level === 2 && loan.status === 'Under Review - Vice President';
                    const canRelease = (user?.role === 'Admin' || user?.role === 'Finance' || user?.role === 'HR') && loan.status === 'Approved';

                    let notifTitle = '';
                    let notifMsg = '';
                    let actionLabel = '';
                    let refId = '';

                    if (canApproveLvl1 || canApproveLvl2) {
                        refId = `loan-review-${loan.id}-${loan.current_approval_level}`;
                        notifTitle = 'Loan Request Pending Approval';
                        notifMsg = `A new emergency loan request is waiting for your review.`;
                        actionLabel = 'Review Loan';
                    } else if (canRelease) {
                        refId = `loan-release-${loan.id}`;
                        notifTitle = 'Loan Ready for Release';
                        notifMsg = `An approved loan request is ready for fund release.`;
                        actionLabel = 'Release Funds';
                    } else if (isOwner && loan.status !== 'Draft' && loan.status !== 'Submitted' && loan.status !== 'Under Review' && !loan.status.includes('Vice President')) {
                        refId = `loan-update-${loan.id}-${loan.status}`;
                        notifTitle = `Loan Status: ${loan.status}`;
                        notifMsg = `Your emergency loan request has been marked as ${loan.status}.`;
                        actionLabel = 'View Loan';
                    }

                    if (notifTitle && refId && !hasReadReference(refId)) {
                        combined.push({
                            id: refId,
                            title: notifTitle,
                            message: notifMsg,
                            type: 'info',
                            severity: 'medium',
                            url: `/loans/${loan.id}`,
                            timestamp: loan.updated_at || loan.created_at || new Date().toISOString(),
                            actionLabel: actionLabel,
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 6. Add Cash Advances (Dynamic)
            if (Array.isArray(cashAdvancesData)) {
                cashAdvancesData.forEach((ca: any) => {
                    const isOwner = user?.employee_id === ca.employee_id;
                    const isBranchReviewer = (user?.role === 'Manager' || user?.role === 'Admin') &&
                        (ca.status === 'For Branch Manager Review' || ca.status === 'Pending');
                    const isExecutiveReviewer = (user?.role === 'President' || user?.role === 'Vice President' || user?.username === 'superadmin') &&
                        ca.status === 'For EVP Approval';

                    let notifTitle = '';
                    let notifMsg = '';
                    let actionLabel = '';
                    let refId = '';

                    if (isBranchReviewer) {
                        refId = `cash-advance-${ca.id}-bm-review`;
                        notifTitle = 'Cash Advance Pending Review';
                        notifMsg = `${ca.employee_name} requested a cash advance.`;
                        actionLabel = 'Review Request';
                    } else if (isExecutiveReviewer) {
                        refId = `cash-advance-${ca.id}-evp-review`;
                        notifTitle = 'Cash Advance Pending EVP Approval';
                        notifMsg = `${ca.employee_name} has a cash advance request awaiting final approval.`;
                        actionLabel = 'Final Review';
                    } else if (isOwner && (ca.status === 'Approved' || ca.status === 'Rejected')) {
                        refId = `cash-advance-${ca.id}-${ca.status.toLowerCase()}`;
                        notifTitle = ca.status === 'Approved' ? 'Cash Advance Approved' : 'Cash Advance Rejected';
                        notifMsg = `Your cash advance request was ${ca.status.toLowerCase()}.`;
                        actionLabel = 'View Request';
                    }

                    if (notifTitle && refId && !hasReadReference(refId)) {
                        combined.push({
                            id: refId,
                            title: notifTitle,
                            message: notifMsg,
                            type: 'info',
                            severity: 'medium',
                            url: `/cash-advance/${ca.id}`,
                            timestamp: ca.updated_at || ca.date_requested || new Date().toISOString(),
                            actionLabel,
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 7. Add Government Contribution Reports (Dynamic)
            if (Array.isArray(govReportsData)) {
                govReportsData.forEach((report: any) => {
                    const canReview = ['Manager', 'Operations Manager', 'President', 'Vice President', 'Admin'].includes(user?.role) &&
                        report.status === 'Pending';
                    const isCreator = user?.id && Number(user.id) === Number(report.created_by);

                    let notifTitle = '';
                    let notifMsg = '';
                    let actionLabel = '';
                    let refId = '';

                    if (canReview) {
                        refId = `gov-contribution-${report.id}-review`;
                        notifTitle = 'Government Contribution Pending Review';
                        notifMsg = `${report.contribution_type} contributions for ${report.payroll_period} are waiting for review.`;
                        actionLabel = 'Review Report';
                    } else if (isCreator && (report.status === 'Approved' || report.status === 'Rejected')) {
                        refId = `gov-contribution-${report.id}-${report.status.toLowerCase()}`;
                        notifTitle = report.status === 'Approved'
                            ? 'Government Contribution Approved'
                            : 'Government Contribution Rejected';
                        notifMsg = `${report.contribution_type} contributions for ${report.payroll_period} were ${report.status.toLowerCase()}.`;
                        actionLabel = 'View Report';
                    }

                    if (notifTitle && refId && !hasReadReference(refId)) {
                        combined.push({
                            id: refId,
                            title: notifTitle,
                            message: notifMsg,
                            type: 'info',
                            severity: report.status === 'Pending' ? 'high' : 'medium',
                            url: `/gov-contributions/${report.id}`,
                            timestamp: report.updated_at || report.created_at || new Date().toISOString(),
                            actionLabel,
                            is_read: false,
                            source: 'dynamic'
                        });
                    }
                });
            }

            // 8. Transportation Allowance Reminder
            const today = new Date();
            if (today.getDate() === 10 && (user?.role === 'Admin' || user?.role === 'HR')) {
                const monthYear = `${today.getFullYear()}-${today.getMonth() + 1}`;
                const refId = `transpo-allowance-${monthYear}`;

                if (!readReferenceIds.has(refId)) {
                    combined.push({
                        id: refId,
                        title: 'Transportation Allowance Due',
                        message: `Today is the 10th. It's time to process and release the Monthly Transportation Allowance.`,
                        type: 'info',
                        severity: 'medium',
                        url: `/transportation`,
                        timestamp: new Date().toISOString(),
                        actionLabel: 'Process Allowance',
                        is_read: false,
                        source: 'dynamic'
                    });
                }
            }

            // Sort by timestamp
            combined.sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });

            if (requestId !== fetchRequestIdRef.current) return;

            // Update local state
            setNotifications(combined);

            // Recalculate unread count
            const totalUnread = combined.filter(n => !n.is_read).length;
            setUnreadCount(totalUnread);

        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            if (showLoading && requestId === fetchRequestIdRef.current) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Re-fetch when user is loaded or on interval
    useEffect(() => {
        fetchNotifications({ showLoading: false });
        const interval = setInterval(() => fetchNotifications({ showLoading: false }), 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string, notif: Notification) => {
        const wasUnread = !notif.is_read;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const sessionId = localStorage.getItem('sessionId');

            const body = {
                is_read: true,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                severity: notif.severity,
                link: notif.url,
                reference_id: notif.reference_id || notif.id,
                timestamp: notif.timestamp
            };

            const res = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: {
                    'x-session-id': sessionId || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            // Refresh from DB to ensure state is in sync
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert optimistic update on error
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: notif.is_read } : n));
            if (wasUnread) setUnreadCount(prev => prev + 1);
        }
    };

    const toggleUnread = async (id: string, notif: Notification) => {
        const newStatus = !notif.is_read;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: newStatus } : n));
        setUnreadCount(prev => newStatus ? Math.max(0, prev - 1) : prev + 1);

        try {
            const sessionId = localStorage.getItem('sessionId');

            const body = {
                is_read: newStatus,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                severity: notif.severity,
                link: notif.url,
                reference_id: notif.reference_id || notif.id,
                timestamp: notif.timestamp
            };

            const res = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: {
                    'x-session-id': sessionId || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            // Refresh from DB to ensure state is in sync
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to toggle read status:', error);
            // Revert optimistic update on error
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: !newStatus } : n));
            setUnreadCount(prev => !newStatus ? Math.max(0, prev - 1) : prev + 1);
        }
    };

    const markAllAsRead = async () => {
        fetchRequestIdRef.current += 1;

        // Collect all currently unread notifications (including dynamic ones)
        const unreadNotifs = notifications.filter(n => !n.is_read);
        const dynamicUnreadNotifs = unreadNotifs.filter(n => n.source !== 'db');

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'x-session-id': sessionId || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dynamicNotifs: dynamicUnreadNotifs })
            });
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }
            await fetchNotifications({ showLoading: false });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            fetchNotifications(); // Revert by fetching
        }
    };

    const filteredNotifs = notifications.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupNotifications = (notifs: Notification[]) => {
        const groups: { title: string, items: Notification[] }[] = [
            { title: 'TODAY', items: [] },
            { title: 'YESTERDAY', items: [] },
            { title: 'LAST WEEK', items: [] },
            { title: 'OLDER', items: [] }
        ];

        const lastWeekLimit = subDays(new Date(), 7);

        notifs.forEach(n => {
            const d = new Date(n.timestamp);
            if (isNaN(d.getTime())) {
                groups[3].items.push(n); // Invalid dates to Older
                return;
            }
            if (isToday(d)) groups[0].items.push(n);
            else if (isYesterday(d)) groups[1].items.push(n);
            else if (d > lastWeekLimit) groups[2].items.push(n);
            else groups[3].items.push(n);
        });

        return groups.filter(g => g.items.length > 0);
    };

    const notificationGroups = groupNotifications(filteredNotifs);

    const getIcon = (notif: Notification) => {
        switch (notif.type) {
            case 'leave': return <div className="icon-circle yellow">🏖️</div>;
            case 'info': return <div className="icon-circle blue">ℹ️</div>;
            case 'alert': return <div className="icon-circle orange">⚠️</div>;
            case 'PAYROLL_PENDING_VP': return <div className="icon-circle yellow">⚠️</div>;
            case 'PAYROLL_APPROVED': return <div className="icon-circle green">✅</div>;
            case 'PAYROLL_RELEASED': return <div className="icon-circle blue">💰</div>;
            case 'PAYROLL_REJECTED': return <div className="icon-circle red">❌</div>;
            default: return <div className="icon-circle gray">🔔</div>;
        }
    };

    return (
        <div className="notification-container" ref={dropdownRef}>
            <button className="notif-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notif-dropdown redesign">
                    <div className="notif-header">
                        <button className="back-btn" onClick={() => setIsOpen(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <h3>Notifications</h3>
                        <button className="mark-read-link" onClick={markAllAsRead}>Mark all as read</button>
                    </div>

                    <div className="notif-search-bar">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search alerts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="filter-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="notif-list scrollable">
                        {loading && notifications.length === 0 ? (
                            <div className="notif-loading">
                                <div className="spinner-mini"></div>
                                <p>Checking for updates...</p>
                            </div>
                        ) : notificationGroups.length > 0 ? (
                            notificationGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="notif-group">
                                    <div className="group-title">{group.title}</div>
                                    <div className="group-items">
                                        {group.items.map((notif, idx) => (
                                            <div key={notif.id} className={`notif-item-wrapper ${notif.is_read ? 'read' : 'unread'}`}>
                                                <div className="timeline-col">
                                                    {getIcon(notif)}
                                                    {idx < group.items.length - 1 && <div className="timeline-line"></div>}
                                                </div>
                                                <div className="notif-main-content">
                                                    <div className="notif-top">
                                                        <span className="notif-title">
                                                            {notif.title}
                                                            {!notif.is_read && <span className="unread-dot"></span>}
                                                        </span>
                                                        <span className="notif-timestamp">
                                                            {(() => {
                                                                try {
                                                                    const date = new Date(notif.timestamp);
                                                                    return isNaN(date.getTime()) ? '' : format(date, 'h:mm a');
                                                                } catch (e) { return ''; }
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <p className="notif-msg">{notif.message}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                        <div className="notif-actions">
                                                            {notif.actionLabel && (
                                                                <Link href={notif.url} className="action-btn blue" onClick={() => markAsRead(notif.id, notif)}>
                                                                    {notif.actionLabel}
                                                                </Link>
                                                            )}
                                                            {notif.secondaryActionLabel && (
                                                                <button className="action-btn gray">{notif.secondaryActionLabel}</button>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="mark-unread-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleUnread(notif.id, notif);
                                                            }}
                                                            title={notif.is_read ? "Mark as unread" : "Mark as read"}
                                                        >
                                                            {notif.is_read ? 'Mark Unread' : 'Mark Read'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="notif-empty-state">
                                <span>🔍</span>
                                <p>{searchQuery ? 'No notifications match your search' : 'No notifications yet'}</p>
                            </div>
                        )}
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
                    transition: all 0.2s;
                }
                .notif-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: bold;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                }
                .notif-dropdown.redesign {
                    position: absolute;
                    top: calc(100% + 15px);
                    right: 0;
                    width: 380px;
                    max-height: 600px;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 15px 50px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    overflow: hidden;
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .notif-header {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #f1f5f9;
                }
                .back-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #1e293b;
                    padding: 0;
                }
                .notif-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: -0.02em;
                }
                .mark-read-link {
                    background: none;
                    border: none;
                    color: #2563eb;
                    font-size: 0.875rem;
                    font-weight: 700;
                    cursor: pointer;
                }
                .notif-search-bar {
                    padding: 10px 20px;
                    background: white;
                }
                .search-box {
                    background: #f1f5f9;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    gap: 10px;
                }
                .search-icon { font-size: 0.9rem; color: #94a3b8; }
                .search-box input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    font-size: 0.9rem;
                    color: #1e293b;
                }
                .filter-icon {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                .notif-list.scrollable {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px 0;
                }
                .notif-group {
                    margin-bottom: 20px;
                }
                .group-title {
                    padding: 10px 20px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: 0.05em;
                }
                .notif-item-wrapper {
                    display: flex;
                    padding: 12px 20px;
                    gap: 15px;
                    transition: background 0.2s;
                }
                .notif-item-wrapper:hover {
                    background: #f8fafc;
                }
                .timeline-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 40px;
                    flex-shrink: 0;
                }
                .icon-circle {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    z-index: 2;
                }
                .icon-circle.green { background: #dcfce7; color: #16a34a; }
                .icon-circle.yellow { background: #fef9c3; color: #ca8a04; }
                .icon-circle.blue { background: #dbeafe; color: #2563eb; }
                .icon-circle.orange { background: #ffedd5; color: #ea580c; }
                .icon-circle.red { background: #fee2e2; color: #dc2626; }
                .icon-circle.gray { background: #f1f5f9; color: #64748b; }

                .timeline-line {
                    width: 2px;
                    flex: 1;
                    background: #f1f5f9;
                    margin: 4px 0 -12px 0;
                }
                .notif-main-content {
                    flex: 1;
                    padding-bottom: 10px;
                }
                .notif-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 4px;
                }
                .notif-title {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #1e293b;
                    letter-spacing: 0.05em;
                }
                .notif-timestamp {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #94a3b8;
                }
                .notif-msg {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }
                .unread-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #2563eb;
                    border-radius: 50%;
                    margin-left: 8px;
                }
                .notif-item-wrapper.unread {
                    background: #f0f7ff;
                }
                .notif-item-wrapper.unread .notif-title {
                    color: #1e3a8a;
                }
                .mark-unread-btn {
                    font-size: 0.7rem;
                    color: #64748b;
                    background: none;
                    border: 1px solid #e2e8f0;
                    padding: 4px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .mark-unread-btn:hover {
                    background: #f8fafc;
                    color: #1e293b;
                    border-color: #cbd5e1;
                }
                .notif-actions {
                    display: flex;
                    gap: 10px;
                }
                .action-btn {
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn.blue {
                    background: #2563eb;
                    color: white;
                }
                .action-btn.blue:hover { background: #1d4ed8; }
                .action-btn.gray {
                    background: #f1f5f9;
                    color: #1e293b;
                }
                .action-btn.gray:hover { background: #e2e8f0; }

                .notif-empty-state {
                    padding: 60px 20px;
                    text-align: center;
                    color: #94a3b8;
                }
                .notif-empty-state span { font-size: 2.5rem; display: block; margin-bottom: 10px; }

                .notif-loading { padding: 40px 20px; text-align: center; color: #94a3b8; }
                .spinner-mini { width: 24px; height: 24px; border: 2px solid #f1f5f9; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Custom Scrollbar */
                .scrollable::-webkit-scrollbar { width: 6px; }
                .scrollable::-webkit-scrollbar-track { background: transparent; }
                .scrollable::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
