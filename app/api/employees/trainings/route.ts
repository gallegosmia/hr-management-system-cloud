import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Helper to make response serializable
const serialize = (obj: any) => {
    if (obj === undefined || obj === null) return obj;
    return JSON.parse(JSON.stringify(obj));
};

// GET - Fetch trainings and certificates for an employee
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const type = searchParams.get('type'); // 'trainings' or 'certificates'

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'certificates') {
            const result = await query(
                `SELECT * FROM employee_certificates 
                 WHERE employee_id = $1 
                 ORDER BY issue_date DESC`,
                [employeeId]
            );
            return NextResponse.json(serialize(result.rows));
        }

        // Default to trainings
        const result = await query(
            `SELECT * FROM employee_trainings 
             WHERE employee_id = $1 
             ORDER BY date_completed DESC, date_started DESC`,
            [employeeId]
        );
        return NextResponse.json(serialize(result.rows));

    } catch (error: any) {
        console.error('Fetch trainings error:', error);
        return NextResponse.json(serialize({ error: error.message }), { status: 500 });
    }
}

// POST - Add a new training or certificate
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, employee_id, ...recordData } = data;

        if (!employee_id) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'certificate') {
            const result = await query(
                `INSERT INTO employee_certificates 
                 (employee_id, certificate_name, issuing_organization, issue_date, expiry_date, certificate_number, certificate_file, status, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    employee_id,
                    recordData.certificate_name,
                    recordData.issuing_organization,
                    recordData.issue_date || null,
                    recordData.expiry_date || null,
                    recordData.certificate_number,
                    recordData.certificate_file,
                    recordData.status || 'Active',
                    recordData.remarks
                ]
            );
            return NextResponse.json(serialize(result.rows[0]));
        }

        // Default: Add training
        const result = await query(
            `INSERT INTO employee_trainings 
             (employee_id, training_name, training_type, provider, date_started, date_completed, hours_completed, certificate_number, certificate_file, status, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                employee_id,
                recordData.training_name,
                recordData.training_type,
                recordData.provider,
                recordData.date_started || null,
                recordData.date_completed || null,
                recordData.hours_completed || null,
                recordData.certificate_number,
                recordData.certificate_file,
                recordData.status || 'Completed',
                recordData.remarks
            ]
        );
        return NextResponse.json(serialize(result.rows[0]));

    } catch (error: any) {
        console.error('Add training error:', error);
        return NextResponse.json(serialize({ error: error.message }), { status: 500 });
    }
}

// PUT - Update training or certificate
export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        if (type === 'certificate') {
            const result = await query(
                `UPDATE employee_certificates SET
                 certificate_name = $1,
                 issuing_organization = $2,
                 issue_date = $3,
                 expiry_date = $4,
                 certificate_number = $5,
                 certificate_file = $6,
                 status = $7,
                 remarks = $8,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9
                 RETURNING *`,
                [
                    updateData.certificate_name || null,
                    updateData.issuing_organization || null,
                    updateData.issue_date || null,
                    updateData.expiry_date || null,
                    updateData.certificate_number || null,
                    updateData.certificate_file || null,
                    updateData.status || null,
                    updateData.remarks || null,
                    id
                ]
            );

            if (result.rowCount === 0) {
                return NextResponse.json({ error: 'Certificate record not found' }, { status: 404 });
            }

            return NextResponse.json(serialize(result.rows[0]));
        }

        // Default: Update training
        const result = await query(
            `UPDATE employee_trainings SET
             training_name = $1,
             training_type = $2,
             provider = $3,
             date_started = $4,
             date_completed = $5,
             hours_completed = $6,
             certificate_number = $7,
             certificate_file = $8,
             status = $9,
             remarks = $10,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING *`,
            [
                updateData.training_name || null,
                updateData.training_type || null,
                updateData.provider || null,
                updateData.date_started || null,
                updateData.date_completed || null,
                updateData.hours_completed || null,
                updateData.certificate_number || null,
                updateData.certificate_file || null,
                updateData.status || null,
                updateData.remarks || null,
                id
            ]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
        }

        return NextResponse.json(serialize(result.rows[0]));

    } catch (error: any) {
        console.error('Update training error:', error);
        return NextResponse.json(serialize({ error: error.message }), { status: 500 });
    }
}

// DELETE - Remove training or certificate
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        const table = type === 'certificate' ? 'employee_certificates' : 'employee_trainings';
        await query(`DELETE FROM ${table} WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete training error:', error);
        return NextResponse.json(serialize({ error: error.message }), { status: 500 });
    }
}
