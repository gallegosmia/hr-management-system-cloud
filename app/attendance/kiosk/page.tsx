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

interface AttendanceData {
    date: string;
    morning_in: string | null;
    morning_out: string | null;
    afternoon_in: string | null;
    afternoon_out: string | null;
    morning_hours: number;
    afternoon_hours: number;
    total_hours: number;
}

const CHECKPOINT_ICONS: Record<string, string> = {
    'morning_in': '🌅',
    'morning_out': '☀️',
    'afternoon_in': '🌤️',
    'afternoon_out': '🌙'
};

const CHECKPOINT_COLORS: Record<string, string> = {
    'morning_in': '#059669',
    'morning_out': '#0891b2',
    'afternoon_in': '#7c3aed',
    'afternoon_out': '#c026d3'
};

export default function AttendanceKioskPage() {
    const [scanResult, setScanResult] = useState<LoggedEmployee | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
    const [checkpoint, setCheckpoint] = useState<string>('');
    const [checkpointLabel, setCheckpointLabel] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isKioskMode, setIsKioskMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [status, setStatus] = useState<string>('Loading...');
    const scannerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const isInitializing = useRef(false);

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
            // Auto-start attempt on mount/user-ready
            const timer = setTimeout(() => {
                if (!cameraActive && !isInitializing.current) {
                    startCamera();
                }
            }, 1000);
            return () => clearTimeout(timer);
        }

        // When scanResult exists, stop the camera
        if (scanResult) {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [scanResult, user]);

    const stopCamera = async () => {
        // We use a local variable to avoid race conditions with multiple stop calls
        const currentScanner = scannerRef.current;
        if (currentScanner) {
            scannerRef.current = null; // Clear immediately
            try {
                if (currentScanner.isScanning) {
                    await currentScanner.stop();
                }
                setCameraActive(false);
            } catch (e) {
                console.error("Failed to stop scanner", e);
            }
        }
    };

    const startCamera = async () => {
        if (isInitializing.current || cameraActive) return;

        const readerElement = document.getElementById("qr-reader");
        if (!readerElement) return;

        isInitializing.current = true;
        setError(null);
        setStatus('Initializing camera...');

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            // Explicitly clear the div content before creating a new instance
            // to avoid any left-over nodes from previous failed attempts
            readerElement.innerHTML = '';

            const html5QrCode = new Html5Qrcode("qr-reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            ).catch(async (envErr) => {
                console.warn("Environment camera failed, trying default", envErr);
                return await html5QrCode.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    onScanFailure
                );
            });

            setCameraActive(true);
            setStatus('Ready - Scan your QR ID');
            setError(null);

        } catch (err: any) {
            console.error("Scanner failed:", err);
            let msg = 'Could not access camera.';
            if (err.name === 'NotAllowedError') msg = 'Camera permission denied.';
            else if (err.toString().includes('AbortError')) msg = 'Camera timeout. Please try again.';
            else if (err.toString().includes('NotFound')) msg = 'No camera found.';

            setError(msg);
            setStatus('Scanner unavailable');
            setCameraActive(false);
        } finally {
            isInitializing.current = false;
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        // Debounce scan
        if (isLoading) return;

        // Stop camera immediately to prevent double scan and release hardware
        await stopCamera();
        await processQRCode(decodedText);
    };

    const onScanFailure = (error: string) => {
        // We usually ignore scan failures (no QR in frame)
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
                setAttendanceData(data.attendance);
                setCheckpoint(data.checkpoint);
                setCheckpointLabel(data.checkpoint_label);
                setStatus('Success!');
            } else {
                setError(data.error || 'Failed to log attendance');
                setStatus('Error');
                // Don't re-init here if scanResult is null, the useEffect will handle it when scanResult changes
                // But since scanResult didn't change (still null), we might need to re-init
                setTimeout(() => {
                    setError(null);
                    startCamera();
                }, 4000);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setStatus('Network Error');
            setTimeout(() => {
                setError(null);
                startCamera();
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
            setError('No QR code found in the image.');
            setStatus('Scan Failed');
            setTimeout(() => setError(null), 3000);
        }

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
        setAttendanceData(null);
        setCheckpoint('');
        setCheckpointLabel('');
        setError(null);
        setStatus('Loading...');
    };

    const handlePrint = () => {
        if (!scanResult) return;

        const printContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 2px dashed #064e3b; width: 280px; margin: auto; background: #fff;">
                <h2 style="margin: 0; color: #064e3b; font-size: 18px;">MELANN LENDING</h2>
                <p style="margin: 2px 0 15px; font-size: 10px; color: #666;">INVESTOR CORPORATION</p>
                <h3 style="margin: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 8px 0; font-size: 14px; color: ${CHECKPOINT_COLORS[checkpoint] || '#064e3b'};">
                    ${CHECKPOINT_ICONS[checkpoint] || '✓'} ${checkpointLabel}
                </h3>
                <div style="text-align: left; margin: 15px 0; font-size: 12px; line-height: 1.8;">
                    <p><strong>NAME:</strong> ${scanResult.first_name} ${scanResult.last_name}</p>
                    <p><strong>EMP ID:</strong> ${scanResult.employee_id}</p>
                    <p><strong>DEPT:</strong> ${scanResult.department}</p>
                    <p><strong>TIME:</strong> ${format(new Date(), 'hh:mm:ss a')}</p>
                    <p><strong>DATE:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
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

    const formatTime = (time: string | null) => {
        if (!time) return '--:--';
        try {
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        } catch {
            return time;
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
                            fontSize: '0.875rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>⚠️ {error}</span>
                            <button
                                onClick={() => startCamera()}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                }}
                            >
                                Retry Camera
                            </button>
                        </div>
                    )}

                    {/* Scanner or Result */}
                    {!scanResult ? (
                        <div style={{ position: 'relative' }}>
                            <div id="qr-reader" style={{
                                width: '100%',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                marginBottom: '1rem',
                                background: '#f3f4f6',
                                minHeight: '250px'
                            }}></div>

                            {/* Manual Start Overlay - Prevent React from conflicting with qr-reader children */}
                            {!cameraActive && !isLoading && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 5
                                }}>
                                    <button
                                        onClick={startCamera}
                                        style={{
                                            padding: '1rem 2rem',
                                            background: '#064e3b',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        Start Scanner
                                    </button>
                                </div>
                            )}

                            <div id="qr-file-reader" style={{ display: 'none' }}></div>

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
                                    fontSize: '0.875rem'
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
                            </div>

                            {/* Checkpoint Legend */}
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>TODAY'S CHECKPOINTS</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out'].map((cp) => (
                                        <div key={cp} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            fontSize: '0.7rem',
                                            color: '#9ca3af'
                                        }}>
                                            <span>{CHECKPOINT_ICONS[cp]}</span>
                                            <span>{cp.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Checkpoint Badge */}
                            <div style={{
                                background: CHECKPOINT_COLORS[checkpoint] || '#16a34a',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '99px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: 700,
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem'
                            }}>
                                {CHECKPOINT_ICONS[checkpoint] || '✅'} {checkpointLabel}
                            </div>

                            {/* ID Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
                                borderRadius: '20px',
                                padding: '1.5rem',
                                color: 'white',
                                textAlign: 'left',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 600 }}>
                                        MELANN LENDING<br />INVESTOR CORP.
                                    </div>
                                    <div style={{ background: '#fbbf24', color: '#064e3b', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>M</div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '70px',
                                        height: '70px',
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
                                            <div style={{ fontSize: '1.25rem', color: '#064e3b', fontWeight: 700 }}>
                                                {scanResult.first_name[0]}{scanResult.last_name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{scanResult.first_name} {scanResult.last_name}</h3>
                                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>{scanResult.position}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{scanResult.department}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Today's Checkpoints */}
                            {attendanceData && (
                                <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Today's Attendance</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        {[
                                            { key: 'morning_in', label: 'AM In', value: attendanceData.morning_in },
                                            { key: 'morning_out', label: 'AM Out', value: attendanceData.morning_out },
                                            { key: 'afternoon_in', label: 'PM In', value: attendanceData.afternoon_in },
                                            { key: 'afternoon_out', label: 'PM Out', value: attendanceData.afternoon_out }
                                        ].map(({ key, label, value }) => (
                                            <div key={key} style={{
                                                padding: '0.5rem',
                                                background: value ? '#dcfce7' : 'white',
                                                border: `1px solid ${value ? '#86efac' : '#e5e7eb'}`,
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600 }}>{label}</div>
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    color: value ? '#16a34a' : '#d1d5db'
                                                }}>
                                                    {formatTime(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {attendanceData.total_hours > 0 && (
                                        <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#064e3b', fontWeight: 700 }}>
                                            Total Hours: {attendanceData.total_hours.toFixed(2)} hrs
                                        </div>
                                    )}
                                </div>
                            )}

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
                                    🖨️
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
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 12px !important;
                }
                #qr-reader img {
                    display: none !important;
                }
            `}</style>
        </DashboardLayout>
    );
}
