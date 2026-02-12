'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<any>({});
    const [users, setUsers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        role: 'Employee',
        employee_id: ''
    });

    // Leave Settings State
    const [leaveSettings, setLeaveSettings] = useState({
        payroll_cutoff_day: 15,
        filing_cutoff_days: 3,
        approval_levels: {
            level1_enabled: true,
            level2_enabled: true,
            level3_enabled: false
        }
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            // If and only if HR, Admin, Manager, President, or Vice President, allow fetching data
            const masterRoles = ['Admin', 'HR', 'Manager', 'President', 'Vice President'];
            if (masterRoles.includes(parsedUser.role)) {
                fetchData();
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const fetchData = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const [settingsRes, usersRes, employeesRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/users'),
                fetch('/api/employees', {
                    headers: { 'x-session-id': sessionId || '' }
                })
            ]);

            const settingsData = await settingsRes.json();
            const usersData = await usersRes.json();
            const employeesData = await employeesRes.json();

            setSettings(settingsData);
            if (settingsData.leave_config) {
                setLeaveSettings(settingsData.leave_config);
            }
            setUsers(usersData);
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    // --- Components ---
    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === id ? '#3b82f6' : '#f1f5f9',
                color: activeTab === id ? 'white' : '#4b5563',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
            }}
        >
            {label}
        </button>
    );

    const SettingsField = ({ label, value, onChange, type = 'text', icon, helpText }: any) => (
        <div style={{ marginBottom: '1.25rem' }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '0.75rem 1rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative'
            }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6', marginBottom: '0.1rem' }}>{label}</label>
                    <input
                        type={type}
                        value={value}
                        onChange={onChange}
                        style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#1f2937',
                            padding: 0,
                            background: 'transparent'
                        }}
                    />
                </div>
                {icon && <div style={{ color: '#94a3b8' }}>{icon}</div>}
            </div>
            {helpText && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{helpText}</span>
                </div>
            )}
        </div>
    );

    const ToggleSwitch = ({ label, checked }: { label: string, checked: boolean }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>{label}</span>
            <div style={{
                width: '50px',
                height: '26px',
                background: checked ? '#3b82f6' : '#e2e8f0',
                borderRadius: '13px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '27px' : '3px',
                    width: '20px',
                    height: '20px',
                    background: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}></div>
            </div>
        </div>
    );

    const handleSaveLeaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leave_config: leaveSettings })
            });

            if (response.ok) {
                alert('Leave configuration saved successfully!');
                fetchData();
            }
        } catch (error) {
            console.error('Failed to save leave settings:', error);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                alert('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingUserId ? 'PUT' : 'POST';
            const body: any = { ...userForm };

            if (editingUserId) {
                body.id = editingUserId;
                // Don't send empty password during update
                if (!body.password) {
                    delete body.password;
                }
            }

            const response = await fetch('/api/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setShowUserForm(false);
                setEditingUserId(null);
                setUserForm({ username: '', password: '', role: 'Employee', employee_id: '' });
                fetchData(); // Refresh list
                alert(editingUserId ? 'User updated successfully!' : 'User created successfully!');
            } else {
                const error = await response.json();
                alert(error.error || `Failed to ${editingUserId ? 'update' : 'create'} user`);
            }
        } catch (error) {
            console.error('Failed to handle user form:', error);
        }
    };

    const handleEditUser = (u: any) => {
        setEditingUserId(u.id);
        setUserForm({
            username: u.username,
            password: '', // Don't show hashed password
            role: u.role,
            employee_id: u.employee_id?.toString() || ''
        });
        setShowUserForm(true);
        // Scroll to form
        const formElement = document.getElementById('user-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/users?id=${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    fetchData();
                    alert('User deleted successfully.');
                } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Failed to delete user:', error);
            }
        }
    };

    const toggleUserStatus = async (u: any) => {
        if (confirm(`Are you sure you want to ${u.is_active ? 'deactivate' : 'activate'} this user?`)) {
            try {
                await fetch('/api/users', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: u.id, is_active: u.is_active ? 0 : 1 })
                });
                fetchData();
            } catch (error) {
                console.error('Failed to update user:', error);
            }
        }
    };

    if (loading) return <DashboardLayout><div className="p-5 text-center">Loading settings...</div></DashboardLayout>;

    const masterRoles = ['Admin', 'HR', 'Manager', 'President', 'Vice President'];
    if (!masterRoles.includes(user?.role)) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body text-center py-10">
                        <div className="text-4xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                        <p className="text-gray-500 mb-6">You do not have permission to view this page.</p>
                        <a href="/dashboard" className="btn btn-primary">Return to Dashboard</a>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '5rem' }}>
                {/* Header */}
                <div style={{ padding: '2rem 1.5rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>System Settings</h1>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.5rem' }}>Configure system preferences and manage user access.</p>
                        </div>
                        <button style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'white',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#1e293b'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation Scroll */}
                <div style={{ overflowX: 'auto', padding: '0.5rem 1.5rem 1.5rem', display: 'flex', gap: '0.75rem', WebkitOverflowScrolling: 'touch' }}>
                    <TabButton id="general" label="General Settings" />
                    <TabButton id="leave" label="Leave Configuration" />
                    <TabButton id="backup" label="Backup & Restore" />
                </div>

                <div style={{ padding: '0 1.5rem' }}>
                    {activeTab === 'general' && (
                        <div style={{ maxWidth: '500px' }}>
                            <form onSubmit={handleSaveSettings}>
                                <SettingsField
                                    label="Company Name"
                                    value={settings.company_name || ''}
                                    onChange={(e: any) => setSettings({ ...settings, company_name: e.target.value })}
                                />

                                <SettingsField
                                    label="Attendance Cut-off Time"
                                    value={settings.attendance_cutoff || ''}
                                    type="time"
                                    onChange={(e: any) => setSettings({ ...settings, attendance_cutoff: e.target.value })}
                                    helpText="Employees timing in after this time will be marked as Late."
                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                                />

                                <SettingsField
                                    label="Default User Password"
                                    value={settings.default_password || ''}
                                    onChange={(e: any) => setSettings({ ...settings, default_password: e.target.value })}
                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>}
                                />

                                <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginTop: '2.5rem', marginBottom: '1rem' }}>NOTIFICATION PREFERENCES</h2>
                                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '0 1rem' }}>
                                    <ToggleSwitch label="Email Alerts" checked={true} />
                                    <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                                    <ToggleSwitch label="Push Notifications" checked={false} />
                                </div>

                                <button type="submit" style={{
                                    width: '100%',
                                    marginTop: '3rem',
                                    padding: '1.25rem',
                                    borderRadius: '16px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)',
                                    marginBottom: '2rem'
                                }}>
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    )}


                    {activeTab === 'leave' && (
                        <div className="card max-w-2xl">
                            <div className="card-body">
                                <h3 className="text-lg font-medium mb-4">Leave Configuration</h3>
                                <form onSubmit={handleSaveLeaveSettings}>
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Cut-off Rules</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-group">
                                                <label className="form-label">Payroll Cut-off Day</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    className="form-input"
                                                    value={leaveSettings.payroll_cutoff_day}
                                                    onChange={e => setLeaveSettings({ ...leaveSettings, payroll_cutoff_day: parseInt(e.target.value) })}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Day of the month (e.g., 15th)</p>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Filing Cut-off (Days)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="form-input"
                                                    value={leaveSettings.filing_cutoff_days}
                                                    onChange={e => setLeaveSettings({ ...leaveSettings, filing_cutoff_days: parseInt(e.target.value) })}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Days before payroll cut-off</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Workflow</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="level1"
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    checked={leaveSettings.approval_levels.level1_enabled}
                                                    onChange={e => setLeaveSettings({
                                                        ...leaveSettings,
                                                        approval_levels: { ...leaveSettings.approval_levels, level1_enabled: e.target.checked }
                                                    })}
                                                />
                                                <label htmlFor="level1" className="ml-2 text-sm text-gray-700">
                                                    Level 1: Immediate Supervisor / Manager
                                                </label>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="level2"
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    checked={leaveSettings.approval_levels.level2_enabled}
                                                    onChange={e => setLeaveSettings({
                                                        ...leaveSettings,
                                                        approval_levels: { ...leaveSettings.approval_levels, level2_enabled: e.target.checked }
                                                    })}
                                                />
                                                <label htmlFor="level2" className="ml-2 text-sm text-gray-700">
                                                    Level 2: HR Department
                                                </label>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="level3"
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    checked={leaveSettings.approval_levels.level3_enabled}
                                                    onChange={e => setLeaveSettings({
                                                        ...leaveSettings,
                                                        approval_levels: { ...leaveSettings.approval_levels, level3_enabled: e.target.checked }
                                                    })}
                                                />
                                                <label htmlFor="level3" className="ml-2 text-sm text-gray-700">
                                                    Level 3: Final Approver (Admin/Management)
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary">Save Configuration</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                                {/* Download Backup */}
                                <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⬇️</div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>Download Backup</h3>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Export complete database as JSON</p>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '2rem' }}>
                                        Securely download a full snapshot of your current system data, including employees, attendance, and settings.
                                    </p>
                                    <button
                                        onClick={() => window.open('/api/system/backup', '_blank')}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '9999px',
                                            border: 'none',
                                            background: '#10b981',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        💾 Download .JSON File
                                    </button>
                                </div>

                                {/* Restore Database */}
                                <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🔄</div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>Restore Database</h3>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Import previously saved snapshot</p>
                                        </div>
                                    </div>
                                    <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #ffedd5' }}>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>
                                            ⚠️ Warning: This will completely overwrite your current live data. This process cannot be reversed.
                                        </p>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="file"
                                            accept=".json"
                                            id="restore-file-new"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    if (confirm("Are you sure you want to RESTORE the database? This will overwrite all current data.")) {
                                                        const formData = new FormData();
                                                        formData.append('file', e.target.files[0]);
                                                        try {
                                                            const res = await fetch('/api/system/backup', { method: 'POST', body: formData });
                                                            if (res.ok) {
                                                                alert('Database restored successfully!');
                                                                window.location.reload();
                                                            } else {
                                                                const data = await res.json();
                                                                alert('Restore failed: ' + data.error);
                                                            }
                                                        } catch (err) {
                                                            alert('An error occurred during restoration.');
                                                        }
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="restore-file-new"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '9999px',
                                                border: '2px dashed #d1d5db',
                                                background: '#f9fafb',
                                                color: '#374151',
                                                fontWeight: 700,
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            📂 Choose File & Restore
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}

