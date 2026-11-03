// Écrit le résumé de couverture dans GitHub Actions et prépare le badge du README.
// À lancer après vitest run --coverage.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const { total } = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))

const rows = [
  ['Lignes', total.lines.pct],
  ['Instructions', total.statements.pct],
  ['Fonctions', total.functions.pct],
  ['Branches', total.branches.pct],
]

function color(percent) {
  if (percent >= 90) return '#2e7d32'
  if (percent >= 75) return '#b26a00'
  return '#c62828'
}

const percent = total.lines.pct
const value = `${percent}%`
const LABEL_WIDTH = 74
const valueWidth = 12 + value.length * 7
const width = LABEL_WIDTH + valueWidth

const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="couverture : ${value}">
  <rect width="${LABEL_WIDTH}" height="20" fill="#555"/>
  <rect x="${LABEL_WIDTH}" width="${valueWidth}" height="20" fill="${color(percent)}"/>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${LABEL_WIDTH / 2}" y="14">couverture</text>
    <text x="${LABEL_WIDTH + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`

mkdirSync('coverage/badge', { recursive: true })
writeFileSync('coverage/badge/coverage.svg', badge)

const summary = [
  `## Couverture des tests : ${value}`,
  '',
  '| Mesure | Taux |',
  '| --- | --- |',
  ...rows.map(([name, pct]) => `| ${name} | ${pct}% |`),
  '',
  'Le rapport détaillé est dans l’artifact `rapport-couverture` : ouvre `index.html`.',
  '',
].join('\n')

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)

console.log(summary)
