import React from 'react'

export default function SeverityChart({ rules }) {
  // Count rules by severity
  const severityCounts = {
    High: 0,
    Medium: 0,
    Low: 0
  }

  if (!rules || rules.length === 0) {
    return null
  }

  rules.forEach((rule) => {
    const sev = rule.severity || 'Low'
    if (severityCounts.hasOwnProperty(sev)) {
      severityCounts[sev]++
    }
  })

  const total = severityCounts.High + severityCounts.Medium + severityCounts.Low
  const highPct = total > 0 ? Math.round((severityCounts.High / total) * 100) : 0
  const mediumPct = total > 0 ? Math.round((severityCounts.Medium / total) * 100) : 0
  const lowPct = total > 0 ? Math.round((severityCounts.Low / total) * 100) : 0

  return (
    <div style={{ marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: 20, marginTop: 0 }}>Alarm Distribution by Severity</h3>
      
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* High Severity */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: '#ef4444' }}>High</strong>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {severityCounts.High}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${highPct}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>{highPct}%</div>
        </div>

        {/* Medium Severity */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: '#f97316' }}>Medium</strong>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>
              {severityCounts.Medium}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${mediumPct}%`, height: '100%', background: '#f97316', transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>{mediumPct}%</div>
        </div>

        {/* Low Severity */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: '#10b981' }}>Low</strong>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {severityCounts.Low}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${lowPct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>{lowPct}%</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
        Total Rules: {total}
      </div>
    </div>
  )
}
