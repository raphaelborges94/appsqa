/* server/store/fileStore.js */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readAll(name) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return []; }
}

function writeAll(name, arr) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8');
}

function genId() {
  // id simples e estável o suficiente p/ CRUD local
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

module.exports = { readAll, writeAll, genId };
