
const { query, isPostgres } = require('./lib/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('🚀 Starting Payroll Workflow Migration...');

    if (isPostgres()) {
        console.log('💻 Detecting PostgreSQL, applying ALTER TABLE...');
        try {
            await query(`
                ALTER TABLE payroll_runs 
                ADD COLUMN IF NOT EXISTS workflow_stage INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS current_reviewer_role VARCHAR(50),
                ADD COLUMN IF NOT EXISTS hr_review_status VARCHAR(20) DEFAULT 'Pending',
                ADD COLUMN IF NOT EXISTS hr_review_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS operations_review_status VARCHAR(20) DEFAULT 'Pending',
                ADD COLUMN IF NOT EXISTS operations_review_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS evp_review_status VARCHAR(20) DEFAULT 'Pending',
                ADD COLUMN IF NOT EXISTS evp_review_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS return_remarks TEXT
            `);
            console.log('✅ PostgreSQL schema updated successfully.');
        } catch (error) {
            console.error('❌ PostgreSQL Migration Error:', error);
        }
    } else {
        console.log('📂 Detecting Local JSON Database...');
        const dbPath = path.join(process.cwd(), 'data', 'database.json');
        if (fs.existsSync(dbPath)) {
            try {
                const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                if (db.payroll_runs) {
                    db.payroll_runs = db.payroll_runs.map(run => ({
                        ...run,
                        workflow_stage: run.workflow_stage ?? 0,
                        current_reviewer_role: run.current_reviewer_role ?? null,
                        hr_review_status: run.hr_review_status ?? 'Pending',
                        hr_review_date: run.hr_review_date ?? null,
                        operations_review_status: run.operations_review_status ?? 'Pending',
                        operations_review_date: run.operations_review_date ?? null,
                        evp_review_status: run.evp_review_status ?? 'Pending',
                        evp_review_date: run.evp_review_date ?? null,
                        return_remarks: run.return_remarks ?? null
                    }));
                    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                    console.log('✅ database.json updated successfully.');
                }
            } catch (error) {
                console.error('❌ JSON Migration Error:', error);
            }
        }
    }

    console.log('🏁 Migration process finished.');
}

migrate();
