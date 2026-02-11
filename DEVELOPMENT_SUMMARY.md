# Database Protection Insight Platform — V1 Development Summary

**Date:** January 29, 2026  
**Status:** Working prototype with CSV import capability  
**Technology:** React 18 + Vite + React Router

---

## Project Overview

A lightweight security dashboard for database protection rules. Displays rules triggered, affected users, and detailed activity logs per user. No backend, no authentication—static mock data + CSV import only.

---

## Architecture

### Components
1. **RuleList** (`src/components/RuleList.jsx`)
   - Displays all security rules in table format
   - Shows: Rule Name, Severity (color-coded), Trigger Count, Affected Users
   - CSV file upload via `CSVImporter`
   - Severity color coding: Red (High), Orange (Medium), Green (Low)
   - State persisted to browser localStorage
   - Loads pre-generated `importedRules.json` on startup if available

2. **RuleDetail** (`src/components/RuleDetail.jsx`)
   - Shows users who triggered a selected rule
   - Displays per-user details:
     - **User** (UserName)
     - **Team** (Company)
     - **System Date** (timestamp)
     - **Activity Description** (activity logged)
     - **Severity** (individual user severity)
     - **Trigger Count** (per user)
   - Loads from localStorage or falls back to mock data

3. **CSVImporter** (`src/components/CSVImporter.jsx`)
   - File input for browser-based CSV upload
   - Flexible CSV parsing (detects comma, semicolon, tab delimiters)
   - Normalizes header names (case-insensitive, ignores whitespace/underscores)
   - Converts CSV rows to rules JSON structure

### Data Flow
```
Desktop CSV File
    ↓
Node.js Parser (scripts/parse_csv_to_rules.js)
    ↓
src/data/importedRules.json
    ↓
Vite Dev Server (localhost:5173)
    ↓
RuleList (fetches on mount) → localStorage
    ↓
RuleDetail (loads from localStorage/mock)
    ↓
Browser UI (6-column table per rule)
```

---

## Data Structure

### Rule Object
```json
{
  "id": "imported-1",
  "ruleName": "ATLAS Kritik Objeler",
  "severity": "High",
  "triggerCount": 5,
  "affectedUsersCount": 1,
  "users": [
    {
      "id": "keskinme",
      "name": "keskinme",
      "team": "Veri Güvenliği Yönetimi",
      "systemDate": "23.06.2026 19:46",
      "activityDescription": "Deneme1 amacılıdır.",
      "severity": "High",
      "triggerCount": 5
    }
  ]
}
```

### CSV Column Mapping
| CSV Column | Parsed As | Rule Field | User Field |
|------------|-----------|-----------|-----------|
| `AlarmDetail` / `Alarm` | Rule name | `ruleName` | — |
| `UserName` / `User` | User identifier | — | `name`, `id` |
| `Company` / `Team` | User's organization | — | `team` |
| `SystemDate` / `Date` | Timestamp | — | `systemDate` |
| `ActivityDescription` / `Activity` | Activity details | — | `activityDescription` |
| `Severity` | Alert level | `severity` | `severity` |
| `Count` / `TriggerCount` | Event count | `triggerCount` | `triggerCount` |

**Note:** Parser is flexible and normalizes header names (case, spaces, underscores).

---

## File Structure
```
C:\workspace/
├── package.json                    # Dependencies, scripts
├── index.html                      # Entry point
├── src/
│   ├── main.jsx                    # React app bootstrap
│   ├── App.jsx                     # Router & layout
│   ├── styles.css                  # Minimal styling (dark theme)
│   ├── components/
│   │   ├── RuleList.jsx            # Main dashboard
│   │   ├── RuleDetail.jsx          # Detail view
│   │   └── CSVImporter.jsx         # File upload & parse
│   └── data/
│       ├── mockRules.json          # Built-in demo data (3 rules)
│       └── importedRules.json      # Generated from CSV (3 rules)
└── scripts/
    └── parse_csv_to_rules.js       # Node script to convert CSV → JSON
```

---

## Setup & Running

### Prerequisites
- Node.js installed
- CSV file on Desktop at: `C:\Users\Merve Sena Keskin\Desktop\DAM_Alerts.csv`
- Windows Firewall rule for port 5173 (added)

### Start Dev Server
```bash
cd C:\workspace
npx vite --host --port 5173
```
Then open: **http://127.0.0.1:5173/**

### Generate importedRules.json from CSV
```bash
node C:\workspace\scripts\parse_csv_to_rules.js "C:\Users\Merve Sena Keskin\Desktop\DAM_Alerts.csv"
```

### Browser CSV Import
1. Open Rules page
2. Click file input (top-right, "Choose File" button)
3. Select a CSV with headers: `UserName`, `AlarmDetail`, `SystemDate`, `Company`, `ActivityDescription`, `Severity`, `Count`
4. Data auto-aggregates and displays
5. Persists to localStorage; click "Reset" to revert to mock data

---

## Styling
- **Dark theme** (navy/slate backgrounds)
- **Severity colors:**
  - High → Red (#ef4444)
  - Medium → Orange (#f97316)
  - Low → Green (#10b981)
- **Typography:** Inter/system-ui, 13-18px
- **Tables:** Minimal borders, clean rows
- **Responsive:** 980px max-width, responsive padding

---

## Features (V1 Scope)
✅ Display list of security rules  
✅ Show rule details: name, severity, trigger count, affected users  
✅ Click rule to see users who triggered it  
✅ Display per-user: name, team, date, activity, severity, trigger count  
✅ CSV import from browser file input  
✅ Parse flexible CSV formats (comma, tab, semicolon)  
✅ Persist data to localStorage  
✅ Color-coded severity levels  
✅ Reset to mock data button  

---

## Features NOT Included (By Design)
❌ Authentication / login  
❌ Backend API connection  
❌ Search, filtering, pagination  
❌ MITRE ATT&CK / behavioral analysis  
❌ ML scoring / anomaly detection  
❌ Charts or visualizations  
❌ Database schema optimization  
❌ Multi-tenant support  

---

## Known Issues / Notes
1. **Character Encoding:** Turkish characters (ç, ğ, ı, ö, ş, ü) may display with mojibake in some terminals/browsers — UTF-8 handling varies by environment.
2. **CSV Parser:** Handles quoted fields; edge cases with nested quotes not fully tested.
3. **localStorage:** Clears on browser cache clear; no backend persistence.
4. **Timezone:** `systemDate` displayed as-is from CSV; no timezone conversion.

---

## Development Timeline (Today)

| Step | Time | Action |
|------|------|--------|
| 1 | 14:00 | Project scaffold: React, Vite, routing, components, mock data |
| 2 | 14:30 | CSV importer component added; flexible parsing |
| 3 | 14:50 | Parse Desktop CSV → `importedRules.json` with 3 rules |
| 4 | 15:10 | Added `systemDate`, `activityDescription`, `severity` fields |
| 5 | 15:30 | Updated `RuleDetail` table to display 6 columns |
| 6 | 15:45 | Restarted Vite; verified changes in localStorage flow |

---

## Next Steps (Optional Enhancements)
- Add search/filter by rule name or user
- Implement pagination for large rule sets
- Export rules as CSV
- Add timestamp range filtering
- Integrate backend API (when ready)
- Add user authentication
- Improve accessibility (ARIA labels, keyboard nav)

---

## Quick Reference Commands

### Start Server
```powershell
cd C:\workspace
npx vite --host --port 5173
```

### Parse CSV to Rules
```powershell
node C:\workspace\scripts\parse_csv_to_rules.js "C:\Users\Merve Sena Keskin\Desktop\DAM_Alerts.csv"
```

### View Imported Rules
```powershell
type C:\workspace\src\data\importedRules.json
```

### Reset Firewall Rule
```powershell
netsh advfirewall firewall delete rule name="Vite5173" protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Vite5173" dir=in action=allow protocol=TCP localport=5173
```

---

## Contact / Questions
Deployed at: **http://127.0.0.1:5173/**  
All source in: **C:\workspace**  
CSV input: **Desktop/DAM_Alerts.csv**

---

*Documentation generated January 29, 2026*
