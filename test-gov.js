const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hrms',
    password: 'admin',
    port: 5432,
});

pool.query('SELECT id, type, year_effective FROM gov_contribution_configs').then(res => {
    console.log(res.rows);
    pool.end();
}).catch(err => {
    console.error(err);
    pool.end();
});
