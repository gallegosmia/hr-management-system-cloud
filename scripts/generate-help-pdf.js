const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const outputDir = path.join(process.cwd(), 'public', 'docs');
const outputPath = path.join(outputDir, 'hr-management-system-documentation.pdf');

const sections = [
    {
        title: 'System Overview',
        body: [
            'Melann HR Management System is a digital HR platform for employee 201 files, attendance, leave, compensation, payroll, government contributions, announcements, reports, and user access management.',
            'The system uses role-based access and branch context so users only work with the modules and employee data they are authorized to view.',
            'This document explains each module, primary users, key actions, and notes that help avoid common data and access issues.'
        ]
    },
    {
        title: 'Module: Dashboard',
        body: [
            'Purpose: gives a quick operating picture of employees, departments, attendance status, recent hires, birthdays, announcements, and payroll or approval reminders.',
            'Primary users: HR, President, Vice President, Admin, Manager, and Operations Manager.',
            'Key actions: review metric cards, open pending payroll reviews, check attendance alerts, view announcements, and move into employee or payroll records from dashboard shortcuts.',
            'Important note: always confirm the Target Branch selector before relying on dashboard totals because branch context changes the visible data.'
        ]
    },
    {
        title: 'Module: My Profile',
        body: [
            'Purpose: lets employees and linked users view their own 201 File profile without searching the masterlist.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President when their account is linked to an employee record.',
            'Key actions: view personal details, employment details, attendance and leave information, files, trainings, violations, and compensation details allowed by role.',
            'Important note: if the account is not linked to an employee record, the user must contact HR or an admin to connect the account to the correct employee.'
        ]
    },
    {
        title: 'Module: TRACKER',
        body: [
            'Purpose: gives employee users a focused area for tracking their own HR-related status and activity.',
            'Primary users: Employee accounts.',
            'Key actions: review available personal status information, follow assigned employee workflows, and navigate to employee-accessible modules.',
            'Important note: tracker visibility is intentionally limited for management and superadmin-style users because they use dashboard and reporting modules instead.'
        ]
    },
    {
        title: 'Module: 201 Files / Employee Masterlist',
        body: [
            'Purpose: stores official employee 201 File records used across attendance, leave, compensation, payroll, benefits, and reports.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, Vice President, and superadmin-style users.',
            'Key actions: add employees, search/filter the masterlist, open employee profiles, update personal information, employment details, compensation, attendance and leave tabs, document files, trainings, and violations.',
            'Important note: incomplete employee records can cause incorrect reports, payroll outputs, branch filtering, or missing account/profile links.'
        ]
    },
    {
        title: 'Module: Compensation and Benefits',
        body: [
            'Purpose: centralizes salary and benefit information that may affect payroll, reports, and employee records.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: review compensation profiles, inspect employee benefit details, and navigate to related government contribution configuration or compensation records.',
            'Important note: compensation changes should be verified before payroll generation because incorrect salary or benefit records can affect payslips and reports.'
        ]
    },
    {
        title: 'Module: Attendance',
        body: [
            'Purpose: tracks employee attendance records used by HR operations, leave validation, payroll preparation, and reports.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: filter attendance by employee/date/status, review present and absent counts, validate late or missing entries, and inspect individual attendance reports.',
            'Important note: attendance should be corrected only with verified supporting information because payroll and absence tracking depend on this data.'
        ]
    },
    {
        title: 'Module: Leave Requests',
        body: [
            'Purpose: manages employee leave requests and helps approvers validate leave dates, reason, status, and available credits.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: file leave requests, review submitted leave, approve or monitor status, and compare leave requests with attendance records.',
            'Important note: approvers should verify leave balance and date coverage before approving requests that affect attendance and payroll.'
        ]
    },
    {
        title: 'Module: Emergency Loans',
        body: [
            'Purpose: records emergency loan details so HR and management can review loan status and payroll-related deductions.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create or review loan records, inspect employee loan details, track balances, and verify loan data before payroll deduction.',
            'Important note: loan records must be checked before payroll because unpaid balances can affect net pay.'
        ]
    },
    {
        title: 'Module: Cash Advance',
        body: [
            'Purpose: manages employee cash advances and supports tracking against payroll deductions or limits.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create cash advance records, review summary and limits, inspect details, and validate balances before payroll.',
            'Important note: confirm employee identity, cutoff period, and remaining balance before approving or deducting cash advances.'
        ]
    },
    {
        title: 'Module: Employee Bonuses',
        body: [
            'Purpose: records employee bonus amounts and incentive-related entries for review and reporting.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create, review, and manage bonus records for eligible employees.',
            'Important note: bonus entries should be reviewed before payroll or compensation reporting so totals are accurate.'
        ]
    },
    {
        title: 'Module: Payroll',
        body: [
            'Purpose: prepares employee pay from attendance, compensation, benefits, deductions, loans, cash advances, government contributions, and manual adjustments.',
            'Primary users: HR, Admin, Finance, Manager, Operations Manager, President, and Vice President.',
            'Key actions: create payroll runs, select cutoff and branch, sync attendance, review employee payslips, inspect audit details, export payroll, and release or approve payroll as allowed.',
            'Important note: payroll should not be finalized until attendance, compensation, deductions, loans, cash advances, and government contribution values are checked.'
        ]
    },
    {
        title: 'Module: Government Contributions',
        body: [
            'Purpose: calculates and organizes employee and employer contribution information for required government-related reporting.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: generate contribution runs, review contribution details, inspect employee-level values, and manage government contribution configuration.',
            'Important note: verify employee compensation and applicable contribution settings before generating contribution outputs.'
        ]
    },
    {
        title: 'Module: Transportation Allowance',
        body: [
            'Purpose: records and reviews transportation allowance data for eligible employees.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: inspect allowance entries, manage employee transportation allowance records, and review allowance output for reporting or compensation use.',
            'Important note: confirm employee eligibility and branch assignment before adding or reviewing allowance records.'
        ]
    },
    {
        title: 'Module: Reports',
        body: [
            'Purpose: provides consolidated views for management, HR review, attendance, payroll, and operational decisions.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: choose report filters, review generated report data, print or export outputs, and validate branch/date/employee scope.',
            'Important note: reports can contain confidential HR and payroll data. Confirm audience and destination before sharing externally.'
        ]
    },
    {
        title: 'Module: Memos and Announcements',
        body: [
            'Purpose: publishes internal HR or company messages that employees and managers can review from the system.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: read announcements, review memo details, and manage announcements when the user role allows it.',
            'Important note: announcement content should be accurate and approved before publication because it becomes visible to intended users.'
        ]
    },
    {
        title: 'Module: Kiosk Scanner',
        body: [
            'Purpose: allows employees to record attendance from a kiosk or shared scanner device.',
            'Primary users: Employee, HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: open scanner mode, scan employee attendance, and verify scan result feedback.',
            'Important note: scanner devices should remain on the correct kiosk page and be monitored to prevent incorrect or duplicate entries.'
        ]
    },
    {
        title: 'Module: Help',
        body: [
            'Purpose: explains system modules, role access, workflows, troubleshooting, and operating reminders.',
            'Primary users: all users with access to the main system.',
            'Key actions: search help topics, switch documentation categories, and download the PDF documentation.',
            'Important note: use Help as the first reference before changing sensitive records such as payroll, compensation, users, or settings.'
        ]
    },
    {
        title: 'Module: Settings',
        body: [
            'Purpose: stores configurable rules and company information used by multiple modules.',
            'Primary users: HR, Admin, Manager, Operations Manager, President, and Vice President.',
            'Key actions: update general settings, review leave settings, configure operational values, and manage authorized setup data.',
            'Important note: changes to settings can affect leave, payroll, approvals, and reports. Verify affected workflows after saving.'
        ]
    },
    {
        title: 'Module: User Management',
        body: [
            'Purpose: controls who can log in, which role they have, and what branch or system areas they can access.',
            'Primary users: superadmin and authorized President, Vice President, or Admin-level accounts depending on system rules.',
            'Key actions: create accounts, update roles, reset credentials, assign branches, and review access levels.',
            'Important note: incorrect role or branch assignment can expose sensitive data or hide required modules. Review carefully before saving.'
        ]
    },
    {
        title: 'User Roles',
        body: [
            'Employee: Can access self-service areas such as My Profile, leave-related actions, loans, cash advance, announcements, and attendance scanner access when enabled.',
            'HR: Maintains employee records, attendance, leave, compensation, benefits, documents, trainings, violations, reports, and payroll support workflows.',
            'President / Vice President / Manager / Operations Manager: Reviews dashboards, reports, approvals, payroll status, branch data, and management summaries.',
            'Admin / Superadmin: Manages accounts, system access, settings, branch assignments, and high-impact configuration.',
            'Finance: Can access payroll-related workflows when assigned the Finance role.'
        ]
    },
    {
        title: 'Daily HR Workflow',
        body: [
            '1. Confirm the selected branch in the top navigation before reviewing or editing records.',
            '2. Review dashboard alerts for attendance, approvals, birthdays, announcements, and pending payroll actions.',
            '3. Maintain employee 201 Files before generating reports, benefits, payroll, or government contribution output.',
            '4. Validate attendance and leave records before payroll preparation.',
            '5. Review compensation, deductions, loans, cash advances, and benefits before payroll release.',
            '6. Export or print reports only after filters and data scope are confirmed.'
        ]
    },
    {
        title: 'Payroll Workflow',
        body: [
            '1. Select the correct branch and cutoff period.',
            '2. Confirm employee compensation records are complete.',
            '3. Review attendance and approved leave records for the payroll period.',
            '4. Create or open the payroll run.',
            '5. Verify earnings, deductions, loans, cash advances, government contributions, and net pay.',
            '6. Review payslips before export, print, release, or final approval.'
        ]
    },
    {
        title: 'Troubleshooting',
        body: [
            'Missing data: Check the target branch selector, user role, and employee record completeness.',
            'Cannot log in: Confirm the username, account status, role, and assigned branch with an authorized admin.',
            'Module is hidden: The user role may not have access to that module. Review User Management settings.',
            'Payroll amount looks wrong: Check attendance, compensation, loans, cash advances, government contributions, and benefits for the employee.',
            'Theme colors or display look stale: Refresh the page after changing Light or Dark mode.'
        ]
    },
    {
        title: 'System Safety Notes',
        body: [
            'User Management and Settings should only be changed by authorized personnel.',
            'Branch assignments affect what data users can view and modify.',
            'Payroll, compensation, leave, and government contribution changes should be reviewed after saving.',
            'Reports may contain sensitive employee and payroll data. Confirm access and destination before sharing externally.'
        ]
    }
];

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildHtml() {
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>HR Management System Documentation</title>
    <style>
        @page { size: A4; margin: 42px; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            line-height: 1.5;
            margin: 0;
        }
        header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 18px;
            margin-bottom: 24px;
        }
        h1 {
            font-size: 30px;
            margin: 0;
            color: #0f172a;
        }
        header p {
            margin: 8px 0 0;
            color: #475569;
        }
        .meta {
            font-size: 12px;
            color: #64748b;
            margin-top: 10px;
        }
        .note {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 12px 14px;
            color: #1e3a8a;
            margin-bottom: 22px;
            font-size: 13px;
        }
        section {
            break-inside: avoid;
            margin-bottom: 24px;
        }
        h2 {
            font-size: 18px;
            color: #1e3a8a;
            margin: 0 0 10px;
            border-bottom: 1px solid #dbeafe;
            padding-bottom: 6px;
        }
        ul {
            margin: 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 7px;
        }
        footer {
            border-top: 1px solid #e5e7eb;
            margin-top: 26px;
            padding-top: 10px;
            font-size: 11px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <header>
        <h1>Melann HR Management System Documentation</h1>
        <p>Downloadable user guide for modules, roles, workflows, and troubleshooting.</p>
        <div class="meta">Generated ${escapeHtml(today)}</div>
    </header>
    <div class="note">
        Use this document as an operating guide. Role visibility may vary depending on account permissions and branch assignment.
    </div>
    ${sections.map(section => `
        <section>
            <h2>${escapeHtml(section.title)}</h2>
            <ul>
                ${section.body.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </section>
    `).join('')}
    <footer>
        Melann HR Management System documentation. Keep employee, payroll, and user access data confidential.
    </footer>
</body>
</html>`;
}

async function main() {
    fs.mkdirSync(outputDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(buildHtml(), { waitUntil: 'load' });
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false
    });
    await browser.close();

    console.log(outputPath);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
