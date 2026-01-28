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
    const [status, setStatus] = useState<string>('Standby');
    const html5QrCodeRef = useRef<any>(null);

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
            }, 800);
            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        }
    }, [scanResult, user]);

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                setStatus('Scanner Stopped');
            } catch (err) {
                console.error("Failed to stop scanner:", err);
            }
        }
    };

    const startScanner = async () => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) return;

        try {
            // Import Html5Qrcode only on client side
            const { Html5Qrcode } = await import('html5-qrcode');

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode("reader");
            }

            if (html5QrCodeRef.current.isScanning) {
                await stopScanner();
            }

            setStatus('Initializing camera...');

            await html5QrCodeRef.current.start(
                { facingMode: "user" }, // Better for Kiosks (front camera)
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                onScanSuccess,
                onScanFailure
            ).then(() => {
                setStatus('Active - Searching for QR ID');
            }).catch((err: any) => {
                console.error("Scanner start failed:", err);
                setStatus('Camera Error');
                setError('Failed to access camera. Please ensure permissions are granted.');
            });

        } catch (err) {
            console.error("Failed to start scanner:", err);
            setStatus('Error');
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        if (isLoading) return;
        setIsLoading(true);
        setStatus('Processing scan...');
        setError(null);

        try {
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
                setStatus('Success');
                await stopScanner();
            } else {
                setError(data.error || 'Failed to log attendance');
                setStatus('Scan Error');
                // Auto reset error after 3 seconds for kiosk usability
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            setError('An error occurred during scanning');
            setStatus('Network Error');
        } finally {
            setIsLoading(false);
        }
    };

    const onScanFailure = (error: any) => {
        // Just searching...
    };

    const getDeviceInfo = () => {
        if (typeof window === 'undefined') return "Server";
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) return "Mobile";
        return "Desktop";
    };

    const handleSave = () => {
        setScanResult(null);
        setError(null);
        setStatus('Standby');
    };

    const handlePrint = () => {
        if (!scanResult) return;

        const printContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px dashed #064e3b; width: 280px; margin: auto; background: #fff;">
                <h2 style="margin: 0; color: #064e3b; font-size: 18px;">MELANN LENDING</h2>
                <p style="margin: 2px 0 15px; font-size: 10px; color: #666;">INVESTOR CORPORATION</p>
                <h3 style="margin: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 5px 0; font-size: 14px;">ATTENDANCE SLIP</h3>
                <div style="text-align: left; margin: 15px 0; font-size: 12px; line-height: 1.6;">
                    <p><strong>NAME:</strong> ${scanResult.first_name} ${scanResult.last_name}</p>
                    <p><strong>EMP ID:</strong> ${scanResult.employee_id}</p>
                    <p><strong>DEPT:</strong> ${scanResult.department}</p>
                    <p><strong>LOGGED AT:</strong> ${scanResult.logged_at}</p>
                </div>
                <div style="margin-top: 15px; font-size: 9px; color: #999;">
                    "Lend • Empower • Grow"
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Print Slip</title></head><body style="margin:0;">${printContent}</body></html>`);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    return (
        <DashboardLayout hideSidebar={isKioskMode} hideNavbar={isKioskMode}>
            <div className="kiosk-container" style={{
                minHeight: '100vh',
                background: isKioskMode ? '#f0fdf4' : 'transparent',
                padding: isKioskMode ? '0' : '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: isKioskMode ? '100%' : '600px',
                    height: isKioskMode ? '100vh' : 'auto',
                    background: 'white',
                    borderRadius: isKioskMode ? '0' : '24px',
                    boxShadow: isKioskMode ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '2.5rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <header style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: '#fbbf24', color: '#064e3b', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem' }}>M</div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                                Attendance Kiosk
                            </h1>
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.4rem 1rem',
                            background: status.includes('Active') ? '#f0fdf4' : '#f3f4f6',
                            color: status.includes('Active') ? '#10b981' : '#6b7280',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {status}
                        </div>
                    </header>

                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            marginBottom: '1.5rem',
                            border: '1px solid #fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            fontWeight: 600,
                            animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both'
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {!scanResult ? (
                        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                            <div id="reader" style={{
                                width: '100%',
                                minHeight: '300px',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '4px solid #064e3b',
                                background: '#000'
                            }}></div>

                            {/* Upload Image Option */}
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <label style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    border: '1px solid #e5e7eb',
                                    transition: 'all 0.2s'
                                }}>
                                    <span>📷</span> Upload QR Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file && html5QrCodeRef.current) {
                                                try {
                                                    setStatus('Processing image...');
                                                    const result = await html5QrCodeRef.current.scanFile(file, true);
                                                    await onScanSuccess(result);
                                                } catch (err) {
                                                    setError('No QR code found in the image.');
                                                    setStatus('Scan Failed');
                                                    setTimeout(() => setError(null), 3000);
                                                }
                                            }
                                        }}
                                    />
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                                    Or upload a screenshot of your QR ID
                                </p>
                            </div>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '250px',
                                height: '250px',
                                border: '2px solid #fbbf24',
                                borderRadius: '12px',
                                pointerEvents: 'none',
                                opacity: status.includes('Active') ? 1 : 0.2,
                                transition: 'opacity 0.3s'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '20px',
                                    height: '20px',
                                    borderTop: '6px solid #fbbf24',
                                    borderLeft: '6px solid #fbbf24',
                                    borderRadius: '4px 0 0 0'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '20px',
                                    height: '20px',
                                    borderTop: '6px solid #fbbf24',
                                    borderRight: '6px solid #fbbf24',
                                    borderRadius: '0 4px 0 0'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    width: '20px',
                                    height: '20px',
                                    borderBottom: '6px solid #fbbf24',
                                    borderLeft: '6px solid #fbbf24',
                                    borderRadius: '0 0 0 4px'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: '20px',
                                    height: '20px',
                                    borderBottom: '6px solid #fbbf24',
                                    borderRight: '6px solid #fbbf24',
                                    borderRadius: '0 0 4px 0'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    top: '0%',
                                    left: '0',
                                    width: '100%',
                                    height: '2px',
                                    background: 'rgba(251, 191, 36, 0.5)',
                                    boxShadow: '0 0 15px #fbbf24',
                                    animation: 'scan-line 2s linear infinite'
                                }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="id-card-success">
                            <div style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                padding: '1rem 2rem',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontWeight: 800,
                                marginBottom: '2rem',
                                border: '1px solid #dcfce7'
                            }}>
                                <span>🎉</span> Attendance Logged Successfully
                            </div>

                            <div style={{
                                margin: '0 auto',
                                width: '100%',
                                maxWidth: '350px',
                                background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
                                borderRadius: '24px',
                                padding: '2rem',
                                color: 'white',
                                textAlign: 'left',
                                position: 'relative',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 700, letterSpacing: '0.05em' }}>
                                        MELANN LENDING<br />INVESTOR CORP.
                                    </div>
                                    <div style={{ background: '#fbbf24', color: '#064e3b', width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>M</div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ width: '110px', height: '110px', borderRadius: '16px', overflow: 'hidden', background: 'white', border: '4px solid #fbbf24', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {scanResult.profile_picture ? (
                                            <img src={scanResult.profile_picture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#064e3b', fontWeight: 800 }}>
                                                {scanResult.first_name[0]}{scanResult.last_name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>{scanResult.first_name}<br />{scanResult.last_name}</h3>
                                        <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 700, marginTop: '0.5rem' }}>{scanResult.position}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{scanResult.department}</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>Employee ID</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}>{scanResult.employee_id}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>Logged In</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{format(new Date(), 'HH:mm a')}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', justifyContent: 'center' }}>
                                <button onClick={handleSave} style={{
                                    flex: 1,
                                    padding: '1.25rem',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: '#064e3b',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 15px -3px rgba(6, 78, 59, 0.4)',
                                    transition: 'transform 0.2s'
                                }}>
                                    CONTINUE
                                </button>
                                <button onClick={handlePrint} style={{
                                    padding: '1.25rem 2rem',
                                    borderRadius: '16px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    color: '#374151',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>
                                    🖨️ PRINT
                                </button>
                            </div>
                        </div>
                    )}

                    {user && (user.role === 'Admin' || user.role === 'HR') && (
                        <div style={{ marginTop: '3rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => setIsKioskMode(!isKioskMode)}
                                style={{
                                    color: isKioskMode ? '#064e3b' : '#9ca3af',
                                    fontSize: '0.875rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    margin: '0 auto'
                                }}
                            >
                                🖥️ {isKioskMode ? 'Exit Fullscreen Kiosk' : 'Switch to Fullscreen Kiosk'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan-line {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                video {
                    object-fit: cover !important;
                    border-radius: 20px;
                }
                #reader__scan_region {
                    background: #000 !important;
                }
                #reader__dashboard {
                    display: none !important;
                }
                #reader {
                    border: none !important;
                }
            `}</style>
        </DashboardLayout>
    );
}
