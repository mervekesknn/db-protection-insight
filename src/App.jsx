import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import RuleList from './components/RuleList'
import RuleDetail from './components/RuleDetail'
import TrendAnalysis from './components/TrendAnalysis'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Database Protection Insights — V1</h1>
        </div>
        <nav>
          <Link to="/">Rules</Link>
          <Link to="/trends">Trends</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<RuleList />} />
          <Route path="/rule/:id" element={<RuleDetail />} />
          <Route path="/trends" element={<TrendAnalysis />} />
        </Routes>
      </main>

      <footer className="footer">Lightweight insight dashboard — V1</footer>
    </div>
  )
}
