import { NextRequest, NextResponse } from 'next/server';
import { getAll, update, insert, query } from '@/lib/database';

export async function GET() {
    try {
        const settings = await getAll('settings');
        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        return NextResponse.json(settingsMap);
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const updates = await request.json();
        const settings = await getAll('settings');

        for (const [key, value] of Object.entries(updates)) {
            const setting = settings.find((s: any) => s.key === key);
            if (setting) {
                await update('settings', setting.id, { value });
            } else {
                await insert('settings', { key, value, description: 'User defined setting' });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
