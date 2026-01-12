import { Pool } from 'pg';
import { hashPassword } from './auth';

// Database connection configuration
// In production, use DATABASE_URL from .env
const pool = new Pool({
  // In production, prioritize the environment variable. Fallback to pooler connection for local/dev.
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false }
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Generic database operations
export async function getAll(table: string): Promise<any[]> {
  const res = await query(`SELECT * FROM ${table} ORDER BY id ASC`);
  return res.rows;
}

export async function getById(table: string, id: number): Promise<any | undefined> {
  const res = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return res.rows[0];
}

export async function insert(table: string, data: any): Promise<number> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;

  const res = await query(sql, values);
  return res.rows[0].id;
}

export async function update(table: string, id: number, data: any): Promise<void> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause}, last_updated = CURRENT_TIMESTAMP WHERE id = $1`;

  await query(sql, [id, ...values]);
}

export async function remove(table: string, id: number): Promise<void> {
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

// Initialize database with default admin
export async function initializeDatabase() {
  try {
    // Check if admin exists
    const res = await query("SELECT * FROM users WHERE username = 'admin'");

    if (res.rows.length === 0) {
      const hashedPassword = hashPassword('admin123');
      await query(
        "INSERT INTO users (username, password, role, is_active) VALUES ($1, $2, $3, $4)",
        ['admin', hashedPassword, 'Admin', 1]
      );
      console.log('✅ Default admin user created in PostgreSQL');
    }

    // Check if default settings exist
    const settingsCount = await query("SELECT COUNT(*) FROM settings");
    if (parseInt(settingsCount.rows[0].count) === 0) {
      const defaultSettings = [
        { key: 'company_name', value: JSON.stringify('Melann Lending Investor Corp.'), description: 'Company Name' },
        { key: 'attendance_cutoff', value: JSON.stringify('09:00'), description: 'Attendance Cutoff' },
        { key: 'default_password', value: JSON.stringify('welcome123'), description: 'Default Password' }
      ];

      for (const setting of defaultSettings) {
        await query(
          "INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)",
          [setting.key, setting.value, setting.description]
        );
      }
      console.log('✅ Default settings initialized');
    }

    console.log('✅ PostgreSQL Database fully initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    // In a real scenario, we might want to check the connection first
  }
}

export default {
  query,
  getAll,
  getById,
  insert,
  update,
  remove,
  initializeDatabase
};
