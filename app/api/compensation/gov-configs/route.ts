import { NextResponse } from 'next/server';
import { query, isPostgres } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const yearStr = searchParams.get('year');

        let data = [];

        if (isPostgres()) {
            let sql = `SELECT * FROM gov_contribution_configs`;
            let params = [];
            let conditions = [];

            if (type) {
                conditions.push(`type = $${params.length + 1}`);
                params.push(type);
            }
            if (yearStr) {
                conditions.push(`year_effective = $${params.length + 1}`);
                params.push(Number(yearStr));
            }

            if (conditions.length > 0) {
                sql += ` WHERE ` + conditions.join(' AND ');
            }

            sql += ` ORDER BY year_effective DESC, type ASC`;

            const result = await query(sql, params);
            data = result.rows;
        } else {
            const dbPath = path.join(process.cwd(), 'data', 'database.json');
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            data = db.gov_contribution_configs || [];

            if (type) {
                data = data.filter((c: any) => c.type === type);
            }
            if (yearStr) {
                data = data.filter((c: any) => c.year_effective === Number(yearStr));
            }
            data.sort((a: any, b: any) => {
                if (b.year_effective !== a.year_effective) return b.year_effective - a.year_effective;
                return a.type.localeCompare(b.type);
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch Gov Contribution Configs:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const sessionId = request.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { type, year_effective, config_data } = body;

        if (!type || !year_effective || !config_data) {
            return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
        }

        let newId = 0;
        let userId = null;

        if (isPostgres()) {
            // Get user from session
            const sessionQuery = await query(`
                SELECT user_id, role FROM sessions 
                JOIN users ON sessions.user_id = users.id 
                WHERE sessions.id = $1`, [sessionId]);

            if (sessionQuery.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            const user = sessionQuery.rows[0];
            if (user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'President') {
                return NextResponse.json({ error: 'Forbidden: Only HR or Admin can configure rates.' }, { status: 403 });
            }
            userId = user.user_id;

            // Check if exists
            const existing = await query(`SELECT id FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2`, [type, year_effective]);
            if (existing.rows.length > 0) {
                return NextResponse.json({ error: `Configuration for ${type} in ${year_effective} already exists.` }, { status: 400 });
            }

            // Insert Config
            const insertResult = await query(
                `INSERT INTO gov_contribution_configs (type, year_effective, config_data, updated_by)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [type, year_effective, JSON.stringify(config_data), userId]
            );
            newId = insertResult.rows[0].id;

            // Insert Audit Log
            await query(
                `INSERT INTO gov_contribution_config_logs (config_id, action, new_data, changed_by)
                 VALUES ($1, $2, $3, $4)`,
                [newId, 'CREATE', JSON.stringify(config_data), userId]
            );

        } else {
            const dbPath = path.join(process.cwd(), 'data', 'database.json');
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

            const session = (db.sessions || []).find((s: any) => s.id === sessionId);
            if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            const user = (db.users || []).find((u: any) => u.id === session.user_id);
            if (!user || (user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'President')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            userId = user.id;

            db.gov_contribution_configs = db.gov_contribution_configs || [];
            db.gov_contribution_config_logs = db.gov_contribution_config_logs || [];

            const existing = db.gov_contribution_configs.find((c: any) => c.type === type && c.year_effective === Number(year_effective));
            if (existing) {
                return NextResponse.json({ error: `Configuration for ${type} in ${year_effective} already exists.` }, { status: 400 });
            }

            newId = db.gov_contribution_configs.length > 0 ? Math.max(...db.gov_contribution_configs.map((c: any) => c.id)) + 1 : 1;

            const newConfig = {
                id: newId,
                type,
                year_effective: Number(year_effective),
                config_data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                updated_by: userId
            };

            db.gov_contribution_configs.push(newConfig);

            db.gov_contribution_config_logs.push({
                id: db.gov_contribution_config_logs.length > 0 ? Math.max(...db.gov_contribution_config_logs.map((l: any) => l.id)) + 1 : 1,
                config_id: newId,
                action: 'CREATE',
                old_data: null,
                new_data: config_data,
                changed_by: userId,
                changed_at: new Date().toISOString()
            });

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        }

        return NextResponse.json({ success: true, id: newId }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create config:', error);
        return NextResponse.json({ error: 'Failed to create configuration: ' + error.message }, { status: 500 });
    }
}
