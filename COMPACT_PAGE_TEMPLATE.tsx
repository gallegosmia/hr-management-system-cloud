/**
 * Compact Page Template
 * Use this as a reference when converting pages to compact sizing
 * Target: 1366×768 screen, no vertical scrolling
 */

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function CompactPageTemplate() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        department: 'all'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Fetch logic here
        setLoading(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="compact-page-wrapper">
                {/* Page Header - Compact */}
                <div className="page-header">
                    <div className="header-left">
                        <h1>Page Title</h1>
                        <p className="subtitle">Brief description</p>
                    </div>
                    <div className="header-actions">
                        <button className="compact-btn compact-btn-primary">
                            <span>➕</span> Add New
                        </button>
                    </div>
                </div>

                {/* Stats/Metrics Row - Compact */}
                <div className="metrics-grid">
                    <div className="compact-metric-card">
                        <div className="metric-info">
                            <span className="compact-metric-label">Total Items</span>
                            <h3 className="compact-metric-value">125</h3>
                            <div className="metric-trend">↑ 12%</div>
                        </div>
                        <div className="compact-metric-icon">📊</div>
                    </div>

                    <div className="compact-metric-card">
                        <div className="metric-info">
                            <span className="compact-metric-label">Active</span>
                            <h3 className="compact-metric-value">98</h3>
                            <div className="metric-trend">↑ 5%</div>
                        </div>
                        <div className="compact-metric-icon">✅</div>
                    </div>

                    <div className="compact-metric-card">
                        <div className="metric-info">
                            <span className="compact-metric-label">Pending</span>
                            <h3 className="compact-metric-value">15</h3>
                            <div className="metric-trend">↓ 3%</div>
                        </div>
                        <div className="compact-metric-icon">⏳</div>
                    </div>

                    <div className="compact-metric-card">
                        <div className="metric-info">
                            <span className="compact-metric-label">Completed</span>
                            <h3 className="compact-metric-value">12</h3>
                            <div className="metric-trend">→ 0%</div>
                        </div>
                        <div className="compact-metric-icon">🎯</div>
                    </div>
                </div>

                {/* Filters Section - Compact */}
                <div className="filters-section">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="compact-input"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                    <select
                        className="compact-select"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                    </select>
                    <select
                        className="compact-select"
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                        <option value="all">All Departments</option>
                        <option value="hr">HR</option>
                        <option value="it">IT</option>
                    </select>
                    <button className="compact-btn compact-btn-secondary">
                        Clear Filters
                    </button>
                </div>

                {/* Main Content - Compact Table */}
                <div className="content-section">
                    <div className="table-container">
                        <table className="compact-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.id}</td>
                                        <td>{item.name}</td>
                                        <td>{item.department}</td>
                                        <td>
                                            <span className="compact-badge compact-badge-success">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>{item.date}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="compact-btn compact-btn-sm">
                                                    View
                                                </button>
                                                <button className="compact-btn compact-btn-sm">
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* Page Wrapper - CRITICAL for 648px constraint */
                .compact-page-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 0;
                    margin: 0;
                    max-height: 648px;
                    overflow: hidden;
                }

                /* Page Header - Compact */
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }

                .page-header h1 {
                    font-size: 1.25rem;
                    margin: 0;
                    color: #1e293b;
                    font-weight: 700;
                }

                .subtitle {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin: 2px 0 0 0;
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                /* Metrics Grid - Compact */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .compact-metric-card {
                    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                    padding: 12px 14px;
                    border-radius: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    border: 1px solid #f1f5f9;
                    height: 70px;
                }

                .metric-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .compact-metric-label {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                }

                .compact-metric-value {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0;
                    line-height: 1;
                }

                .metric-trend {
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: #10b981;
                }

                .compact-metric-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    background: #f8fafc;
                }

                /* Filters Section - Compact */
                .filters-section {
                    display: flex;
                    gap: 10px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }

                .compact-input,
                .compact-select {
                    padding: 6px 10px;
                    font-size: 0.7rem;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    height: 32px;
                }

                .compact-input {
                    flex: 1;
                }

                .compact-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                /* Content Section - Compact */
                .content-section {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    overflow: hidden;
                    flex: 1;
                    min-height: 0;
                }

                .table-container {
                    overflow-y: auto;
                    max-height: 380px;
                }

                /* Compact Table */
                .compact-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.7rem;
                }

                .compact-table thead th {
                    padding: 8px 10px;
                    background: #f8fafc;
                    color: #475569;
                    font-weight: 600;
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 2px solid #e2e8f0;
                    text-align: left;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .compact-table tbody td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    height: 36px;
                }

                .compact-table tbody tr:hover {
                    background: #f8fafc;
                }

                /* Badges */
                .compact-badge {
                    padding: 2px 8px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    border-radius: 4px;
                    display: inline-block;
                }

                .compact-badge-success {
                    background: #dcfce7;
                    color: #166534;
                }

                /* Buttons */
                .compact-btn {
                    padding: 6px 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    border-radius: 6px;
                    height: 32px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .compact-btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .compact-btn-primary:hover {
                    background: #2563eb;
                }

                .compact-btn-secondary {
                    background: #f1f5f9;
                    color: #64748b;
                }

                .compact-btn-secondary:hover {
                    background: #e2e8f0;
                }

                .compact-btn-sm {
                    padding: 4px 10px;
                    font-size: 0.65rem;
                    height: 28px;
                }

                .action-buttons {
                    display: flex;
                    gap: 6px;
                }

                /* Loading State */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #64748b;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e2e8f0;
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Scrollbar */
                .table-container::-webkit-scrollbar {
                    width: 4px;
                }

                .table-container::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }

                .table-container::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }

                .table-container::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </DashboardLayout>
    );
}
