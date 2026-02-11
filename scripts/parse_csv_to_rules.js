const fs = require('fs')
const path = require('path')

function detectDelimiter(firstLine) {
  if (firstLine.indexOf('\t') >= 0) return '\t'
  if (firstLine.indexOf(';') >= 0) return ';'
  return ','
}

function splitLine(line, delim) {
  if (delim === '\t') return line.split('\t')
  // simple CSV splitter for commas/semicolons that respects quoted fields
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

function normalizeHeader(h) {
  return (h || '').toString().trim().toLowerCase().replace(/[_\s\-]/g, '')
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
    // r already has normalized headers (lower, no spaces) from parseCSV
    const ruleName = r['alarmdetail'] || r['alarm'] || r['alarmdescription'] || r['activitydescription'] || 'Unknown Rule'
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

if (process.argv.length < 3) {
  console.error('Usage: node parse_csv_to_rules.js <csvPath> [outJsonPath]')
  process.exit(2)
}

const csvPath = process.argv[2]
const outPath = process.argv[3] || path.join(__dirname, '..', 'src', 'data', 'importedRules.json')

if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath)
  process.exit(2)
}

const text = fs.readFileSync(csvPath, 'utf8')
const rows = parseCSV(text)
const rules = generateRulesFromRows(rows)

fs.writeFileSync(outPath, JSON.stringify(rules, null, 2), 'utf8')
console.log('Wrote', outPath, 'with', rules.length, 'rules')
