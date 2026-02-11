import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import initialRules from '../data/mockRules.json'

export default function RuleDetail() {
  const { id } = useParams()
  const [rule, setRule] = useState(null)

  useEffect(() => {
    const getRules = async () => {
      try {
        const raw = localStorage.getItem('importedRules')
        if (raw) {
          const rules = JSON.parse(raw)
          const found = rules.find((r) => String(r.id) === String(id))
          if (found) {
            setRule(found)
            return
          }
        }
      } catch (e) {}

      // fallback to mockRules
      const found = initialRules.find((r) => String(r.id) === String(id))
      setRule(found || null)
    }

    getRules()
  }, [id])

  if (!rule) {
    return (
      <section className="panel">
        <h2>Rule not found</h2>
        <p>
          <Link to="/">Back to rules</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="detail-header">
        <h2>{rule.ruleName}</h2>
        <div>
          <Link to="/">← Back to rules</Link>
        </div>
      </div>

      <p>
        <strong>Severity:</strong> {rule.severity} • <strong>Triggers:</strong>{' '}
        {rule.triggerCount} • <strong>Affected users:</strong>{' '}
        {rule.affectedUsersCount}
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Team</th>
            <th>System Date</th>
            <th>Activity Description</th>
            <th>Severity</th>
            <th>Trigger Count</th>
          </tr>
        </thead>
        <tbody>
          {rule.users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.team}</td>
              <td>{u.systemDate || '—'}</td>
              <td>{u.activityDescription || '—'}</td>
              <td>{u.severity || '—'}</td>
              <td>{u.triggerCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
