'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Alert {
    id: string;
    employee_id: number;
    employee_name: string;
    type: 'incomplete_201' | 'missing_documents' | 'probation_ending' | 'contract_expiring';
    severity: 'high' | 'medium' | 'low';
    message: string;
    created_at: string;
}

export default function AlertsWidget() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await fetch(`/api/alerts?severity=high&t=${new Date().getTime()}`);
            const data = await response.json();
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Loading alerts...</div>;

    if (alerts.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 bg-green-50">
                <span className="mr-2">✅</span>
                No critical alerts. Good job!
            </div>
        );
    }

    return (
        <div className="alerts-list">
            {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
                    <div className="alert-content">
                        <div className="alert-header">
                            <span className="alert-icon">
                                {alert.type === 'missing_documents' ? '📂' :
                                    alert.type === 'incomplete_201' ? '👤' :
                                        alert.type === 'probation_ending' ? '⏳' : '📅'}
                            </span>
                            <div className="alert-title">{alert.message}</div>
                        </div>
                        <div className="alert-meta">
                            <span className="employee-name">{alert.employee_name}</span>
                            <span className="dot">•</span>
                            <span className="alert-date">{new Date(alert.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <Link
                        href={`/employees/${alert.employee_id}`}
                        className="alert-action-btn"
                    >
                        Review
                    </Link>
                </div>
            ))}
            {alerts.length > 5 && (
                <div className="more-alerts">
                    +{alerts.length - 5} more alerts requiring attention
                </div>
            )}
            <style jsx>{`
                .alerts-list {
                    display: flex;
                    flex-direction: column;
                }
                .alert-item {
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--gray-100);
                    transition: all 0.2s ease;
                }
                .alert-item:hover {
                    background-color: var(--gray-50);
                }
                .severity-high {
                    border-left: 4px solid #ef4444;
                }
                .severity-medium {
                    border-left: 4px solid #f59e0b;
                }
                .severity-low {
                    border-left: 4px solid #3b82f6;
                }
                .alert-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.25rem;
                }
                .alert-icon {
                    font-size: 1.25rem;
                }
                .alert-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                }
                .alert-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    padding-left: 2rem;
                }
                .employee-name {
                    font-weight: 500;
                }
                .alert-action-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    background: white;
                    border: 1px solid var(--gray-200);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .alert-action-btn:hover {
                    background: var(--gray-50);
                    border-color: var(--gray-300);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .more-alerts {
                    padding: 0.75rem;
                    text-align: center;
                    background-color: var(--gray-50);
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}
