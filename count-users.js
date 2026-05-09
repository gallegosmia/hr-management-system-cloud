const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/database.sqlite');
db.all("SELECT count(*) as c FROM users", (err, rows) => {
    console.log("USERS IN SQLITE:", rows);
    db.close();
});
