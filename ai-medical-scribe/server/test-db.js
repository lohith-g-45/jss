const mysql = require('mysql2');
require('dotenv').config();

console.log('\n🔍 Testing MySQL Connection...\n');
console.log('Configuration:');
console.log('  Host:', process.env.DB_HOST);
console.log('  User:', process.env.DB_USER);
console.log('  Database:', process.env.DB_NAME);
console.log('  Port:', process.env.DB_PORT);
console.log('  Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'EMPTY');
console.log('\n');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection Failed!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('\n💡 Possible solutions:');
    console.error('1. Check if MySQL is running');
    console.error('2. Verify password in .env file');
    console.error('3. Try running this in MySQL Workbench:');
    console.error('   ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'KALAI123\';');
    console.error('   FLUSH PRIVILEGES;');
    process.exit(1);
  }
  
  console.log('✅ Connection Successful!');
  
  connection.query('SHOW TABLES', (err, results) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
    } else {
      console.log('\n📋 Tables in database:');
      results.forEach(row => console.log('  -', Object.values(row)[0]));
    }
    connection.end();
  });
});
