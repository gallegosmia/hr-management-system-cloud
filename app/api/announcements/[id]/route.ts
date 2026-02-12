import { NextResponse } from 'next/server';
import { updateAnnouncement, deleteAnnouncement } from '@/lib/data';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        await updateAnnouncement(Number(params.id), body);
        return NextResponse.json({ message: 'Announcement updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await deleteAnnouncement(Number(params.id));
        return NextResponse.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }
}
