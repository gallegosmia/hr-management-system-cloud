import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration
let pool: Pool | null = null;
let sqliteDb: any = null;
let pgMigrationDone = false;

function getPool(): Pool | null {
  if (pool) return pool;

  let url = process.env.DATABASE_URL;


  if (!url && fs.existsSync(path.join(process.cwd(), '.env'))) {
    const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) url = match[1].trim();
  }

  if (url) {
    try {
      pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      // Run migration once after pool is created
      if (!pgMigrationDone) {
        pgMigrationDone = true;
        runPostgresMigration(pool).catch(e =>
          console.error('[PG Migration] Error:', e.message)
        );
      }
      return pool;
    } catch (e) {
      console.error('Failed to create PG pool:', e);
      return null;
    }
  }
  return null;
}

async function runPostgresMigration(p: Pool) {
  const cols = [
    'other_earnings NUMERIC(12,2) DEFAULT 0',
    'holiday_days NUMERIC(8,2) DEFAULT 0',
    'holiday_pay NUMERIC(12,2) DEFAULT 0',
    'regular_allowance NUMERIC(12,2) DEFAULT 0',
    'special_allowance NUMERIC(12,2) DEFAULT 0',
    'pagibig_loan NUMERIC(12,2) DEFAULT 0',
    'company_funds NUMERIC(12,2) DEFAULT 0',
    'sss_loan NUMERIC(12,2) DEFAULT 0',
    'other_deductions NUMERIC(12,2) DEFAULT 0',
    'daily_rate NUMERIC(12,2) DEFAULT 0',
    'workflow_stage INTEGER DEFAULT 1',
    'evp_review_status TEXT',
    'evp_review_date TIMESTAMPTZ',
    'return_remarks TEXT',
    'current_reviewer_role TEXT',
    'process_date TIMESTAMPTZ',
    'approved_at TIMESTAMPTZ',
  ];

  const client = await p.connect();
  try {
    for (const colDef of cols) {
      const colName = colDef.split(' ')[0];
      // ADD COLUMN IF NOT EXISTS is safe â€” does nothing if column exists
      try {
        await client.query(
          `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS ${colDef}`
        );
      } catch (_) {}
      try {
        await client.query(
          `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS ${colDef}`
        );
      } catch (_) {}
    }
    // Also ensure payroll_audit_log exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_audit_log (
        id SERIAL PRIMARY KEY,
        payroll_run_id INTEGER,
        action TEXT,
        performed_by INTEGER,
        details JSONB,
        performed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Ensure cash_advances table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_advances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        employee_name TEXT,
        daily_rate NUMERIC(12,2) DEFAULT 0,
        working_days NUMERIC(8,2) DEFAULT 0,
        allowable_ca NUMERIC(12,2) DEFAULT 0,
        requested_amount NUMERIC(12,2) NOT NULL,
        approved_amount NUMERIC(12,2) DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        date_requested TIMESTAMPTZ DEFAULT NOW(),
        date_approved TIMESTAMPTZ,
        approved_by INTEGER,
        reason TEXT,
        remarks TEXT,
        branch TEXT,
        cutoff_period TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('[PG Migration] âœ… Schema columns verified.');
  } finally {
    client.release();
  }
}

export const isPostgres = () => !!getPool();


// SQLite Fallback Logic
async function getSqliteDB() {
  if (sqliteDb) return sqliteDb;
  try {
      const sqlite3 = require('sqlite3').verbose();
      const sqlite = require('sqlite');
      
      const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
      
      if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
          fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
      }

      sqliteDb = await sqlite.open({
          filename: dbPath,
          driver: sqlite3.Database
      });

      // Proactively ensure all required tables and columns exist
      await ensureSchema(sqliteDb);
      
      return sqliteDb;
  } catch (e) {
      console.error('\nâš ï¸ Failed to initialize SQLite fallback. Ensure you install dependencies:\n   npm install sqlite3 sqlite\n', e);
      throw new Error('SQLite fallback is not installed.');
  }
}

async function ensureSchema(db: any) {
  const safeAdd = async (table: string, col: string, type = 'TEXT') => {
    try { await db.run(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}`); } catch (_) {}
  };

  // Create core tables if missing
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_number TEXT, branch TEXT,
      status TEXT DEFAULT 'Draft', payroll_period_start TEXT, payroll_period_end TEXT,
      cutoff_day INTEGER, employee_count INTEGER DEFAULT 0,
      total_net_pay REAL DEFAULT 0, total_gross_pay REAL DEFAULT 0,
      created_by INTEGER, approved_by INTEGER, workflow_stage INTEGER DEFAULT 1,
      evp_review_status TEXT, evp_review_date TEXT,
      return_remarks TEXT, current_reviewer_role TEXT,
      process_date TEXT, approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT, payroll_run_id INTEGER, employee_id INTEGER,
      daily_rate REAL DEFAULT 0, payroll_days REAL DEFAULT 0,
      basic_pay REAL DEFAULT 0, regular_allowance REAL DEFAULT 0,
      special_allowance REAL DEFAULT 0, holiday_pay REAL DEFAULT 0,
      holiday_days REAL DEFAULT 0, other_earnings REAL DEFAULT 0,
      gross_pay REAL DEFAULT 0,
      phic REAL DEFAULT 0, pagibig REAL DEFAULT 0, pagibig_loan REAL DEFAULT 0,
      company_funds REAL DEFAULT 0, sss REAL DEFAULT 0, sss_loan REAL DEFAULT 0,
      company_loan REAL DEFAULT 0, cash_advance REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0, total_deductions REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payroll_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, payroll_run_id INTEGER,
      action TEXT, performed_by INTEGER, details TEXT,
      performed_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT,
        employee_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        is_active INTEGER DEFAULT 0,
        assigned_branch TEXT,
        hr_approval_status TEXT,
        hr_approved_by INTEGER,
        hr_approved_at TEXT,
        status TEXT DEFAULT 'PENDING_APPROVAL',
        reset_otp TEXT,
        reset_otp_expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        expires_at TEXT,
        selected_branch TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        last_name TEXT NOT NULL,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        department TEXT,
        position TEXT,
        branch TEXT,
        employment_status TEXT,
        date_hired TEXT,
        date_of_birth TEXT,
        date_separated TEXT,
        contact_number TEXT,
        email_address TEXT,
        address TEXT,
        sss_number TEXT,
        philhealth_number TEXT,
        pagibig_number TEXT,
        tin TEXT,
        civil_status TEXT,
        salary_info TEXT,
        personal_info_complete INTEGER DEFAULT 0,
        preemployment_req_complete INTEGER DEFAULT 0,
        government_docs_complete INTEGER DEFAULT 0,
        employment_records_complete INTEGER DEFAULT 0,
        attendance_records_complete INTEGER DEFAULT 0,
        payroll_records_complete INTEGER DEFAULT 0,
        disciplinary_records INTEGER DEFAULT 0,
        training_records INTEGER DEFAULT 0,
        separation_records INTEGER DEFAULT 0,
        file_completion_status TEXT DEFAULT 'Incomplete',
        last_updated TEXT DEFAULT (datetime('now')),
        remarks TEXT,
        training_details TEXT,
        disciplinary_details TEXT,
        profile_picture TEXT,
        created_by INTEGER
    );
    CREATE TABLE IF NOT EXISTS cash_advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        employee_name TEXT,
        daily_rate REAL DEFAULT 0,
        working_days REAL DEFAULT 0,
        allowable_ca REAL DEFAULT 0,
        requested_amount REAL NOT NULL,
        approved_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        date_requested TEXT DEFAULT (datetime('now')),
        date_approved TEXT,
        approved_by INTEGER,
        reason TEXT,
        remarks TEXT,
        branch TEXT,
        cutoff_period TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gov_contribution_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        year_effective INTEGER NOT NULL,
        config_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gov_contribution_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id TEXT,
        payroll_period TEXT,
        contribution_type TEXT,
        total_er REAL DEFAULT 0,
        total_ee REAL DEFAULT 0,
        total_ec REAL DEFAULT 0,
        total_loan REAL DEFAULT 0,
        total_mpf_er REAL DEFAULT 0,
        total_mpf_ee REAL DEFAULT 0,
        service_charge REAL DEFAULT 0,
        employee_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Draft',
        created_by INTEGER,
        approved_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gov_contribution_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        employee_id INTEGER,
        government_number TEXT,
        salary REAL DEFAULT 0,
        er_share REAL DEFAULT 0,
        ee_share REAL DEFAULT 0,
        ec REAL DEFAULT 0,
        mpf_er REAL DEFAULT 0,
        mpf_ee REAL DEFAULT 0,
        loan_deduction REAL DEFAULT 0,
        config_id_used INTEGER,
        rate_used TEXT,
        computation_date TEXT DEFAULT (datetime('now')),
        last_name TEXT,
        first_name TEXT
    );
    CREATE TABLE IF NOT EXISTS sss_contribution_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        effectivity_year INTEGER,
        salary_range_from REAL,
        salary_range_to REAL,
        employee_share REAL DEFAULT 0,
        employer_share REAL DEFAULT 0,
        ec_contribution REAL DEFAULT 0
    );
  `);


  // Ensure every known column exists (safe: ALTER TABLE silently fails if column already present)
  const payslipCols: [string, string][] = [
    ['daily_rate','REAL'], ['payroll_days','REAL'], ['basic_pay','REAL'],
    ['regular_allowance','REAL'], ['special_allowance','REAL'], ['holiday_pay','REAL'],
    ['holiday_days','REAL'], ['other_earnings','REAL'], ['gross_pay','REAL'],
    ['phic','REAL'], ['pagibig','REAL'], ['pagibig_loan','REAL'],
    ['company_funds','REAL'], ['sss','REAL'], ['sss_loan','REAL'],
    ['company_loan','REAL'], ['cash_advance','REAL'], ['other_deductions','REAL'],
    ['total_deductions','REAL'], ['net_pay','REAL'],
  ];
  for (const [col, type] of payslipCols) await safeAdd('payslips', col, type);

  const runCols: [string, string][] = [
    ['workflow_stage','INTEGER'], ['evp_review_status','TEXT'], ['evp_review_date','TEXT'],
    ['return_remarks','TEXT'], ['current_reviewer_role','TEXT'], ['process_date','TEXT'],
    ['approved_at','TEXT'], ['total_net_pay','REAL'], ['total_gross_pay','REAL'],
    ['employee_count','INTEGER'], ['cutoff_day','INTEGER'],
    ['payroll_period_start','TEXT'], ['payroll_period_end','TEXT'],
  ];
  for (const [col, type] of runCols) await safeAdd('payroll_runs', col, type);

  const govReportCols: [string, string][] = [
    ['branch_id','TEXT'], ['payroll_period','TEXT'], ['contribution_type','TEXT'],
    ['total_er','REAL'], ['total_ee','REAL'], ['total_ec','REAL'],
    ['total_loan','REAL'], ['total_mpf_er','REAL'], ['total_mpf_ee','REAL'],
    ['service_charge','REAL'], ['employee_count','INTEGER'], ['status','TEXT'],
    ['created_by','INTEGER'], ['approved_by','INTEGER'], ['created_at','TEXT'],
    ['updated_at','TEXT'],
  ];
  for (const [col, type] of govReportCols) await safeAdd('gov_contribution_reports', col, type);

  const govDetailCols: [string, string][] = [
    ['report_id','INTEGER'], ['employee_id','INTEGER'], ['government_number','TEXT'],
    ['salary','REAL'], ['er_share','REAL'], ['ee_share','REAL'], ['ec','REAL'],
    ['mpf_er','REAL'], ['mpf_ee','REAL'], ['loan_deduction','REAL'],
    ['config_id_used','INTEGER'], ['rate_used','TEXT'], ['computation_date','TEXT'],
  ];
  for (const [col, type] of govDetailCols) await safeAdd('gov_contribution_details', col, type);

  console.log('[SQLite] Schema verified.');
}


/**
 * Helper to make data JSON safe (handles BigInt from PostgreSQL and extracts Strings from SQLite JSON)
 */
function safeJson(data: any) {
  if (data === undefined || data === null) return data;
  try {
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      return value;
    }));
  } catch (e) {
    console.error('safeJson error:', e);
    return data;
  }
}

/**
 * Coerce SQLite TEXT columns that are numeric back to numbers.
 * SQLite stores all non-declared types as TEXT, so "5000.00" comes back as a string.
 */
function coerceSqliteRow(row: any): any {
  if (!row || typeof row !== 'object') return row;
  const result: any = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    // Convert numeric strings to numbers, and "NaN"/"null"/"undefined" strings to 0/null
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === 'NaN' || trimmed === 'undefined') {
        result[key] = 0;
      } else if (trimmed === 'null' || trimmed === '') {
        result[key] = null;
      } else if (!isNaN(Number(trimmed))) {
        result[key] = Number(trimmed);
      } else {
        result[key] = val;
      }
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Main query function
 */
export async function query(sql: string, params: any[] = []): Promise<{ rows: any[], rowCount: number }> {
  const activePool = getPool();
  if (activePool) {
    try {
      const res = await activePool.query(sql, params);
      return {
        rows: safeJson(res.rows),
        rowCount: res.rowCount || 0
      };
    } catch (error: any) {
      const errorMsg = String(error.message || '').toLowerCase();
      const errorCode = String(error.code || '').toLowerCase();

      const isConnectionError =
        errorMsg.includes('connection') ||
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('etimedout') ||
        errorMsg.includes('promise') || 
        errorCode === 'econnrefused' ||
        errorCode === 'etimedout';

      if (isConnectionError) {
        console.error('âš  DATABASE CONNECTION ERROR. Falling back to local SQLite database.', { msg: errorMsg, code: errorCode });
        pool = null; // Clear the pool to trigger fallback
      } else {
        console.error(`[PostgreSQL] Query Error: ${sql}`, error);
        throw error;
      }
    }
  }

  // Fallback to SQLite Database
  const db = await getSqliteDB();
  
  // Convert parameter syntax from PostgreSQL ($1, $2) to SQLite (?1, ?2)
  let sqliteSql = sql.replace(/\$(\d+)/g, '?$1');
  
  // Convert basic Postgres Dialects to SQLite syntax
  sqliteSql = sqliteSql.replace(/\bILIKE\b/gi, 'LIKE');
  sqliteSql = sqliteSql.replace(/\bNOW\(\)/gi, "datetime('now')");
  sqliteSql = sqliteSql.replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')");
  sqliteSql = sqliteSql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  sqliteSql = sqliteSql.replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME');
  sqliteSql = sqliteSql.replace(/\bJSONB\b/gi, 'TEXT');
  sqliteSql = sqliteSql.replace(/\bBYTEA\b/gi, 'BLOB');
  sqliteSql = sqliteSql.replace(/\bCOALESCE\(/gi, 'COALESCE('); // SQLite supports COALESCE natively
  
  // Ensure objects in array are stringified for insertion into SQLite
  const sqliteParams = params.map(p => {
      if (typeof p === 'object' && p !== null && !(p instanceof Date)) {
          return JSON.stringify(p);
      }
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      return p;
  });

  async function executeWithAutoHeal(method: 'all' | 'run', sqlQuery: string, sqlParams: any[], maxRetries = 30) {
      let retries = 0;
      while (retries < maxRetries) {
          try {
              if (method === 'all') return await db.all(sqlQuery, ...sqlParams);
              return await db.run(sqlQuery, ...sqlParams);
          } catch (e: any) {
              const msg = e.message || '';

              // --- Auto-heal: Missing TABLE ---
              const matchNoTable = msg.match(/no such table:\s*([a-zA-Z0-9_]+)/i);
              if (matchNoTable) {
                  const missingTable = matchNoTable[1];
                  console.log(`[Auto-Heal] Creating missing table '${missingTable}'...`);
                  try {
                      // Extract column names from SET clause (UPDATE) or column list (INSERT/SELECT)
                      const setCols = sqlQuery.match(/SET\s+([\s\S]+?)\s+WHERE/i);
                      const insertCols = sqlQuery.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+[^\s(]+\s*\(([^)]+)\)/i);
                      const selectCols = sqlQuery.match(/SELECT\s+([\s\S]+?)\s+FROM/i);

                      let colDefs = 'id INTEGER PRIMARY KEY AUTOINCREMENT';
                      if (setCols) {
                          const cols = setCols[1].split(',').map((s: string) => s.trim().split(/\s*=\s*/)[0].replace(/"/g, '').trim()).filter((c: string) => c && c !== 'id');
                          colDefs += cols.map((c: string) => `, "${c}" TEXT`).join('');
                      } else if (insertCols) {
                          const cols = insertCols[1].split(',').map((s: string) => s.trim().replace(/"/g, '')).filter((c: string) => c && c !== 'id');
                          colDefs += cols.map((c: string) => `, "${c}" TEXT`).join('');
                      } else if (selectCols && selectCols[1].trim() !== '*') {
                          const cols = selectCols[1].split(',').map((s: string) => {
                              const parts = s.trim().split(/\s+as\s+/i);
                              return (parts[parts.length - 1] || '').replace(/"/g, '').trim();
                          }).filter((c: string) => c && c !== '*' && c !== 'id' && !c.includes('.'));
                          colDefs += cols.map((c: string) => `, "${c}" TEXT`).join('');
                      }

                      await db.exec(`CREATE TABLE IF NOT EXISTS "${missingTable}" (${colDefs})`);
                      retries++;
                      continue;
                  } catch (createErr) {
                      console.error(`[Auto-Heal] Failed to create table '${missingTable}':`, createErr);
                  }
              }

              // --- Auto-heal: Missing COLUMN ---
              const matchInsert = msg.match(/table\s+([a-zA-Z0-9_]+)\s+has\s+no\s+column\s+named\s+([a-zA-Z0-9_]+)/i);
              const matchSelectUpdate = msg.match(/no such column:\s*([a-zA-Z0-9_]+)/i);
              
              let tableToAlter = '';
              let colToAdd = '';

              if (matchInsert) {
                  tableToAlter = matchInsert[1];
                  colToAdd = matchInsert[2];
              } else if (matchSelectUpdate) {
                  colToAdd = matchSelectUpdate[1];
                  const updateMatch = sqlQuery.match(/UPDATE\s+"?([a-zA-Z0-9_]+)"?\s+SET/i);
                  const insertMatch = sqlQuery.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+"?([a-zA-Z0-9_]+)"?/i);
                  const selectMatch = sqlQuery.match(/FROM\s+"?([a-zA-Z0-9_]+)"?/i);
                  if (updateMatch) tableToAlter = updateMatch[1];
                  else if (insertMatch) tableToAlter = insertMatch[1];
                  else if (selectMatch) tableToAlter = selectMatch[1];
              }

              if (tableToAlter && colToAdd) {
                  console.log(`[Auto-Heal] Adding missing column '${colToAdd}' to table '${tableToAlter}'...`);
                  try {
                      await db.exec(`ALTER TABLE "${tableToAlter}" ADD COLUMN "${colToAdd}" TEXT`);
                      retries++;
                      continue;
                  } catch (alterErr) {
                      console.error(`[Auto-Heal] Failed to add column:`, alterErr);
                  }
              }

              throw e;
          }
      }
      throw new Error(`Auto-heal failed after ${maxRetries} retries for query: ${sqlQuery}`);
  }

  try {
    const upperSql = sqliteSql.trim().toUpperCase();
    const isSelect = upperSql.startsWith('SELECT');
    const isReturning = upperSql.includes('RETURNING');

    if (isSelect) {
        const rows = await executeWithAutoHeal('all', sqliteSql, sqliteParams) as any[];
        const coerced = rows.map(coerceSqliteRow);
        return { rows: safeJson(coerced), rowCount: coerced.length };

    } else if (isReturning) {
        // INSERT/UPDATE ... RETURNING â€” sqlite returns rows like a SELECT
        const rows = await executeWithAutoHeal('all', sqliteSql, sqliteParams) as any[];
        const coerced = rows.map(coerceSqliteRow);
        return { rows: safeJson(coerced), rowCount: coerced.length };

    } else {
        const result = await executeWithAutoHeal('run', sqliteSql, sqliteParams) as any;
        return { rows: [], rowCount: result.changes || 0 };
    }
  } catch (error: any) {
    console.error(`[SQLite] Query Error: ${sqliteSql}`, error);
    throw error;
  }
}

export async function getAll(table: string): Promise<any[]> {
  const res = await query(`SELECT * FROM ${table}`);
  return res.rows;
}

export async function getById(table: string, id: number | string): Promise<any | undefined> {
  const res = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return res.rows[0];
}

export async function insert(table: string, data: any): Promise<number> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;
  const res = await query(sql, values);
  return res.rows[0]?.id;
}

export async function update(table: string, id: number | string, data: any): Promise<void> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = $1`;
  await query(sql, [id, ...values]);
}

export async function remove(table: string, id: number | string): Promise<void> {
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

export async function initializeDatabase() {
  const activePool = getPool();
  if (activePool) {
    console.log('âœ… PostgreSQL Database connected');
    return;
  }
  
  try {
    await getSqliteDB();
    console.log('âœ… Local SQLite Database initialized');
  } catch (e) {
    console.error('âŒ Local SQLite Fallback missing dependencies.');
  }
}

export async function resetTableSequence(table: string) {
  const activePool = getPool();
  if (activePool) {
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid table name");
      const sql = `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`;
      await activePool.query(sql, [table]);
      console.log(`Sequence for ${table} reset successfully.`);
    } catch (e) {
      console.error(`Failed to reset sequence for ${table}:`, e);
    }
  } else {
      // Internal SQLite reset (sqlite_sequence table handles this automatically usually)
      console.log(`No sequence reset required for SQLite (${table})`);
  }
}

const db = {
  query,
  getAll,
  getById,
  insert,
  update,
  remove,
  initializeDatabase,
  isPostgres,
  resetTableSequence
};

export default db;
