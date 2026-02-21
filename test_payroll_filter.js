const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

function normalizeBranchName(branch) {
    if (!branch) return '';
    return branch.replace(/\s*branch\s*$/i, '').trim().toUpperCase();
}

function test() {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const allEmployees = db.employees;

    console.log('Total Employees:', allEmployees.length);

    const branchToTest = 'Ormoc';
    const normalizedTarget = normalizeBranchName(branchToTest);

    let stats = {
        total: allEmployees.length,
        inactive: 0,
        noSalaryInfo: 0,
        invalidRates: 0,
        wrongBranch: 0,
        qualified: 0
    };

    allEmployees.forEach(emp => {
        // 1. Status Check
        const inactiveStatuses = ['Resigned', 'Terminated', 'AWOL'];
        if (inactiveStatuses.includes(emp.employment_status)) {
            stats.inactive++;
            return;
        }

        // 2. Branch Check
        const empBranch = normalizeBranchName(emp.branch);
        if (empBranch !== normalizedTarget) {
            stats.wrongBranch++;
            return;
        }

        // 3. Salary Info Check
        if (!emp.salary_info) {
            stats.noSalaryInfo++;
            return;
        }

        let s = emp.salary_info;
        if (typeof s === 'string') {
            try { s = JSON.parse(s); } catch (e) { stats.noSalaryInfo++; return; }
        }

        const dailyRate = parseFloat(s.daily_rate) || 0;
        const monthlySalary = parseFloat(s.monthly_salary) || parseFloat(s.basic_salary) || 0;

        if (dailyRate <= 0 && monthlySalary <= 0) {
            stats.invalidRates++;
            return;
        }

        stats.qualified++;
    });

    console.log('Filtering stats for branch:', branchToTest);
    console.log(JSON.stringify(stats, null, 2));

    const branches = [...new Set(allEmployees.map(e => e.branch))];
    console.log('Branches in DB:', branches);
}

test();
