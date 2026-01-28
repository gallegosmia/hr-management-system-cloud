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
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@700&display=swap');
                        
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
                                    <div class="company-tag">Lend ΓÇó Empower ΓÇó Grow</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Basic Information */}
            <Card style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                        {/* Profile Picture with Upload */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '180px',
                                height: '180px',
                                minWidth: '180px',
                                minHeight: '180px',
                                aspectRatio: '1 / 1',
                                borderRadius: '50%',
                                background: 'white',
                                border: '8px solid var(--primary-50)',
                                overflow: 'hidden',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 15px 30px -10px rgba(0,0,0,0.1)'
                            }}>
                                {profilePicture ?
                                    <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '1 / 1' }} />
                                    : <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-200)' }}>{employee.first_name?.[0]}{employee.last_name?.[0]}</span>
                                }
                            </div>
                        </div>
                        <div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--gray-900)', margin: 0, letterSpacing: '-0.02em' }}>
                                    {employee.first_name} {employee.last_name}
                                </h2>
                                <span style={{
                                    background: '#10b981',
                                    color: 'white',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
                                }}>Γ£ô</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.925rem', marginBottom: '1.5rem' }}>
                                <span style={{ color: 'var(--primary-600)' }}>≡ƒåö {employee.employee_id}</span>
                                <span>ΓÇó</span>
                                <span>≡ƒÆ╝ {employee.position}</span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem' }}>
                                <div style={{ background: 'var(--gray-50)', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--gray-100)' }}>
                                    <span style={{ fontSize: '1.1rem' }}>Γ£ë∩╕Å</span>
                                    <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{employee.email_address || 'No email provided'}</span>
                                </div>
                                <div style={{ background: 'var(--gray-50)', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--gray-100)' }}>
                                    <span style={{ fontSize: '1.1rem' }}>≡ƒô₧</span>
                                    <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{employee.contact_number || 'No contact set'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                        {user && user.role !== 'Employee' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: 'var(--primary-600)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.625rem',
                                    boxShadow: '0 8px 15px rgba(37, 99, 235, 0.2)',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>Γ£Å∩╕Å</span> Edit Basic File
                            </button>
                        )}

                        {/* Digital QR ID Section */}
                        <div style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid var(--gray-200)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center',
                            width: '140px'
                        }}>
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Digital QR ID
                            </div>
                            <div ref={qrRef} style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', display: 'inline-block' }}>
                                <QRCodeSVG
                                    value={employee.employee_id}
                                    size={100}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                                {employee.employee_id}
                            </div>
                        </div>

                        <button
                            onClick={handlePrintID}
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                background: 'white',
                                color: 'var(--gray-700)',
                                borderRadius: '10px',
                                border: '1px solid var(--gray-200)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                marginBottom: '0.5rem'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#f9fafb';
                                e.currentTarget.style.borderColor = 'var(--primary-200)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = 'var(--gray-200)';
                            }}
                        >
                            <span>≡ƒû¿∩╕Å</span> Print ID Card
                        </button>

                        <button
                            onClick={handleDownloadQR}
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                background: '#f8fafc',
                                color: 'var(--primary-700)',
                                borderRadius: '10px',
                                border: '1px solid var(--primary-100)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'var(--primary-50)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                            }}
                        >
                            <span>≡ƒÆ╛</span> Save QR Image
                        </button>

                        <div style={{
                            marginTop: '0.75rem',
                            fontSize: '0.65rem',
                            color: '#ef4444',
                            fontWeight: 600,
                            lineHeight: 1.4,
                            fontStyle: 'italic',
                            textAlign: 'center'
                        }}>
                            ΓÜá∩╕Å IF LOST QR CODE, ASK THE ADMINISTRATOR TO GENERATE QR CODE AGAIN
                        </div>
                    </div>

                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '2rem',
                    padding: '2rem',
                    background: '#f8fafc',
                    borderRadius: '20px',
                    border: '1px solid var(--gray-100)'
                }}>
                    <div>
                        <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Birth Date</span>
                        <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '1rem' }}>{formatDate(employee.date_of_birth)}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Civil Status</span>
                        <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '1rem' }}>{employee.civil_status || 'Not defined'}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Religion</span>
                        <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '1rem' }}>{employee.religion || 'Not specified'}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-400)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Branch Unit</span>
                        <span style={{ color: 'var(--gray-700)', fontWeight: 700, fontSize: '1rem' }}>{employee.branch || 'Head Office'}</span>
                    </div>
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Address */}
                <Card>
                    <CardHeader title="Residential Address" icon="≡ƒôì" onEdit={() => onEdit('address')} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--primary-500)' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Residence</span>
                            <span style={{ fontSize: '0.925rem', color: 'var(--gray-700)', fontWeight: 500, lineHeight: 1.6 }}>
                                {employee.address || 'Street/Barangay info not provided'}
                            </span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-400)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citizen ID Address</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                                {employee.citizen_id_address || 'Matches residential address'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Emergency Contact */}
                <Card>
                    <CardHeader title="Emergency Contact" icon="≡ƒåÿ" onEdit={() => onEdit('emergency')} />
                    <div style={{ background: '#fffef3', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--warning-200)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                ≡ƒæñ
                            </div>
                            <div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                                    {employee.emergency_contact_name || 'Guardian Not Set'}
                                </div>
                                <div style={{ color: 'var(--warning-700)', fontWeight: 700, fontSize: '0.925rem', marginTop: '0.25rem' }}>
                                    ≡ƒô₧ {employee.emergency_contact_number || 'No emergency number'}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Education */}
                <Card style={{ gridColumn: 'span 2' }}>
                    <CardHeader title="Educational Background" icon="≡ƒÄô" onEdit={() => onEdit('education')} />

                    {(!employee.education || employee.education.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--gray-50)', borderRadius: '16px', border: '2px dashed var(--gray-200)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>≡ƒôÜ</span>
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
                                    <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>≡ƒÅ½</div>
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
                                            {edu.grade && <span style={{ background: 'var(--success-50)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--success-700)' }}>GPA: {edu.grade}</span>}
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
