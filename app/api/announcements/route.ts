import { NextResponse } from 'next/server';
import { getAnnouncements, createAnnouncement } from '@/lib/data';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch') || undefined;
    const department = searchParams.get('department') || undefined;
    const is_active = searchParams.get('is_active') === 'false' ? false : true;
    const employee_id = searchParams.get('employee_id') ? parseInt(searchParams.get('employee_id')!) : undefined;

    try {
        const announcements = await getAnnouncements({ branch, department, is_active, employee_id });
        return NextResponse.json(announcements);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = await createAnnouncement(body);
        return NextResponse.json({ id, message: 'Announcement created successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }
}
