import React from 'react'

function detectDelimiter(firstLine) {
  if (firstLine.indexOf('\t') >= 0) return '\t'
  if (firstLine.indexOf(';') >= 0) return ';'
  return ','
}

function splitLine(line, delim) {
  if (delim === '\t') return line.split('\t')
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === delim && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result.map((s) => s.trim())
}

function normalizeHeader(h) { return (h||'').toString().trim().toLowerCase().replace(/[_\s\-]/g,'') }

function extractAlertName(raw) {
  const value = (raw || '').toString().trim()
  if (!value) return ''

  const labels = ['Splunk Alert Description:', 'Alert Description:']
  const lowerValue = value.toLowerCase()
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const labelIndex = lowerValue.indexOf(label.toLowerCase())
    if (labelIndex >= 0) {
      const afterLabel = value.slice(labelIndex + label.length).trim()
      const pipeIndex = afterLabel.indexOf('|')
      return (pipeIndex >= 0 ? afterLabel.slice(0, pipeIndex) : afterLabel).trim()
    }
  }

  const pipeIndex = value.indexOf('|')
  return (pipeIndex >= 0 ? value.slice(0, pipeIndex) : value).trim()
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  const delim = detectDelimiter(lines[0])
  const headersRaw = splitLine(lines[0], delim)
  const headers = headersRaw.map(normalizeHeader)
  const rows = lines.slice(1).map((l) => {
    const parts = splitLine(l, delim)
    const obj = {}
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = parts[i] || ''
    return obj
  })
  return rows
}

function generateRulesFromRows(rows) {
  const ruleMap = new Map()

  rows.forEach((r) => {
    const rawRuleName = r['alarmdetail'] || r['alarm'] || r['alarmdescription'] || r['activitydescription'] || 'Unknown Rule'
    const ruleName = extractAlertName(rawRuleName) || 'Unknown Rule'
    const user = r['username'] || r['user'] || r['useremail'] || 'unknown'
    const team = r['company'] || r['team'] || ''
    const systemDate = r['systemdate'] || r['date'] || ''
    const activityDescription = r['activitydescription'] || r['activity'] || r['description'] || ''
    const severityRaw = (r['severity'] || 'Low').toString().trim()
    const severity = severityRaw.charAt(0).toUpperCase() + severityRaw.slice(1)
    const count = parseInt(r['count'] || r['triggercount'] || r['occurrences'] || '1', 10) || 1

    if (!ruleMap.has(ruleName)) {
      ruleMap.set(ruleName, { ruleName, severity, triggerCount: 0, users: new Map() })
    }

    const entry = ruleMap.get(ruleName)
    entry.triggerCount += count

    const u = entry.users.get(user) || { id: user, name: user, team: team, systemDate: '', activityDescription: '', severity: '', triggerCount: 0 }
    u.triggerCount += count
    u.team = team || u.team
    u.systemDate = systemDate || u.systemDate
    u.activityDescription = activityDescription || u.activityDescription
    u.severity = severity || u.severity
    entry.users.set(user, u)
  })

  const rules = []
  let idx = 1
  for (const [k, v] of ruleMap.entries()) {
    const users = Array.from(v.users.values())
    rules.push({
      id: `imported-${idx}`,
      ruleName: v.ruleName,
      severity: v.severity || 'Low',
      triggerCount: v.triggerCount,
      affectedUsersCount: users.length,
      users,
    })
    idx++
  }

  return rules
}

export default function CSVImporter({ onImport }) {
  async function handleFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCSV(text)
    const rules = generateRulesFromRows(rows)
    onImport(rules)
  }

  return (
    <label style={{display:'inline-flex',alignItems:'center',gap:8}}>
      <input type="file" accept="text/csv" onChange={handleFile} style={{display:'inline-block'}} />
    </label>
  )
}
