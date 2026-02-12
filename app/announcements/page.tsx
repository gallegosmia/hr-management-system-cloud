'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Announcement } from '@/lib/data';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'Announcement',
        priority: 'Normal',
        target_branch: 'All',
        target_department: 'All',
        target_employee_id: null as number | null,
        is_active: true
    });
    const [empSearchTerm, setEmpSearchTerm] = useState('');
    const [targetMode, setTargetMode] = useState<'Branch' | 'Employee'>('Branch');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const savedBranch = localStorage.getItem('selectedBranch');

        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            const isManager = parsedUser.role === 'HR' ||
                parsedUser.role === 'President' ||
                parsedUser.role === 'Vice President' ||
                parsedUser.username === 'superadmin';

            // Respect global branch scope if saved, otherwise fallback to role-based logic
            const branchToUse = savedBranch || (isManager ? 'All' : (parsedUser.assigned_branch || 'All'));

            if (isManager) {
                fetchAnnouncements(branchToUse);
                fetchEmployees();
            } else {
                fetchAnnouncements(branchToUse, parsedUser.employee_id);
            }
        }
    }, []);

    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees', {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (response.ok) {
                const data = await response.json();
                // Ensure data is an array
                if (Array.isArray(data)) {
                    setEmployees(data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchAnnouncements = async (currentBranch?: string, employeeId?: number) => {
        try {
            setLoading(true);
            let url = '/api/announcements?is_active=true';
            if (currentBranch && currentBranch !== 'All') {
                url += `&branch=${encodeURIComponent(currentBranch)}`;
            }
            if (employeeId) {
                url += `&employee_id=${employeeId}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data);
            }
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (announcement: Announcement | null = null) => {
        setEmpSearchTerm('');
        if (announcement) {
            setEditingAnnouncement(announcement);
            setTargetMode(announcement.target_employee_id ? 'Employee' : 'Branch');
            setFormData({
                title: announcement.title,
                content: announcement.content,
                category: announcement.category as any,
                priority: announcement.priority as any,
                target_branch: announcement.target_branch,
                target_department: announcement.target_department,
                target_employee_id: announcement.target_employee_id || null,
                is_active: announcement.is_active
            });
        } else {
            const savedBranch = localStorage.getItem('selectedBranch') || 'All';
            setEditingAnnouncement(null);
            setTargetMode('Branch');
            setFormData({
                title: '',
                content: '',
                category: 'Announcement',
                priority: 'Normal',
                target_branch: savedBranch,
                target_department: 'All',
                target_employee_id: null,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingAnnouncement ? 'PATCH' : 'POST';
            const url = editingAnnouncement ? `/api/announcements/${editingAnnouncement.id}` : '/api/announcements';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    author_id: user.id
                })
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchAnnouncements(user.role === 'Employee' ? user.assigned_branch : undefined, user.role === 'Employee' ? user.employee_id : undefined);
            } else {
                alert('Something went wrong');
            }
        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchAnnouncements(user.role === 'Employee' ? user.assigned_branch : undefined, user.role === 'Employee' ? user.employee_id : undefined);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handlePrint = (ann: Announcement) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Announcement - ${ann.title}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #111827; }
                        .header { border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { font-size: 28px; font-weight: 800; margin: 0; }
                        .meta { color: #6b7280; font-size: 14px; margin-top: 5px; }
                        .badges { margin-top: 15px; display: flex; gap: 10px; }
                        .badge { padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #f3f4f6; text-transform: uppercase; }
                        .content { line-height: 1.6; font-size: 16px; white-space: pre-wrap; }
                        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">${ann.title}</div>
                        <div class="meta">By ${ann.author_name} • ${format(new Date(ann.created_at), 'MMMM dd, yyyy')}</div>
                        <div class="badges">
                            <span class="badge">${ann.category}</span>
                            <span class="badge">${ann.priority} Priority</span>
                            <span class="badge">${ann.target_branch}</span>
                        </div>
                    </div>
                    <div class="content">${ann.content}</div>
                    <div class="footer">
                        <div>Official Document - HR Management System</div>
                        <div>Generated on ${new Date().toLocaleString()}</div>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportPDF = (ann: Announcement) => {
        const doc = new jsPDF();

        // Branded header
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('OFFICIAL MEMO', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ref ID: #${ann.id.toString().padStart(5, '0')}`, 160, 25);

        // Body Content
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(ann.title, 20, 60);

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(`From: ${ann.author_name}`, 20, 70);
        doc.text(`Date: ${format(new Date(ann.created_at), 'MMMM dd, yyyy')}`, 20, 75);
        doc.text(`Target: ${ann.target_branch} / ${ann.target_department}${ann.target_employee_name ? ` / Specifically: ${ann.target_employee_name}` : ''}`, 20, 80);

        doc.setDrawColor(243, 244, 246);
        doc.line(20, 90, 190, 90);

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const splitContent = doc.splitTextToSize(ann.content, 170);
        doc.text(splitContent, 20, 105);

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(156, 163, 175);
            doc.text('Digital HR Management System - Authorized Personal Only', 20, 285);
            doc.text(`Page ${i} of ${pageCount}`, 170, 285);
        }

        doc.save(`${ann.category}_${ann.id}.pdf`);
    };

    const isAuthorized = user?.role === 'HR' ||
        user?.role === 'President' ||
        user?.role === 'Vice President' ||
        user?.username === 'superadmin';

    const filteredAnnouncements = announcements.filter(ann =>
        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="announcements-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Announcements</h1>
                        <p className="page-subtitle">Stay updated with company news</p>
                    </div>
                    {isAuthorized && (
                        <button className="create-btn" onClick={() => handleOpenModal()}>
                            <span>➕</span> Create New
                        </button>
                    )}
                </div>

                <div className="search-section">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search memos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading announcements...</p>
                    </div>
                ) : filteredAnnouncements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📢</div>
                        <h3>No Announcements Yet</h3>
                        <p>Official company updates will appear here.</p>
                    </div>
                ) : (
                    <div className="announcements-list">
                        {filteredAnnouncements.map((ann) => (
                            <div key={ann.id} className="announcement-card-modern">
                                <div className="card-top">
                                    <div className="badge-row">
                                        <span className={`badge-pilled category-${ann.category.toLowerCase()}`}>
                                            {ann.category.toUpperCase()}
                                        </span>
                                        <span className={`badge-pilled priority-${ann.priority.toLowerCase()}`}>
                                            {ann.priority.toUpperCase()}
                                        </span>
                                        {ann.target_employee_id && (
                                            <span className="badge-pilled private-badge">
                                                PRIVATE 🔒
                                            </span>
                                        )}
                                    </div>
                                    <div className="action-row">
                                        <button onClick={() => setSelectedAnnouncement(ann)} className="action-icon-btn" title="View Full">👁️</button>
                                        <button onClick={() => handlePrint(ann)} className="action-icon-btn" title="Print">🖨️</button>
                                        <button onClick={() => handleExportPDF(ann)} className="action-icon-btn" title="Export PDF">📅</button>

                                        {isAuthorized && (
                                            <div className="admin-actions">
                                                <button onClick={() => handleOpenModal(ann)} className="action-icon-btn edit">✏️</button>
                                                <button onClick={() => handleDelete(ann.id)} className="action-icon-btn delete">🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="card-main" onClick={() => setSelectedAnnouncement(ann)}>
                                    <h2 className="title">{ann.title}</h2>
                                    <p className="description">{ann.content.length > 200 ? ann.content.substring(0, 200) + '...' : ann.content}</p>
                                </div>

                                <div className="card-bottom">
                                    <div className="author-side">
                                        <div className="avatar-circle">
                                            {ann.author_name?.[0]?.toUpperCase() || 'S'}
                                        </div>
                                        <div className="author-meta">
                                            <span className="name">{ann.author_name || 'System Admin'}</span>
                                            <span className="date">
                                                {format(new Date(ann.created_at), 'MMM dd, yyyy • hh:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="target-side">
                                        <div className="target-pill">
                                            <span className="icon">📌</span> {ann.target_branch}
                                        </div>
                                        <div className="target-pill">
                                            <span className="icon">👥</span> {ann.target_employee_name || ann.target_department}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content glass-effect">
                            <div className="modal-header">
                                <h2>{editingAnnouncement ? 'Edit Announcement' : 'Post New Announcement'}</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
                            </div>
                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="modal-body-scroll">
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                            placeholder="e.g. Schedule for Monthly Meeting"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Category</label>
                                            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}>
                                                <option value="Announcement">Announcement</option>
                                                <option value="Memo">Memo</option>
                                                <option value="Policy">Policy</option>
                                                <option value="Holiday">Holiday</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Priority</label>
                                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}>
                                                <option value="Low">Low</option>
                                                <option value="Normal">Normal</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="target-selection-area">
                                        <div className="target-mode-tabs">
                                            <button
                                                type="button"
                                                className={`target-tab ${targetMode === 'Branch' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setTargetMode('Branch');
                                                    setFormData({ ...formData, target_employee_id: null });
                                                }}
                                            >
                                                📢 Broadcast
                                            </button>
                                            <button
                                                type="button"
                                                className={`target-tab ${targetMode === 'Employee' ? 'active' : ''}`}
                                                onClick={() => setTargetMode('Employee')}
                                            >
                                                👤 Individual
                                            </button>
                                        </div>

                                        <div className="target-form-grid">
                                            <div className="form-group">
                                                <label>Branch Scope</label>
                                                <select
                                                    value={formData.target_branch}
                                                    onChange={(e) => {
                                                        const b = e.target.value;
                                                        setFormData({ ...formData, target_branch: b, target_employee_id: null });
                                                        setEmpSearchTerm('');
                                                    }}
                                                >
                                                    <option value="All">All Branches</option>
                                                    <option value="Head Office">Head Office</option>
                                                    <option value="Naval">Naval</option>
                                                    <option value="Ormoc">Ormoc</option>
                                                </select>
                                            </div>

                                            {targetMode === 'Employee' && (
                                                <div className="form-group">
                                                    <label>Target Employee</label>
                                                    <div className="searchable-emp-group">
                                                        <input
                                                            type="text"
                                                            className="emp-search-box"
                                                            placeholder="🔍 Find employee..."
                                                            value={empSearchTerm}
                                                            onChange={(e) => setEmpSearchTerm(e.target.value)}
                                                        />
                                                        <select
                                                            value={formData.target_employee_id || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value ? parseInt(e.target.value) : null;
                                                                setFormData({ ...formData, target_employee_id: val });
                                                            }}
                                                            required={targetMode === 'Employee'}
                                                        >
                                                            <option value="">-- Select One Particular Employee --</option>
                                                            {employees
                                                                .filter(emp => formData.target_branch === 'All' || emp.branch === formData.target_branch)
                                                                .filter(emp => (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(empSearchTerm.toLowerCase()))
                                                                .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
                                                                .map(emp => (
                                                                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.branch})</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Content</label>
                                        <textarea
                                            rows={8}
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            required
                                            placeholder="Enter full memo or announcement details here..."
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="submit-btn">{editingAnnouncement ? 'Save Changes' : 'Publish'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Modal */}
                {selectedAnnouncement && (
                    <div className="modal-overlay" onClick={() => setSelectedAnnouncement(null)}>
                        <div className="modal-content view-large" onClick={e => e.stopPropagation()}>
                            <div className="view-modal-header">
                                <div className="badge-row">
                                    <span className={`badge-pilled category-${selectedAnnouncement.category.toLowerCase()}`}>
                                        {selectedAnnouncement.category.toUpperCase()}
                                    </span>
                                    <span className={`badge-pilled priority-${selectedAnnouncement.priority.toLowerCase()}`}>
                                        {selectedAnnouncement.priority.toUpperCase()}
                                    </span>
                                </div>
                                <button className="close-btn" onClick={() => setSelectedAnnouncement(null)}>×</button>
                            </div>
                            <div className="view-modal-body">
                                <h2 className="view-title">{selectedAnnouncement.title}</h2>
                                <div className="view-meta-row">
                                    <div className="meta-item">
                                        <span className="label">Published By</span>
                                        <span className="value">{selectedAnnouncement.author_name}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="label">Date</span>
                                        <span className="value">{format(new Date(selectedAnnouncement.created_at), 'MMMM dd, yyyy • hh:mm a')}</span>
                                    </div>
                                    {selectedAnnouncement.target_employee_name && (
                                        <div className="meta-item">
                                            <span className="label">Direct Recipient</span>
                                            <span className="value">👤 {selectedAnnouncement.target_employee_name} (Private)</span>
                                        </div>
                                    )}
                                </div>
                                <div className="view-content-box">
                                    {selectedAnnouncement.content.split('\n').map((line, i) => (
                                        <p key={i}>{line}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="view-modal-footer">
                                <button className="print-btn" onClick={() => handlePrint(selectedAnnouncement)}>Print Copy 🖨️</button>
                                <button className="export-btn" onClick={() => handleExportPDF(selectedAnnouncement)}>Export PDF 📅</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .announcements-container {
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                }
                .page-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #111827;
                    margin: 0;
                    letter-spacing: -0.025em;
                }
                .page-subtitle {
                    margin: 4px 0 0;
                    color: #6b7280;
                    font-size: 1.1rem;
                }
                .create-btn {
                    padding: 12px 24px;
                    background: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                }
                .create-btn:hover {
                    background: #4338ca;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
                }

                .search-section {
                    margin-bottom: 35px;
                }
                .search-bar {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 9999px;
                    padding: 14px 28px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                .search-icon { color: #9ca3af; font-size: 1.25rem; }
                .search-bar input {
                    border: none;
                    background: none;
                    outline: none;
                    width: 100%;
                    font-size: 1.1rem;
                    color: #1f2937;
                }

                .searchable-emp-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .emp-search-box {
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                    background: #fdfdfd;
                }

                .emp-search-box:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                    background: white;
                }

                .target-selection-area {
                    margin-bottom: 20px;
                    background: #fdfdfd;
                    border: 1px solid #f3f4f6;
                    border-radius: 20px;
                    padding: 20px;
                }

                .target-mode-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .target-tab {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    border: 2px solid #f3f4f6;
                    background: white;
                    color: #6b7280;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .target-tab.active {
                    border-color: #3b82f6;
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .target-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .announcements-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .announcement-card-modern {
                    background: white;
                    border-radius: 32px;
                    padding: 30px;
                    border: 1px solid #f3f4f6;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.05);
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .announcement-card-modern:hover {
                    box-shadow: 0 20px 50px -10px rgba(0,0,0,0.1);
                    transform: translateY(-4px);
                    border-color: #e5e7eb;
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .badge-row { display: flex; gap: 10px; }
                .badge-pilled {
                    padding: 6px 16px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                }
                .category-announcement { background: #eff6ff; color: #1d4ed8; }
                .category-memo { background: #fffbeb; color: #b45309; }
                .category-policy { background: #f0fdf4; color: #15803d; }
                .category-holiday { background: #f9fafb; color: #4b5563; }

                .priority-urgent { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
                .priority-high { background: #ffedd5; color: #ea580c; }
                .priority-normal { background: #f3f4f6; color: #6b7280; }
                .priority-low { background: #f0fdf4; color: #16a34a; }
                .private-badge { background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; }

                .action-row { display: flex; gap: 8px; align-items: center; }
                .action-icon-btn {
                    width: 36px; height: 36px; border-radius: 12px; border: none; background: #f9fafb;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem; transition: all 0.2s; color: #6b7280;
                }
                .action-icon-btn:hover { background: #eff6ff; color: #2563eb; transform: scale(1.1); }
                .admin-actions { display: flex; gap: 8px; margin-left: 8px; padding-left: 8px; border-left: 1px solid #e5e7eb; }
                .action-icon-btn.delete:hover { background: #fef2f2; color: #ef4444; }

                .card-main { margin-bottom: 28px; }
                .title { font-size: 1.85rem; font-weight: 900; color: #111827; margin: 0 0 10px; letter-spacing: -0.02em; }
                .description { font-size: 1.15rem; color: #4b5563; margin: 0; line-height: 1.6; }

                .card-bottom {
                    display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid #f9fafb;
                }
                .author-side { display: flex; align-items: center; gap: 14px; }
                .avatar-circle {
                    width: 52px; height: 52px; background: linear-gradient(135deg, #4f46e5, #818cf8);
                    border-radius: 16px; display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 800; font-size: 1.4rem; box-shadow: 0 8px 15px rgba(79, 70, 229, 0.2);
                }
                .author-meta { display: flex; flex-direction: column; }
                .name { font-size: 1.05rem; font-weight: 800; color: #111827; }
                .date { font-size: 0.85rem; color: #9ca3af; font-weight: 500; margin-top: 2px; }

                .target-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
                .target-pill { font-size: 0.875rem; font-weight: 700; color: #6b7280; display: flex; align-items: center; gap: 8px; background: #f9fafb; padding: 4px 12px; border-radius: 8px; }

                /* Large View Modal */
                .view-large { max-width: 800px !important; }
                .view-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .view-title { font-size: 2.5rem; font-weight: 900; color: #111827; margin: 0 0 20px; letter-spacing: -0.03em; line-height: 1.1; }
                .view-meta-row { display: flex; gap: 40px; margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 20px; }
                .meta-item { display: flex; flex-direction: column; gap: 4px; }
                .meta-item .label { font-size: 0.75rem; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
                .meta-item .value { font-size: 1rem; font-weight: 700; color: #111827; }
                .view-content-box { font-size: 1.2rem; color: #374151; line-height: 1.8; white-space: pre-wrap; padding: 10px; }
                .view-modal-footer { margin-top: 40px; padding-top: 30px; border-top: 2px solid #f3f4f6; display: flex; gap: 15px; }
                .print-btn, .export-btn { flex: 1; padding: 16px; border-radius: 16px; font-weight: 800; cursor: pointer; border: none; transition: all 0.2s; }
                .print-btn { background: #f3f4f6; color: #4b5563; }
                .export-btn { background: #111827; color: white; }
                .export-btn:hover { background: #000; transform: translateY(-2px); }

                /* Form Modal */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px);
                    display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
                }
                .modal-content {
                    background: white; border-radius: 40px; width: 100%; max-width: 800px; padding: 40px;
                    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                }
                .modal-form {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    overflow: hidden;
                }
                .modal-body-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 15px; /* Space for scrollbar */
                    margin-right: -15px;
                }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-shrink: 0; }
                .modal-header h2 { font-size: 1.75rem; font-weight: 900; color: #111827; }
                .close-btn { 
                    background: none; border: none; font-size: 2rem; color: #9ca3af; 
                    cursor: pointer; transition: color 0.2s; line-height: 1;
                }
                .close-btn:hover { color: #ef4444; }

                .form-group { margin-bottom: 24px; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                label { display: block; font-size: 0.9rem; font-weight: 800; color: #374151; margin-bottom: 10px; }
                input, select, textarea {
                    width: 100%; padding: 14px 20px; border: 2px solid #f3f4f6; border-radius: 16px;
                    font-size: 1rem; color: #111827; background: #f9fafb; outline: none; transition: all 0.2s;
                }
                input:focus, select:focus, textarea:focus { border-color: #4f46e5; background: white; }

                .modal-actions { 
                    display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px; 
                    padding-top: 20px; border-top: 1px solid #f3f4f6; flex-shrink: 0;
                }
                .cancel-btn { padding: 14px 28px; background: #f3f4f6; color: #4b5563; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; }
                .submit-btn { padding: 14px 28px; background: #4f46e5; color: white; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; }

                .loading-state { text-align: center; padding: 150px 0; }
                .spinner { width: 50px; height: 50px; border: 4px solid #f3f4f6; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
