// Capture the committed browser scripts without changing their parameters or logic.
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const html = fs.readFileSync('index.html', 'utf8');
const controls = {};
for (const id of ['rounds', 'floor', 'noise']) {
  const match = html.match(new RegExp(`<input id="${id}"[^>]*value="([^"]+)"`));
  if (!match) throw new Error(`Missing committed control: ${id}`);
  controls[id] = match[1];
}
const elements = new Map();
for (const id of ['rounds', 'floor', 'noise', 'roundsOut', 'floorOut', 'noiseOut', 'run', 'material', 'lineage', 'nullsep', 'depth']) {
  elements.set(id, { value: controls[id], textContent: '', addEventListener() {} });
}
elements.set('chart', {
  width: 1100, height: 430,
  getContext() {
    return { clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, setLineDash() {} };
  }
});
const logs = [];
const errors = [];
const capturedConsole = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(level => [level, (...args) => logs.push({level, message: args.map(String).join(' ')})]));
const context = vm.createContext({
  document: { getElementById: id => elements.get(id) },
  console: capturedConsole,
  TextEncoder, TextDecoder
});
const files = ['omega.js', 'polyfill.js', 'field.js'];
for (const file of files) {
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file}); }
  catch (error) { errors.push({file, name: error.name, message: error.message, stack: error.stack}); break; }
}
const sha = cp.execFileSync('git', ['hash-object', 'field.js'], {encoding:'utf8'}).trim();
const hashes = Object.fromEntries(['LICENSE', 'README.md', 'field.js', 'index.html', 'omega.js', 'polyfill.js', 'style.css'].map(file => [file, cp.execFileSync('git', ['hash-object', file], {encoding:'utf8'}).trim()]));
const output = {
  repository: 'AlphaDataOmega/cell_phone',
  commit: '6b75da086ba2c004c3ff87da3944c56af67d57f3',
  capturedAtUtc: new Date().toISOString(),
  environment: {platform: process.platform, arch: process.arch, osRelease: os.release(), node: process.version, v8: process.versions.v8, execution: 'Node vm with minimal DOM and canvas shim; committed scripts evaluated in index.html order'},
  controls,
  sourceBlobHashes: hashes,
  rows: context.cellPhoneLastRun ? Array.from(context.cellPhoneLastRun, row => ({...row})) : null,
  summary: Object.fromEntries(['material','lineage','nullsep','depth'].map(id => [id, elements.get(id).textContent])),
  console: logs,
  errors
};
fs.writeFileSync('FIRST-RUN.json', JSON.stringify(output, null, 2) + '\n');
if (errors.length || !output.rows) process.exitCode = 1;
