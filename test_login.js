const dbOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'aim19', password: 'password123' })
};

async function testLogin() {
    // using direct db access to bypass fetch
    const db = require('./lib/database').default;
    await db.initializeDatabase();
    console.log("DB Postgres?", db.isPostgres());
    try {
        const users = await db.getAll('users');
        const user = users.find(u => u.username === 'aim19');
        console.log("Found user?", !!user, user?.id, typeof user?.id);
        
        await db.update('users', user.id, { last_login: new Date().toISOString() });
        console.log("Update success!");
    } catch(e) {
        console.error("ERROR:", e);
    }
}
testLogin();
