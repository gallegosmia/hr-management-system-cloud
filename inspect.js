const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('data/database.sqlite');
db.serialize(() => {
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'", (err, row) => console.log('SESSIONS:', row));
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => console.log('USERS:', row));
});
