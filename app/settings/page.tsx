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
            // Ensure employeesData is an array
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setEmployees([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

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
            <div className="card mb-4">
                <div className="card-body">
                    <h2 className="mb-2">System Settings</h2>
                    <p className="text-gray-500">Configure system preferences and manage user access.</p>
                </div>
            </div>

            <div className="flex mb-4 border-b border-gray-200">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('general')}
                >
                    General Settings
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'leave' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('leave')}
                >
                    Leave Configuration
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'backup' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('backup')}
                >
                    Backup & Restore
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="card max-w-2xl">
                    <div className="card-body">
                        <form onSubmit={handleSaveSettings}>
                            <div className="form-group mb-4">
                                <label className="form-label">Company Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={settings.company_name || ''}
                                    onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Attendance Cut-off Time</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={settings.attendance_cutoff || ''}
                                    onChange={e => setSettings({ ...settings, attendance_cutoff: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Employees timing in after this time will be marked as Late.</p>
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Default User Password</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={settings.default_password || ''}
                                    onChange={e => setSettings({ ...settings, default_password: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card">
                        <div className="card-body">
                            <h3 className="text-lg font-medium mb-2">Backup Database</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Create a backup of your current database (JSON format). You can use this file to restore your data later if needed.
                            </p>
                            <button
                                onClick={() => window.open('/api/system/backup', '_blank')}
                                className="btn bg-green-600 text-white hover:bg-green-700 w-full flex items-center justify-center gap-2"
                            >
                                <span>⬇️</span> Download Backup
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <h3 className="text-lg font-medium mb-2">Restore Database</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Upload a previously saved backup file (.json) to restore your system data.
                                <br />
                                <span className="text-red-500 font-bold">WARNING: This will overwrite your current data!</span>
                            </p>

                            <input
                                type="file"
                                accept=".json"
                                id="restore-file"
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 mb-4"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        if (confirm("Are you sure you want to RESTORE the database? This will overwrite all current data and cannot be undone.")) {
                                            const formData = new FormData();
                                            formData.append('file', e.target.files[0]);

                                            try {
                                                const res = await fetch('/api/system/backup', {
                                                    method: 'POST',
                                                    body: formData
                                                });
                                                const data = await res.json();
                                                if (res.ok) {
                                                    alert('Database restored successfully! The page will now reload.');
                                                    window.location.reload();
                                                } else {
                                                    alert('Restore failed: ' + data.error);
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert('An error occurred during restoration.');
                                            }
                                            // Reset input
                                            e.target.value = '';
                                        } else {
                                            e.target.value = ''; // Cancelled
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </DashboardLayout>
    );
}
