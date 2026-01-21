'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function AttendanceKiosk() {
    const [scanResult, setScanResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scannerRef.current.render(onScanSuccess, onScanFailure);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, []);

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setScanResult(null);

        try {
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanData: decodedText })
            });

            const data = await response.json();

            if (response.ok) {
                setScanResult(data);
                // Reset after 3 seconds to be ready for next scan
                setTimeout(() => {
                    setScanResult(null);
                    setIsProcessing(false);
                }, 3000);
            } else {
                setError(data.error || 'Failed to record attendance');
                setTimeout(() => {
                    setError(null);
                    setIsProcessing(false);
                }, 3000);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setTimeout(() => {
                setError(null);
                setIsProcessing(false);
            }, 3000);
        }
    };

    const onScanFailure = (error: any) => {
        // Quietly fail as this triggers constantly if no QR is in frame
    };

    return (
        <DashboardLayout>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="card mb-3">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">🎥 Attendance QR Kiosk</h2>
                        <Link href="/attendance" className="btn btn-secondary btn-sm">
                            Back to List
                        </Link>
                    </div>
                    <div className="card-body" style={{ textAlign: 'center' }}>
                        <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Position your ID QR code in front of the camera to Clock In/Out.
                        </p>

                        <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', border: 'none', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}></div>

                        {/* Result Overlays */}
                        {isProcessing && !scanResult && !error && (
                            <div className="mt-4 p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div className="spinner"></div>
                                <p>Processing scan...</p>
                            </div>
                        )}

                        {scanResult && (
                            <div className="mt-4 p-4 animate-in" style={{
                                backgroundColor: scanResult.action === 'IN' ? '#dcfce7' : '#dbeafe',
                                border: `2px solid ${scanResult.action === 'IN' ? '#16a34a' : '#2563eb'}`,
                                borderRadius: 'var(--radius-lg)',
                                color: scanResult.action === 'IN' ? '#16a34a' : '#2563eb'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                    {scanResult.action === 'IN' ? '✅' : '🕒'}
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>Clocked {scanResult.action === 'IN' ? 'In' : 'Out'} Successful!</h3>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{scanResult.employeeName}</p>
                                <p style={{ margin: '0.5rem 0 0 0' }}>Time: {scanResult.time}</p>
                                {scanResult.status === 'Late' && (
                                    <span className="badge badge-danger mt-2" style={{ fontSize: '1rem' }}>LATE</span>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-4 animate-in" style={{
                                backgroundColor: '#fee2e2',
                                border: '2px solid #dc2626',
                                borderRadius: 'var(--radius-lg)',
                                color: '#dc2626'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>Scan Error</h3>
                                <p style={{ fontSize: '1.125rem', margin: 0 }}>{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <h4>Instructions:</h4>
                        <ul style={{ textAlign: 'left', display: 'inline-block', color: 'var(--text-secondary)' }}>
                            <li>Employees should show their QR ID to the camera.</li>
                            <li>The system automatically detects if it's a Time In or Time Out.</li>
                            <li>A green check means Time In was recorded.</li>
                            <li>A blue clock means Time Out was recorded.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .animate-in {
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--gray-200);
                    border-top: 4px solid var(--primary-600);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </DashboardLayout>
    );
}
