/**
 * scripts/check-purity.mjs — enforces that derived calculations stay pure.
 *
 * Pure calculations must not depend on the DOM, a clock, storage, or other
 * side effects. Configure guarded files in purity.config.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, 'purity.config.json');
const PURE_FILES = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8')).files
  : ['src/engine/derive.ts'];

if (!Array.isArray(PURE_FILES) || PURE_FILES.some((file) => typeof file !== 'string')) {
  throw new TypeError('purity.config.json must contain a string array named "files"');
}

const FORBIDDEN = [
  { pattern: /\bdocument\b/, why: 'DOM access' },
  { pattern: /\bwindow\b/, why: 'browser globals' },
  { pattern: /\blocalStorage\b/, why: 'storage access' },
  { pattern: /\bsessionStorage\b/, why: 'storage access' },
  { pattern: /\bfetch\s*\(/, why: 'network access' },
  { pattern: /\bconsole\./, why: 'side effect' },
  { pattern: /\bMath\.random\b/, why: 'non-determinism' },
  { pattern: /\bnew Date\b/, why: 'clock read — pass timestamps in instead' },
  { pattern: /\bDate\.now\b/, why: 'clock read — pass timestamps in instead' },
  { pattern: /from ['"][^'"]*\/(shell|views|pages|canon)\//, why: 'import from a UI layer' },
  { pattern: /from ['"][^'"]*\/engine\/(store|storage)['"]?/, why: 'derive must not read the store — accept inputs instead' },
];

let failures = 0;

/** Strip /* … *\/ and // … comments so forbidden tokens inside prose don't flag. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

for (const rel of PURE_FILES) {
  const abs = resolve(root, rel);
  const src = stripComments(readFileSync(abs, 'utf8'));
  for (const { pattern, why } of FORBIDDEN) {
    const match = src.match(pattern);
    if (match) {
      console.error(`✗ ${rel}: ${why} (matched ${JSON.stringify(match[0])})`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} purity violation(s).`);
  process.exit(1);
}
console.log(`✓ purity check passed for ${PURE_FILES.length} file(s)`);
