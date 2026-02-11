import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const topRules = Object.entries(ruleStats)
    .map(([ruleName, data]) => ({ ruleName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topUsers = Object.entries(userStats)
    .map(([userName, data]) => ({ userName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { topRules, topUsers };
}

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(';').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(';');
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
    const ruleName = row.AlarmDetail || row.alarmDetail || row.RuleName || row.ruleName;
    if (!ruleName) return;
    if (!ruleMap[ruleName]) {
      ruleMap[ruleName] = {
        ruleName,
        users: {}
      };
    }
    const userName = row.UserName || row.userName || 'Unknown';
    if (!ruleMap[ruleName].users[userName]) {
      ruleMap[ruleName].users[userName] = {
        name: userName,
        team: row.Company || row.company || '',
        triggerCount: 0,
        systemDate: row.SystemDate || row.systemDate || '',
        activity: row.ActivityDescription || row.activityDescription || '',
        severity: row.Severity || row.severity || ''
      };
    }
    ruleMap[ruleName].users[userName].triggerCount += 1;
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
    const loadLocalCsv = async () => {
      setLoading(true);
      setError(null);
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
        setSourceInfo('Local CSV not found. Please select a CSV file.');
        setLoading(false);
      }
    };

    loadLocalCsv();
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
  if (data.topRules.length === 0 && data.topUsers.length === 0) {
    return <section className="panel"><p>Hiç veri bulunamadı. Tarih formatlarını ve verileri kontrol edin.</p></section>;
  }

  // Tarih aralığını Date objesine çevir
  const ruleStartDate = ruleStart ? new Date(ruleStart) : null;
  const ruleEndDate = ruleEnd ? new Date(ruleEnd) : null;
  const userStartDate = userStart ? new Date(userStart) : null;
  const userEndDate = userEnd ? new Date(userEnd) : null;

  // Filtrelenmiş kurallar ve kullanıcılar
  const filteredRules = data.topRules.filter(rule => {
    if (!rule.ruleName.toLowerCase().includes(ruleSearch.toLowerCase())) return false;
    // Tarih aralığına göre filtrele
    if (ruleStartDate || ruleEndDate) {
      const total = getTotalForPeriodInRange(rule.temporal, ruleStartDate, ruleEndDate);
      return total > 0;
    }
    return true;
  });
  const filteredUsers = data.topUsers.filter(user => {
    if (!user.userName.toLowerCase().includes(userSearch.toLowerCase())) return false;
    if (userStartDate || userEndDate) {
      const total = getTotalForPeriodInRange(user.temporal, userStartDate, userEndDate);
      return total > 0;
    }
    return true;
  });

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>Top 10 Rules</h3>
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
        <table className="table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th style={{ textAlign: 'right' }}>Count</th>
              <th>Grafik</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule, i) => {
              const total = (ruleStartDate || ruleEndDate)
                ? getTotalForPeriodInRange(rule.temporal, ruleStartDate, ruleEndDate)
                : Object.values(rule.temporal.daily || {}).reduce((sum, count) => sum + count, 0);
              const chartData = getChartData(rule.temporal, ruleStartDate, ruleEndDate);
              return (
                <tr key={i}>
                  <td>{rule.ruleName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#f97316' }}>{total}</td>
                  <td>
                    <div style={{ width: 120, height: 40 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                          <XAxis dataKey="date" hide={true} />
                          <YAxis hide={true} />
                          <Tooltip />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRules.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: '#aaa' }}>Kural bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* USERS SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Top 10 Users</h3>
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
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Team</th>
              <th style={{ textAlign: 'right' }}>Count</th>
              <th>Grafik</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, i) => {
              const total = (userStartDate || userEndDate)
                ? getTotalForPeriodInRange(user.temporal, userStartDate, userEndDate)
                : Object.values(user.temporal.daily || {}).reduce((sum, count) => sum + count, 0);
              const chartData = getChartData(user.temporal, userStartDate, userEndDate);
              return (
                <tr key={i}>
                  <td>{user.userName}</td>
                  <td>{user.team || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{total}</td>
                  <td>
                    <div style={{ width: 120, height: 40 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <XAxis dataKey="date" hide={true} />
                          <YAxis hide={true} />
                          <Tooltip />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>Kullanıcı bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
