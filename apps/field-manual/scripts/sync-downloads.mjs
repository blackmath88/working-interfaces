import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const source = path.join(repoRoot, 'knowledge');
const target = path.join(appRoot, 'public', 'downloads', 'knowledge');
const foundations = path.join(source, 'foundations');
const styles = path.join(source, 'styles');
const tokenStylesheet = path.join(appRoot, 'src', 'styles', 'tokens.css');

function fail(file, message) {
  throw new Error(`Cannot generate tokens.css from ${path.relative(repoRoot, file)}: ${message}`);
}

async function frontmatter(file) {
  const markdown = await readFile(file, 'utf8');
  const value = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (!value) fail(file, 'missing YAML frontmatter');
  return value.split('\n');
}

function scalar(file, lines, field, requireQuotes = false) {
  const line = lines.find((candidate) => candidate.startsWith(`${field}:`));
  if (!line) fail(file, `missing ${field}`);
  const sourceValue = line.slice(line.indexOf(':') + 1).trim();
  if (!sourceValue.startsWith('"')) {
    if (!requireQuotes && sourceValue) return sourceValue;
    fail(file, `${field} must be a quoted string`);
  }
  try {
    const value = JSON.parse(sourceValue);
    if (typeof value !== 'string' || !value) throw new Error();
    return value;
  } catch {
    fail(file, `${field} must be a quoted string`);
  }
}

function tokenLines(file, lines) {
  const start = lines.findIndex((line) => line === 'tokens:');
  if (start === -1) fail(file, 'missing tokens map');
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(' ')) break;
    if (line.trim()) entries.push(line);
  }
  if (!entries.length) fail(file, 'tokens map is empty');
  return entries;
}

async function foundationContract(file) {
  const lines = await frontmatter(file);
  return tokenLines(file, lines).map((line) => {
    const token = line.match(/^  ([a-z][a-z0-9.-]*):\s*\{(.+)\}\s*$/);
    if (!token) fail(file, `malformed token declaration "${line.trim()}"`);
    const [, name, fields] = token;
    if (!/(?:^|,\s*)\s*note:\s*"[^"]+"/.test(fields)) {
      fail(file, `contract token "${name}" is missing its note`);
    }
    if (/(?:^|,\s*)\s*(?:light|value):/.test(fields)) {
      fail(file, `contract token "${name}" must not bind a value`);
    }
    return name;
  });
}

function validateValue(file, name, value) {
  if (name.startsWith('duration.')) {
    if (!/^\d+ms$/.test(value)) {
      fail(file, `token "${name}" must be a duration in milliseconds, received "${value}"`);
    }
    return;
  }
  if (name.startsWith('easing.')) {
    if (!/^cubic-bezier\((?:-?\d*\.?\d+,){3}-?\d*\.?\d+\)$/.test(value)) {
      fail(file, `token "${name}" has malformed cubic-bezier value "${value}"`);
    }
    return;
  }

  const match = value.match(/^oklch\((\d*\.?\d+) (\d*\.?\d+) (\d*\.?\d+)\)$/);
  if (!match) fail(file, `token "${name}" has malformed OKLCH value "${value}"`);
  const [, lightness, chroma, hue] = match.map(Number);
  if (lightness < 0 || lightness > 1 || chroma < 0 || hue < 0 || hue > 360) {
    fail(file, `token "${name}" has an out-of-range OKLCH value "${value}"`);
  }
}

async function styleBinding(file) {
  const lines = await frontmatter(file);
  const id = scalar(file, lines, 'id');
  const selector = scalar(file, lines, 'selector', true);
  const tokens = new Map();

  for (const line of tokenLines(file, lines)) {
    const token = line.match(/^  ([a-z][a-z0-9.-]*):\s*("(?:\\.|[^"\\])*")\s*$/);
    if (!token) fail(file, `malformed style token "${line.trim()}"`);
    const [, name, encodedValue] = token;
    const value = JSON.parse(encodedValue);
    validateValue(file, name, value);
    tokens.set(name, value);
  }

  return { file, id, selector, tokens };
}

async function markdownFiles(directory, label) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => path.join(directory, file));
  if (!files.length) throw new Error(`Cannot generate tokens.css: no ${label} records found`);
  return files;
}

async function generateTokens() {
  const contract = new Set();
  for (const file of await markdownFiles(foundations, 'knowledge/foundations/*.md')) {
    for (const name of await foundationContract(file)) {
      if (contract.has(name)) fail(file, `duplicate contract token "${name}"`);
      contract.add(name);
    }
  }

  const bindings = [];
  const selectors = new Map();
  for (const file of await markdownFiles(styles, 'knowledge/styles/*.md')) {
    const binding = await styleBinding(file);
    const duplicate = selectors.get(binding.selector);
    if (duplicate) {
      fail(file, `style "${binding.id}" shares selector "${binding.selector}" with style "${duplicate}"`);
    }
    selectors.set(binding.selector, binding.id);

    const missing = [...contract].filter((name) => !binding.tokens.has(name));
    if (missing.length) {
      fail(file, `style "${binding.id}" is missing contract tokens: ${missing.join(', ')}`);
    }
    const unknown = [...binding.tokens.keys()].filter((name) => !contract.has(name));
    if (unknown.length) {
      fail(file, `style "${binding.id}" binds unknown tokens: ${unknown.join(', ')}`);
    }
    bindings.push(binding);
  }

  if (!selectors.has(':root')) {
    throw new Error('Cannot generate tokens.css: no style uses selector ":root"');
  }

  bindings.sort((a, b) => Number(b.selector === ':root') - Number(a.selector === ':root') || a.id.localeCompare(b.id));
  const blocks = bindings.map(({ selector, tokens }) => {
    const declarations = [...contract]
      .map((name) => `  --${name.replaceAll('.', '-')}: ${tokens.get(name)};`)
      .join('\n');
    return `${selector} {\n${declarations}\n}`;
  }).join('\n\n');
  const css = `/* GENERATED from knowledge/foundations/*.md + knowledge/styles/*.md — do not edit */\n${blocks}\n`;
  await writeFile(tokenStylesheet, css, 'utf8');
}

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
await generateTokens();
