import React from 'react'
import { Link } from 'react-router-dom'
import initialRules from '../data/mockRules.json'
import CSVImporter from './CSVImporter'
import SeverityChart from './SeverityChart'
import TeamAnalysis from './TeamAnalysis'
import { useEffect, useState } from 'react'

const severityClass = (s) => {
  if (s === 'High') return 'severity-high'
  if (s === 'Medium') return 'severity-medium'
  return 'severity-low'
}

export default function RuleList() {
  const [rules, setRules] = useState(() => {
    try {
      const raw = localStorage.getItem('importedRules')
      return raw ? JSON.parse(raw) : initialRules
    } catch (e) {
      return initialRules
    }
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('rules') // 'rules', 'teams', or 'fineTune'

  useEffect(() => {
    // If a pre-generated importedRules.json exists on the dev server, load it.
    let mounted = true
    fetch('/src/data/importedRules.json')
      .then((r) => {
        if (!r.ok) throw new Error('no import file')
        return r.json()
      })
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length) {
          setRules(data)
        }
      })
      .catch(() => {})

    try {
      localStorage.setItem('importedRules', JSON.stringify(rules))
    } catch (e) {}
    return () => { mounted = false }
  }, [rules])

  function handleImport(newRules) {
    setRules(newRules)
  }

  function resetToMock() {
    setRules(initialRules)
    setSearchTerm('')
    try { localStorage.removeItem('importedRules') } catch (e) {}
  }

  // Filter rules by search term
  const filteredRules = rules.filter((rule) =>
    rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Security Rules</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <CSVImporter onImport={handleImport} />
          <button onClick={resetToMock} style={{ padding: '6px 10px', borderRadius: 6 }}>Reset</button>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
        <button
          onClick={() => { setActiveTab('rules'); setSearchTerm('') }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'rules' ? '#10b981' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'rules' ? '#000' : '#e6eef8',
            cursor: 'pointer',
            fontWeight: activeTab === 'rules' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Rules
        </button>
        <button
          onClick={() => { setActiveTab('teams'); setSearchTerm('') }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'teams' ? '#10b981' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'teams' ? '#000' : '#e6eef8',
            cursor: 'pointer',
            fontWeight: activeTab === 'teams' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Team Analysis
        </button>
        <button
          onClick={() => { setActiveTab('fineTune'); setSearchTerm('') }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'fineTune' ? '#10b981' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'fineTune' ? '#000' : '#e6eef8',
            cursor: 'pointer',
            fontWeight: activeTab === 'fineTune' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Fine Tune Rules
        </button>
      </div>

      {activeTab === 'rules' ? (
        <>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 Search rules by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#e6eef8',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        {searchTerm && (
          <div style={{ marginTop: 8, fontSize: '12px', color: '#94a3b8' }}>
            Found {filteredRules.length} rule(s) matching "{searchTerm}"
          </div>
        )}
      </div>

      <SeverityChart rules={filteredRules} />

      <table className="table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Severity</th>
            <th>Trigger Count</th>
            <th>Affected Users</th>
          </tr>
        </thead>
        <tbody>
          {filteredRules.map((rule) => (
            <tr key={rule.id} className="clickable-row">
              <td>
                <Link to={`/rule/${rule.id}`} className="rule-link">
                  {rule.ruleName}
                </Link>
              </td>
              <td>
                <span className={`severity ${severityClass(rule.severity)}`}>
                  {rule.severity}
                </span>
              </td>
              <td>{rule.triggerCount}</td>
              <td>{rule.affectedUsersCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </>
      ) : activeTab === 'teams' ? (
        <TeamAnalysis rules={rules} />
      ) : (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h3 style={{ color: '#94a3b8', marginBottom: '16px' }}>🔧 Fine Tune Rules</h3>
          <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px' }}>
            Customize and optimize alarm rules with AI-powered suggestions.<br />
            <span style={{ fontSize: '12px', color: '#64748b' }}>OpenAI integration coming soon</span>
          </p>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px dashed #10b981',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              This section will allow you to fine-tune alarm rules with AI recommendations and custom thresholds.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
