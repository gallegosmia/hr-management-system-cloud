const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const marchPayrolls = (db.payroll_runs || []).filter(pr => {
  const start = new Date(pr.payroll_period_start);
  const end = new Date(pr.payroll_period_end);
  return start >= new Date('2026-03-01T00:00:00Z') && end <= new Date('2026-03-15T23:59:59Z');
});

console.log(JSON.stringify(marchPayrolls, null, 2));
