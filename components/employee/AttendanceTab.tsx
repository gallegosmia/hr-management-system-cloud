'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { format, differenceInHours, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceRecord {
    id: number;
    date: string;
    morning_in?: string;
    morning_out?: string;
    afternoon_in?: string;
    afternoon_out?: string;
    status: string;
    remarks?: string;
}

interface AttendanceTabProps {
    employeeId: number;
}

// --- Icons / Components ---
const StatusBadge = ({ status }: { status: string }) => {
    let styles = { bg: '#f3f4f6', color: '#4b5563' };

    switch (status) {
        case 'Present':
            styles = { bg: '#dcfce7', color: '#166534' }; // Light green
            break;
        case 'Absent':
            styles = { bg: '#fee2e2', color: '#991b1b' };
            break;
        case 'Late':
            styles = { bg: '#fff7ed', color: '#9a3412' }; // Soft orange
            break;
        case 'Half-Day':
            styles = { bg: '#fef9c3', color: '#854d0e' };
            break;
        case 'On Leave':
            styles = { bg: '#e0f2fe', color: '#075985' };
            break;
        default:
            styles = { bg: '#f1f5f9', color: '#475569' };
    }

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            backgroundColor: styles.bg,
            color: styles.color,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {status}
        </span>
    );
};

const TimeCell = ({ time }: { time?: string }) => {
    if (!time) return <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>--:--</span>;
    try {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{`${h12}:${minutes}`}</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>{ampm}</span>
            </div>
        );
    } catch {
        return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>--:--</span>;
    }
};

export default function AttendanceTab({ employeeId }: AttendanceTabProps) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchAttendance();
    }, [employeeId, startDate, endDate]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'Present').length;
        const late = records.filter(r => r.status === 'Late').length;

        let totalHours = 0;
        let countWithHours = 0;

        records.forEach(r => {
            if (r.morning_in && r.afternoon_out) {
                try {
                    const start = parseISO(`${r.date}T${r.morning_in}`);
                    const end = parseISO(`${r.date}T${r.afternoon_out}`);
                    const diff = differenceInHours(end, start);
                    if (diff > 0) {
                        totalHours += diff;
                        countWithHours++;
                    }
                } catch (e) { }
            }
        });

        const avgHours = countWithHours > 0 ? (totalHours / countWithHours).toFixed(1) : '0';

        return { total, present, late, avgHours };
    }, [records]);

    const handleDownloadReport = () => {
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text(`Employee Attendance Report`, 14, 20);
        doc.setFontSize(11);
        doc.text(`Employee ID: ${employeeId}`, 14, 28);
        doc.text(`Period: ${format(parseISO(startDate), 'MMMM dd, yyyy')} - ${format(parseISO(endDate), 'MMMM dd, yyyy')}`, 14, 34);

        const tableBody = records.map(r => [
            format(parseISO(r.date), 'MMM dd, yyyy'),
            r.morning_in || '-',
            r.morning_out || '-',
            r.afternoon_in || '-',
            r.afternoon_out || '-',
            r.status,
            r.remarks || '-'
        ]);

        autoTable(doc, {
            head: [['Date', 'AM In', 'AM Out', 'PM In', 'PM Out', 'Status', 'Remarks']],
            body: tableBody,
            startY: 40,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] }
        });

        doc.save(`Attendance_Report_${employeeId}_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div className="attendance-tab-container">
            {/* Background Overlay */}
            <div className="theme-overlay"></div>

            <div className="content-relative">
                {/* Header Card */}
                <div className="header-card">
                    <div className="header-info">
                        <h2 className="title">Attendance Records</h2>
                        <p className="subtitle">View and monitor employee daily time logs and status.</p>
                    </div>

                    <div className="header-controls">
                        <div className="date-picker-group">
                            <div className="picker">
                                <label>FROM</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="picker-divider"></div>
                            <div className="picker">
                                <label>TO</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <button className="btn-download" onClick={handleDownloadReport}>
                            <div className="btn-inner">
                                <span className="btn-icon">📥</span>
                                <div className="btn-text">
                                    <span>Download</span>
                                    <span>Report</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Table Card */}
                <div className="table-card">
                    <div className="table-header-part">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>DATE</th>
                                    <th className="center">AM IN</th>
                                    <th className="center">AM OUT</th>
                                    <th className="center">PM IN</th>
                                    <th className="center">PM OUT</th>
                                    <th style={{ width: '15%' }}>STATUS</th>
                                    <th style={{ width: '20%' }}>REMARKS</th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div className="table-body-part">
                        <table className="attendance-table">
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="status-msg">Loading records...</td></tr>
                                ) : records.length === 0 ? (
                                    <tr><td colSpan={7} className="status-msg">No attendance found for this period.</td></tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={r.id}>
                                            <td style={{ width: '15%', fontWeight: 700, color: '#1e293b' }}>
                                                {format(parseISO(r.date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="center"><TimeCell time={r.morning_in} /></td>
                                            <td className="center"><TimeCell time={r.morning_out} /></td>
                                            <td className="center"><TimeCell time={r.afternoon_in} /></td>
                                            <td className="center"><TimeCell time={r.afternoon_out} /></td>
                                            <td style={{ width: '15%' }}><StatusBadge status={r.status} /></td>
                                            <td style={{ width: '20%', fontSize: '0.8rem', color: '#64748b' }}>
                                                {r.remarks || '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="metrics-grid">
                    <div className="metric-card">
                        <span className="m-label">TOTAL DAYS</span>
                        <div className="m-value">{metrics.total}</div>
                        <div className="m-icon">📅</div>
                    </div>
                    <div className="metric-card">
                        <span className="m-label">PRESENT</span>
                        <div className="m-value highlight-green">{metrics.present}</div>
                        <div className="m-icon">✅</div>
                    </div>
                    <div className="metric-card">
                        <span className="m-label">LATE ARRIVALS</span>
                        <div className="m-value highlight-orange">{metrics.late}</div>
                        <div className="m-icon">⏰</div>
                    </div>
                    <div className="metric-card">
                        <span className="m-label">AVG WORK HOURS</span>
                        <div className="m-value">{metrics.avgHours}h</div>
                        <div className="m-icon">📊</div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .attendance-tab-container {
                    position: relative;
                    min-height: 400px;
                    max-height: 70vh; /* Adjust height to fit screen */
                    overflow-y: auto; /* Enable vertical scolling */
                    padding: 1rem;
                    border-radius: 20px;
                    /* Custom Scrollbar */
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }

                .attendance-tab-container::-webkit-scrollbar { width: 6px; }
                .attendance-tab-container::-webkit-scrollbar-track { background: transparent; }
                .attendance-tab-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }


                .theme-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(232, 245, 233, 0.4); /* Light green transparent overlay */
                    backdrop-filter: blur(4px);
                    z-index: 1;
                }

                .content-relative {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                /* Cards */
                .header-card, .table-card {
                    background: white;
                    border-radius: 20px;
                    padding: 1.5rem;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                }

                .header-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }

                .title { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.02em; }
                .subtitle { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0; }

                /* Header Controls */
                .header-controls { display: flex; gap: 1.25rem; align-items: center; }
                
                .date-picker-group {
                    display: flex;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 0.35rem 1rem;
                    align-items: center;
                    gap: 1rem;
                }
                .picker { display: flex; flex-direction: column; }
                .picker label { font-size: 0.6rem; font-weight: 800; color: #94a3b8; margin-bottom: 0.1rem; }
                .picker input { 
                    border: none; background: transparent; font-size: 0.8rem; font-weight: 700; color: #334155; 
                    outline: none; padding: 0;
                }
                .picker-divider { width: 1px; height: 24px; background: #e2e8f0; }

                .btn-download {
                    background: #2ecc71;
                    color: white;
                    border: none;
                    padding: 0.6rem 1rem;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.2);
                    min-width: 140px;
                    height: 80px; /* Tall button as per image */
                }
                .btn-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                }
                .btn-icon {
                    background: rgba(255,255,255,0.2);
                    padding: 8px;
                    border-radius: 10px;
                    font-size: 1.2rem;
                    display: flex;
                }
                .btn-text {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    line-height: 1.2;
                    text-align: left;
                }
                .btn-text span:first-child { font-size: 0.9rem; }
                .btn-text span:last-child { font-size: 1.1rem; font-weight: 800; }
                
                .btn-download:hover { transform: scale(1.02); background: #27ae60; }
                .btn-download:active { transform: scale(0.98); }

                /* Table Styling */
                .table-card { padding: 0; overflow: hidden; }
                .attendance-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                
                .attendance-table th {
                    padding: 1.25rem 1rem;
                    background: #f8fafc;
                    color: #94a3b8;
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    text-align: left;
                    border-bottom: 1px solid #f1f5f9;
                }
                
                .attendance-table td { padding: 1rem; border-bottom: 1px solid #f8fafc; text-align: left; }
                .attendance-table tr:last-child td { border-bottom: none; }
                .attendance-table tr:hover td { background: #f0fdf4; }

                .center { text-align: center !important; }
                
                .table-body-part {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .status-msg { text-align: center; padding: 3rem; color: #94a3b8; font-weight: 500; }

                /* Scrollbar */
                .table-body-part::-webkit-scrollbar { width: 6px; }
                .table-body-part::-webkit-scrollbar-track { background: transparent; }
                .table-body-part::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

                /* Metrics */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .metric-card {
                    background: white;
                    padding: 1.25rem;
                    border-radius: 20px;
                    border: 1px solid rgba(46, 204, 113, 0.2);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    box-shadow: 0 8px 20px -10px rgba(0,0,0,0.05);
                }
                .m-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .m-value { font-size: 1.75rem; font-weight: 900; color: #1e293b; margin-top: 0.25rem; }
                .m-icon { position: absolute; right: 1.25rem; top: 1.25rem; font-size: 1.5rem; opacity: 0.2; }
                
                .highlight-green { color: #27ae60; }
                .highlight-orange { color: #e67e22; }

                @media (max-width: 1024px) {
                    .header-card { flex-direction: column; align-items: flex-start; }
                    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>
        </div>
    );
}
