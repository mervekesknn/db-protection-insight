const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

let pool;

async function getPool() {
  if (pool) return pool;

  const rawServer = process.env.DB_SERVER || '';
  let server = rawServer;
  let instanceName = process.env.DB_INSTANCE;

  if (rawServer.includes('\\')) {
    const parts = rawServer.split('\\');
    server = parts[0];
    instanceName = instanceName || parts[1];
  }

  const portRaw = parseInt(process.env.DB_PORT || '', 10);
  const port = Number.isFinite(portRaw) ? portRaw : undefined;

  pool = await sql.connect({
    server,
    database: process.env.DB_NAME,
    port,
    options: {
      trustedConnection: true,
      trustServerCertificate: true,
      instanceName
    },
    driver: 'msnodesqlv8'
  });

  console.log("MSSQL Connected");
  return pool;
}

module.exports = { sql, getPool };
