import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
let pool: Pool | null = null;

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
      return pool;
    } catch (e) {
      console.error('Failed to create PG pool:', e);
      return null;
    }
  }
  return null;
}

export const isPostgres = () => !!getPool();

// Ensure local directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// Local JSON Fallback Logic
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error('Failed to parse database.json', e);
    }
  }
  return {
    users: [],
    employees: [],
    settings: [],
    attendance: [],
    leave_requests: [],
    payroll_runs: [],
    payslips: [],
    documents: [],
    audit_logs: [],
    sessions: [],
    education: [],
    admin_approval_queue: []
  };
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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
        rows: res.rows,
        rowCount: res.rowCount || 0
      };
    } catch (error: any) {
      const errorMsg = (error.message || '').toLowerCase();
      const isConnectionError = errorMsg.includes('connection') ||
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('etimedout');

      if (isConnectionError) {
        console.error('⚠ DATABASE CONNECTION ERROR. Falling back to local JSON database.', errorMsg);
        pool = null;
        // Proceed to fallback logic below
      } else {
        console.error(`[PostgreSQL] Query Error: ${sql}`, error);
        throw error;
      }
    }
  }

  // Fallback to Local JSON Simulation
  const db = loadDB();
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  try {
    if (normalizedSql.match(/^SELECT NOW\(\)/i)) {
      return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
    }

    if (normalizedSql.match(/^SELECT/i)) {
      const tableMatch = normalizedSql.match(/FROM\s+([a-z0-9_]+)/i);
      if (!tableMatch) throw new Error('Table not found in query');
      const table = tableMatch[1].toLowerCase();

      if (!db[table]) return { rows: [], rowCount: 0 };

      let results = [...db[table]];

      const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        results = results.filter((row: any) => {
          const parts = conditions.split(/\s+AND\s+/i);
          return parts.every(part => {
            let match;
            if (match = part.match(/([a-z0-9_]+)\s*=\s*\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              return row[col] == params[parseInt(paramIdx) - 1];
            }
            if (match = part.match(/([a-z0-9_]+)\s*=\s*'(.*?)'/i)) {
              const [_, col, literal] = match;
              return row[col] == literal;
            }
            if (match = part.match(/([a-z0-9_]+)\s+LIKE\s+\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              const val = params[parseInt(paramIdx) - 1];
              if (!row[col]) return false;
              const pattern = val.replace(/%/g, '.*');
              return new RegExp(`^${pattern}$`, 'i').test(row[col]);
            }
            return true;
          });
        });
      }

      if (normalizedSql.match(/SELECT\s+COUNT\(\*\)/i)) {
        return { rows: [{ count: results.length }], rowCount: 1 };
      }

      return { rows: results, rowCount: results.length };
    }

    if (normalizedSql.match(/^INSERT/i)) {
      const tableMatch = normalizedSql.match(/INTO\s+([a-z_]+)/i);
      const table = tableMatch![1];
      if (!db[table]) db[table] = [];

      const colsMatch = normalizedSql.match(/\((.+?)\)\s*VALUES/i);
      const columns = colsMatch![1].split(',').map(s => s.trim());

      const newItem: any = {};
      columns.forEach((col, idx) => {
        newItem[col] = params[idx];
      });

      if (!newItem.id) {
        const maxId = db[table].reduce((max: number, item: any) => Math.max(max, item.id || 0), 0);
        newItem.id = maxId + 1;
      }

      db[table].push(newItem);
      saveDB(db);
      return { rows: [{ id: newItem.id }], rowCount: 1 };
    }

    if (normalizedSql.match(/^UPDATE/i)) {
      const tableMatch = normalizedSql.match(/UPDATE\s+([a-z_]+)/i);
      const table = tableMatch![1];
      const whereMatch = normalizedSql.match(/WHERE\s+(.+)$/i);
      if (!whereMatch) throw new Error('UPDATE must have WHERE clause');

      const conditions = whereMatch[1];
      let updatedCount = 0;

      if (!db[table]) return { rows: [], rowCount: 0 };

      db[table] = db[table].map((row: any) => {
        const parts = conditions.split(/\s+AND\s+/i);
        const matches = parts.every(part => {
          let m;
          if (m = part.match(/([a-z0-9_]+)\s*=\s*\$(\d+)/i)) {
            const [_, col, paramIdx] = m;
            return row[col] == params[parseInt(paramIdx) - 1];
          }
          if (m = part.match(/([a-z0-9_]+)\s*=\s*'(.*?)'/i)) {
            const [_, col, literal] = m;
            return row[col] == literal;
          }
          return true;
        });

        if (matches) {
          const setMatch = normalizedSql.match(/SET\s+(.+?)\s+WHERE/i);
          if (setMatch) {
            const setClauses = setMatch[1].split(',');
            setClauses.forEach(clause => {
              const [colRaw, valRaw] = clause.split('=');
              if (colRaw && valRaw) {
                const col = colRaw.trim();
                const valPart = valRaw.trim();
                if (valPart.startsWith('$')) {
                  row[col] = params[parseInt(valPart.substring(1)) - 1];
                } else if (valPart.match(/CURRENT_TIMESTAMP/i)) {
                  row[col] = new Date().toISOString();
                } else if (valPart.startsWith("'") && valPart.endsWith("'")) {
                  row[col] = valPart.substring(1, valPart.length - 1);
                }
              }
            });
          }
          updatedCount++;
        }
        return row;
      });

      if (updatedCount > 0) saveDB(db);
      return { rows: [], rowCount: updatedCount };
    }

    if (normalizedSql.match(/^DELETE/i)) {
      const tableMatch = normalizedSql.match(/FROM\s+([a-z_]+)/i);
      const table = tableMatch![1];
      const whereMatch = normalizedSql.match(/WHERE\s+(.+)$/i);
      if (whereMatch) {
        const initialLen = db[table].length;
        const conditions = whereMatch[1];
        db[table] = db[table].filter((row: any) => {
          const parts = conditions.split(/\s+AND\s+/i);
          return !parts.every(part => {
            let m;
            if (m = part.match(/([a-z0-9_]+)\s*=\s*\$(\d+)/i)) {
              const [_, col, paramIdx] = m;
              return row[col] == params[parseInt(paramIdx) - 1];
            }
            return true;
          });
        });
        saveDB(db);
        return { rows: [], rowCount: initialLen - db[table].length };
      }
    }

    return { rows: [], rowCount: 0 };
  } catch (e: any) {
    console.error(`[LocalDB] Query Error: ${sql}`, e);
    throw e;
  }
}

export async function getAll(table: string): Promise<any[]> {
  const res = await query(`SELECT * FROM ${table}`);
  return res.rows;
}

export async function getById(table: string, id: number | string): Promise<any | undefined> {
  const activePool = getPool();
  if (activePool) {
    const res = await activePool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return res.rows[0];
  }
  const db = loadDB();
  return (db[table] || []).find((item: any) => item.id == id);
}

export async function insert(table: string, data: any): Promise<number> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const activePool = getPool();
  const sql = activePool
    ? `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`
    : `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

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
    console.log('✅ PostgreSQL Database connected');
    return;
  }
  console.log('✅ Local JSON Database initialized');
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
