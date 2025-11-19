/* server/routes/empresas.js */
'use strict';

const express = require('express');
const router = express.Router();
const { Client } = require('pg');

/**
 * Cria cliente PostgreSQL com as configurações do .env
 */
function createPgClient() {
  return new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'arcway',
  });
}

/**
 * GET /api/empresas
 * Lista todas as empresas (com filtro opcional por tipo)
 */
router.get('/', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();

    const { order = '-created_date', tipo } = req.query;
    let orderClause = 'created_date DESC';

    // Parse order parameter
    if (order.startsWith('-')) {
      const field = order.substring(1);
      orderClause = `${field} DESC`;
    } else {
      orderClause = `${order} ASC`;
    }

    // Filtro por tipo (grupo_empresarial, empresa)
    let whereClause = '';
    if (tipo === 'grupo_empresarial') {
      whereClause = 'WHERE is_grupo_empresarial = true';
    } else if (tipo === 'empresa') {
      whereClause = 'WHERE is_empresa = true';
    }

    const result = await client.query(`
      SELECT
        codemp,
        nomeempresa,
        numdoc,
        grupoemp,
        obs,
        is_grupo_empresarial,
        is_empresa,
        created_date,
        updated_date,
        created_by,
        updated_by
      FROM empresas
      ${whereClause}
      ORDER BY ${orderClause}
    `);

    res.json({
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('[empresas:list] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * GET /api/empresas/:id
 * Busca uma empresa por código
 */
router.get('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;

    const result = await client.query(`
      SELECT
        codemp,
        nomeempresa,
        numdoc,
        grupoemp,
        obs,
        is_grupo_empresarial,
        is_empresa,
        created_date,
        updated_date,
        created_by,
        updated_by
      FROM empresas
      WHERE codemp = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[empresas:get] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * POST /api/empresas
 * Cria uma nova empresa
 */
router.post('/', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { nomeempresa, numdoc, grupoemp, obs, is_grupo_empresarial, is_empresa } = req.body;

    // Validações
    if (!nomeempresa || !numdoc) {
      return res.status(400).json({ error: 'Nome da empresa e CNPJ são obrigatórios' });
    }

    // Verificar se CNPJ já existe
    const existing = await client.query(
      'SELECT codemp FROM empresas WHERE numdoc = $1',
      [numdoc]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }

    const result = await client.query(`
      INSERT INTO empresas (nomeempresa, numdoc, grupoemp, obs, is_grupo_empresarial, is_empresa)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        codemp,
        nomeempresa,
        numdoc,
        grupoemp,
        obs,
        is_grupo_empresarial,
        is_empresa,
        created_date,
        updated_date,
        created_by,
        updated_by
    `, [
      nomeempresa,
      numdoc,
      grupoemp || null,
      obs || null,
      is_grupo_empresarial || false,
      is_empresa || false
    ]);

    console.log(`[empresas:create] Empresa criada: ${result.rows[0].codemp} (${nomeempresa})`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[empresas:create] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * PUT /api/empresas/:id
 * Atualiza uma empresa existente
 */
router.put('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;
    const { nomeempresa, numdoc, grupoemp, obs, is_grupo_empresarial, is_empresa } = req.body;

    // Verificar se CNPJ já existe em outra empresa
    if (numdoc) {
      const existing = await client.query(
        'SELECT codemp FROM empresas WHERE numdoc = $1 AND codemp != $2',
        [numdoc, id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'CNPJ já cadastrado em outra empresa' });
      }
    }

    const result = await client.query(`
      UPDATE empresas
      SET
        nomeempresa = COALESCE($1, nomeempresa),
        numdoc = COALESCE($2, numdoc),
        grupoemp = $3,
        obs = $4,
        is_grupo_empresarial = COALESCE($5, is_grupo_empresarial),
        is_empresa = COALESCE($6, is_empresa)
      WHERE codemp = $7
      RETURNING
        codemp,
        nomeempresa,
        numdoc,
        grupoemp,
        obs,
        is_grupo_empresarial,
        is_empresa,
        created_date,
        updated_date,
        created_by,
        updated_by
    `, [nomeempresa, numdoc, grupoemp, obs, is_grupo_empresarial, is_empresa, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    console.log(`[empresas:update] Empresa atualizada: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[empresas:update] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * DELETE /api/empresas/:id
 * Remove uma empresa
 */
router.delete('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM empresas WHERE codemp = $1 RETURNING codemp',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    console.log(`[empresas:delete] Empresa deletada: ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('[empresas:delete] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * POST /api/empresas/search
 * Busca empresas por nome ou CNPJ
 */
router.post('/search', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    const result = await client.query(`
      SELECT
        codemp,
        nomeempresa,
        numdoc,
        grupoemp,
        obs,
        created_date,
        updated_date
      FROM empresas
      WHERE
        nomeempresa ILIKE $1 OR
        numdoc ILIKE $1 OR
        grupoemp ILIKE $1
      ORDER BY created_date DESC
      LIMIT 50
    `, [`%${query}%`]);

    res.json({
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('[empresas:search] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

module.exports = router;
