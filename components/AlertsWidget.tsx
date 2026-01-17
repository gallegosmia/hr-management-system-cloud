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
        <div className="divide-y divide-gray-200">
            {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-red-50 transition-colors flex justify-between items-center">
                    <div>
                        <div className="font-medium text-red-800">{alert.message}</div>
                        <div className="text-sm text-red-600">
                            {alert.employee_name} • {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <Link
                        href={`/employees/${alert.employee_id}`}
                        className="btn btn-sm btn-outline text-red-600 border-red-200 hover:bg-red-100"
                    >
                        Review
                    </Link>
                </div>
            ))}
            {alerts.length > 5 && (
                <div className="p-2 text-center bg-gray-50 text-sm text-gray-500">
                    +{alerts.length - 5} more alerts
                </div>
            )}
        </div>
    );
}
