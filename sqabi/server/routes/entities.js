/* server/routes/entities.js */
const express = require('express');
const { readAll, writeAll, genId } = require('../store/fileStore');

const router = express.Router();
// Coleção → arquivo
const MAP = {
  Connection: 'connections',
  DataSource: 'datasources',
  ChartConfig: 'charts',
  Dashboard: 'dashboards',
};

// Listar
router.get('/:entity', (req, res) => {
  const name = MAP[req.params.entity];
  if (!name) return res.status(404).json({ error: 'entity not found' });
  const items = readAll(name).sort((a,b) => (b.created_date||0)-(a.created_date||0));
  res.json({ items, total: items.length });
});

// Criar
router.post('/:entity', (req, res) => {
  const name = MAP[req.params.entity];
  if (!name) return res.status(404).json({ error: 'entity not found' });
  const items = readAll(name);
  const now = Date.now();
  const item = {
    id: genId(),
    created_date: now,
    updated_date: now,
    ...req.body,
  };
  items.push(item);
  writeAll(name, items);
  res.json(item);
});

// Ler por id
router.get('/:entity/:id', (req, res) => {
  const name = MAP[req.params.entity];
  const id = req.params.id;
  const items = readAll(name);
  const found = items.find(x => x.id === id);
  if (!found) return res.status(404).json({ error: 'not found' });
  res.json(found);
});

// Atualizar
router.put('/:entity/:id', (req, res) => {
  const name = MAP[req.params.entity];
  const id = req.params.id;
  const items = readAll(name);
  const idx = items.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const updated = { ...items[idx], ...req.body, updated_date: Date.now() };
  items[idx] = updated;
  writeAll(name, items);
  res.json(updated);
});

// Remover
router.delete('/:entity/:id', (req, res) => {
  const name = MAP[req.params.entity];
  const id = req.params.id;
  const items = readAll(name).filter(x => x.id !== id);
  writeAll(name, items);
  res.json({ ok: true });
});

module.exports = router;
