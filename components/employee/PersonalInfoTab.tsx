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

    // Related data
    branch?: string;
    education?: Education[];
}

interface Education {
    level: string;
    school_name: string;
    degree_course?: string;
    year_graduated: string;
    grade?: string; // GPA
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
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

                // Upload to server
                const response = await fetch('/api/employees/photo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                            /* STANDARD CREDIT CARD SIZE (CR80) */
                            width: 85.6mm;
                            height: 54mm;
                            background: white;
                            border-radius: 4mm;
                            position: relative;
                            overflow: hidden;
                            display: flex;
                            align-items: center;
                            box-sizing: border-box;
                            border: 1px solid #cbd5e1;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        }
                        
                        /* Background Pattern */
                        .id-bg {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            z-index: 0;
                            opacity: 0.03;
                            background-image: radial-gradient(#8B2635 1px, transparent 1px);
                            background-size: 4mm 4mm;
                        }

                        /* Left Side Accent */
                        .left-accent {
                            position: absolute;
                            left: 0;
                            top: 0;
                            bottom: 0;
                            width: 6mm;
                            background: linear-gradient(180deg, #E74C3C 0%, #8B2635 100%);
                            z-index: 10;
                        }

                        /* Content Container */
                        .content {
                            display: flex;
                            width: 100%;
                            height: 100%;
                            padding: 0 5mm 0 10mm; /* Extra left padding for accent */
                            position: relative;
                            z-index: 20;
                            gap: 4mm;
                            align-items: center;
                        }

                        /* Photo Section (Left) */
                        .photo-section {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 2mm;
                        }

                        .profile-container {
                            width: 32mm;
                            height: 32mm;
                            border-radius: 50%;
                            background: white;
                            border: 1mm solid #f1f5f9;
                            overflow: hidden;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }

                        .profile-img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }

                        .initials {
                            font-size: 14mm;
                            font-weight: 800;
                            color: #8B2635;
                        }

                        .id-number-box {
                            background: #f8fafc;
                            padding: 1mm 3mm;
                            border-radius: 1mm;
                            border: 1px solid #e2e8f0;
                            text-align: center;
                        }

                        .id-label {
                            font-size: 6pt;
                            color: #64748b;
                            text-transform: uppercase;
                            font-weight: 700;
                            display: block;
                            line-height: 1;
                            margin-bottom: 0.5mm;
                        }

                        .id-value {
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 8pt;
                            font-weight: 800;
                            color: #334155;
                        }

                        /* Info Section (Right) */
                        .info-section {
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            height: 100%;
                            padding-top: 2mm;
                        }

                        /* Header/Logo */
                        .header {
                            display: flex;
                            align-items: center;
                            gap: 2mm;
                            margin-bottom: 3mm;
                            border-bottom: 0.5px solid #e2e8f0;
                            padding-bottom: 2mm;
                        }

                        .logo-box {
                            width: 8mm;
                            height: 8mm;
                        }

                        .company-name {
                            font-size: 8pt;
                            font-weight: 900;
                            color: #8B2635;
                            line-height: 1.1;
                            text-transform: uppercase;
                        }

                        .emp-name {
                            font-size: 14pt;
                            font-weight: 900;
                            color: #0f172a;
                            line-height: 1.1;
                            margin-bottom: 1mm;
                        }

                        .emp-role {
                            font-size: 8pt;
                            color: #E74C3C;
                            font-weight: 700;
                            text-transform: uppercase;
                            margin-bottom: 0.5mm;
                        }

                        .emp-dept {
                            font-size: 7pt;
                            color: #64748b;
                            font-weight: 600;
                        }

                        /* QR Code */
                        .qr-section {
                            position: absolute;
                            bottom: 3mm;
                            right: 3mm;
                            width: 14mm;
                            height: 14mm;
                            background: white;
                            padding: 1mm;
                            border-radius: 1mm;
                            border: 0.5px solid #e2e8f0;
                        }

                        @media print {
                            body { 
                                background: white; 
                                height: auto;
                                display: block;
                                margin: 0;
                            }
                            .id-card {
                                border: 1px solid #eee; /* faint border for cutting guide */
                                margin: 0;
                                page-break-inside: avoid;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                box-shadow: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="id-card">
                        <div class="id-bg"></div>
                        <div class="left-accent"></div>
                        
                        <div class="content">
                            <!-- Photo Side -->
                            <div class="photo-section">
                                <div class="profile-container">
                                    ${profilePic ? `<img src="${profilePic}" class="profile-img" />` : `<div class="initials">${initials}</div>`}
                                </div>
                                <div class="id-number-box">
                                    <span class="id-label">Employee ID</span>
                                    <span class="id-value">${employee.employee_id}</span>
                                </div>
                            </div>

                            <!-- Info Side -->
                            <div class="info-section">
                                <div class="header">
                                    <div class="logo-box">
                                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="10" y="50" width="20" height="40" rx="4" fill="#8B2635" />
                                            <rect x="40" y="30" width="20" height="60" rx="4" fill="#D2691E" />
                                            <rect x="70" y="10" width="20" height="80" rx="4" fill="#E74C3C" />
                                        </svg>
                                    </div>
                                    <div class="company-name">Melann Lending<br>Investor Corp.</div>
                                </div>
                                
                                <div>
                                    <div class="emp-name">${employee.first_name}<br>${employee.last_name}</div>
                                    <div class="emp-role">${employee.position}</div>
                                    <div class="emp-dept">${employee.department}</div>
                                </div>
                            </div>
                            
                            <!-- QR Code -->
                            <div class="qr-section">
                                ${qrSvg}
                            </div>
                        </div>
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
        <div style={{
            background: '#fff1f2',
            backgroundImage: 'radial-gradient(#e11d48 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
            minHeight: '100%',
            padding: '2rem',
            borderRadius: '16px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

                {/* Header Section */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', padding: '1.25rem 2rem', borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem',
                    borderLeft: '6px solid #8B2635'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #8B2635, #E74C3C)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(231, 76, 60, 0.3)' }}>ML</div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>MELANN LENDING</h1>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Investor Corporation</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B2635', fontFamily: 'monospace', lineHeight: 1 }}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, marginTop: '0.2rem' }}>
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>

                    {/* Basic Info Card (Full Width) */}
                    <div style={{ gridColumn: 'span 12' }}>
                        <Card style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, var(--primary-50) 0%, transparent 70%)', borderRadius: '0 0 0 100%' }}></div>

                            <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '160px', height: '160px', borderRadius: '50%',
                                        background: 'white', padding: '0.5rem',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                                        border: '1px solid var(--gray-100)'
                                    }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {profilePicture ?
                                                <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-300)' }}>{employee.first_name?.[0]}{employee.last_name?.[0]}</span>
                                            }
                                        </div>
                                    </div>
                                    <div style={{
                                        position: 'absolute', bottom: '10px', right: '10px',
                                        background: '#10b981', color: 'white',
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1rem', border: '3px solid white',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>âœ“</div>
                                </div>

                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1f2937', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                {employee.first_name} {employee.last_name}
                                            </h2>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ background: '#fef2f2', color: '#991b1b', padding: '0.2rem 0.8rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {employee.department}
                                                </span>
                                                <span style={{ color: '#6b7280', fontSize: '1rem', fontWeight: 500 }}>
                                                    {employee.position}
                                                </span>
                                            </div>
                                        </div>

                                        {user && user.role !== 'Employee' && (
                                            <button onClick={() => setIsEditing(true)} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4b5563', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                âœï¸
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Full ID</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>{employee.employee_id}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email Address</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{employee.email_address || '-'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{employee.contact_number || '-'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Birth Date</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{formatDate(employee.date_of_birth)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Civil Status</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{employee.civil_status || '-'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button onClick={handlePrintID} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'white', border: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        ðŸ–¨ï¸ Print ID
                                    </button>
                                    <button onClick={handleDownloadQR} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'white', border: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        ðŸ’¾ Save QR
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sub Cards Row 1 */}
                    <div style={{ gridColumn: 'span 6' }}>
                        <Card>
                            <CardHeader title="Residential Address" icon="ðŸ“" onEdit={() => onEdit('address')} />
                            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                                <p style={{ margin: 0, color: '#374151', lineHeight: '1.6', fontWeight: 500 }}>
                                    {employee.address || 'Address not updated'}
                                </p>
                            </div>
                        </Card>
                    </div>

                    <div style={{ gridColumn: 'span 6' }}>
                        <Card>
                            <CardHeader title="Emergency Contact" icon="ðŸ†˜" onEdit={() => onEdit('emergency')} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff7ed', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #fdba74' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>ðŸ“ž</div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{employee.emergency_contact_name || 'Not Listed'}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#c2410c', fontWeight: 600 }}>{employee.emergency_contact_number || '-'}</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sub Cards Row 2 */}
                    <div style={{ gridColumn: 'span 6' }}>
                        <Card>
                            <CardHeader title="Work & Legal Info" icon="ðŸ¢" onEdit={() => onEdit('address')} />
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Company Address / Branch</div>
                                    <div style={{ fontWeight: 600, color: '#374151', marginTop: '0.25rem' }}>{employee.branch || 'Head Office'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Citizen ID Address</div>
                                    <div style={{ fontWeight: 600, color: '#374151', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{employee.citizen_id_address || 'Same as residential'}</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div style={{ gridColumn: 'span 6' }}>
                        <Card>
                            <CardHeader title="Education" icon="ðŸŽ“" onEdit={() => onEdit('education')} />
                            {(!employee.education || employee.education.length === 0) ? (
                                <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No records found</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {employee.education.slice(0, 3).map((edu, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < employee.education!.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: 600, color: '#374151' }}>{edu.level}</div>
                                            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{edu.year_graduated}</div>
                                        </div>
                                    ))}
                                    {employee.education.length > 3 && <div style={{ fontSize: '0.8rem', color: '#3b82f6', textAlign: 'center' }}>+ {employee.education.length - 3} more</div>}
                                </div>
                            )}
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
