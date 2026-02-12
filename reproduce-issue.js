
const fs = require('fs');
try {
    const db = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));

    const user = db.users.find(u => u.username === 'mariz'); // User 19
    if (!user) {
        console.log("User 'mariz' not found");
        process.exit(1);
    }

    console.log(`User: ${user.username}, Role: ${user.role}, Branch: '${user.assigned_branch}'`);

    const employees = db.employees;
    console.log(`Total Employees: ${employees.length}`);

    function normalizeBranchName(branch) {
        if (!branch) return '';
        // Same logic as lib/branch-access.ts
        return branch.replace(/\s*branch\s*$/i, '').trim().toUpperCase();
    }

    const userBranch = user.assigned_branch;
    const normalizedUserBranch = normalizeBranchName(userBranch);
    console.log(`Normalized User Branch: '${normalizedUserBranch}'`);

    const filtered = employees.filter(item => {
        const itemBranch = item.branch;
        if (!itemBranch) return false;
        const normalizedItemBranch = normalizeBranchName(itemBranch);
        const match = normalizedItemBranch === normalizedUserBranch;

        // Log potential matches or "Naval" items
        if (itemBranch.toLowerCase().includes('naval')) {
            console.log(`[DEBUG] Emp ${item.last_name}: Branch '${itemBranch}' -> Normalized '${normalizedItemBranch}'. Match? ${match}`);
        }
        return match;
    });

    console.log("Filtered Count:", filtered.length);
} catch (e) {
    console.error(e);
}
