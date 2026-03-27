'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface ScanResult {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    profile_picture?: string;
}

interface AttendanceData {
    morning_in: string | null;
    morning_out: string | null;
    afternoon_in: string | null;
    afternoon_out: string | null;
    total_hours: number;
}

const CHECKPOINT_ICONS: Record<string, string> = {
    morning_in: '🌅',
    morning_out: '☀️',
    afternoon_in: '🌤️',
    afternoon_out: '🌙',
};

const CHECKPOINT_COLORS: Record<string, string> = {
    morning_in: '#059669',
    morning_out: '#0891b2',
    afternoon_in: '#7c3aed',
    afternoon_out: '#c026d3',
};

export default function MobileAttendancePage() {
    // Auth guard
    const [authed, setAuthed] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    // Scanner state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
    const [checkpoint, setCheckpoint] = useState('');
    const [checkpointLabel, setCheckpointLabel] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [status, setStatus] = useState('Initializing...');
    const [currentTime, setCurrentTime] = useState('');

    const scannerRef = useRef<any>(null);
    const isInitializing = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clock
    useEffect(() => {
        const tick = () => setCurrentTime(format(new Date(), 'hh:mm:ss a'));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    // Auth check
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (['Admin', 'HR', 'Super Admin'].includes(user.role) || user.username === 'superadmin') {
                    setAuthed(true);
                }
            } catch {}
        }
        setAuthChecked(true);
    }, []);

    // Auto-start camera
    useEffect(() => {
        if (!authed || !authChecked) return;
        if (scanResult) {
            stopCamera();
            return;
        }
        const t = setTimeout(() => {
            if (!cameraActive && !isInitializing.current) startCamera();
        }, 800);
        return () => {
            clearTimeout(t);
            stopCamera();
        };
    }, [authed, authChecked, scanResult]);

    const stopCamera = async () => {
        const current = scannerRef.current;
        if (current) {
            scannerRef.current = null;
            try {
                if (current.isScanning) await current.stop();
                setCameraActive(false);
            } catch {}
        }
    };

    const startCamera = async () => {
        if (isInitializing.current || cameraActive) return;
        const el = document.getElementById('mobile-qr-reader');
        if (!el) return;

        isInitializing.current = true;
        setError(null);
        setStatus('Starting camera...');

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            el.innerHTML = '';
            const scanner = new Html5Qrcode('mobile-qr-reader');
            scannerRef.current = scanner;

            const cfg = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 };

            await scanner
                .start({ facingMode: 'environment' }, cfg, onScanSuccess, () => {})
                .catch(() =>
                    scanner.start({ facingMode: 'user' }, cfg, onScanSuccess, () => {})
                );

            setCameraActive(true);
            setStatus('Ready — Scan your QR ID');
        } catch (err: any) {
            let msg = 'Camera unavailable.';
            if (err?.name === 'NotAllowedError') msg = 'Camera permission denied. Tap retry.';
            else if (err?.toString().includes('NotFound')) msg = 'No camera found on this device.';
            setError(msg);
            setStatus('Error');
            setCameraActive(false);
        } finally {
            isInitializing.current = false;
        }
    };

    const onScanSuccess = async (decoded: string) => {
        if (isLoading) return;
        await stopCamera();
        await processQR(decoded);
    };

    const processQR = async (employeeId: string) => {
        if (isLoading) return;
        setIsLoading(true);
        setStatus('Processing...');
        setError(null);

        try {
            const res = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId, device_info: 'Mobile' }),
            });
            const data = await res.json();

            if (res.ok) {
                setScanResult(data.employee);
                setAttendanceData(data.attendance);
                setCheckpoint(data.checkpoint);
                setCheckpointLabel(data.checkpoint_label);
                setStatus('Success!');
                // Vibrate on success
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                // Auto-reset after 6 seconds
                setTimeout(() => handleReset(), 6000);
            } else {
                setError(data.error || 'Failed to log attendance.');
                setStatus('Error');
                if (navigator.vibrate) navigator.vibrate(400);
                setTimeout(() => { setError(null); startCamera(); }, 4000);
            }
        } catch {
            setError('Network error. Please try again.');
            setStatus('Network Error');
            if (navigator.vibrate) navigator.vibrate(400);
            setTimeout(() => { setError(null); startCamera(); }, 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setStatus('Scanning image...');
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const reader = new Html5Qrcode('qr-file-temp');
            const result = await reader.scanFile(file, true);
            await reader.clear();
            await processQR(result);
        } catch {
            setError('No QR code found in image.');
            setTimeout(() => setError(null), 3000);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleReset = () => {
        setScanResult(null);
        setAttendanceData(null);
        setCheckpoint('');
        setCheckpointLabel('');
        setError(null);
        setStatus('Initializing...');
    };

    const formatTime = (t: string | null) => {
        if (!t) return '--:--';
        try {
            const [h, m] = t.split(':');
            const hh = parseInt(h);
            return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
        } catch { return t; }
    };

    // --- AUTH GATE ---
    if (authChecked && !authed) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                fontFamily: "'Inter', sans-serif", padding: '2rem', textAlign: 'center'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                    Access Restricted
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                    This scanner is for Admin and HR staff only.
                </p>
                <a href="/login" style={{
                    padding: '0.875rem 2rem', background: '#fbbf24', color: '#064e3b',
                    borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem'
                }}>
                    Login
                </a>
            </div>
        );
    }

    // --- MAIN SCANNER LAYOUT ---
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #0f172a 0%, #064e3b 60%, #065f46 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            fontFamily: "'Inter', sans-serif", padding: '0', overflowX: 'hidden'
        }}>

            {/* Top Bar */}
            <div style={{
                width: '100%', padding: '1rem 1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        background: '#fbbf24', color: '#064e3b', width: '28px', height: '28px',
                        borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '1rem'
                    }}>M</div>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                        Attendance Kiosk
                    </span>
                </div>
                <div style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {currentTime}
                </div>
            </div>

            {/* Status Pill */}
            <div style={{ padding: '0.75rem 1.5rem', width: '100%', textAlign: 'center' }}>
                <span style={{
                    display: 'inline-block',
                    padding: '0.3rem 1rem',
                    borderRadius: '99px',
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    background: status.includes('Ready') || status.includes('Success')
                        ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                    color: status.includes('Ready') || status.includes('Success')
                        ? '#6ee7b7' : 'rgba(255,255,255,0.6)',
                    border: `1px solid ${status.includes('Ready') || status.includes('Success') ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`,
                }}>
                    {status}
                </span>
            </div>

            {/* Main Card */}
            <div style={{
                width: '100%', maxWidth: '420px', margin: '0 auto',
                padding: '0 1rem 6rem',
                display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '12px', padding: '0.875rem 1rem',
                        color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                {!scanResult ? (
                    <>
                        {/* Camera Viewfinder */}
                        <div style={{
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            border: '2px solid rgba(255,255,255,0.1)',
                            position: 'relative',
                            minHeight: '300px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                        }}>
                            <div id="mobile-qr-reader" style={{ width: '100%', minHeight: '300px' }} />

                            {/* Scanner Corner Overlay */}
                            {cameraActive && (
                                <div style={{
                                    position: 'absolute', inset: 0, pointerEvents: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                        {/* Corner brackets */}
                                        {[
                                            { top: 0, left: 0, borderTop: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24', borderRadius: '4px 0 0 0' },
                                            { top: 0, right: 0, borderTop: '3px solid #fbbf24', borderRight: '3px solid #fbbf24', borderRadius: '0 4px 0 0' },
                                            { bottom: 0, left: 0, borderBottom: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24', borderRadius: '0 0 0 4px' },
                                            { bottom: 0, right: 0, borderBottom: '3px solid #fbbf24', borderRight: '3px solid #fbbf24', borderRadius: '0 0 4px 0' },
                                        ].map((s, i) => (
                                            <div key={i} style={{
                                                position: 'absolute', width: '24px', height: '24px', ...s
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Start button overlay when camera is off */}
                            {!cameraActive && !isLoading && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '1rem', background: 'rgba(0,0,0,0.6)'
                                }}>
                                    <span style={{ fontSize: '3rem' }}>📷</span>
                                    <button
                                        onClick={startCamera}
                                        style={{
                                            padding: '0.875rem 2rem', background: '#059669',
                                            color: 'white', border: 'none', borderRadius: '12px',
                                            fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                                        }}
                                    >
                                        Start Scanner
                                    </button>
                                </div>
                            )}

                            {isLoading && (
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexDirection: 'column', gap: '0.75rem'
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)',
                                        borderTop: '3px solid #fbbf24', borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>Processing...</span>
                                </div>
                            )}
                        </div>

                        {/* Upload QR fallback */}
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '0.5rem', padding: '0.875rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '12px', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.875rem'
                        }}>
                            <span>🖼️</span> Upload QR Image Instead
                            <input
                                ref={fileInputRef}
                                type="file" accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </label>

                        {/* Hidden element for file scan */}
                        <div id="qr-file-temp" style={{ display: 'none' }} />

                        {/* Checkpoint legend */}
                        <div style={{
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '12px', padding: '0.875rem 1rem',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                                Checkpoint Order
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                {['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out'].map(cp => (
                                    <div key={cp} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                                        <span>{CHECKPOINT_ICONS[cp]}</span>
                                        <span>{cp.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    /* SUCCESS CARD */
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        {/* Checkpoint badge */}
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                background: CHECKPOINT_COLORS[checkpoint] || '#059669',
                                color: 'white', padding: '0.6rem 1.25rem',
                                borderRadius: '99px', fontWeight: 700, fontSize: '0.95rem',
                                boxShadow: `0 8px 24px ${CHECKPOINT_COLORS[checkpoint]}66`
                            }}>
                                {CHECKPOINT_ICONS[checkpoint]} {checkpointLabel}
                            </div>
                        </div>

                        {/* Employee ID Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
                            borderRadius: '20px', padding: '1.5rem',
                            boxShadow: '0 20px 50px rgba(5, 150, 105, 0.3)',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600, color: 'white' }}>
                                    MELANN LENDING<br />INVESTOR CORP.
                                </div>
                                <div style={{ background: '#fbbf24', color: '#064e3b', width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>M</div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '12px',
                                    overflow: 'hidden', border: '3px solid #fbbf24',
                                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {scanResult.profile_picture ? (
                                        <img src={scanResult.profile_picture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    ) : (
                                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#064e3b' }}>
                                            {scanResult.first_name[0]}{scanResult.last_name[0]}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                                        {scanResult.first_name} {scanResult.last_name}
                                    </h2>
                                    <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.75rem', marginTop: '2px' }}>{scanResult.position}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>{scanResult.department}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'right' }}>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {format(new Date(), 'hh:mm:ss a • MMM dd, yyyy')}
                                </div>
                            </div>
                        </div>

                        {/* Today's attendance grid */}
                        {attendanceData && (
                            <div style={{
                                background: 'rgba(255,255,255,0.06)', borderRadius: '16px',
                                padding: '1rem', border: '1px solid rgba(255,255,255,0.08)',
                                marginBottom: '1rem'
                            }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
                                    Today's Attendance
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {[
                                        { key: 'morning_in', label: 'AM In', value: attendanceData.morning_in },
                                        { key: 'morning_out', label: 'AM Out', value: attendanceData.morning_out },
                                        { key: 'afternoon_in', label: 'PM In', value: attendanceData.afternoon_in },
                                        { key: 'afternoon_out', label: 'PM Out', value: attendanceData.afternoon_out },
                                    ].map(({ key, label, value }) => (
                                        <div key={key} style={{
                                            padding: '0.625rem',
                                            background: value ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${value ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '10px', textAlign: 'center'
                                        }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                                            <div style={{ color: value ? '#6ee7b7' : 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>
                                                {formatTime(value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {(attendanceData.total_hours || 0) > 0 && (
                                    <div style={{ textAlign: 'center', marginTop: '0.625rem', color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 700 }}>
                                        Total: {attendanceData.total_hours.toFixed(2)} hrs
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CONTINUE button */}
                        <button
                            onClick={handleReset}
                            style={{
                                width: '100%', padding: '1rem',
                                background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
                                color: 'white', border: 'none', borderRadius: '14px',
                                fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
                                letterSpacing: '0.05em'
                            }}
                        >
                            ✓ CONTINUE / NEXT EMPLOYEE
                        </button>

                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                            Auto-resetting in a few seconds...
                        </p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                body { margin: 0; }
                #mobile-qr-reader video {
                    width: 100% !important;
                    object-fit: cover !important;
                    border-radius: 18px !important;
                }
                #mobile-qr-reader img { display: none !important; }
                #mobile-qr-reader > div { border: none !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
