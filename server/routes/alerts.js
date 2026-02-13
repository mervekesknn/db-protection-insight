const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { sql, getPool } = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalizeHeader(h) {
  return (h || '').toString().trim().toLowerCase().replace(/[_\s\-]/g, '');
}

function extractAlertName(raw) {
  const value = (raw || '').toString().trim();
  if (!value) return '';

  const labels = ['Splunk Alert Description:', 'Alert Description:'];
  const lowerValue = value.toLowerCase();
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const labelIndex = lowerValue.indexOf(label.toLowerCase());
    if (labelIndex >= 0) {
      const afterLabel = value.slice(labelIndex + label.length).trim();
      const pipeIndex = afterLabel.indexOf('|');
      return (pipeIndex >= 0 ? afterLabel.slice(0, pipeIndex) : afterLabel).trim();
    }
  }

  const pipeIndex = value.indexOf('|');
  return (pipeIndex >= 0 ? value.slice(0, pipeIndex) : value).trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const iso = dateStr.replace(' ', 'T');
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('/').map(Number);
    const [hour = 0, min = 0, sec = 0] = (timePart || '').split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, min, sec);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.').map(Number);
    const [hour = 0, min = 0] = (timePart || '').split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, min);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeRecords(records) {
  return records.map((record) => {
    const normalized = {};
    Object.keys(record).forEach((key) => {
      normalized[normalizeHeader(key)] = record[key];
    });
    return normalized;
  });
}

function getValue(row, keys, fallback = '') {
  for (let i = 0; i < keys.length; i++) {
    if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== '') {
      return row[keys[i]];
    }
  }
  return fallback;
}

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required (field name: file).' });
  }

  try {
    const raw = req.file.buffer.toString('utf8');
    const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
    const rows = normalizeRecords(records);

    if (!rows.length) {
      return res.status(400).json({ error: 'No rows found in CSV.' });
    }

    const table = new sql.Table('dbo.synthetic_alarm_logs');
    table.create = false;
    table.columns.add('UserName', sql.NVarChar(256), { nullable: true });
    table.columns.add('AlarmDetail', sql.NVarChar(512), { nullable: true });
    table.columns.add('SystemDate', sql.DateTime2, { nullable: true });
    table.columns.add('Company', sql.NVarChar(256), { nullable: true });
    table.columns.add('ActivityDescription', sql.NVarChar(sql.MAX), { nullable: true });
    table.columns.add('Severity', sql.NVarChar(64), { nullable: true });

    rows.forEach((row) => {
      const rawAlarm = getValue(row, ['alarmdetail', 'alarm', 'alarmdescription', 'activitydescription']);
      const alarmDetail = extractAlertName(rawAlarm) || rawAlarm || null;
      const systemDate = parseDate(getValue(row, ['systemdate', 'date'], ''));

      table.rows.add(
        getValue(row, ['username', 'user', 'useremail'], null),
        alarmDetail,
        systemDate,
        getValue(row, ['company', 'team'], null),
        getValue(row, ['activitydescription', 'activity', 'description'], null),
        getValue(row, ['severity'], null)
      );
    });

    const pool = await getPool();
    await pool.request().bulk(table);

    return res.json({ inserted: rows.length });
  } catch (err) {
    console.error('CSV import error:', err);
    return res.status(500).json({ error: 'CSV import failed.' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Health check failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const limitRaw = parseInt(req.query.limit || '0', 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(limitRaw, 50000)) : 0;
    const topSql = limit > 0 ? `TOP (${limit})` : '';

    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT ${topSql} UserName, AlarmDetail, SystemDate, Company, ActivityDescription, Severity
       FROM dbo.synthetic_alarm_logs
       ORDER BY SystemDate DESC`
    );

    return res.json(result.recordset || []);
  } catch (err) {
    console.error('Fetch alerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch alerts.', message: err.message || String(err) });
  }
});

module.exports = router;
