const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' 
});

// 2025 PhilHealth config
// Premium rate: 5% of basic salary (employee and employer sharing: 2.5% each)
// Monthly calculation cap: max salary = PHP 100,000
const philhealthConfig = {
  rate: 0.05,
  employee_rate: 0.025,
  employer_rate: 0.025,
  min_salary: 10000,
  max_salary: 100000,
  min_premium: 500,   // 10,000 * 5%
  max_premium: 5000,  // 100,000 * 5%
  note: "PhilHealth 2025: 5% premium rate. EE and ER share equally (2.5% each). Cap at PHP 100,000 MSC."
};

// 2025 Pag-IBIG (HDMF) config
// Salary bracket brackets for contribution rate
const pagibigConfig = [
  {
    range_start: 0,
    range_end: 1500,
    employee_rate: 0.01,
    employer_rate: 0.02,
    max_cap: 1500,
    label: "PHP 1,500 and below — EE: 1%, ER: 2%"
  },
  {
    range_start: 1500.01,
    range_end: 9999999,
    employee_rate: 0.02,
    employer_rate: 0.02,
    max_cap: 5000,
    label: "Over PHP 1,500 — EE: 2%, ER: 2%, cap at PHP 5,000 MSC"
  }
];

async function seed() {
  try {
    // Check what already exists
    const existing = await pool.query('SELECT type, year_effective FROM gov_contribution_configs');
    console.log('Existing configs:', existing.rows);

    // Upsert PhilHealth 2025
    const phicCheck = await pool.query(
      'SELECT id FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2',
      ['PhilHealth', 2025]
    );
    if (phicCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO gov_contribution_configs (type, year_effective, config_data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['PhilHealth', 2025, JSON.stringify(philhealthConfig)]
      );
      console.log('✅ Inserted PhilHealth 2025 config');
    } else {
      await pool.query(
        'UPDATE gov_contribution_configs SET config_data = $1, updated_at = NOW() WHERE type = $2 AND year_effective = $3',
        [JSON.stringify(philhealthConfig), 'PhilHealth', 2025]
      );
      console.log('✅ Updated PhilHealth 2025 config');
    }

    // Upsert Pag-IBIG 2025
    const pagibigCheck = await pool.query(
      'SELECT id FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2',
      ['Pag-IBIG', 2025]
    );
    if (pagibigCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO gov_contribution_configs (type, year_effective, config_data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['Pag-IBIG', 2025, JSON.stringify(pagibigConfig)]
      );
      console.log('✅ Inserted Pag-IBIG 2025 config');
    } else {
      await pool.query(
        'UPDATE gov_contribution_configs SET config_data = $1, updated_at = NOW() WHERE type = $2 AND year_effective = $3',
        [JSON.stringify(pagibigConfig), 'Pag-IBIG', 2025]
      );
      console.log('✅ Updated Pag-IBIG 2025 config');
    }

    // Also insert 2024 as fallback in case old periods are selected
    const phic2024Check = await pool.query(
      'SELECT id FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2',
      ['PhilHealth', 2024]
    );
    if (phic2024Check.rows.length === 0) {
      const phic2024 = { ...philhealthConfig, note: "PhilHealth 2024: 5% premium rate." };
      await pool.query(
        'INSERT INTO gov_contribution_configs (type, year_effective, config_data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['PhilHealth', 2024, JSON.stringify(phic2024)]
      );
      console.log('✅ Inserted PhilHealth 2024 config (fallback)');
    }

    const pagibig2024Check = await pool.query(
      'SELECT id FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2',
      ['Pag-IBIG', 2024]
    );
    if (pagibig2024Check.rows.length === 0) {
      await pool.query(
        'INSERT INTO gov_contribution_configs (type, year_effective, config_data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['Pag-IBIG', 2024, JSON.stringify(pagibigConfig)]
      );
      console.log('✅ Inserted Pag-IBIG 2024 config (fallback)');
    }

    // Verify
    const all = await pool.query('SELECT type, year_effective FROM gov_contribution_configs ORDER BY type, year_effective');
    console.log('\n📋 All configs now in DB:', all.rows);

  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

seed();
