const bcrypt = require('bcryptjs');

const hash = "$2a$10$ARKzzaNPeiJrMWFyS9TEueMmJA1O/b/72AVBdPp0a/ccsDGJtsOs.";
console.log("admin123:", bcrypt.compareSync("admin123", hash));
console.log("password:", bcrypt.compareSync("password", hash));
console.log("superadmin123:", bcrypt.compareSync("superadmin123", hash));
console.log("admin:", bcrypt.compareSync("admin", hash));
