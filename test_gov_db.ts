import { query } from './lib/database';
query('SELECT * FROM gov_contribution_configs').then(res => console.log(res.rows)).catch(console.error);
