'use client';

import { useState, useEffect, useRef } from 'react';
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
    const [status, setStatus] = useState<string>('Loading...');
    const scannerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            initScanner();
        }
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        };
    }, [scanResult, user]);

    const initScanner = async () => {
        const readerElement = document.getElementById("qr-reader");
        if (!readerElement) {
            setTimeout(initScanner, 500);
            return;
        }

        try {
            // Clear any existing scanner
            if (scannerRef.current) {
                try {
                    await scannerRef.current.clear();
                } catch (e) {
                    // Ignore
                }
            }

            setStatus('Initializing scanner...');

            // Dynamic import for client-side only
            const { Html5QrcodeScanner } = await import('html5-qrcode');

            const scanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    rememberLastUsedCamera: true,
                    showTorchButtonIfSupported: true
                },
                false
            );

            scanner.render(
                async (decodedText: string) => {
                    await processQRCode(decodedText);
                    scanner.clear();
                },
                (errorMessage: string) => {
                    // Ignore scan failures (no QR in frame)
                }
            );

            scannerRef.current = scanner;
            setStatus('Ready - Point camera at QR code');

        } catch (err) {
            console.error("Scanner init failed:", err);
            setStatus('Scanner unavailable');
            setError('Could not initialize camera. Try uploading an image instead.');
        }
    };

    const processQRCode = async (employeeId: string) => {
        if (isLoading) return;

        setIsLoading(true);
        setStatus('Processing...');
        setError(null);

        try {
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employeeId,
                    device_info: getDeviceInfo()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setScanResult(data.employee);
                setStatus('Success!');
            } else {
                setError(data.error || 'Failed to log attendance');
                setStatus('Error');
                setTimeout(() => {
                    setError(null);
                    initScanner();
                }, 3000);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setStatus('Network Error');
            setTimeout(() => {
                setError(null);
                initScanner();
            }, 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('Scanning image...');
        setError(null);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode("qr-file-reader");

            const result = await html5QrCode.scanFile(file, true);
            await html5QrCode.clear();

            await processQRCode(result);
        } catch (err) {
            setError('No QR code found in the image. Please try another image.');
            setStatus('Scan Failed');
            setTimeout(() => setError(null), 3000);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getDeviceInfo = () => {
        if (typeof window === 'undefined') return "Server";
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) return "Mobile";
        return "Desktop";
    };

    const handleContinue = () => {
        setScanResult(null);
        setError(null);
        setStatus('Loading...');
    };

    const handlePrint = () => {
        if (!scanResult) return;

        const printContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 2px dashed #064e3b; width: 280px; margin: auto; background: #fff;">
                <h2 style="margin: 0; color: #064e3b; font-size: 18px;">MELANN LENDING</h2>
                <p style="margin: 2px 0 15px; font-size: 10px; color: #666;">INVESTOR CORPORATION</p>
                <h3 style="margin: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 8px 0; font-size: 14px;">ATTENDANCE SLIP</h3>
                <div style="text-align: left; margin: 15px 0; font-size: 12px; line-height: 1.8;">
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
            printWindow.document.write(`<html><head><title>Attendance Slip</title></head><body style="margin:0; padding: 20px;">${printContent}</body></html>`);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    return (
        <DashboardLayout hideSidebar={isKioskMode} hideNavbar={isKioskMode}>
            <div style={{
                minHeight: '100vh',
                background: isKioskMode ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' : 'transparent',
                padding: isKioskMode ? '1rem' : '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: isKioskMode ? '500px' : '450px',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    {/* Header */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                background: '#fbbf24',
                                color: '#064e3b',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: '1.25rem'
                            }}>M</div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                                Attendance Scanner
                            </h1>
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.35rem 0.75rem',
                            background: status.includes('Ready') || status.includes('Success') ? '#dcfce7' : '#f3f4f6',
                            color: status.includes('Ready') || status.includes('Success') ? '#16a34a' : '#6b7280',
                            borderRadius: '99px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {status}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginBottom: '1rem',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Scanner or Result */}
                    {!scanResult ? (
                        <div>
                            {/* QR Scanner */}
                            <div id="qr-reader" style={{
                                width: '100%',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                marginBottom: '1rem'
                            }}></div>

                            {/* Hidden div for file scanning */}
                            <div id="qr-file-reader" style={{ display: 'none' }}></div>

                            {/* Upload Button */}
                            <div style={{ marginTop: '1rem' }}>
                                <label style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: '#064e3b',
                                    color: 'white',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}>
                                    📷 Upload QR Image
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                    />
                                </label>
                                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                                    Or upload a screenshot of your QR ID
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Success Badge */}
                            <div style={{
                                background: '#dcfce7',
                                color: '#16a34a',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '99px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: 700,
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem'
                            }}>
                                ✅ Attendance Logged
                            </div>

                            {/* ID Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
                                borderRadius: '20px',
                                padding: '1.5rem',
                                color: 'white',
                                textAlign: 'left',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 600 }}>
                                        MELANN LENDING<br />INVESTOR CORP.
                                    </div>
                                    <div style={{ background: '#fbbf24', color: '#064e3b', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>M</div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        background: 'white',
                                        border: '3px solid #fbbf24',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {scanResult.profile_picture ? (
                                            <img src={scanResult.profile_picture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                            <div style={{ fontSize: '1.5rem', color: '#064e3b', fontWeight: 700 }}>
                                                {scanResult.first_name[0]}{scanResult.last_name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{scanResult.first_name} {scanResult.last_name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>{scanResult.position}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{scanResult.department}</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>ID</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{scanResult.employee_id}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>Time</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{format(new Date(), 'hh:mm a')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={handleContinue} style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#064e3b',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}>
                                    CONTINUE
                                </button>
                                <button onClick={handlePrint} style={{
                                    padding: '1rem 1.25rem',
                                    borderRadius: '12px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    color: '#374151',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}>
                                    🖨️ PRINT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Kiosk Mode Toggle */}
                    {user && (user.role === 'Admin' || user.role === 'HR') && (
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                            <button
                                onClick={() => setIsKioskMode(!isKioskMode)}
                                style={{
                                    color: '#9ca3af',
                                    fontSize: '0.75rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                🖥️ {isKioskMode ? 'Exit Kiosk Mode' : 'Enter Kiosk Mode'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                #qr-reader video {
                    border-radius: 12px !important;
                }
                #qr-reader__scan_region {
                    background: #f3f4f6 !important;
                    border-radius: 12px !important;
                }
                #qr-reader__dashboard {
                    padding: 0.5rem !important;
                }
                #qr-reader__dashboard button {
                    background: #064e3b !important;
                    color: white !important;
                    border: none !important;
                    padding: 0.5rem 1rem !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    font-weight: 600 !important;
                    margin: 0.25rem !important;
                }
                #qr-reader__dashboard select {
                    padding: 0.5rem !important;
                    border-radius: 8px !important;
                    border: 1px solid #e5e7eb !important;
                }
                #qr-reader img {
                    display: none !important;
                }
            `}</style>
        </DashboardLayout>
    );
}
