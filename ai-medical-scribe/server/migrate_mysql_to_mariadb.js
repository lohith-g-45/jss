const mysql = require('mysql2/promise');

async function migrate() {
  const source = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'KALAI123',
    database: 'medicalscribe',
    multipleStatements: true,
  });

  const targetAdmin = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    multipleStatements: true,
  });

  await targetAdmin.query('DROP DATABASE IF EXISTS medicalscribe');
  await targetAdmin.query('CREATE DATABASE medicalscribe');
  await targetAdmin.end();

  const target = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'medicalscribe',
    multipleStatements: true,
  });

  const [tables] = await source.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'medicalscribe' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );

  await target.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const row of tables) {
    const table = row.table_name || row.TABLE_NAME;
    if (!table) {
      continue;
    }

    const [createRows] = await source.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRows[0]['Create Table'];

    await target.query(`DROP TABLE IF EXISTS \`${table}\``);
    await target.query(createSql);

    const [data] = await source.query(`SELECT * FROM \`${table}\``);
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const colSql = columns.map((c) => `\`${c}\``).join(', ');
      const placeholders = `(${columns.map(() => '?').join(', ')})`;
      const insertSql = `INSERT INTO \`${table}\` (${colSql}) VALUES ${placeholders}`;

      for (const record of data) {
        const values = columns.map((c) => record[c]);
        await target.query(insertSql, values);
      }
    }

    console.log(`Migrated table ${table}: ${data.length} rows`);
  }

  await target.query('SET FOREIGN_KEY_CHECKS = 1');

  const [pc] = await target.query('SELECT COUNT(*) AS count FROM patients');
  const [cc] = await target.query('SELECT COUNT(*) AS count FROM consultations');
  console.log(`patients=${pc[0].count}, consultations=${cc[0].count}`);

  await source.end();
  await target.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
