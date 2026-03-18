import { NextResponse } from 'next/server';
import { query, isPostgres } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const sessionId = request.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { config_data } = body;

        if (!config_data) {
            return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
        }

        const configId = Number(params.id);

        if (isPostgres()) {
            const sessionQuery = await query(`
                SELECT user_id, role FROM sessions 
                JOIN users ON sessions.user_id = users.id 
                WHERE sessions.id = $1`, [sessionId]);

            if (sessionQuery.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            const user = sessionQuery.rows[0];
            if (user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'President') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const userId = user.user_id;

            // Get Old Data
            const oldConfig = await query(`SELECT config_data FROM gov_contribution_configs WHERE id = $1`, [configId]);
            if (oldConfig.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            // Update Config
            await query(
                `UPDATE gov_contribution_configs 
                 SET config_data = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 
                 WHERE id = $3`,
                [JSON.stringify(config_data), userId, configId]
            );

            // Insert Audit Log
            await query(
                `INSERT INTO gov_contribution_config_logs (config_id, action, old_data, new_data, changed_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [configId, 'UPDATE', JSON.stringify(oldConfig.rows[0].config_data), JSON.stringify(config_data), userId]
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
            const userId = user.id;

            const configIndex = db.gov_contribution_configs.findIndex((c: any) => c.id === configId);
            if (configIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const oldData = db.gov_contribution_configs[configIndex].config_data;

            db.gov_contribution_configs[configIndex].config_data = config_data;
            db.gov_contribution_configs[configIndex].updated_at = new Date().toISOString();
            db.gov_contribution_configs[configIndex].updated_by = userId;

            db.gov_contribution_config_logs = db.gov_contribution_config_logs || [];
            db.gov_contribution_config_logs.push({
                id: db.gov_contribution_config_logs.length > 0 ? Math.max(...db.gov_contribution_config_logs.map((l: any) => l.id)) + 1 : 1,
                config_id: configId,
                action: 'UPDATE',
                old_data: oldData,
                new_data: config_data,
                changed_by: userId,
                changed_at: new Date().toISOString()
            });

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Failed to update config:', error);
        return NextResponse.json({ error: 'Failed to update configuration: ' + error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const sessionId = request.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const configId = Number(params.id);

        if (isPostgres()) {
            const sessionQuery = await query(`
                SELECT user_id, role FROM sessions 
                JOIN users ON sessions.user_id = users.id 
                WHERE sessions.id = $1`, [sessionId]);

            if (sessionQuery.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            const user = sessionQuery.rows[0];
            if (user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'President') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Check if used in details
            const usageCheck = await query(`SELECT id FROM gov_contribution_details WHERE config_id_used = $1 LIMIT 1`, [configId]);
            if (usageCheck.rows.length > 0) {
                return NextResponse.json({ error: 'Cannot delete configuration. It is already attached to existing payroll reports. Adjust the rates using a new Year Effective instead.' }, { status: 400 });
            }

            await query(`DELETE FROM gov_contribution_configs WHERE id = $1`, [configId]);

        } else {
            const dbPath = path.join(process.cwd(), 'data', 'database.json');
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

            const session = (db.sessions || []).find((s: any) => s.id === sessionId);
            if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            const user = (db.users || []).find((u: any) => u.id === session.user_id);
            if (!user || (user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'President')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const usageCheck = (db.gov_contribution_details || []).find((d: any) => d.config_id_used === configId);
            if (usageCheck) {
                return NextResponse.json({ error: 'Cannot delete configuration. It is already attached to existing payroll reports. Adjust the rates using a new Year Effective instead.' }, { status: 400 });
            }

            const configIndex = db.gov_contribution_configs.findIndex((c: any) => c.id === configId);
            if (configIndex > -1) {
                db.gov_contribution_configs.splice(configIndex, 1);
            }

            // Remove logs
            if (db.gov_contribution_config_logs) {
                db.gov_contribution_config_logs = db.gov_contribution_config_logs.filter((l: any) => l.config_id !== configId);
            }

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Failed to delete config:', error);
        return NextResponse.json({ error: 'Failed to delete configuration: ' + error.message }, { status: 500 });
    }
}
