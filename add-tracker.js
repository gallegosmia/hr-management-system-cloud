const fs = require('fs');
let content = fs.readFileSync('app/leave/page.tsx', 'utf8');

const trackerFunction = `
    const renderTracker = (req: LeaveRequest) => {
        const status = req.status;
        const isCancelled = status.toLowerCase() === 'cancelled';
        const isRejected = status.toLowerCase() === 'rejected';
        const isApproved = status.toLowerCase() === 'approved';
        
        let currentStep = 1;
        if (status.includes('EVP') || isApproved || isRejected) currentStep = 2;
        if (isApproved || isRejected || isCancelled) currentStep = 3;

        const steps = [
            { label: 'Submitted', desc: 'Branch Manager', active: currentStep >= 1, done: currentStep > 1 || (currentStep === 1 && (isApproved || isRejected || isCancelled)) },
            { label: 'Reviewed', desc: 'EVP Approval', active: currentStep >= 2, done: currentStep > 2 || (currentStep === 2 && (isApproved || isRejected || isCancelled)) },
            { label: isRejected ? 'Rejected' : (isCancelled ? 'Cancelled' : 'Approved'), desc: 'Final Decision', active: currentStep >= 3 || isRejected || isCancelled, done: isApproved || isRejected || isCancelled }
        ];

        return (
            <div style={{ margin: '0.5rem 0 1rem 0', padding: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '0.825rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Approval Progress</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '14px', left: '15%', right: '15%', height: '4px', background: '#e2e8f0', zIndex: 0, borderRadius: '2px' }}>
                        <div style={{ 
                            width: currentStep === 1 ? '0%' : (currentStep === 2 ? '50%' : '100%'), 
                            height: '100%', 
                            background: isRejected || isCancelled ? '#ef4444' : '#10b981', 
                            transition: 'width 0.4s ease-in-out',
                            borderRadius: '2px'
                        }} />
                    </div>
                    {steps.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '33%', textAlign: 'center' }}>
                            <div style={{ 
                                width: '32px', height: '32px', 
                                borderRadius: '50%', 
                                background: step.done ? (isRejected || isCancelled ? '#ef4444' : '#10b981') : (step.active ? '#3b82f6' : 'white'),
                                border: '3px solid',
                                borderColor: step.done ? (isRejected || isCancelled ? '#ef4444' : '#10b981') : (step.active ? '#3b82f6' : '#cbd5e1'),
                                color: step.done || step.active ? 'white' : '#94a3b8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 'bold',
                                boxShadow: step.active && !step.done ? '0 0 0 4px rgba(59, 130, 246, 0.15)' : 'none',
                                transition: 'all 0.3s ease'
                            }}>
                                {step.done ? (isRejected || isCancelled ? '✕' : '✓') : (idx + 1)}
                            </div>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: step.active ? '#1e293b' : '#94a3b8' }}>{step.label}</div>
                            <div style={{ fontSize: '0.7rem', color: step.active ? '#64748b' : '#cbd5e1', marginTop: '2px' }}>{step.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
`;

if (!content.includes('const renderTracker')) {
    content = content.replace('const filteredRequests =', trackerFunction + '\n    const filteredRequests =');
}

const trackerInjection = `
                            </div>
                            
                            {/* Tracker */}
                            {renderTracker(viewingRequest)}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>`;

content = content.replace(
    /<\/div>\s*<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1\.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>/,
    trackerInjection
);

fs.writeFileSync('app/leave/page.tsx', content);
console.log('Tracker script done');
