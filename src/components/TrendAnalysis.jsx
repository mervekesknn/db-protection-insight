import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

function parseDate(dateStr) {
  if (!dateStr) return null;
  // ISO: 2026-01-15 11:46:34.073 veya 2026-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const iso = dateStr.replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      console.warn('parseDate: Geçersiz ISO tarih:', dateStr);
      return null;
    }
    return d;
  }
  // yyyy/MM/dd
  if (/^\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('/').map(Number);
    const [hour = 0, min = 0, sec = 0] = (timePart || '').split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, min, sec);
    if (isNaN(d.getTime())) {
      console.warn('parseDate: Geçersiz yyyy/MM/dd tarih:', dateStr);
      return null;
    }
    return d;
  }
  // dd.MM.yyyy
  if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.').map(Number);
    const [hour = 0, min = 0] = (timePart || '').split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, min);
    if (isNaN(d.getTime())) {
      console.warn('parseDate: Geçersiz dd.MM.yyyy tarih:', dateStr);
      return null;
    }
    return d;
  }
  // fallback
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.warn('parseDate: Geçersiz fallback tarih:', dateStr);
    return null;
  }
  return d;
}

function analyzeData(rules) {
  const ruleStats = {};
  const userStats = {};
  let userCount = 0;
  let ruleCount = 0;
  rules.forEach((rule) => {
    ruleCount++;
    if (!ruleStats[rule.ruleName]) {
      ruleStats[rule.ruleName] = { count: 0, temporal: { daily: {}, weekly: {}, monthly: {} } };
    }
    rule.users.forEach((user) => {
      userCount++;
      ruleStats[rule.ruleName].count += user.triggerCount;
      if (!userStats[user.name]) {
        userStats[user.name] = { count: 0, team: user.team, temporal: { daily: {}, weekly: {}, monthly: {} } };
      }
      userStats[user.name].count += user.triggerCount;
      const dateObj = parseDate(user.systemDate);
      if (dateObj) {
        ['daily', 'weekly', 'monthly'].forEach((period) => {
          const key = period === 'daily'
            ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
            : period === 'weekly'
            ? `${dateObj.getFullYear()}-W${String(Math.ceil(((dateObj - new Date(dateObj.getFullYear(), 0, 1)) / 86400000 + new Date(dateObj.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`
            : `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          ruleStats[rule.ruleName].temporal[period][key] = (ruleStats[rule.ruleName].temporal[period][key] || 0) + user.triggerCount;
          userStats[user.name].temporal[period][key] = (userStats[user.name].temporal[period][key] || 0) + user.triggerCount;
        });
      } else {
        console.warn('analyzeData: Kullanıcı tarihi parse edilemedi:', user.systemDate);
      }
    });
  });
  console.log('analyzeData: ruleCount', ruleCount, 'userCount', userCount);
  const ruleList = Object.entries(ruleStats)
    .map(([ruleName, data]) => ({ ruleName, ...data }));
  const userList = Object.entries(userStats)
    .map(([userName, data]) => ({ userName, ...data }));
  return { rules: ruleList, users: userList };
}

function detectDelimiter(firstLine) {
  if (firstLine.indexOf('\t') >= 0) return '\t';
  if (firstLine.indexOf(';') >= 0) return ';';
  return ',';
}

function splitLine(line, delim) {
  if (delim === '\t') return line.split('\t');
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delim && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function normalizeHeader(h) {
  return (h || '').toString().trim().toLowerCase().replace(/[_\s\-]/g, '');
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const normalized = {};
    Object.keys(row || {}).forEach((key) => {
      normalized[normalizeHeader(key)] = row[key];
    });
    return normalized;
  });
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

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const delim = detectDelimiter(lines[0]);
  const headersRaw = splitLine(lines[0], delim);
  const headers = headersRaw.map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cols = splitLine(line, delim);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });
    return row;
  });
}

function buildRulesFromRows(rows) {
  const ruleMap = {};
  rows.forEach((row) => {
    const rawRuleName = row.alarmdetail || row.alarm || row.alarmdescription || row.activitydescription || row.rulename;
    const ruleName = extractAlertName(rawRuleName) || 'Unknown Rule';
    if (!ruleMap[ruleName]) {
      ruleMap[ruleName] = {
        ruleName,
        users: {}
      };
    }
    const userName = row.username || row.user || row.useremail || 'Unknown';
    if (!ruleMap[ruleName].users[userName]) {
      ruleMap[ruleName].users[userName] = {
        name: userName,
        team: row.company || row.team || '',
        triggerCount: 0,
        systemDate: row.systemdate || row.date || '',
        activity: row.activitydescription || row.activity || row.description || '',
        severity: row.severity || ''
      };
    }
    const count = parseInt(row.count || row.triggercount || row.occurrences || '1', 10) || 1;
    ruleMap[ruleName].users[userName].triggerCount += count;
  });
  return Object.values(ruleMap).map((rule) => ({
    ...rule,
    users: Object.values(rule.users)
  }));
}

function getTotalForPeriod(temporal, period) {
  return Object.values(temporal[period] || {}).reduce((sum, count) => sum + count, 0);
}

function getTotalForPeriodInRange(temporal, start, end) {
  // temporal: { daily: {dateKey: count}, ... }
  let total = 0;
  Object.entries(temporal.daily || {}).forEach(([dateKey, count]) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if ((!start || d >= start) && (!end || d <= end)) {
      total += count;
    }
  });
  return total;
}

function getChartData(temporal, start, end) {
  // Tarih aralığındaki günlük tetiklenme sayılarını diziye çevir
  const data = [];
  Object.entries(temporal.daily || {}).forEach(([dateKey, count]) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if ((!start || d >= start) && (!end || d <= end)) {
      data.push({ date: dateKey, count });
    }
  });
  // Tarihe göre sırala
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return data;
}

export default function TrendAnalysis() {
  const [rules, setRules] = useState([]);
  const [data, setData] = useState(null);
  const [ruleSearch, setRuleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [ruleStart, setRuleStart] = useState('');
  const [ruleEnd, setRuleEnd] = useState('');
  const [userStart, setUserStart] = useState('');
  const [userEnd, setUserEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceInfo, setSourceInfo] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadFromBackend = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:4000/alerts');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const records = await res.json();
        if (cancelled) return true;
        if (!Array.isArray(records)) throw new Error('Unexpected backend response');
        const rows = normalizeRows(records);
        setRules(buildRulesFromRows(rows));
        setSourceInfo('Backend SQL loaded from /alerts');
        setLoading(false);
        return true;
      } catch (err) {
        return false;
      }
    };

    const loadLocalCsv = async () => {
      try {
        const res = await fetch('/DAM_Alerts_v2.csv');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const text = await res.text();
        if (cancelled) return;
        const rows = parseCsvText(text);
        setRules(buildRulesFromRows(rows));
        setSourceInfo('Local CSV loaded from /DAM_Alerts_v2.csv');
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setSourceInfo('Backend unavailable and local CSV not found. Please select a CSV file.');
        setLoading(false);
      }
    };

    const loadData = async () => {
      const loaded = await loadFromBackend();
      if (!loaded) await loadLocalCsv();
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = parseCsvText(text);
        setRules(buildRulesFromRows(rows));
        setSourceInfo(`Local CSV loaded: ${file.name}`);
        setLoading(false);
      } catch (err) {
        setError('CSV parse hatası: ' + err.message);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('CSV okuma hatası');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (rules.length) {
      const result = analyzeData(rules);
      setData(result);
    }
  }, [rules]);

  if (loading) return <section className="panel"><p>Yükleniyor...</p></section>;
  if (error) return <section className="panel"><p style={{color:'red'}}>{error}</p></section>;
  if (!data) return (
    <section className="panel">
      <h2>Alarm Trends</h2>
      <p style={{ color: '#94a3b8' }}>{sourceInfo || 'CSV yüklenmedi.'}</p>
      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
      </div>
    </section>
  );
  if (data.rules.length === 0 && data.users.length === 0) {
    return <section className="panel"><p>Hiç veri bulunamadı. Tarih formatlarını ve verileri kontrol edin.</p></section>;
  }

  // Tarih aralığını Date objesine çevir
  const ruleStartDate = ruleStart ? new Date(ruleStart) : null;
  const ruleEndDate = ruleEnd ? new Date(ruleEnd) : null;
  const userStartDate = userStart ? new Date(userStart) : null;
  const userEndDate = userEnd ? new Date(userEnd) : null;

  // Filtrelenmiş kurallar ve kullanıcılar
  const filteredRules = data.rules
    .map((rule) => {
      const total = (ruleStartDate || ruleEndDate)
        ? getTotalForPeriodInRange(rule.temporal, ruleStartDate, ruleEndDate)
        : getTotalForPeriod(rule.temporal, 'daily');
      return { ...rule, total };
    })
    .filter((rule) => {
      if (!rule.ruleName.toLowerCase().includes(ruleSearch.toLowerCase())) return false;
      if (ruleStartDate || ruleEndDate) return rule.total > 0;
      return true;
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const filteredUsers = data.users
    .map((user) => {
      const total = (userStartDate || userEndDate)
        ? getTotalForPeriodInRange(user.temporal, userStartDate, userEndDate)
        : getTotalForPeriod(user.temporal, 'daily');
      return { ...user, total };
    })
    .filter((user) => {
      if (!user.userName.toLowerCase().includes(userSearch.toLowerCase())) return false;
      if (userStartDate || userEndDate) return user.total > 0;
      return true;
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const ruleChartData = filteredRules.map((rule) => ({
    name: rule.ruleName,
    count: rule.total
  }));

  const userChartData = filteredUsers.map((user) => ({
    name: user.userName,
    count: user.total
  }));

  const ruleTitle = (ruleStartDate || ruleEndDate) ? 'Filtered Top 10 Rules' : 'Top 10 Rules';
  const userTitle = (userStartDate || userEndDate) ? 'Filtered Top 10 Users' : 'Top 10 Users';

  return (
    <section className="panel">
      <h2>Alarm Trends</h2>
      {sourceInfo && (
        <p style={{ color: '#94a3b8', marginTop: '-4px', marginBottom: '12px' }}>
          {sourceInfo}
        </p>
      )}
      {/* ALARMS SECTION */}
      <div style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{ruleTitle}</h3>
        </div>
        {/* Rule Name Search */}
        <input
          type="text"
          placeholder="Rule Name ile ara..."
          value={ruleSearch}
          onChange={e => setRuleSearch(e.target.value)}
          style={{
            marginBottom: '8px',
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '100%',
            fontSize: '14px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="date"
            value={ruleStart}
            onChange={e => setRuleStart(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="Başlangıç tarihi"
          />
          <input
            type="date"
            value={ruleEnd}
            onChange={e => setRuleEnd(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="Bitiş tarihi"
          />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule, i) => (
                  <tr key={i}>
                    <td>{rule.ruleName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#f97316' }}>{rule.total}</td>
                  </tr>
                ))}
                {filteredRules.length === 0 && (
                  <tr><td colSpan={2} style={{ textAlign: 'center', color: '#aaa' }}>Kural bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ width: 320, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Grafik</div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ruleChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide={true} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" fill="#e2e8f0" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      {/* USERS SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{userTitle}</h3>
        </div>
        {/* User Search */}
        <input
          type="text"
          placeholder="Kullanıcı adı ile ara..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          style={{
            marginBottom: '8px',
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '100%',
            fontSize: '14px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="date"
            value={userStart}
            onChange={e => setUserStart(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="Başlangıç tarihi"
          />
          <input
            type="date"
            value={userEnd}
            onChange={e => setUserEnd(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="Bitiş tarihi"
          />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, i) => (
                  <tr key={i}>
                    <td>{user.userName}</td>
                    <td>{user.team || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{user.total}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#aaa' }}>Kullanıcı bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ width: 320, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Grafik</div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide={true} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" fill="#e2e8f0" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
