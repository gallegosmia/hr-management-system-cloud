import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export default async function Page() {
    let result = "Testing...";

    try {
        // Create a dedicated pool right here in the page to ensure fresh config
        const forcedPool = new Pool({
            connectionString: "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        const res = await forcedPool.query("SELECT NOW()");
        result = "SUCCESS via aws-0 pooler! Time: " + JSON.stringify(res.rows[0]);
        await forcedPool.end();

    } catch (e: any) {
        result = "FAILED: " + e.message + " | Host: " + (e.address || e.hostname);
    }

    return (
        <div className="p-10 font-mono text-xl">
            <h1>Test Connection 2</h1>
            <p>{result}</p>
        </div>
    );
}
