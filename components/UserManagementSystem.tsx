'use client';

import { useEffect, useState, useRef } from 'react';
import Modal from '@/components/Modal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface User {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    is_active: number; // 1: Active, 0: Pending, -1: Rejected
    created_at: string;
    last_login: string;
    two_fa_enabled: boolean;
    employee_id?: number;
}

export default function UserManagementSystem() {
    const [users, setUsers] = useState<User[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [twoFaFilter, setTwoFaFilter] = useState('All 2FA');

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
    const [showFormPassword, setShowFormPassword] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Form States
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        role: 'Employee',
        email: '',
        employee_id: '',
        is_active: 1
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setCurrentUser(JSON.parse(userData));

        fetchUsers();
        fetchEmployees();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter, twoFaFilter, rowsPerPage]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (!res.ok) {
                const errText = await res.text();
                console.error("API Error:", res.status, errText);
                alert(`API Error: ${res.status} - ${errText}`);
                setUsers([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error("Failed to fetch users (invalid response):", data);
                alert("Invalid API response format");
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            alert(`Network/Fetch Error: ${error}`);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const logAction = async (action: string, details: any) => {
        if (!currentUser) return;
        try {
            await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    action,
                    details
                })
            });
        } catch (error) {
            console.error("Failed to log action", error);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            });
            if (res.ok) {
                await logAction('CREATE_USER', { username: userForm.username, role: userForm.role });
                setIsAddModalOpen(false);
                setUserForm({ username: '', password: '', role: 'Employee', email: '', employee_id: '', is_active: 1 });
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create user");
            }
        } catch (error) {
            console.error("Create user error", error);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingUser.id,
                    role: userForm.role,
                    email: userForm.email,
                    employee_id: userForm.employee_id || null,
                    password: userForm.password || undefined,
                    is_active: parseInt(userForm.is_active.toString())
                })
            });
            if (res.ok) {
                await logAction('UPDATE_USER', { user_id: editingUser.id, updated_fields: ['role', 'email', userForm.password ? 'password' : null].filter(Boolean) });
                setIsEditModalOpen(false);
                setEditingUser(null);
                setUserForm({ username: '', password: '', role: 'Employee', email: '', employee_id: '', is_active: 1 });
                fetchUsers();
            }
        } catch (error) {
            console.error("Update user error", error);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await logAction('DELETE_USER', { user_id: id });
                fetchUsers();
            }
        } catch (error) {
            console.error("Delete user error", error);
        }
    };

    const handleApproveUser = async (user: User) => {
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, is_active: 1 })
            });
            if (res.ok) {
                await logAction('APPROVE_USER', { user_id: user.id, username: user.username });
                fetchUsers();
            }
        } catch (error) {
            console.error("Approve user error", error);
        }
    };

    const handleRejectUser = async (user: User) => {
        if (!confirm(`Are you sure you want to reject registration for ${user.username}?`)) return;
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, is_active: -1 })
            });
            if (res.ok) {
                await logAction('REJECT_USER', { user_id: user.id, username: user.username });
                fetchUsers();
            }
        } catch (error) {
            console.error("Reject user error", error);
        }
    };

    const togglePasswordVisibility = (userId: number) => {
        const isCurrentlyVisible = !!showPasswordMap[userId];
        if (!isCurrentlyVisible) {
            logAction('VIEW_PASSWORD_MASK', { target_user_id: userId });
        }
        setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Username", "Full Name", "Email", "Role", "Status", "Joined Date"];
        const csvContent = [
            headers.join(","),
            ...filteredUsers.map(u => [
                u.id,
                `"${u.username}"`,
                `"${u.full_name}"`,
                `"${u.email}"`,
                `"${u.role}"`,
                u.is_active ? "Active" : "Inactive",
                new Date(u.created_at).toLocaleDateString()
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        logAction('EXPORT_USERS_CSV', { count: filteredUsers.length });
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.text("Melann HR Management System - User List", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["ID", "Username", "Full Name", "Email", "Role", "Status", "Joined"];
        const tableRows = filteredUsers.map(u => [
            u.id,
            u.username,
            u.full_name,
            u.email || 'N/A',
            u.role,
            u.is_active ? "Active" : "Inactive",
            new Date(u.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`users_export_${new Date().toISOString().split('T')[0]}.pdf`);
        logAction('EXPORT_USERS_PDF', { count: filteredUsers.length });
    };

    const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
        const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;

        let matchesStatus = true;
        if (statusFilter !== 'All Status') {
            if (statusFilter === 'Pending') matchesStatus = u.is_active === 0;
            else if (statusFilter === 'Active') matchesStatus = u.is_active === 1;
            else if (statusFilter === 'Inactive/Rejected') matchesStatus = u.is_active === -1;
        }

        const matches2fa = twoFaFilter === 'All 2FA' ||
            (twoFaFilter === 'Enabled' && u.two_fa_enabled) ||
            (twoFaFilter === 'Disabled' && !u.two_fa_enabled);

        return matchesSearch && matchesRole && matchesStatus && matches2fa;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

    if (loading && users.length === 0) return <div className="loading-state">Loading User Management System...</div>;

    // Access check
    if (currentUser && currentUser.role !== 'Admin') {
        return (
            <div className="access-denied-inline">
                <h2>🚫 Access Denied</h2>
                <p>Only administrators can access user management system.</p>
            </div>
        );
    }

    return (
        <div className="ums-container">
            {/* Header Section */}
            <div className="um-header">
                <div className="um-title-section">
                    <h2>User Management</h2>
                    <p className="um-subtitle">Manage system access and security roles</p>
                </div>
                <div className="um-actions">
                    <button className="um-btn um-btn-secondary" onClick={() => fetchUsers()} title="Refresh Data">
                        <span>🔄</span>
                    </button>
                    <button className="um-btn um-btn-secondary" onClick={handleExportCSV} title="Export CSV">
                        <span>📊</span> CSV
                    </button>
                    <button className="um-btn um-btn-secondary" onClick={handleExportPDF} title="Export PDF">
                        <span>📄</span> PDF
                    </button>
                    <button className="um-btn um-btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <span>➕</span> Add User
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="um-filters-card">
                <div className="um-search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name, email or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="um-filter-groups">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option>All Roles</option>
                        <option>Admin</option>
                        <option>HR</option>
                        <option>Manager</option>
                        <option>President</option>
                        <option>Vice President</option>
                        <option>Employee</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option>All Status</option>
                        <option>Pending</option>
                        <option>Active</option>
                        <option>Inactive/Rejected</option>
                    </select>
                    <select value={twoFaFilter} onChange={(e) => setTwoFaFilter(e.target.value)}>
                        <option>All 2FA</option>
                        <option>Enabled</option>
                        <option>Disabled</option>
                    </select>
                </div>
            </div>

            {/* Dark Themed Table Container */}
            <div className="um-table-wrapper">
                <table className="um-dark-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined Date</th>
                            <th>2FA Status</th>
                            <th>Password</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="um-user-info">
                                        <div className="um-avatar-small">{user.full_name?.charAt(0) || user.username?.charAt(0)}</div>
                                        <div className="um-name-details">
                                            <span className="um-full-name">{user.full_name}</span>
                                            <span className="um-username">@{user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{user.email || '—'}</td>
                                <td>
                                    <span className={`um-role-badge ${user.role.toLowerCase()}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    {user.is_active === 0 && (
                                        <span className="um-status-indicator pending">Pending Approval</span>
                                    )}
                                    {user.is_active === 1 && (
                                        <span className="um-status-indicator active">Active</span>
                                    )}
                                    {user.is_active === -1 && (
                                        <span className="um-status-indicator inactive">Rejected</span>
                                    )}
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td>
                                    <span className={`um-2fa-status ${user.two_fa_enabled ? 'enabled' : 'disabled'}`}>
                                        {user.two_fa_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td>
                                    <div className="um-password-field">
                                        <span className="um-password-masked">
                                            {showPasswordMap[user.id] ? '********' : '••••••••'}
                                        </span>
                                        <button
                                            className="um-eye-btn"
                                            onClick={() => togglePasswordVisibility(user.id)}
                                            title={showPasswordMap[user.id] ? "Mask Password" : "Log Password View Intent"}
                                        >
                                            {showPasswordMap[user.id] ? '👁️‍🗨️' : '👁️'}
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <div className="um-row-actions">
                                        {user.is_active === 0 && (
                                            <>
                                                <button className="um-action-btn approve" onClick={() => handleApproveUser(user)} title="Approve">✅</button>
                                                <button className="um-action-btn reject" onClick={() => handleRejectUser(user)} title="Reject">❌</button>
                                            </>
                                        )}
                                        <button className="um-action-btn edit" onClick={() => {
                                            setEditingUser(user);
                                            setUserForm({
                                                username: user.username,
                                                password: '',
                                                role: user.role,
                                                email: user.email,
                                                employee_id: user.employee_id?.toString() || '',
                                                is_active: user.is_active
                                            });
                                            setIsEditModalOpen(true);
                                        }}>✏️</button>
                                        <button className="um-action-btn delete" onClick={() => handleDeleteUser(user.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={8} className="um-empty-state">No users found matching your criteria.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="um-pagination">
                <div className="um-rows-per-page">
                    <span>Rows per page:</span>
                    <select value={rowsPerPage} onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                    }}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div className="um-page-navigation">
                    <span>{startIndex + 1} - {Math.min(startIndex + rowsPerPage, filteredUsers.length)} of {filteredUsers.length}</span>
                    <div className="um-nav-btns">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >◀</button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >▶</button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <div className="um-modal-overlay">
                    <div className="um-modal">
                        <div className="um-modal-header">
                            <h2>Add New User</h2>
                            <button onClick={() => setIsAddModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="um-modal-body">
                                <div className="um-form-grid">
                                    <div className="um-form-group">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            required
                                            value={userForm.username}
                                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="um-form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="um-form-group">
                                        <label>Password</label>
                                        <div className="um-form-input-with-icon">
                                            <input
                                                type={showFormPassword ? "text" : "password"}
                                                required
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="um-form-icon-btn"
                                                onClick={() => setShowFormPassword(!showFormPassword)}
                                            >
                                                {showFormPassword ? '👁️‍🗨️' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="um-form-group">
                                        <label>Role</label>
                                        <select
                                            value={userForm.role}
                                            onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                        >
                                            <option>Admin</option>
                                            <option>HR</option>
                                            <option>President</option>
                                            <option>Vice President</option>
                                            <option>Manager</option>
                                            <option>Employee</option>
                                        </select>
                                    </div>
                                    <div className="um-form-group um-full-width">
                                        <label>Link to Employee (Optional)</label>
                                        <select
                                            value={userForm.employee_id}
                                            onChange={e => setUserForm({ ...userForm, employee_id: e.target.value })}
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.last_name}, {emp.first_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="um-modal-footer">
                                <button type="button" className="um-btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="um-btn um-btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="um-modal-overlay">
                    <div className="um-modal">
                        <div className="um-modal-header">
                            <h2>Edit User: {editingUser?.username}</h2>
                            <button onClick={() => setIsEditModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="um-modal-body">
                                <div className="um-form-grid">
                                    <div className="um-form-group">
                                        <label>Username</label>
                                        <input type="text" value={userForm.username} disabled />
                                    </div>
                                    <div className="um-form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="um-form-group">
                                        <label>Reset Password (optional)</label>
                                        <div className="um-form-input-with-icon">
                                            <input
                                                type={showFormPassword ? "text" : "password"}
                                                placeholder="Enter new password to reset"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="um-form-icon-btn"
                                                onClick={() => setShowFormPassword(!showFormPassword)}
                                            >
                                                {showFormPassword ? '👁️‍🗨️' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="um-form-group">
                                        <label>Role</label>
                                        <select
                                            value={userForm.role}
                                            onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                        >
                                            <option>Admin</option>
                                            <option>HR</option>
                                            <option>President</option>
                                            <option>Vice President</option>
                                            <option>Manager</option>
                                            <option>Employee</option>
                                        </select>
                                    </div>
                                    <div className="um-form-group">
                                        <label>Account Status</label>
                                        <select
                                            value={userForm.is_active}
                                            onChange={e => setUserForm({ ...userForm, is_active: parseInt(e.target.value) })}
                                        >
                                            <option value={1}>Active</option>
                                            <option value={0}>Pending Approval</option>
                                            <option value={-1}>Rejected</option>
                                        </select>
                                    </div>
                                    <div className="um-form-group um-full-width">
                                        <label>Link to Employee</label>
                                        <select
                                            value={userForm.employee_id}
                                            onChange={e => setUserForm({ ...userForm, employee_id: e.target.value })}
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.last_name}, {emp.first_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="um-modal-footer">
                                <button type="button" className="um-btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="um-btn um-btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .ums-container {
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                }

                .um-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }

                .um-title-section h2 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .um-subtitle {
                    color: #64748b;
                    font-size: 14px;
                    margin: 5px 0 0;
                }

                .um-actions {
                    display: flex;
                    gap: 12px;
                }

                .um-btn {
                    padding: 10px 18px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .um-btn-primary {
                    background: #0ea5e9;
                    color: white;
                }

                .um-btn-primary:hover {
                    background: #0284c7;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
                }

                .um-btn-secondary {
                    background: white;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                }

                .um-btn-secondary:hover {
                    background: #f1f5f9;
                }

                .um-filters-card {
                    background: white;
                    padding: 16px;
                    border-radius: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 24px;
                    gap: 20px;
                }

                .um-search-wrapper {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }

                .um-search-wrapper input {
                    width: 100%;
                    padding: 10px 10px 10px 40px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    outline: none;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .um-search-wrapper input:focus {
                    border-color: #0ea5e9;
                }

                .um-filter-groups {
                    display: flex;
                    gap: 12px;
                }

                .um-filter-groups select {
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    color: #475569;
                    font-size: 13px;
                    outline: none;
                    cursor: pointer;
                }

                .um-table-wrapper {
                    background: #1e293b; /* Dark theme for table */
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                }

                .um-dark-table {
                    width: 100%;
                    border-collapse: collapse;
                    color: #e2e8f0;
                }

                .um-dark-table th {
                    text-align: left;
                    padding: 18px 20px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    border-bottom: 1px solid #334155;
                    background: #0f172a;
                }

                .um-dark-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid #334155;
                    font-size: 14px;
                }

                .um-dark-table tbody tr:hover {
                    background: #334155;
                }

                .um-user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .um-avatar-small {
                    width: 36px;
                    height: 36px;
                    background: #0ea5e9;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: white;
                }

                .um-name-details {
                    display: flex;
                    flex-direction: column;
                }

                .um-full-name {
                    font-weight: 600;
                    color: white;
                }

                .um-username {
                    font-size: 12px;
                    color: #94a3b8;
                }

                .um-role-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    background: #475569;
                }

                .um-role-badge.admin { background: #fee2e2; color: #991b1b; }
                .um-role-badge.hr { background: #dcfce7; color: #15803d; }
                .um-role-badge.manager { background: #fef9c3; color: #a16207; }
                .um-role-badge.employee { background: #e0f2fe; color: #0369a1; }

                .um-status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .um-status-indicator::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .um-status-indicator.active { color: #4ade80; }
                .um-status-indicator.active::before { background: #4ade80; }
                .um-status-indicator.pending { color: #fbbf24; }
                .um-status-indicator.pending::before { background: #fbbf24; }
                .um-status-indicator.inactive { color: #f87171; }
                .um-status-indicator.inactive::before { background: #f87171; }

                .um-2fa-status {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    border: 1px solid transparent;
                }

                .um-2fa-status.enabled { border-color: #4ade80; color: #4ade80; }
                .um-2fa-status.disabled { border-color: #64748b; color: #94a3b8; }

                .um-password-field {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .um-password-masked {
                    font-family: monospace;
                    letter-spacing: 2px;
                    color: #94a3b8;
                }

                .um-eye-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                    filter: grayscale(1);
                    transition: filter 0.2s;
                }

                .um-eye-btn:hover {
                    filter: grayscale(0);
                }

                .um-row-actions {
                    display: flex;
                    gap: 8px;
                }

                .um-action-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #334155;
                    border: 1px solid #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .um-action-btn:hover {
                    background: #475569;
                }

                .um-action-btn.edit:hover {
                    background: #0ea5e9;
                    border-color: #0ea5e9;
                }

                .um-action-btn.approve:hover {
                    background: #4ade80;
                    border-color: #4ade80;
                }

                .um-action-btn.reject:hover {
                    background: #f87171;
                    border-color: #f87171;
                }

                .um-action-btn.delete:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                }

                .um-pagination {
                    margin-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #64748b;
                    font-size: 13px;
                }

                .um-rows-per-page {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .um-rows-per-page select {
                    background: transparent;
                    border: 1px solid #e2e8f0;
                    padding: 4px 8px;
                    border-radius: 4px;
                }

                .um-page-navigation {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .um-nav-btns {
                    display: flex;
                    gap: 8px;
                }

                .um-nav-btns button {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    transition: all 0.2s;
                }

                .um-nav-btns button:hover:not(:disabled) {
                    background: #f1f5f9;
                    color: #0ea5e9;
                    border-color: #0ea5e9;
                }

                .um-nav-btns button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Modal Styles */
                .um-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .um-modal {
                    background: white;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 600px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .um-modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .um-modal-header h2 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .um-modal-header button {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #94a3b8;
                    cursor: pointer;
                }

                .um-modal-body {
                    padding: 24px;
                }

                .um-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .um-form-group {
                    display: flex;
                    flex-direction: column;
                }

                .um-full-width {
                    grid-column: span 2;
                }

                .um-form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #475569;
                    margin-bottom: 8px;
                }

                .um-form-input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .um-form-icon-btn {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background 0.2s;
                    z-index: 10;
                }

                .um-form-icon-btn:hover {
                    background: rgba(0,0,0,0.05);
                }

                .um-form-group input, .um-form-group select {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    outline: none;
                    font-size: 14px;
                }

                .um-form-group input:focus {
                    border-color: #0ea5e9;
                }

                .um-modal-footer {
                    padding: 20px 24px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .um-btn-cancel {
                    background: transparent;
                    border: none;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                }

                .um-empty-state {
                    text-align: center;
                    padding: 50px !important;
                    color: #94a3b8;
                }

                .access-denied-inline {
                    padding: 50px;
                    text-align: center;
                    color: #64748b;
                }

                .loading-state {
                    padding: 50px;
                    text-align: center;
                    color: #64748b;
                }
            `}</style>
        </div>
    );
}
