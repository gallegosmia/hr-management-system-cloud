import { NextResponse } from 'next/server';

const devtoolsEnabled =
    process.env.ENABLE_CHROME_DEVTOOLS_MANIFEST === 'true';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    if (!devtoolsEnabled) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    if (!devtoolsEnabled) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        workspace: {
            root: "/"
        }
    }, {
        headers: corsHeaders
    });
}
