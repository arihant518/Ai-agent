import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "csv_db 6",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;



// import Database from "better-sqlite3";

// const db = new Database("database.db");

// db.prepare(`
// CREATE TABLE IF NOT EXISTS bookings (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   name TEXT,
//   car TEXT,
//   price INTEGER
// )
// `).run();

// // clear old data
// db.prepare("DELETE FROM bookings").run();

// // insert fresh data
// db.prepare(`
// INSERT INTO bookings (name, car, price)
// VALUES
// ('Rahul','Swift',800000),
// ('Amit','Baleno',600000),
// ('Arihant','Brezza',1000000),
// ('Sumit','Alto',400000)
// `).run();

// export default db;