/**
 * scripts/check-purity.mjs — the invariant that must not rot.
 *
 * Pure calculations must not depend on the DOM, storage, clock, randomness,
 * or side effects. The configured files must remain checkable without a
 * browser and reproducible from their inputs alone.
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
  { pattern: /from ['"][^'"]*\/(ui|shell|pages|canon)\//, why: 'import from a UI layer' },
  { pattern: /from ['"][^'"]*\/engine\/(store|storage)['"]?/, why: 'derive must not read the store — accept inputs instead' },
];

/** Remove comments first. Import rules inspect this form so their module
 * specifiers remain visible; all other rules inspect string-stripped code. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

/** String literals are stripped so forbidden words in prose do not trip the rule. */
function stripStrings(source) {
  return source
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

let failures = 0;

for (const relative of PURE_FILES) {
  const path = resolve(root, relative);
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    console.error(`✗ ${relative} — file is missing. The purity guard expects it.`);
    failures += 1;
    continue;
  }

  const withoutComments = stripComments(source);
  const code = stripStrings(withoutComments);
  const codeLines = code.split('\n');
  const importLines = withoutComments.split('\n');
  const hits = [];

  for (const { pattern, why } of FORBIDDEN) {
    const lines = why.startsWith('import ') ? importLines : codeLines;
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        hits.push(`  line ${index + 1}: ${why} — ${line.trim().slice(0, 78)}`);
      }
    });
  }

  if (hits.length) {
    console.error(`✗ ${relative} is no longer pure:`);
    hits.forEach((hit) => console.error(hit));
    failures += hits.length;
  } else {
    console.log(`✓ ${relative} is pure`);
  }
}

if (failures) {
  console.error(
    `\n${failures} purity violation(s).\n` +
    'The engine must be checkable without a browser. Move the impure part\n' +
    'to engine/store.ts or a shell/ module and pass the result in.',
  );
  process.exit(1);
}

console.log('\nEngine purity holds.');
