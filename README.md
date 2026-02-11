# DB Protection Insights — V1

Minimal React + Vite dashboard showing database security rules and users who triggered them.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Project structure

- `src/components/RuleList.jsx` — shows table of rules
- `src/components/RuleDetail.jsx` — shows users for a selected rule
- `src/data/mockRules.json` — mock data
- `src/App.jsx` — routes and layout

Notes

- No backend or auth. Static mock data only.
- Keeps UI minimal and focused on security analyst readability.
