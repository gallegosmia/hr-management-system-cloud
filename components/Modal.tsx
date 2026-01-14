import React from 'react';

interface ModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onClose: () => void;
    type?: 'alert' | 'confirm';
    onConfirm?: () => void;
}

export default function Modal({ isOpen, title = 'Melann Lending', message, onClose, type = 'alert', onConfirm }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                background: 'white', padding: '1.5rem', borderRadius: '8px',
                width: '90%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: '#4a5568' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {type === 'confirm' && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e0',
                                background: 'white', color: '#4a5568', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (type === 'confirm' && onConfirm) onConfirm();
                            onClose();
                        }}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                            background: '#2196F3', color: 'white', cursor: 'pointer'
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
