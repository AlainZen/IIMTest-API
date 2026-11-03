// Compare chaque fichier de traduction à en.json et échoue s'il manque une clé.
// Usage : node scripts/check-locales.mjs <dossier>
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REFERENCE = 'en.json'
const REQUIRED = ['de.json', 'en.json', 'es.json', 'fr.json']

const directory = process.argv[2]
if (!directory) {
  console.error('Indique le dossier des traductions : node scripts/check-locales.mjs <dossier>')
  process.exit(1)
}

// Transforme { a: { b: 'x' } } en { 'a.b': 'x' }.
function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'object' && child !== null ? flatten(child, path) : [[path, child]]
  })
}

function placeholders(text) {
  return [...String(text).matchAll(/\{(\w+)\}/g)]
    .map(match => match[1])
    .sort()
    .join(',')
}

function read(file) {
  return new Map(flatten(JSON.parse(readFileSync(join(directory, file), 'utf8'))))
}

const files = readdirSync(directory).filter(file => file.endsWith('.json'))
const errors = REQUIRED.filter(file => !files.includes(file)).map(
  file => `${file} : fichier manquant`,
)

if (files.includes(REFERENCE)) {
  const reference = read(REFERENCE)

  for (const file of files.filter(name => name !== REFERENCE)) {
    const locale = read(file)

    for (const [key, text] of reference) {
      if (!locale.has(key)) errors.push(`${file} : clé manquante « ${key} »`)
      else if (!String(locale.get(key)).trim()) errors.push(`${file} : clé vide « ${key} »`)
      else if (placeholders(locale.get(key)) !== placeholders(text)) {
        errors.push(`${file} : variables différentes de en.json pour « ${key} »`)
      }
    }
    for (const key of locale.keys()) {
      if (!reference.has(key)) errors.push(`${file} : clé en trop « ${key} »`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} problème(s) dans ${directory}.`)
  process.exit(1)
}

console.log(`${files.length} fichiers de traduction identiques à ${REFERENCE} dans ${directory}.`)
