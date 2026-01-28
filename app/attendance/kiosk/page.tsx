'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';

interface LoggedEmployee {
    employee_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    department: string;
    position: string;
    profile_picture?: string;
    logged_at: string;
}

export default function AttendanceKioskPage() {
    const [scanResult, setScanResult] = useState<LoggedEmployee | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isKioskMode, setIsKioskMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!scanResult && user) {
            const timer = setTimeout(() => {
                startScanner();
            }, 500);
            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    scannerRef.current = null;
                }
            };
        }
    }, [scanResult, user]);

    const startScanner = () => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
            console.error("Reader element not found");
            return;
        }

        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
        } catch (err) {
            console.error("Failed to start scanner:", err);
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            // Assume the QR code contains the Employee ID
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: decodedText,
                    device_info: getDeviceInfo()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setScanResult(data.employee);
                if (scannerRef.current) {
                    await scannerRef.current.clear();
                }
            } else {
                setError(data.error || 'Failed to log attendance');
                // Don't clear scanner on error, just show message
            }
        } catch (err) {
            setError('An error occurred during scanning');
        } finally {
            setIsLoading(false);
        }
    };

    const onScanFailure = (error: any) => {
        // Standard scan failure (e.g. no QR in frame) - ignore
    };

    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) return "Mobile";
        return "Desktop";
    };

    const handleSave = () => {
        setScanResult(null);
        setError(null);
    };

    const handlePrint = () => {
        if (!scanResult) return;

        const printContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ccc; width: 300px; margin: auto;">
                <h2 style="margin-bottom: 5px;">Melann Lending</h2>
                <h4 style="margin-top: 0; margin-bottom: 20px; color: #666;">Attendance Slip</h4>
                <hr />
                <div style="text-align: left; margin: 20px 0;">
                    <p><strong>Name:</strong> ${scanResult.first_name} ${scanResult.last_name}</p>
                    <p><strong>ID:</strong> ${scanResult.employee_id}</p>
                    <p><strong>Date/Time:</strong> ${scanResult.logged_at}</p>
                </div>
                <hr />
                <p style="font-size: 10px; color: #999;">System Generated Attendance Log</p>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Print Attendance Slip</title></head><body>${printContent}</body></html>`);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <DashboardLayout hideSidebar={isKioskMode} hideNavbar={isKioskMode}>
            <div className="kiosk-container" style={{
                minHeight: '100vh',
                background: isKioskMode ? '#064e3b' : 'transparent',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '2.5rem',
                    textAlign: 'center'
                }}>
                    <header style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.5rem' }}>
                            Attendance Kiosk Scanner
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                            Scan your QR Code to log your attendance
                        </p>
                    </header>

                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem',
                            border: '1px solid #fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {!scanResult ? (
                        <div id="reader" style={{
                            width: '100%',
                            minHeight: '300px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: '2px dashed #064e3b'
                        }}></div>
                    ) : (
                        <div className="id-card-success">
                            <div style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                padding: '0.75rem',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: 700,
                                marginBottom: '2rem'
                            }}>
                                <span>✅</span> Attendance Logged Successfully
                            </div>

                            {/* ID CARD UI */}
                            <div style={{
                                margin: '0 auto',
                                width: '100%',
                                maxWidth: '350px',
                                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                                borderRadius: '20px',
                                padding: '1.5rem',
                                color: 'white',
                                textAlign: 'left',
                                position: 'relative',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 700 }}>
                                        MELANN LENDING<br />INVESTOR CORP.
                                    </div>
                                    <div style={{ background: '#fbbf24', color: '#064e3b', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>M</div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', background: 'white', border: '3px solid #fbbf24' }}>
                                        {scanResult.profile_picture ? (
                                            <img src={scanResult.profile_picture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#064e3b', fontWeight: 700 }}>
                                                {scanResult.first_name[0]}{scanResult.last_name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{scanResult.first_name}<br />{scanResult.last_name}</h3>
                                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>{scanResult.position}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{scanResult.department}</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>Employee ID</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{scanResult.employee_id}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>Time In</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{format(new Date(), 'HH:mm:ss')}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'center' }}>
                                <button onClick={handleSave} style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#064e3b',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px rgba(6, 78, 59, 0.2)'
                                }}>
                                    SAVE & RESET
                                </button>
                                <button onClick={handlePrint} style={{
                                    padding: '1rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    color: '#374151',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}>
                                    🖨️ PRINT SLIP
                                </button>
                            </div>
                        </div>
                    )}

                    {user && (user.role === 'Admin' || user.role === 'HR') && (
                        <div style={{ marginTop: '2rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => setIsKioskMode(!isKioskMode)}
                                style={{
                                    color: isKioskMode ? '#fbbf24' : '#6b7280',
                                    fontSize: '0.875rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                {isKioskMode ? 'Disable Kiosk Mode' : 'Enable Kiosk Mode'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                #reader__scan_region {
                    background: white !important;
                }
                #reader__dashboard {
                    padding: 1rem !important;
                }
                #reader__dashboard_section_csr button {
                    background: #064e3b !important;
                    color: white !important;
                    border: none !important;
                    padding: 0.5rem 1rem !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-weight: 600 !important;
                }
            `}</style>
        </DashboardLayout>
    );
}
