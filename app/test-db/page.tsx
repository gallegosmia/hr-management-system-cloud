import { getAll, query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function Page() {
    let dbStatus = "Checking...";
    let errorDetail = "";
    let envVar = process.env.DATABASE_URL ? "Set (Hidden)" : "Missing";
    let hardcoded = "Used in fallback";
    let userCount = "Unknown";
    let adminExists = "Unknown";

    try {
        const test = await query("SELECT NOW()");
        dbStatus = "Connected! Time: " + JSON.stringify(test.rows[0]);

        const users = await getAll('users');
        userCount = users.length.toString();

        const admin = users.find((u: any) => u.username === 'admin');
        adminExists = admin ? "Yes" : "No";

    } catch (e: any) {
        dbStatus = "Connection Failed";
        errorDetail = e.message + " | Code: " + e.code + " | Host: " + (e.address || e.hostname);
    }

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Diagnostics</h1>
            <div className="space-y-2">
                <p><strong>DB Status:</strong> {dbStatus}</p>
                {errorDetail && <p className="text-red-500 bg-red-100 p-2"><strong>Error:</strong> {errorDetail}</p>}
                <p><strong>Environment Var:</strong> {envVar}</p>
                <p><strong>User Count:</strong> {userCount}</p>
                <p><strong>Admin Exists:</strong> {adminExists}</p>
            </div>
        </div>
    );
}
