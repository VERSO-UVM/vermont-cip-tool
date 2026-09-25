# Vermont Municipal CIP Tool

A browser-based Capital Improvement Program tool for Vermont municipalities. Build a multi-year capital plan across highway, facilities, water/wastewater, and equipment categories -- with automatic totals, budget status indicators, and CSV import/export.

**Live site:** [https://verso-uvm.github.io/vermont-cip-tool/](https://verso-uvm.github.io/vermont-cip-tool/)

## What it does

Towns use this tool to organize capital projects into a 1--10 year spending plan. Each worksheet tab (Highway, Facilities, Water/WW, Equipment) has pre-defined row slots matching common Vermont municipal assets. Enter dollar amounts per year, and the tool tracks column totals, row totals, and budget status automatically.

- **Budget Setup** -- set the plan length, annual local funds, grant estimates, and existing debt service per year.
- **Worksheet tabs** -- enter costs per project per year. "Named" rows (Road, Bridge, Dump Truck, etc.) let you type in the specific asset. "Fixed" rows (Highway Garage, Grader, etc.) are pre-labeled.
- **Summary** -- roll-up across all worksheets with remaining capacity per year. Green = within local funds, amber = needs grants, red = over budget.
- **Import/Export** -- CSV round-trip for preparing data offline or resuming a session. HTML report export for Town Meeting presentations.

## No build step

Open `index.html` in a browser. No Node.js, no npm, no bundler. The app uses ES modules natively, so it must be served over HTTP (not `file://`):

```bash
cd vermont-cip-tool
python3 -m http.server 8080
# open http://localhost:8080
```

On GitHub Pages, it just works.

## Project structure

```
index.html          Main page (tabbed UI)
styles.css          Full design system (light, dark, print)
js/
  main.js           Entry point: state management, tab routing, persistence
  data.js           Worksheet definitions (row slots per category)
  worksheets.js     Editable grid with auto-totals
  budget.js         Budget setup (years, local funds, grants, debt service)
  summary.js        Cross-worksheet roll-up with remaining capacity
  csv.js            CSV import/export with formula injection protection
  print.js          Standalone HTML report export
  modal.js          Lightweight modal system
  helpers.js        formatMoney, escapeHtml, nonNegative, uid
samples/
  pawlet-demo.csv   Sample CIP based on real Pawlet equipment + PACIF data
tests/
  totals.test.mjs   Node-runnable test suite (79 tests)
  totals.test.html  Browser-runnable version of the same tests
```

## Sample data

`samples/pawlet-demo.csv` contains a realistic 5-year capital plan (FY2026--FY2030) for a small Vermont town (~1,400 pop), built from:

- **Pawlet Equipment Replacement Plan** -- actual fleet with years, models, and estimated lifespans
- **VLCT PACIF Property Schedule** (PACIF1485-26) -- real building replacement values and addresses

Import it from the Budget Setup tab to see the tool in action.

## CSV format

The CSV uses a `section` column to multiplex different record types:

| Section | Purpose | Key columns |
|---------|---------|------------|
| `meta` | Town name, prepared by, start year | `key`, `value` |
| `budget_year` | Annual capital capacity | `year`, `local_funds`, `grant_funds`, `debt_service` |
| `cell` | Dollar amount in a worksheet cell | `worksheet`, `row_id`, `year`, `amount` |
| `row_meta` | Description and notes for a row | `worksheet`, `row_id`, `custom_name`, `notes` |
| `note` | Global notes | `notes` |

Export CSV from the Summary tab produces a file in this format that can be re-imported.

## Tests

```bash
node tests/totals.test.mjs
```

Verifies column totals, row totals, column independence, worksheet grand totals, summary cross-worksheet accuracy, known CSV values, and budget status classification. 79 tests.

## Security

- **Content Security Policy** -- restricts scripts and styles to same-origin only
- **XSS prevention** -- all user input is escaped via `escapeHtml()`/`escapeAttr()` before DOM insertion
- **CSV formula injection** -- exported values starting with `=`, `+`, `-`, `@` are prefixed to prevent spreadsheet formula execution
- **No external dependencies** -- zero third-party scripts, no CDN, no supply chain risk
- **No server** -- all data stays in the browser (localStorage). Nothing is transmitted.

## Data sources for pre-population

| Source | Data | Access |
|--------|------|--------|
| VLCT PACIF | Building/equipment inventories, replacement values | Per-town authorization |
| VTrans / geodata.vermont.gov | Roads, bridges, culverts | Public GIS layers |
| Census API | Population, tax base | Public REST API |
| EPA SDWIS/ECHO | Water/wastewater system data | Public REST API |

## Related

- [Selectboard-Strategic-Saga](https://github.com/VERSO-UVM/Selectboard-Strategic-Saga) -- the workshop game this tool grew out of. Teaches capital planning tradeoffs through a card-based exercise.

## License

MIT. Built by [VERSO @ UVM](https://github.com/VERSO-UVM).
