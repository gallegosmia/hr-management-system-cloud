'use client';

import React, { useState } from 'react';

export default function RegistrationFormPreview() {
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    return (
        <div className="preview-container">
            <div className="preview-header">
                <h2 className="preview-title">Registration Form Preview</h2>
                <p className="preview-subtitle">Drag fields from the left panel to build your form</p>
            </div>

            <div className="preview-card">
                <div className="form-field-group">
                    <label className="field-label">Full Name</label>
                    <div className="input-wrapper">
                        <input
                            type="text"
                            className="preview-input"
                            placeholder="Enter your full name"
                            disabled
                        />
                    </div>
                </div>

                <div className="form-field-group">
                    <label className="field-label">Email Address</label>
                    <div className="input-wrapper">
                        <input
                            type="email"
                            className="preview-input"
                            placeholder="Enter your email"
                            disabled
                        />
                    </div>
                </div>

                <div className="form-field-group">
                    <label className="field-label">Password</label>
                    <div className="input-wrapper">
                        <input
                            type="password"
                            className="preview-input"
                            placeholder="Create a password"
                            disabled
                        />
                    </div>
                </div>

                <div className="toggle-section">
                    <label className="ios-switch">
                        <input
                            type="checkbox"
                            checked={showPasswordRequirements}
                            onChange={(e) => setShowPasswordRequirements(e.target.checked)}
                        />
                        <span className="ios-slider"></span>
                    </label>
                    <span className="toggle-text">Show password requirements</span>
                </div>
            </div>

            <style jsx>{`
                .preview-container {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .preview-header {
                    margin-bottom: 2rem;
                }

                .preview-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                    margin-bottom: 0.5rem;
                }

                .preview-subtitle {
                    font-size: 0.9375rem;
                    color: #64748b;
                }

                .preview-card {
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 3rem;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .form-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .field-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #334155;
                    margin-left: 0.25rem;
                }

                .input-wrapper {
                    position: relative;
                }

                .preview-input {
                    width: 100%;
                    height: 52px;
                    background: #f8fafc;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 0 1.25rem;
                    font-size: 0.9375rem;
                    color: #1e293b;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                }

                .preview-input::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }

                .toggle-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                }

                .toggle-text {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #475569;
                }

                /* iOS Style Toggle */
                .ios-switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 26px;
                }

                .ios-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .ios-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #e2e8f0;
                    transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 34px;
                }

                .ios-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                input:checked + .ios-slider {
                    background-color: #3b82f6;
                }

                input:focus + .ios-slider {
                    box-shadow: 0 0 1px #3b82f6;
                }

                input:checked + .ios-slider:before {
                    transform: translateX(22px);
                }

                @media (max-width: 640px) {
                    .preview-card {
                        padding: 1.5rem;
                    }
                    .preview-title {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
}
