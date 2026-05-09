'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

type HelpSection = {
    id: string;
    title: string;
    summary: string;
    items: string[];
};

const moduleSections: HelpSection[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        summary: 'The main monitoring area for HR, management, and operations users.',
        items: [
            'Purpose: gives a quick operating picture of employees, departments, attendance status, recent hires, birthdays, announcements, and payroll or approval reminders.',
            'Primary users: HR, President, Vice President, Admin, Manager, and Operations Manager.',
            'Key actions: review metric cards, open pending payroll reviews, check attendance alerts, view announcements, and move into employee or payroll records from dashboard shortcuts.',
            'Important note: always confirm the Target Branch selector before relying on dashboard totals because branch context changes the visible data.'
        ]
    },
    {
        id: 'my-profile',
        title: 'My Profile',
        summary: 'Self-service entry point that opens the logged-in user employee record.',
        items: [
            'Purpose: lets employees and linked users view their own 201 File profile without searching the masterlist.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President when their account is linked to an employee record.',
            'Key actions: view personal details, employment details, attendance and leave information, files, trainings, violations, and compensation details allowed by role.',
            'Important note: if the account is not linked to an employee record, the user must contact HR or an admin to connect the account to the correct employee.'
        ]
    },
    {
        id: 'tracker',
        title: 'TRACKER',
        summary: 'Employee-facing tracking page for self-service status review.',
        items: [
            'Purpose: gives employee users a focused area for tracking their own HR-related status and activity.',
            'Primary users: Employee accounts.',
            'Key actions: review available personal status information, follow assigned employee workflows, and navigate to employee-accessible modules.',
            'Important note: tracker visibility is intentionally limited for management and superadmin-style users because they use dashboard and reporting modules instead.'
        ]
    },
    {
        id: 'employees',
        title: '201 Files / Employee Masterlist',
        summary: 'The digital employee record center for personal, employment, compensation, attendance, leave, files, training, and violation data.',
        items: [
            'Purpose: stores official employee 201 File records used across attendance, leave, compensation, payroll, benefits, and reports.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, Vice President, and superadmin-style users.',
            'Key actions: add employees, search/filter the masterlist, open employee profiles, update personal information, employment details, compensation, attendance and leave tabs, document files, trainings, and violations.',
            'Important note: incomplete employee records can cause incorrect reports, payroll outputs, branch filtering, or missing account/profile links.'
        ]
    },
    {
        id: 'compensation',
        title: 'Compensation and Benefits',
        summary: 'Employee financial record area for pay rates, benefits, and compensation-related details.',
        items: [
            'Purpose: centralizes salary and benefit information that may affect payroll, reports, and employee records.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: review compensation profiles, inspect employee benefit details, and navigate to related government contribution configuration or compensation records.',
            'Important note: compensation changes should be verified before payroll generation because incorrect salary or benefit records can affect payslips and reports.'
        ]
    },
    {
        id: 'attendance',
        title: 'Attendance',
        summary: 'Daily time record review, validation, filtering, and attendance reporting module.',
        items: [
            'Purpose: tracks employee attendance records used by HR operations, leave validation, payroll preparation, and reports.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: filter attendance by employee/date/status, review present and absent counts, validate late or missing entries, and inspect individual attendance reports.',
            'Important note: attendance should be corrected only with verified supporting information because payroll and absence tracking depend on this data.'
        ]
    },
    {
        id: 'leave',
        title: 'Leave Requests',
        summary: 'Leave filing, approval, status tracking, and leave balance review module.',
        items: [
            'Purpose: manages employee leave requests and helps approvers validate leave dates, reason, status, and available credits.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: file leave requests, review submitted leave, approve or monitor status, and compare leave requests with attendance records.',
            'Important note: approvers should verify leave balance and date coverage before approving requests that affect attendance and payroll.'
        ]
    },
    {
        id: 'loans',
        title: 'Emergency Loans',
        summary: 'Employee emergency loan request, balance, and payment-tracking module.',
        items: [
            'Purpose: records emergency loan details so HR and management can review loan status and payroll-related deductions.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create or review loan records, inspect employee loan details, track balances, and verify loan data before payroll deduction.',
            'Important note: loan records must be checked before payroll because unpaid balances can affect net pay.'
        ]
    },
    {
        id: 'cash-advance',
        title: 'Cash Advance',
        summary: 'Cash advance request, approval, limit, balance, and deduction module.',
        items: [
            'Purpose: manages employee cash advances and supports tracking against payroll deductions or limits.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create cash advance records, review summary and limits, inspect details, and validate balances before payroll.',
            'Important note: confirm employee identity, cutoff period, and remaining balance before approving or deducting cash advances.'
        ]
    },
    {
        id: 'bonuses',
        title: 'Employee Bonuses',
        summary: 'Bonus tracking and employee incentive record module.',
        items: [
            'Purpose: records employee bonus amounts and incentive-related entries for review and reporting.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create, review, and manage bonus records for eligible employees.',
            'Important note: bonus entries should be reviewed before payroll or compensation reporting so totals are accurate.'
        ]
    },
    {
        id: 'payroll',
        title: 'Payroll',
        summary: 'Handles payroll run creation, review, payslip generation, exports, and approval status tracking.',
        items: [
            'Purpose: prepares employee pay from attendance, compensation, benefits, deductions, loans, cash advances, government contributions, and manual adjustments.',
            'Primary users: HR, Admin, Finance, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create payroll runs, select cutoff and branch, sync attendance, review employee payslips, inspect audit details, export payroll, and release or approve payroll as allowed.',
            'Important note: payroll should not be finalized until attendance, compensation, deductions, loans, cash advances, and government contribution values are checked.'
        ]
    },
    {
        id: 'government-contributions',
        title: 'Government Contributions',
        summary: 'SSS, PhilHealth, Pag-IBIG, and government contribution generation and review module.',
        items: [
            'Purpose: calculates and organizes employee and employer contribution information for required government-related reporting.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: generate contribution runs, review contribution details, inspect employee-level values, and manage government contribution configuration.',
            'Important note: verify employee compensation and applicable contribution settings before generating contribution outputs.'
        ]
    },
    {
        id: 'transportation',
        title: 'Transportation Allowance',
        summary: 'Allowance tracking module for transportation-related employee benefits.',
        items: [
            'Purpose: records and reviews transportation allowance data for eligible employees.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: inspect allowance entries, manage employee transportation allowance records, and review allowance output for reporting or compensation use.',
            'Important note: confirm employee eligibility and branch assignment before adding or reviewing allowance records.'
        ]
    },
    {
        id: 'reports',
        title: 'Reports',
        summary: 'Provides printable and exportable views for HR, attendance, payroll, and management review.',
        items: [
            'Purpose: provides consolidated views for management, HR review, attendance, payroll, and operational decisions.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: choose report filters, review generated report data, print or export outputs, and validate branch/date/employee scope.',
            'Important note: reports can contain confidential HR and payroll data. Confirm audience and destination before sharing externally.'
        ]
    },
    {
        id: 'announcements',
        title: 'Memos and Announcements',
        summary: 'Company communication module for notices, memos, reminders, and announcements.',
        items: [
            'Purpose: publishes internal HR or company messages that employees and managers can review from the system.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: read announcements, review memo details, and manage announcements when the user role allows it.',
            'Important note: announcement content should be accurate and approved before publication because it becomes visible to intended users.'
        ]
    },
    {
        id: 'kiosk-scanner',
        title: 'Kiosk Scanner',
        summary: 'Shared-device scanner module for employee attendance time-in and time-out.',
        items: [
            'Purpose: allows employees to record attendance from a kiosk or shared scanner device.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: open scanner mode, scan employee attendance, and verify scan result feedback.',
            'Important note: scanner devices should remain on the correct kiosk page and be monitored to prevent incorrect or duplicate entries.'
        ]
    },
    {
        id: 'help',
        title: 'Help',
        summary: 'In-app documentation and downloadable PDF guide for system users.',
        items: [
            'Purpose: explains system modules, role access, workflows, troubleshooting, and operating reminders.',
            'Primary users: all users with access to the main system.',
            'Key actions: search help topics, switch documentation categories, and download the PDF documentation.',
            'Important note: use Help as the first reference before changing sensitive records such as payroll, compensation, users, or settings.'
        ]
    },
    {
        id: 'settings',
        title: 'Settings',
        summary: 'Administrative configuration area for company settings, leave rules, users, and operational defaults.',
        items: [
            'Purpose: stores configurable rules and company information used by multiple modules.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: update general settings, review leave settings, configure operational values, and manage authorized setup data.',
            'Important note: changes to settings can affect leave, payroll, approvals, and reports. Verify affected workflows after saving.'
        ]
    },
    {
        id: 'user-management',
        title: 'User Management',
        summary: 'Account, role, branch assignment, and system access management module.',
        items: [
            'Purpose: controls who can log in, which role they have, and what branch or system areas they can access.',
            'Primary users: superadmin and authorized President, Vice President, or Admin-level accounts depending on system rules.',
            'Key actions: create accounts, update roles, reset credentials, assign branches, and review access levels.',
            'Important note: incorrect role or branch assignment can expose sensitive data or hide required modules. Review carefully before saving.'
        ]
    }
];

const roleSections: HelpSection[] = [
    {
        id: 'employee',
        title: 'Employee users',
        summary: 'Employee accounts are focused on self-service tasks.',
        items: [
            'Open My Profile to view your linked employee record.',
            'Use Leave Requests for filing or checking leave status.',
            'Use Kiosk Scanner when the workplace requires attendance scanning from this system.'
        ]
    },
    {
        id: 'hr',
        title: 'HR users',
        summary: 'HR users maintain records and operate the daily HR workflows.',
        items: [
            'Keep 201 Files complete before using employee data in payroll, reports, or approvals.',
            'Review attendance, leave, compensation, benefits, documents, trainings, and violations regularly.',
            'Confirm branch selection before adding records or generating branch-specific outputs.'
        ]
    },
    {
        id: 'management',
        title: 'President, Vice President, Manager, and Operations Manager',
        summary: 'Management users review organization-wide data, approvals, payroll status, and reports.',
        items: [
            'Use Dashboard, Reports, Payroll, and approval pages for review and decision-making.',
            'Use the branch selector when reviewing a specific branch instead of all branches.',
            'Avoid changing employee or payroll data unless the update is part of an approved workflow.'
        ]
    },
    {
        id: 'admin',
        title: 'Admin and superadmin users',
        summary: 'Admin users maintain system access and high-risk configuration.',
        items: [
            'Create and update accounts only for authorized personnel.',
            'Review role and branch assignments before saving user changes.',
            'Use Settings and User Management carefully because changes can affect access, payroll, and reports.'
        ]
    }
];

const quickWorkflows: HelpSection[] = [
    {
        id: 'new-employee',
        title: 'Add a new employee',
        summary: 'Use this flow when onboarding a worker into the HR system.',
        items: [
            'Go to 201 Files, choose Add Employee, and enter required identification, contact, position, department, branch, and employment data.',
            'Upload available documents and profile photo after the employee record is created.',
            'Review compensation, leave credits, and benefit-related records before including the employee in payroll.'
        ]
    },
    {
        id: 'payroll-run',
        title: 'Prepare payroll',
        summary: 'Use this flow before generating or releasing payroll.',
        items: [
            'Confirm branch and cutoff period.',
            'Review attendance records and employee compensation records.',
            'Create or open the payroll run, verify earnings and deductions, then review payslips before export or release.'
        ]
    },
    {
        id: 'attendance-check',
        title: 'Check attendance issues',
        summary: 'Use this flow when an employee has absences, late records, or missing time logs.',
        items: [
            'Open Attendance and filter by employee or date range.',
            'Compare attendance entries with leave records and any approved adjustments.',
            'Correct records only when the supporting information is verified.'
        ]
    },
    {
        id: 'access-help',
        title: 'Resolve access problems',
        summary: 'Use this flow when a user cannot see a module or branch data.',
        items: [
            'Confirm the user role and assigned branch in User Management.',
            'Ask the user to log out and log back in after account or branch changes.',
            'If data is still missing, verify that the employee records belong to the selected branch.'
        ]
    }
];

const troubleshooting: HelpSection[] = [
    {
        id: 'missing-data',
        title: 'Data is missing or looks incomplete',
        summary: 'Most missing data is caused by branch context, role access, or incomplete employee records.',
        items: [
            'Check the Target Branch selector in the top navigation.',
            'Confirm your account role has access to the module.',
            'Open the employee 201 File and verify required fields are filled in.'
        ]
    },
    {
        id: 'cannot-login',
        title: 'User cannot log in',
        summary: 'Login problems usually require account or password review by an authorized admin.',
        items: [
            'Confirm the username is correct.',
            'Ask an admin or superadmin to verify that the account exists and has the correct role.',
            'If the account was recently updated, log out from other sessions and try again.'
        ]
    },
    {
        id: 'theme',
        title: 'Changing light and dark mode',
        summary: 'The theme switch is available in the top navigation.',
        items: [
            'Choose Light or Dark from the header switch.',
            'The system saves the selected theme on the same browser.',
            'If colors look stale after an update, refresh the page.'
        ]
    }
];

const groups = [
    { id: 'modules', label: 'Modules', sections: moduleSections },
    { id: 'roles', label: 'Roles', sections: roleSections },
    { id: 'workflows', label: 'Workflows', sections: quickWorkflows },
    { id: 'troubleshooting', label: 'Troubleshooting', sections: troubleshooting }
];

export default function HelpPage() {
    const [activeGroup, setActiveGroup] = useState('modules');
    const [query, setQuery] = useState('');

    const activeSections = groups.find(group => group.id === activeGroup)?.sections || moduleSections;
    const filteredSections = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return activeSections;

        return activeSections.filter(section => {
            const content = [section.title, section.summary, ...section.items].join(' ').toLowerCase();
            return content.includes(normalizedQuery);
        });
    }, [activeSections, query]);

    return (
        <DashboardLayout>
            <main className="help-page">
                <section className="help-hero">
                    <div>
                        <p className="help-kicker">System Documentation</p>
                        <h1>Help Center</h1>
                        <p className="help-intro">
                            Use this guide to understand the HR Management System modules, user roles, daily workflows,
                            and common troubleshooting steps.
                        </p>
                        <a
                            className="download-doc-link"
                            href="/docs/hr-management-system-documentation.pdf"
                            download
                        >
                            Download PDF Documentation
                        </a>
                    </div>
                    <div className="help-search-panel">
                        <label htmlFor="help-search">Search documentation</label>
                        <input
                            id="help-search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search modules, payroll, attendance..."
                        />
                    </div>
                </section>

                <section className="help-tabs" aria-label="Documentation categories">
                    {groups.map(group => (
                        <button
                            key={group.id}
                            type="button"
                            className={activeGroup === group.id ? 'active' : ''}
                            onClick={() => setActiveGroup(group.id)}
                        >
                            {group.label}
                        </button>
                    ))}
                </section>

                <section className="help-grid">
                    {filteredSections.length > 0 ? (
                        filteredSections.map(section => (
                            <article className="help-card" key={section.id}>
                                <h2>{section.title}</h2>
                                <p>{section.summary}</p>
                                <ul>
                                    {section.items.map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </article>
                        ))
                    ) : (
                        <div className="empty-state">
                            <h2>No matching help topics</h2>
                            <p>Try a broader keyword such as payroll, attendance, employee, branch, or settings.</p>
                        </div>
                    )}
                </section>

                <section className="help-footer-note">
                    <h2>Operating reminder</h2>
                    <p>
                        Keep employee records accurate before using them in attendance, benefits, payroll, and reports.
                        Changes to roles, branches, payroll, and system settings should be verified after saving.
                    </p>
                </section>
            </main>

            <style jsx>{`
                .help-page {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    padding: 0 16px 24px 0;
                    color: var(--text-primary);
                }

                .help-hero {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
                    gap: 18px;
                    align-items: stretch;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 18px;
                    padding: 22px;
                    box-shadow: var(--glass-shadow);
                    backdrop-filter: blur(12px);
                }

                .help-kicker {
                    margin: 0 0 8px;
                    color: var(--primary-600);
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                h1 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 2rem;
                }

                .help-intro {
                    margin: 10px 0 0;
                    max-width: 760px;
                    color: var(--text-secondary);
                    font-size: 0.98rem;
                    line-height: 1.65;
                }

                .download-doc-link {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 40px;
                    margin-top: 16px;
                    padding: 0 16px;
                    border-radius: 10px;
                    background: var(--primary-600);
                    color: white;
                    font-size: 0.88rem;
                    font-weight: 800;
                    text-decoration: none;
                    box-shadow: var(--shadow-sm);
                }

                .download-doc-link:hover {
                    background: var(--primary-700);
                    color: white;
                }

                .help-search-panel {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 8px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 16px;
                }

                .help-search-panel label {
                    color: var(--text-secondary);
                    font-size: 0.78rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .help-search-panel input {
                    width: 100%;
                    min-height: 42px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    padding: 0 12px;
                    font-size: 0.92rem;
                    outline: none;
                }

                .help-search-panel input:focus {
                    border-color: var(--border-focus);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
                }

                .help-tabs {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 2px;
                }

                .help-tabs button {
                    min-height: 38px;
                    border: 1px solid var(--border-color);
                    border-radius: 999px;
                    background: var(--bg-primary);
                    color: var(--text-secondary);
                    padding: 0 16px;
                    font-weight: 800;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .help-tabs button.active {
                    background: var(--primary-600);
                    border-color: var(--primary-600);
                    color: white;
                }

                .help-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 14px;
                }

                .help-card,
                .empty-state,
                .help-footer-note {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    box-shadow: var(--shadow-sm);
                }

                .help-card {
                    padding: 18px;
                }

                .help-card h2,
                .empty-state h2,
                .help-footer-note h2 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.05rem;
                }

                .help-card p,
                .empty-state p,
                .help-footer-note p {
                    margin: 8px 0 0;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    line-height: 1.6;
                }

                .help-card ul {
                    margin: 14px 0 0;
                    padding-left: 1.1rem;
                    color: var(--text-primary);
                }

                .help-card li {
                    margin-bottom: 9px;
                    line-height: 1.55;
                    font-size: 0.9rem;
                }

                .empty-state {
                    grid-column: 1 / -1;
                    padding: 28px;
                    text-align: center;
                }

                .help-footer-note {
                    padding: 18px;
                    border-left: 4px solid var(--primary-500);
                }

                [data-theme='dark'] .help-search-panel,
                [data-theme='dark'] .help-card,
                [data-theme='dark'] .empty-state,
                [data-theme='dark'] .help-footer-note,
                [data-theme='dark'] .help-tabs button {
                    background: var(--surface-elevated);
                    border-color: var(--border-color);
                }

                [data-theme='dark'] .help-search-panel input {
                    background: #0f172a;
                    color: #f8fafc;
                }

                @media (max-width: 768px) {
                    .help-page {
                        padding: 0 0 18px;
                    }

                    .help-hero {
                        grid-template-columns: 1fr;
                        padding: 18px;
                    }

                    h1 {
                        font-size: 1.55rem;
                    }

                    .help-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </DashboardLayout>
    );
}
