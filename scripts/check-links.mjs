import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'apps', 'field-manual', 'dist');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

function localReferences(html) {
  const references = [];
  const attributePattern = /\b(?:href|src|poster|action)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(attributePattern)) references.push(match[2]);

  const srcsetPattern = /\bsrcset\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(srcsetPattern)) {
    for (const candidate of match[2].split(',')) references.push(candidate.trim().split(/\s+/)[0]);
  }
  return references;
}

function shouldIgnore(reference) {
  return !reference || reference.startsWith('#') || reference.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(reference);
}

function candidatePaths(htmlFile, reference) {
  const withoutFragment = reference.split('#')[0].split('?')[0];
  if (!withoutFragment) return [];

  let decoded;
  try { decoded = decodeURIComponent(withoutFragment); }
  catch { decoded = withoutFragment; }

  const target = decoded.startsWith('/')
    ? path.resolve(dist, `.${decoded}`)
    : path.resolve(path.dirname(htmlFile), decoded);

  const relativeTarget = path.relative(dist, target);
  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) return [];

  if (decoded.endsWith('/')) return [path.join(target, 'index.html')];
  if (path.extname(target)) return [target];
  return [target, path.join(target, 'index.html'), `${target}.html`];
}

async function exists(file) {
  try { return (await stat(file)).isFile(); }
  catch { return false; }
}

let files;
try { files = await walk(dist); }
catch (error) {
  console.error(`Cannot inspect generated site at ${dist}. Run npm run build first.`);
  console.error(error.message);
  process.exit(1);
}

const htmlFiles = files.filter(file => file.endsWith('.html'));
const broken = [];
let checked = 0;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  for (const reference of localReferences(html)) {
    if (shouldIgnore(reference)) continue;
    const candidates = candidatePaths(htmlFile, reference);
    if (!candidates.length) continue;
    checked += 1;
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) {
      broken.push({ file: path.relative(dist, htmlFile), reference });
    }
  }
}

if (broken.length) {
  console.error(`Broken local references (${broken.length}):`);
  for (const item of broken) console.error(`- ${item.file}: ${item.reference}`);
  process.exit(1);
}

console.log(`Link check passed: ${checked} local references across ${htmlFiles.length} HTML files.`);

