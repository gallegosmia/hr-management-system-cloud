import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Pool for PostgreSQL (Production)
let pool: Pool | null = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Ensure local directory exists (for development)
if (!DATABASE_URL && !fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Local JSON Fallback Logic
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
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
    education: []
  };
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/**
 * Main query function
 */
export async function query(sql: string, params: any[] = []): Promise<{ rows: any[], rowCount: number }> {
  // Use PostgreSQL if pool is available
  if (pool) {
    try {
      const res = await pool.query(sql, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount || 0
      };
    } catch (error: any) {
      console.error(`[PostgreSQL] Query Error: ${sql}`, error);
      throw error;
    }
  }

  // Fallback to Local JSON Simulation
  const db = loadDB();
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  try {
    // SELECT NOW()
    if (normalizedSql.match(/^SELECT NOW\(\)/i)) {
      return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
    }

    // SELECT
    if (normalizedSql.match(/^SELECT/i)) {
      const tableMatch = normalizedSql.match(/FROM\s+([a-z_]+)/i);
      if (!tableMatch) throw new Error('Table not found in query');
      const table = tableMatch[1];

      if (!db[table]) return { rows: [], rowCount: 0 };

      let results = [...db[table]];

      // WHERE clause
      const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        results = results.filter(row => {
          const parts = conditions.split(/\s+AND\s+/i);
          return parts.every(part => {
            let match;
            if (match = part.match(/([a-z_]+)\s*=\s*\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              return row[col] == params[parseInt(paramIdx) - 1];
            }
            else if (match = part.match(/([a-z_]+)\s+LIKE\s+\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              const val = params[parseInt(paramIdx) - 1];
              if (!row[col]) return false;
              const pattern = val.replace(/%/g, '.*');
              return new RegExp(`^${pattern}$`, 'i').test(row[col]);
            }
            else if (match = part.match(/([a-z_]+)\s*>=\s*\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              return row[col] >= params[parseInt(paramIdx) - 1];
            }
            else if (match = part.match(/([a-z_]+)\s*<=\s*\$(\d+)/i)) {
              const [_, col, paramIdx] = match;
              return row[col] <= params[parseInt(paramIdx) - 1];
            }
            return true;
          });
        });
      }

      // ORDER BY
      const orderMatch = normalizedSql.match(/ORDER BY\s+([a-z_]+)(?:\s+(ASC|DESC))?/i);
      if (orderMatch) {
        const [_, col, dir] = orderMatch;
        results.sort((a, b) => {
          if (a[col] < b[col]) return dir?.toUpperCase() === 'DESC' ? 1 : -1;
          if (a[col] > b[col]) return dir?.toUpperCase() === 'DESC' ? -1 : 1;
          return 0;
        });
      }

      // SELECT COUNT(*)
      if (normalizedSql.match(/SELECT\s+COUNT\(\*\)/i)) {
        return { rows: [{ count: results.length }], rowCount: 1 };
      }

      return { rows: results, rowCount: results.length };
    }

    // INSERT
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

    // UPDATE
    if (normalizedSql.match(/^UPDATE/i)) {
      const tableMatch = normalizedSql.match(/UPDATE\s+([a-z_]+)/i);
      const table = tableMatch![1];
      const whereIdMatch = normalizedSql.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
      if (!whereIdMatch) throw new Error('UPDATE must have WHERE id');
      const idToUpdate = params[parseInt(whereIdMatch[1]) - 1];
      const itemIndex = db[table].findIndex((i: any) => i.id == idToUpdate);

      if (itemIndex !== -1) {
        const setMatch = normalizedSql.match(/SET\s+(.+?)\s+WHERE/i);
        if (setMatch) {
          const setClauses = setMatch[1].split(',');
          setClauses.forEach(clause => {
            const [colRaw, valRaw] = clause.split('=');
            const col = colRaw.trim();
            const valPart = valRaw.trim();
            if (valPart.startsWith('$')) {
              db[table][itemIndex][col] = params[parseInt(valPart.substring(1)) - 1];
            } else if (valPart.match(/CURRENT_TIMESTAMP/i)) {
              db[table][itemIndex][col] = new Date().toISOString();
            }
          });
        }
        saveDB(db);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // DELETE
    if (normalizedSql.match(/^DELETE/i)) {
      const tableMatch = normalizedSql.match(/FROM\s+([a-z_]+)/i);
      const table = tableMatch![1];
      const whereIdMatch = normalizedSql.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
      if (whereIdMatch) {
        const initialLen = db[table].length;
        db[table] = db[table].filter((i: any) => i.id != params[parseInt(whereIdMatch[1]) - 1]);
        saveDB(db);
        return { rows: [], rowCount: initialLen - db[table].length };
      }
    }

    return { rows: [], rowCount: 0 };
  } catch (e) {
    console.error(`[LocalDB] Query Error: ${sql}`, e);
    throw e;
  }
}


/**
 * High-level Data Access Functions
 */
export async function getAll(table: string): Promise<any[]> {
  if (pool) {
    const res = await pool.query(`SELECT * FROM ${table}`);
    return res.rows;
  }
  const db = loadDB();
  return db[table] || [];
}

export async function getById(table: string, id: number | string): Promise<any | undefined> {
  if (pool) {
    const res = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return res.rows[0];
  }
  const db = loadDB();
  return (db[table] || []).find((item: any) => item.id == id);
}

export async function insert(table: string, data: any): Promise<number> {
  if (pool) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const res = await pool.query(sql, values);
    return res.rows[0].id;
  }

  const db = loadDB();
  if (!db[table]) db[table] = [];
  const maxId = db[table].reduce((max: number, item: any) => Math.max(max, item.id || 0), 0);
  const newItem = { ...data, id: maxId + 1 };
  db[table].push(newItem);
  saveDB(db);
  return newItem.id;
}

export async function update(table: string, id: number | string, data: any): Promise<void> {
  if (pool) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    // Note: Some tables might not have updated_at, but we'll try or catch
    try {
      await pool.query(sql, [id, ...values]);
    } catch (e) {
      // Fallback for tables without updated_at
      const sqlPlain = `UPDATE ${table} SET ${setClause} WHERE id = $1`;
      await pool.query(sqlPlain, [id, ...values]);
    }
    return;
  }

  const db = loadDB();
  if (!db[table]) return;
  const index = db[table].findIndex((item: any) => item.id == id);
  if (index !== -1) {
    db[table][index] = { ...db[table][index], ...data };
    saveDB(db);
  }
}

export async function remove(table: string, id: number | string): Promise<void> {
  if (pool) {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return;
  }
  const db = loadDB();
  if (!db[table]) return;
  db[table] = db[table].filter((item: any) => item.id != id);
  saveDB(db);
}

export async function initializeDatabase() {
  if (pool) {
    console.log('✅ PostgreSQL Database connected');
    return;
  }
  console.log('✅ Local JSON Database initialized');
}

export default {
  query,
  getAll,
  getById,
  insert,
  update,
  remove,
  initializeDatabase,
  resetTableSequence
};

// Helper to reset sequence if out of sync
export async function resetTableSequence(table: string) {
  if (pool) {
    try {
      // Robust reset: find max ID, set sequence to max+1
      // Use pg_get_serial_sequence to be safe about sequence naming
      const query = `
        SELECT setval(
          pg_get_serial_sequence($1, 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
          false
        )
      `;
      // Check if table name is safe (simple validation)
      if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid table name");

      await pool.query(query, [table]);
      console.log(`Sequence for ${table} reset successfully.`);
    } catch (e) {
      console.error(`Failed to reset sequence for ${table}:`, e);
      // Fallback: try standard naming convention if pg_get_serial_sequence fails
      try {
        const fallbackQuery = `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`;
        await pool.query(fallbackQuery);
        console.log(`Fallback sequence reset for ${table} success.`);
      } catch (e2) {
        console.error(`Fallback reset failed for ${table}:`, e2);
      }
    }
  }
}
