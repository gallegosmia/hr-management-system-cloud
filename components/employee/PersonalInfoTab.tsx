import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import EditProfileForm from './EditProfileForm';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    employment_status: string;
    date_of_birth?: string;
    contact_number?: string;
    email_address?: string;
    address?: string; // Residential Address
    civil_status?: string; // Marital Status
    profile_picture?: string;

    // Fields that might be missing or need placeholders
    gender?: string;
    religion?: string;
    citizen_id_address?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    emergency_contact_relationship?: string;
    emergency_contact_address?: string;

    // Related data
    branch?: string;
    education?: Education[];
}

interface Education {
    level: string;
    school_name: string;
    degree_course?: string;
    year_graduated: string;
    honors_awards?: string;
}

interface PersonalInfoTabProps {
    employee: Employee;
    onEdit: (section: string) => void;
    onSave?: (data: any) => Promise<void>;
}

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div style={{ display: 'flex', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        <span style={{ width: '140px', color: '#111827', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#6b7280', flex: 1 }}>{value || '-'}</span>
    </div>
);

const CardHeader = ({ title, icon, onEdit }: { title: string, icon?: string, onEdit?: () => void }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {icon && <span style={{ fontSize: '1.25rem', color: 'var(--primary-600)' }}>{icon}</span>}
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
        {onEdit && (
            <button
                onClick={onEdit}
                style={{
                    padding: '0.4rem 0.75rem',
                    background: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    borderRadius: '8px',
                    border: '1px solid var(--primary-100)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-100)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary-50)'; }}
            >
                Edit
            </button>
        )}
    </div>
);

const Card = ({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '1.75rem',
        border: '1px solid rgba(0,0,0,0.05)',
        height: '100%',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        transition: 'transform 0.2s ease, boxShadow 0.2s ease',
        ...style
    }}>
        {children}
    </div>
);

export default function PersonalInfoTab({ employee, onEdit, onSave }: PersonalInfoTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [profilePicture, setProfilePicture] = useState(employee.profile_picture);
    const qrRef = useRef<HTMLDivElement>(null);
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
        setProfilePicture(employee.profile_picture);
    }, [employee.profile_picture]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        setIsUploadingPhoto(true);

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;

                const sessionId = localStorage.getItem('sessionId');
                const response = await fetch('/api/employees/photo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-session-id': sessionId || ''
                    },
                    body: JSON.stringify({
                        employee_id: employee.id,
                        photo: base64
                    })
                });

                if (response.ok) {
                    setProfilePicture(base64);
                    alert('Photo uploaded successfully!');
                    // Refresh the page to show updated photo
                    window.location.reload();
                } else {
                    const data = await response.json();
                    alert(data.error || 'Failed to upload photo');
                }
                setIsUploadingPhoto(false);
            };
            reader.onerror = () => {
                alert('Failed to read image file');
                setIsUploadingPhoto(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Failed to upload photo');
            setIsUploadingPhoto(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handlePrintID = () => {
        if (!qrRef.current) return;

        const qrSvg = qrRef.current.innerHTML;
        const profilePic = employee.profile_picture || '';
        const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Employee ID - ${employee.first_name} ${employee.last_name}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap');
                        
                        body { 
                            font-family: 'Inter', system-ui, -apple-system, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: #e5e5e5;
                        }
                        .id-card {
                            /* SQUARE ASPECT RATIO 1:1 */
                            width: 500px;
                            height: 500px;
                            background: white;
                            border-radius: 20px;
                            position: relative;
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            box-sizing: border-box;
                            border: 1px solid #e2e8f0;
                        }
                        
                        /* Header Section */
                        .card-header {
                            width: 100%;
                            height: 130px;
                            background: linear-gradient(135deg, #064e3b 0%, #059669 100%);
                            display: flex;
                            justify-content: center;
                            align-items: flex-start;
                            padding-top: 25px;
                            position: relative;
                        }
                        .header-content {
                            display: flex;
                            align-items: center;
                            gap: 15px;
                            z-index: 5;
                        }
                        .logo-box {
                            width: 45px;
                            height: 45px;
                            background: rgba(255,255,255,0.95);
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 6px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        }
                        .company-info {
                            text-align: left;
                            color: white;
                        }
                        .company-name {
                            font-weight: 800;
                            font-size: 1.1rem;
                            line-height: 1.1;
                            letter-spacing: 0.02em;
                        }
                        .company-tag {
                            font-size: 0.7rem;
                            text-transform: uppercase;
                            opacity: 0.9;
                            margin-top: 4px;
                            letter-spacing: 0.1em;
                            font-weight: 600;
                        }

                        /* Profile Photo - Overlapping Header and Body */
                        .profile-container {
                            width: 130px;
                            height: 130px;
                            border-radius: 50%;
                            background: white;
                            border: 6px solid white;
                            margin-top: -65px; /* Half overlapping */
                            z-index: 10;
                            overflow: hidden;
                            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .profile-img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .initials {
                            font-size: 3rem;
                            font-weight: 800;
                            color: #059669;
                        }

                        /* Employee Info */
                        .emp-info {
                            margin-top: 15px;
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            width: 90%;
                        }
                        .emp-name {
                            font-size: 1.75rem;
                            font-weight: 900;
                            color: #111827;
                            margin: 0;
                            line-height: 1.1;
                            letter-spacing: -0.03em;
                            margin-bottom: 6px;
                        }
                        .emp-pos {
                            font-size: 1rem;
                            font-weight: 700;
                            color: #059669;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            margin-bottom: 2px;
                        }
                        .emp-dept {
                            font-size: 0.85rem;
                            font-weight: 600;
                            color: #6b7280;
                            background: #f3f4f6;
                            padding: 4px 12px;
                            border-radius: 100px;
                            margin-top: 4px;
                        }

                        /* QR and Footer Area */
                        .footer-section {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            width: 100%;
                            padding-bottom: 20px;
                            margin-top: auto;
                        }
                        .qr-box {
                            background: white;
                            padding: 6px;
                            border-radius: 12px;
                            border: 1px solid #e5e7eb;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                            margin-bottom: 8px;
                        }
                        .id-number {
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 1.1rem;
                            font-weight: 800;
                            color: #374151;
                            letter-spacing: 0.1em;
                        }

                        /* Footer Line */
                        .bottom-bar {
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            height: 8px;
                            background: linear-gradient(90deg, #064e3b, #10b981, #064e3b);
                        }

                        @media print {
                            body { 
                                background: white; 
                                height: auto;
                                display: block;
                            }
                            .id-card {
                                border: 1px solid #ddd;
                                margin: 0 auto;
                                page-break-inside: avoid;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="id-card">
                        <!-- Header -->
                        <div class="card-header">
                            <div class="header-content">
                                <div class="logo-box">
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                                        <rect x="15" y="50" width="18" height="35" rx="3" fill="#064e3b" />
                                        <rect x="41" y="30" width="18" height="55" rx="3" fill="#059669" />
                                        <rect x="67" y="15" width="18" height="70" rx="3" fill="#10b981" />
                                    </svg>
                                </div>
                                <div class="company-info">
                                    <div class="company-name">MELANN LENDING<br>INVESTOR CORP.</div>
                                    <div class="company-tag">Lend • Empower • Grow</div>
                                </div>
                            </div>
                        </div>

                        <!-- Profile Photo -->
                        <div class="profile-container">
                            ${profilePic ? `<img src="${profilePic}" class="profile-img" />` : `<div class="initials">${initials}</div>`}
                        </div>

                        <!-- Main Info -->
                        <div class="emp-info">
                            <h2 class="emp-name">${employee.first_name} ${employee.last_name}</h2>
                            <div class="emp-pos">${employee.position}</div>
                            <div class="emp-dept">${employee.department}</div>
                        </div>

                        <!-- Footer / QR -->
                        <div class="footer-section">
                            <div class="qr-box">
                                <div style="width: 85px; height: 85px;">
                                    ${qrSvg}
                                </div>
                            </div>
                            <div class="id-number">${employee.employee_id}</div>
                        </div>

                        <div class="bottom-bar"></div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 800);
    };

    const handleDownloadQR = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Increase size for better quality
        const size = 300;
        canvas.width = size;
        canvas.height = size;

        img.onload = () => {
            if (ctx) {
                // Add white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);

                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR_ID_${employee.employee_id}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    };

    if (isEditing && onSave) {
        return (
            <EditProfileForm
                employee={employee}
                onSave={async (data) => {
                    await onSave(data);
                    setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Top Grid: Profile & QR */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1rem', alignItems: 'stretch' }}>

                {/* LEFT: Employee Profile Card */}
                <Card style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.25rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                {/* Profile Picture */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '110px', height: '110px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        border: '4px solid white',
                                        boxShadow: '0 4px 15px -5px rgba(0,0,0,0.1)',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {profilePicture ?
                                            <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <div style={{ width: '100%', height: '100%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-200)' }}>
                                                {employee.first_name?.[0]}{employee.last_name?.[0]}
                                            </div>
                                        }
                                    </div>
                                    <label style={{
                                        position: 'absolute', bottom: '4px', right: '4px',
                                        background: 'white', border: '1px solid var(--gray-200)',
                                        borderRadius: '50%', width: '28px', height: '28px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                        fontSize: '0.8rem'
                                    }} title="Upload Photo">
                                        📷
                                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                                    </label>
                                </div>

                                {/* Names & Role */}
                                <div style={{ paddingTop: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--gray-900)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                            {employee.first_name} {employee.last_name}
                                        </h2>
                                        <span style={{
                                            background: '#10b981', color: 'white',
                                            padding: '2px 8px', borderRadius: '100px',
                                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                            display: 'flex', alignItems: 'center', gap: '3px',
                                            letterSpacing: '0.05em'
                                        }}>
                                            ✓ Verified
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--primary-600)', fontWeight: 700, marginBottom: '0.25rem' }}>
                                        {employee.position}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>🆔 {employee.employee_id}</span>
                                        <span>•</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>📍 {employee.department}</span>
                                        {employee.employment_status && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: 'var(--gray-700)' }}>{employee.employment_status}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Quick Contact Stats */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                        <div style={{ background: 'var(--gray-50)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                            <span>✉️</span> <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.email_address || 'No email'}</span>
                                        </div>
                                        <div style={{ background: 'var(--gray-50)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                            <span>📞</span> {employee.contact_number || 'No contact'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            {user && user.role !== 'Employee' && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        background: 'white',
                                        color: 'var(--gray-700)',
                                        border: '1px solid var(--gray-200)',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'var(--gray-100)', margin: '1.25rem 0' }}></div>

                        {/* Bio Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '1rem',
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🎂</span>
                                    <span style={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>Birth Date</span>
                                </div>
                                <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>{formatDate(employee.date_of_birth)}</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1rem' }}>💍</span>
                                    <span style={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>Civil Status</span>
                                </div>
                                <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>{employee.civil_status || 'Not defined'}</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🛐</span>
                                    <span style={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>Religion</span>
                                </div>
                                <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>{employee.religion || 'Not specified'}</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🏢</span>
                                    <span style={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>Branch Unit</span>
                                </div>
                                <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>{employee.branch || 'Head Office'}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* RIGHT: Digital QR ID Card */}
                <Card style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
                    border: '1px solid var(--gray-200)',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute', top: '15px', left: '0', right: '0', textAlign: 'center',
                        textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800,
                        color: 'var(--gray-400)', letterSpacing: '0.1em'
                    }}>
                        Digital QR Identification
                    </div>

                    {/* QR Display Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '1rem 0' }}>
                        <div style={{
                            background: 'white',
                            padding: '0.75rem',
                            borderRadius: '16px',
                            boxShadow: '0 4px 15px -5px rgba(0,0,0,0.08)',
                            border: '1px solid var(--gray-100)',
                            borderBottom: '3px solid var(--primary-500)',
                            marginBottom: '0.75rem'
                        }}>
                            <div ref={qrRef} style={{ background: 'white' }}>
                                <QRCodeSVG
                                    value={employee.employee_id}
                                    size={120}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                        </div>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: 'var(--gray-800)',
                            letterSpacing: '0.05em',
                            background: 'var(--gray-100)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '6px'
                        }}>
                            {employee.employee_id}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            onClick={handlePrintID}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: 'white',
                                color: 'var(--gray-800)',
                                borderRadius: '8px',
                                border: '1px solid var(--gray-300)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>🖨️</span> Print ID
                        </button>

                        <button
                            onClick={handleDownloadQR}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: 'var(--primary-50)',
                                color: 'var(--primary-700)',
                                borderRadius: '8px',
                                border: '1px solid var(--primary-100)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span>💾</span> Save QR
                        </button>
                    </div>

                    <p style={{
                        marginTop: '0.75rem',
                        fontSize: '0.6rem',
                        color: 'var(--gray-500)',
                        textAlign: 'center',
                        maxWidth: '90%',
                        lineHeight: 1.3
                    }}>
                        Authorized Personnel Only
                    </p>
                </Card>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Address */}
                <Card style={{ padding: '1rem' }}>
                    <CardHeader title="Residential Address" icon="📍" onEdit={() => onEdit('address')} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--primary-50)', padding: '0.75rem', borderRadius: '10px', borderLeft: '3px solid var(--primary-500)' }}>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary-700)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Residence</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)', fontWeight: 500, lineHeight: 1.4 }}>
                                {employee.address || 'Street/Barangay info not provided'}
                            </span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-400)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citizen ID Address</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                                {employee.citizen_id_address || 'Matches residential address'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Emergency Contact */}
                <Card style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader title="Emergency Contact" icon="🆘" onEdit={() => onEdit('emergency')} />
                    <div style={{ background: '#fffef3', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--warning-200)', display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--warning-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                👤
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                                    {employee.emergency_contact_name || 'Guardian Not Set'}
                                </div>
                                {employee.emergency_contact_number ? (
                                    <div style={{ color: 'var(--warning-700)', fontWeight: 700, fontSize: '0.85rem', marginTop: '0.15rem' }}>
                                        📞 {employee.emergency_contact_number}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: '0.925rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                        No emergency number provided
                                    </div>
                                )}
                                {(employee.emergency_contact_relationship || employee.emergency_contact_address) && (
                                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--warning-200)', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                                        {employee.emergency_contact_relationship && (
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                                <span style={{ fontWeight: 600 }}>Relationship:</span> {employee.emergency_contact_relationship}
                                            </div>
                                        )}
                                        {employee.emergency_contact_address && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>Address:</span> {employee.emergency_contact_address}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Education */}
                <Card style={{ gridColumn: 'span 2' }}>
                    <CardHeader title="Educational Background" icon="🎓" onEdit={() => onEdit('education')} />

                    {(!employee.education || employee.education.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--gray-50)', borderRadius: '16px', border: '2px dashed var(--gray-200)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>📚</span>
                            <p style={{ color: 'var(--gray-400)', fontWeight: 600 }}>No educational records found in database.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {employee.education.map((edu, idx) => (
                                <div key={idx} style={{
                                    padding: '1.25rem',
                                    borderRadius: '16px',
                                    background: 'white',
                                    border: '1px solid var(--gray-100)',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    gap: '1rem'
                                }}>
                                    <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>🏫</div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                            {edu.level}
                                        </div>
                                        <div style={{ fontSize: '0.925rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                                            {edu.school_name}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.4rem', fontWeight: 500 }}>
                                            {edu.degree_course}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                                            <span style={{ background: 'var(--gray-100)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-500)' }}>GRADUATED: {edu.year_graduated}</span>
                                            {edu.honors_awards && <span style={{ background: 'var(--success-50)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--success-700)' }}>AWARDS: {edu.honors_awards}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
