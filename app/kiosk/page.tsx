'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const DEVICE_ID = 'KIOSK-1';

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'warning';

interface ScanResult {
    status: string;
    time: string;
    date: string;
    employee?: {
        id: string;
        name: string;
        first_name: string;
        last_name: string;
        department: string;
        position: string;
        profile_picture: string | null;
        branch: string;
    };
    error?: string;
}

function formatTimeDisplay(timeStr: string): string {
    if (!timeStr) return '--:--';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

export default function KioskPage() {
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [result, setResult] = useState<ScanResult | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [playSound, setPlaySound] = useState(false);
    const scannerRef = useRef<any>(null);
    const isInitializing = useRef(false);
    const isProcessing = useRef(false);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Update clock
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }));
            setCurrentDate(now.toLocaleDateString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    // Play success/error beep
    const playBeep = useCallback((type: 'success' | 'error' | 'warning') => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (type === 'success') {
                oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.4);
            } else if (type === 'error') {
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.4);
            } else {
                oscillator.frequency.setValueAtTime(660, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            // Audio not supported - silent fail
        }
    }, []);

    const stopCamera = useCallback(async () => {
        const current = scannerRef.current;
        if (current) {
            scannerRef.current = null;
            try {
                if (current.isScanning) await current.stop();
            } catch (e) { }
            setCameraActive(false);
        }
    }, []);

    const processQR = useCallback(async (qrValue: string) => {
        if (isProcessing.current) return;
        isProcessing.current = true;
        await stopCamera();
        setScanStatus('processing');

        // Clear auto-reset timer
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        try {
            const response = await fetch('/api/attendance-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: qrValue.trim(),
                    device_id: DEVICE_ID
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResult(data);

                if (data.status === 'ALREADY COMPLETED') {
                    setScanStatus('warning');
                    playBeep('warning');
                } else {
                    setScanStatus('success');
                    playBeep('success');
                }

                // Auto-reset after 4 seconds
                resetTimerRef.current = setTimeout(() => {
                    resetKiosk();
                }, 4000);
            } else {
                setResult({ status: data.status || 'ERROR', error: data.error || 'Failed to record attendance', time: '', date: '' });
                setScanStatus('error');
                playBeep('error');

                resetTimerRef.current = setTimeout(() => {
                    resetKiosk();
                }, 4000);
            }
        } catch (err) {
            setResult({ status: 'ERROR', error: 'Network error. Please try again.', time: '', date: '' });
            setScanStatus('error');
            playBeep('error');

            resetTimerRef.current = setTimeout(() => {
                resetKiosk();
            }, 3000);
        } finally {
            isProcessing.current = false;
        }
    }, [playBeep, stopCamera]);

    const startCamera = useCallback(async () => {
        if (isInitializing.current || cameraActive) return;
        isInitializing.current = true;
        setCameraError(null);

        const el = document.getElementById('kiosk-qr-reader');
        if (!el) {
            isInitializing.current = false;
            return;
        }
        el.innerHTML = '';

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('kiosk-qr-reader');
            scannerRef.current = scanner;

            const config = {
                fps: 15,
                qrbox: { width: 260, height: 260 },
                aspectRatio: 1.0
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                (decoded: string) => processQR(decoded),
                () => { }
            ).catch(async () => {
                return await scanner.start(
                    { facingMode: 'user' },
                    config,
                    (decoded: string) => processQR(decoded),
                    () => { }
                );
            });

            setCameraActive(true);
            setScanStatus('scanning');
        } catch (err: any) {
            let msg = 'Camera not available.';
            if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access.';
            else if (String(err).includes('NotFound')) msg = 'No camera found on this device.';
            setCameraError(msg);
            setScanStatus('idle');
        } finally {
            isInitializing.current = false;
        }
    }, [cameraActive, processQR]);

    const resetKiosk = useCallback(() => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        setResult(null);
        setScanStatus('idle');
        setCameraError(null);
        isProcessing.current = false;
    }, []);

    // Auto-start camera when idle
    useEffect(() => {
        if (scanStatus === 'idle' && !cameraActive && !isInitializing.current) {
            const t = setTimeout(() => startCamera(), 500);
            return () => clearTimeout(t);
        }
    }, [scanStatus, cameraActive, startCamera]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, [stopCamera]);

    const getStatusConfig = () => {
        switch (scanStatus) {
            case 'success':
                if (result?.status === 'TIME IN RECORDED') return {
                    bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                    icon: '✅',
                    label: 'TIME IN RECORDED',
                    labelColor: '#6ee7b7',
                    headerBg: 'rgba(6, 78, 59, 0.95)'
                };
                return {
                    bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
                    icon: '🏁',
                    label: 'TIME OUT RECORDED',
                    labelColor: '#93c5fd',
                    headerBg: 'rgba(30, 58, 95, 0.95)'
                };
            case 'warning':
                return {
                    bg: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
                    icon: '⚠️',
                    label: 'ALREADY COMPLETED',
                    labelColor: '#fde68a',
                    headerBg: 'rgba(120, 53, 15, 0.95)'
                };
            case 'error':
                return {
                    bg: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
                    icon: '❌',
                    label: 'SCAN FAILED',
                    labelColor: '#fca5a5',
                    headerBg: 'rgba(127, 29, 29, 0.95)'
                };
            case 'processing':
                return {
                    bg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    icon: '⏳',
                    label: 'PROCESSING...',
                    labelColor: '#94a3b8',
                    headerBg: 'rgba(30, 41, 59, 0.95)'
                };
            default:
                return {
                    bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    icon: '📱',
                    label: 'SCAN YOUR QR CODE',
                    labelColor: '#a5b4fc',
                    headerBg: 'rgba(15, 23, 42, 0.95)'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div id="kiosk-root" style={{
            minHeight: '100vh',
            minWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
            background: config.bg,
            transition: 'background 0.6s ease',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            overflow: 'hidden',
            position: 'relative',
            userSelect: 'none'
        }}>
            {/* Animated BG Blobs */}
            <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'
            }}>
                <div style={{
                    position: 'absolute', top: '-20%', left: '-10%',
                    width: '60vw', height: '60vw', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)', animation: 'blob1 8s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-10%',
                    width: '50vw', height: '50vw', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)', animation: 'blob2 10s ease-in-out infinite'
                }} />
            </div>

            {/* Header Bar */}
            <header style={{
                background: config.headerBg,
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'background 0.6s ease',
                zIndex: 10
            }}>
                {/* Logo & Company */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '42px', height: '42px', background: '#fbbf24', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '1.25rem', color: '#064e3b',
                        boxShadow: '0 4px 12px rgba(251,191,36,0.4)'
                    }}>M</div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', lineHeight: 1.1 }}>
                            MELANN LENDING
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                            INVESTOR CORPORATION
                        </div>
                    </div>
                </div>

                {/* Live Clock */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontVariantNumeric: 'tabular-nums' }}>
                        {currentTime}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
                        {currentDate}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                gap: '1.5rem',
                zIndex: 5
            }}>
                {/* Big Status Label */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        marginBottom: '0.5rem',
                        animation: scanStatus !== 'idle' && scanStatus !== 'scanning' ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                    }}>
                        {config.icon}
                    </div>
                    <h1 style={{
                        color: config.labelColor,
                        fontSize: 'clamp(1.5rem, 5vw, 3rem)',
                        fontWeight: 900,
                        margin: 0,
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                        transition: 'color 0.4s ease',
                        animation: scanStatus !== 'idle' && scanStatus !== 'scanning' ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                    }}>
                        {config.label}
                    </h1>
                </div>

                {/* Scanner Card or Result Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                    transition: 'all 0.4s ease',
                    minHeight: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.25rem'
                }}>

                    {(scanStatus === 'idle' || scanStatus === 'scanning') && (
                        <>
                            {/* QR Scanner Area */}
                            <div style={{
                                width: '100%',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'rgba(0,0,0,0.3)',
                                minHeight: '280px',
                                position: 'relative',
                                border: cameraActive ? '2px solid rgba(165,180,252,0.5)' : '2px solid rgba(255,255,255,0.1)',
                                transition: 'border-color 0.3s ease'
                            }}>
                                {/* Scanner target frame */}
                                {cameraActive && (
                                    <div style={{
                                        position: 'absolute', inset: 0, zIndex: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        pointerEvents: 'none'
                                    }}>
                                        <div style={{
                                            width: '200px', height: '200px', position: 'relative'
                                        }}>
                                            {/* Corner brackets */}
                                            {[
                                                { top: 0, left: 0, borderTop: '3px solid #a5b4fc', borderLeft: '3px solid #a5b4fc' },
                                                { top: 0, right: 0, borderTop: '3px solid #a5b4fc', borderRight: '3px solid #a5b4fc' },
                                                { bottom: 0, left: 0, borderBottom: '3px solid #a5b4fc', borderLeft: '3px solid #a5b4fc' },
                                                { bottom: 0, right: 0, borderBottom: '3px solid #a5b4fc', borderRight: '3px solid #a5b4fc' }
                                            ].map((style, i) => (
                                                <div key={i} style={{
                                                    position: 'absolute', width: '24px', height: '24px',
                                                    borderRadius: '2px', ...style
                                                }} />
                                            ))}
                                            {/* Scan line animation */}
                                            <div style={{
                                                position: 'absolute', left: '4px', right: '4px', height: '2px',
                                                background: 'linear-gradient(90deg, transparent, #a5b4fc, transparent)',
                                                animation: 'scanLine 2s linear infinite'
                                            }} />
                                        </div>
                                    </div>
                                )}

                                <div id="kiosk-qr-reader" style={{
                                    width: '100%',
                                    minHeight: '280px'
                                }} />

                                {!cameraActive && !cameraError && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: '1rem'
                                    }}>
                                        <div style={{
                                            width: '48px', height: '48px', border: '3px solid rgba(165,180,252,0.4)',
                                            borderTopColor: '#a5b4fc', borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                                            Initializing camera...
                                        </span>
                                    </div>
                                )}
                            </div>

                            {cameraError && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '12px', padding: '1rem', textAlign: 'center', width: '100%'
                                }}>
                                    <p style={{ color: '#fca5a5', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                                        ⚠️ {cameraError}
                                    </p>
                                    <button
                                        onClick={startCamera}
                                        id="retry-camera-btn"
                                        style={{
                                            padding: '0.5rem 1.5rem', background: '#dc2626', color: 'white',
                                            border: 'none', borderRadius: '8px', fontWeight: 700,
                                            cursor: 'pointer', fontSize: '0.875rem'
                                        }}
                                    >
                                        Retry Camera
                                    </button>
                                </div>
                            )}

                            {cameraActive && (
                                <p style={{
                                    color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0,
                                    textAlign: 'center'
                                }}>
                                    Point your QR code ID at the camera
                                </p>
                            )}
                        </>
                    )}

                    {scanStatus === 'processing' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                width: '64px', height: '64px', border: '4px solid rgba(148,163,184,0.2)',
                                borderTopColor: '#94a3b8', borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite', margin: '0 auto 1.5rem'
                            }} />
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                                Recording attendance...
                            </p>
                        </div>
                    )}

                    {(scanStatus === 'success' || scanStatus === 'warning') && result?.employee && (
                        <>
                            {/* Employee Card */}
                            <div style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center',
                                border: '1px solid rgba(255,255,255,0.12)'
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '14px',
                                    overflow: 'hidden', flexShrink: 0,
                                    border: '3px solid rgba(251,191,36,0.6)',
                                    background: '#064e3b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {result.employee.profile_picture ? (
                                        <img
                                            src={result.employee.profile_picture}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            alt=""
                                        />
                                    ) : (
                                        <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.5rem' }}>
                                            {result.employee.first_name?.[0]}{result.employee.last_name?.[0]}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        color: 'white', fontWeight: 800,
                                        fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                                        marginBottom: '0.25rem',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {result.employee.name}
                                    </div>
                                    <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.125rem' }}>
                                        {result.employee.position}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                                        {result.employee.department}
                                    </div>
                                    <div style={{
                                        display: 'inline-block',
                                        marginTop: '0.4rem',
                                        background: 'rgba(251,191,36,0.15)',
                                        border: '1px solid rgba(251,191,36,0.3)',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        color: '#fde68a',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em'
                                    }}>
                                        ID: {result.employee.id}
                                    </div>
                                </div>
                            </div>

                            {/* Time Info */}
                            <div style={{
                                width: '100%', textAlign: 'center',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px', padding: '1rem',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <div style={{
                                    fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
                                    fontWeight: 900, color: 'white',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.02em'
                                }}>
                                    {formatTimeDisplay(result.time)}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {result.date ? formatDateDisplay(result.date) : currentDate}
                                </div>
                            </div>

                            {/* Status badge */}
                            <div style={{
                                background: scanStatus === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                                border: `1px solid ${scanStatus === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
                                borderRadius: '99px',
                                padding: '0.5rem 1.5rem',
                                color: scanStatus === 'success' ? '#6ee7b7' : '#fde68a',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                letterSpacing: '0.05em'
                            }}>
                                {result.status === 'TIME IN RECORDED' && '✅ TIME IN RECORDED'}
                                {result.status === 'TIME OUT RECORDED' && '🏁 TIME OUT RECORDED'}
                                {result.status === 'ALREADY COMPLETED' && '⚠️ ATTENDANCE ALREADY COMPLETED'}
                            </div>

                            {/* Countdown */}
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>
                                Resetting in 4 seconds...
                            </p>

                            <button
                                id="kiosk-scan-next-btn"
                                onClick={resetKiosk}
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '12px', color: 'white', fontWeight: 700,
                                    fontSize: '0.9rem', cursor: 'pointer',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            >
                                Next Scan →
                            </button>
                        </>
                    )}

                    {scanStatus === 'error' && (
                        <>
                            <div style={{
                                textAlign: 'center', padding: '1rem 0',
                                color: '#fca5a5', fontSize: '1rem', fontWeight: 600
                            }}>
                                {result?.error || 'Failed to record attendance'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'center' }}>
                                Scanner will reset automatically...
                            </div>
                            <button
                                id="kiosk-retry-btn"
                                onClick={resetKiosk}
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    background: 'rgba(239,68,68,0.2)',
                                    border: '1px solid rgba(239,68,68,0.4)',
                                    borderRadius: '12px', color: '#fca5a5', fontWeight: 700,
                                    fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: '0.75rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
                zIndex: 10
            }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                    Device: {DEVICE_ID}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                    Attendance Kiosk v2.0
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                    © {new Date().getFullYear()} Melann
                </span>
            </footer>

            {/* Global Styles */}
            <style>{`
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; overflow: hidden; }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes scanLine {
                    0% { top: 4px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: calc(100% - 6px); opacity: 0; }
                }
                @keyframes popIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    70% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes blob1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes blob2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-40px, 30px) scale(1.05); }
                    66% { transform: translate(20px, -20px) scale(0.97); }
                }
                
                /* Override html5-qrcode internal styles */
                #kiosk-qr-reader video {
                    width: 100% !important;
                    height: auto !important;
                    min-height: 260px !important;
                    object-fit: cover !important;
                    border-radius: 12px !important;
                }
                #kiosk-qr-reader img {
                    display: none !important;
                }
                #kiosk-qr-reader__scan_region {
                    min-height: 280px !important;
                }
                #kiosk-qr-reader__dashboard {
                    display: none !important;
                }
                #kiosk-qr-reader__status_span {
                    display: none !important;
                }
                #kiosk-qr-reader select {
                    display: none !important;
                }
                #kiosk-qr-reader button {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
