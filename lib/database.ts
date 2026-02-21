import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
let pool: Pool | null = null;

function getPool(): Pool | null {
  if (pool) return pool;

  // let url = process.env.DATABASE_URL; // Ignore cached env
  let url = null;
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
    documents: [],
    audit_logs: [],
    sessions: [],
    education: [],
    admin_approval_queue: [],
    announcements: [],
    emergency_loans: [],
    notifications: []
  };
}

// Global Polyfill for BigInt JSON serialization
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

/**
 * Helper to make data JSON safe (handles BigInt)
 */
function safeJson(data: any) {
  if (data === undefined || data === null) return data;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    console.error('safeJson error:', e);
    return data;
  }
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
    , 2));
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
      // Improved main table detection: find the FROM that is not inside a subquery
      // This is a naive heuristic but works for our standard queries
      // We look for the 'FROM' that appears AFTER the outermost SELECT list
      let mainFromMatch = normalizedSql.match(/\s+FROM\s+([a-z0-9_]+)/i);

      // If there are subqueries in SELECT list, the first FROM might be wrong
      // We try to find the one following a top-level SELECT pattern
      const selectParts = normalizedSql.split(/\s+FROM\s+/i);
      let table = '';
      if (selectParts.length > 2) {
        // Potential subqueries. Try to find the one after the balance point of parentheses
        let parenLevel = 0;
        let pos = 0;
        const fromKeyword = ' FROM ';
        const lowerSql = normalizedSql.toUpperCase();

        while ((pos = lowerSql.indexOf(fromKeyword, pos)) !== -1) {
          // Check paren level at this position
          const beforeFrom = normalizedSql.substring(0, pos);
          const opens = (beforeFrom.match(/\(/g) || []).length;
          const closes = (beforeFrom.match(/\)/g) || []).length;
          if (opens === closes) {
            // Found a FROM at top level!
            const afterFrom = normalizedSql.substring(pos + fromKeyword.length).trim();
            const tMatch = afterFrom.match(/^([a-z0-9_]+)/i);
            if (tMatch) {
              table = tMatch[1].toLowerCase();
              break;
            }
          }
          pos += fromKeyword.length;
        }
      }

      if (!table && mainFromMatch) {
        table = mainFromMatch[1].toLowerCase();
      }

      if (!table || !db[table]) {
        return { rows: [], rowCount: 0 };
      }

      let results = [];
      // Also improve JOIN detection to skip joins inside subqueries
      let isJoin: RegExpMatchArray | null = null;
      let pos = 0;
      const joinKeyword = ' JOIN ';
      const lowerSql = normalizedSql.toUpperCase();
      while ((pos = lowerSql.indexOf(joinKeyword, pos)) !== -1) {
        const beforeJoin = normalizedSql.substring(0, pos);
        const opens = (beforeJoin.match(/\(/g) || []).length;
        const closes = (beforeJoin.match(/\)/g) || []).length;
        if (opens === closes) {
          isJoin = normalizedSql.substring(pos).match(/JOIN\s+([a-z0-9_]+)(?:\s+[a-z0-9_]+)?\s+ON/i);
          if (isJoin) break;
        }
        pos += joinKeyword.length;
      }

      if (isJoin) {
        // Simple JOIN support (attendance + employees)
        const table1 = table;
        const table2 = isJoin[1].toLowerCase();

        const data1 = db[table1] || [];
        const data2 = db[table2] || [];

        results = data1.map((item1: any) => {
          // Smart join: Find match in table2
          // Prioritize specific foreign keys over generic 'id'
          const item2 = data2.find((i: any) => {
            if (table2 === 'employees' && item1.employee_id) {
              return String(i.id) === String(item1.employee_id);
            }
            if (table1 === 'employees' && i.employee_id) {
              return String(i.employee_id) === String(item1.id);
            }
            // Fallback to simple ID match only if tables are obviously related
            return String(i.id) === String(item1.id);
          });

          if (item2) {
            // Create a merged object but BE CAREFUL with 'id'
            // The ID of the primary table (table1) should usually prevail for the row identity
            const merged = { ...item2, ...item1 };

            // Special handling for employee names and branches
            if (table2 === 'employees' || table1 === 'employees') {
              const emp = table2 === 'employees' ? item2 : item1;
              (merged as any).employee_name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
              (merged as any).branch = emp.branch || (merged as any).branch;
            }
            return merged;
          }
          return item1;
        });
      } else {
        results = [...(db[table] || [])];
      }

      const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        results = results.filter((row: any) => {
          const parts = conditions.split(/\s+AND\s+/i);
          return parts.every(part => {
            let match;
            if (match = part.match(/([a-z0-9_\.]+)\s*(>=|<=|=|>|<)\s*\$(\d+)/i)) {
              const [_, fullCol, op, paramIdx] = match;
              const col = fullCol.includes('.') ? fullCol.split('.')[1] : fullCol;
              const colVal = row[col];
              let paramVal = params[parseInt(paramIdx) - 1];

              const matchResult = (op === '=') ? (colVal == paramVal) :
                (op === '>=') ? (colVal >= paramVal) :
                  (op === '<=') ? (colVal <= paramVal) :
                    (op === '>') ? (colVal > paramVal) :
                      (op === '<') ? (colVal < paramVal) : true;

              return matchResult;
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

      return {
        rows: safeJson(results),
        rowCount: results.length
      };
    }

    if (normalizedSql.match(/^INSERT/i)) {
      const tableMatch = normalizedSql.match(/INTO\s+([a-z_]+)/i);
      const table = tableMatch![1];
      if (!db[table]) db[table] = [];

      const colsMatch = normalizedSql.match(/\((.+?)\)\s*VALUES/i);
      const columns = colsMatch![1].split(',').map(s => s.trim());

      // Find the VALUES part to extract literals vs params
      const valuesMatch = normalizedSql.match(/VALUES\s*\((.+?)\)/i);
      const valParts = valuesMatch![1].split(',').map(s => s.trim());

      const newItem: any = {};
      columns.forEach((col, idx) => {
        const valPart = valParts[idx];
        if (valPart.startsWith('$')) {
          const paramIdx = parseInt(valPart.substring(1)) - 1;
          newItem[col] = params[paramIdx];
        } else if (valPart.match(/CURRENT_TIMESTAMP/i)) {
          newItem[col] = new Date().toISOString();
        } else if (valPart.startsWith("'") && valPart.endsWith("'")) {
          newItem[col] = valPart.substring(1, valPart.length - 1);
        } else {
          // Fallback if it's a number or something else
          newItem[col] = isNaN(Number(valPart)) ? valPart : Number(valPart);
        }
      });

      if (!newItem.id) {
        const maxId = db[table].reduce((max: number, item: any) => Math.max(max, item.id || 0), 0);
        newItem.id = maxId + 1;
      }

      db[table].push(newItem);
      saveDB(db);
      // Return full item to simulate RETURNING *
      return { rows: safeJson([newItem]), rowCount: 1 };
    }

    if (normalizedSql.match(/^UPDATE/i)) {
      const tableMatch = normalizedSql.match(/UPDATE\s+([a-z_]+)/i);
      const table = tableMatch![1];
      const whereMatch = normalizedSql.match(/WHERE\s+(.+)$/i);
      if (!whereMatch) throw new Error('UPDATE must have WHERE clause');

      const conditions = whereMatch[1];
      let updatedCount = 0;
      const updatedRows: any[] = [];

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
          updatedRows.push(row);
        }
        return row;
      });

      if (updatedCount > 0) saveDB(db);
      return { rows: safeJson(updatedRows), rowCount: updatedCount };
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
  const activePool = getPool();
  if (activePool) {
    const res = await activePool.query(`SELECT * FROM ${table}`);
    return safeJson(res.rows);
  }
  const db = loadDB();
  return safeJson(db[table] || []);
}

export async function getById(table: string, id: number | string): Promise<any | undefined> {
  const activePool = getPool();
  if (activePool) {
    const res = await activePool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return safeJson(res.rows[0]);
  }
  const db = loadDB();
  return safeJson((db[table] || []).find((item: any) => String(item.id) === String(id)));
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
