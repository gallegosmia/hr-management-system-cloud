import { isPostgres, query } from '@/lib/database';

let schemaReady = false;

export async function ensureUserNotificationsTable() {
    if (schemaReady) return;

    await query(`
        CREATE TABLE IF NOT EXISTS user_notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL DEFAULT 'system',
            title VARCHAR(255) NOT NULL,
            message TEXT,
            severity VARCHAR(20) DEFAULT 'medium',
            link VARCHAR(500) DEFAULT '#',
            is_read BOOLEAN DEFAULT FALSE,
            reference_id VARCHAR(255),
            reference_type VARCHAR(50),
            created_at TEXT
        )
    `);

    if (isPostgres()) {
        try {
            await query(`
                ALTER TABLE user_notifications
                ALTER COLUMN reference_id TYPE VARCHAR(255)
                USING reference_id::text
            `);
        } catch (error: any) {
            console.warn('[Notifications] Could not normalize reference_id column:', error);
        }
    }

    await query(`
        UPDATE user_notifications
        SET is_read = $1
        WHERE LOWER(CAST(is_read AS TEXT)) IN ('true', '1', 't', 'yes')
    `, [true]);

    await query(`
        UPDATE user_notifications
        SET is_read = $1
        WHERE is_read IS NULL
           OR LOWER(CAST(is_read AS TEXT)) NOT IN ('true', '1', 't', 'yes')
    `, [false]);

    schemaReady = true;
}
