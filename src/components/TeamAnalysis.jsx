import React, { useState } from 'react'

export default function TeamAnalysis({ rules }) {
  const [selectedTeam, setSelectedTeam] = useState(null)

  // Aggregate rules by team with detailed user info
  const teamData = {}

  if (!rules || rules.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
        No data available
      </div>
    )
  }

  rules.forEach((rule) => {
    if (rule.users && Array.isArray(rule.users)) {
      rule.users.forEach((user) => {
        const team = user.team || 'Unknown Team'
        if (!teamData[team]) {
          teamData[team] = {
            team,
            totalRules: 0,
            high: 0,
            medium: 0,
            low: 0,
            users: {},
            userSet: new Set()
          }
        }
        
        // Track by user
        if (!teamData[team].users[user.name]) {
          teamData[team].users[user.name] = {
            name: user.name,
            id: user.id,
            rules: []
          }
        }
        
        // Add rule to user
        teamData[team].users[user.name].rules.push({
          ruleName: rule.ruleName,
          severity: user.severity,
          date: user.systemDate,
          activity: user.activityDescription,
          triggerCount: user.triggerCount
        })
        
        teamData[team].totalRules += user.triggerCount || 1
        const sev = (user.severity || 'Low').toLowerCase()
        teamData[team][sev]++
        teamData[team].userSet.add(user.name)
      })
    }
  })

  const teams = Object.values(teamData)
    .map(t => ({
      ...t,
      userCount: t.userSet.size
    }))
    .sort((a, b) => b.totalRules - a.totalRules)

  if (teams.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
        No team data available
      </div>
    )
  }

  if (selectedTeam) {
    const team = teams.find(t => t.team === selectedTeam)
    if (!team) return null

    const users = Object.values(team.users)

    return (
      <div>
        <button
          onClick={() => setSelectedTeam(null)}
          style={{
            padding: '8px 12px',
            marginBottom: 16,
            background: '#10b981',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ← Back to Teams
        </button>

        <h3 style={{ marginBottom: 16 }}>{team.team} - {users.length} Member(s)</h3>

        {users.map((user, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 20,
              padding: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 12, color: '#10b981' }}>
              {user.name} ({user.id})
            </h4>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Severity</th>
                  <th>Triggers</th>
                  <th>Date</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {user.rules.map((rule, rIdx) => (
                  <tr key={rIdx}>
                    <td>{rule.ruleName}</td>
                    <td>
                      <span
                        style={{
                          color:
                            rule.severity === 'High'
                              ? '#ef4444'
                              : rule.severity === 'Medium'
                              ? '#f97316'
                              : '#10b981'
                        }}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td>{rule.triggerCount}</td>
                    <td style={{ fontSize: '12px' }}>{rule.date || '—'}</td>
                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {rule.activity || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Team-based Rule Analysis (Click to see members)</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Total Rules</th>
            <th style={{ color: '#ef4444' }}>High</th>
            <th style={{ color: '#f97316' }}>Medium</th>
            <th style={{ color: '#10b981' }}>Low</th>
            <th>Members</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, idx) => (
            <tr
              key={idx}
              onClick={() => setSelectedTeam(t.team)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <td style={{ fontWeight: '600', color: '#10b981' }}>{t.team}</td>
              <td>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {t.totalRules}
                </span>
              </td>
              <td>
                <span style={{ color: '#ef4444', fontWeight: '600' }}>
                  {t.high}
                </span>
              </td>
              <td>
                <span style={{ color: '#f97316', fontWeight: '600' }}>
                  {t.medium}
                </span>
              </td>
              <td>
                <span style={{ color: '#10b981', fontWeight: '600' }}>
                  {t.low}
                </span>
              </td>
              <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                {t.userCount} member(s)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
