// Basit Express API - SQL Server'dan alarm verisi çeker
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const app = express();
app.use(cors());
app.use(express.json());

// SQL Server bağlantı ayarları
const config = {
  server: 'localhost', // veya 'DESKTOP-H3RKH5B' da kullanılabilir
  database: 'SyntheticSecurityDB',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: {
    encrypt: false, // local için
    trustServerCertificate: true,
    port: 1433 // instanceName yerine port kullanılıyor
  }
};

const CSV_PATH = process.env.ALERTS_CSV_PATH || 'C:\\Users\\Merve Sena Keskin\\Desktop\\DAM_Alerts_v2.csv';

app.get('/api/alarms', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT TOP 1000 UserName, AlarmDetail, SystemDate, Company, ActivityDescription, Severity FROM dbo.synthetic_alarm_logs ORDER BY SystemDate DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error('SQL error:', err);
    res.status(500).json({ error: 'SQL error', details: err.message });
  }
});

app.get('/api/alarms-csv', (req, res) => {
  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf8');
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      trim: true
    });
    res.json(records);
  } catch (err) {
    console.error('CSV error:', err);
    res.status(500).json({ error: 'CSV error', details: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
