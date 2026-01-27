
function LeaveCreditsWidget({ used, total = 5 }: { used: number, total?: number }) {
    const percentage = Math.min((used / total) * 100, 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem'
        }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                    />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke={percentage > 80 ? '#ef4444' : '#10b981'}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>{used}</div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>USED</div>
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Paid Leaves</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Service Incentive Leave</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {total - used} days remaining
                </div>
            </div>
        </div>
    );
}

export default LeaveCreditsWidget;
