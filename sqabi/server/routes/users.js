/* server/routes/users.js */
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
 * GET /api/users
 * Lista todos os usuários
 */
router.get('/', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();

    const { order = '-data_criacao' } = req.query;
    let orderClause = 'data_criacao DESC';

    // Parse order parameter
    if (order.startsWith('-')) {
      const field = order.substring(1);
      orderClause = `${field} DESC`;
    } else {
      orderClause = `${order} ASC`;
    }

    const result = await client.query(`
      SELECT
        u.codusuario,
        u.nome,
        u.email,
        u.cpf,
        u.telefone,
        u.perfil,
        u.codemp,
        e.nomeempresa,
        u.ativo,
        u.verificado,
        u.ultimo_login,
        u.contador_logins,
        u.data_criacao,
        u.data_atualizacao,
        u.metadados
      FROM usuarios u
      LEFT JOIN empresas e ON u.codemp = e.codemp
      ORDER BY ${orderClause}
    `);

    res.json({
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('[users:list] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * GET /api/users/:id
 * Busca um usuário por ID
 */
router.get('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;

    const result = await client.query(`
      SELECT
        u.codusuario,
        u.nome,
        u.email,
        u.cpf,
        u.telefone,
        u.perfil,
        u.codemp,
        e.nomeempresa,
        u.ativo,
        u.verificado,
        u.ultimo_login,
        u.contador_logins,
        u.data_criacao,
        u.data_atualizacao,
        u.metadados
      FROM usuarios u
      LEFT JOIN empresas e ON u.codemp = e.codemp
      WHERE u.codusuario = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[users:get] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * POST /api/users
 * Cria um novo usuário
 */
router.post('/', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { nome, email, cpf, telefone, perfil, codemp, ativo, metadados } = req.body;

    // Validações
    if (!nome || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios' });
    }

    // Verificar se email já existe
    const existingEmail = await client.query(
      'SELECT codusuario FROM usuarios WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se CPF já existe
    const existingCPF = await client.query(
      'SELECT codusuario FROM usuarios WHERE cpf = $1',
      [cpf]
    );

    if (existingCPF.rows.length > 0) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const result = await client.query(`
      INSERT INTO usuarios (nome, email, cpf, telefone, perfil, codemp, ativo, metadados)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        codusuario,
        nome,
        email,
        cpf,
        telefone,
        perfil,
        codemp,
        ativo,
        verificado,
        ultimo_login,
        contador_logins,
        data_criacao,
        data_atualizacao,
        metadados
    `, [
      nome,
      email,
      cpf,
      telefone || null,
      perfil || 'Visualizador',
      codemp || null,
      ativo !== undefined ? ativo : true,
      metadados || {}
    ]);

    console.log(`[users:create] Usuário criado: ${result.rows[0].codusuario} (${email})`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[users:create] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * PUT /api/users/:id
 * Atualiza um usuário existente
 */
router.put('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;
    const { nome, email, cpf, telefone, perfil, codemp, ativo, metadados } = req.body;

    // Verificar se email já existe em outro usuário
    if (email) {
      const existing = await client.query(
        'SELECT codusuario FROM usuarios WHERE email = $1 AND codusuario != $2',
        [email, id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email já cadastrado em outro usuário' });
      }
    }

    // Verificar se CPF já existe em outro usuário
    if (cpf) {
      const existing = await client.query(
        'SELECT codusuario FROM usuarios WHERE cpf = $1 AND codusuario != $2',
        [cpf, id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'CPF já cadastrado em outro usuário' });
      }
    }

    const result = await client.query(`
      UPDATE usuarios
      SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        cpf = COALESCE($3, cpf),
        telefone = $4,
        perfil = COALESCE($5, perfil),
        codemp = $6,
        ativo = COALESCE($7, ativo),
        metadados = COALESCE($8, metadados)
      WHERE codusuario = $9
      RETURNING
        codusuario,
        nome,
        email,
        cpf,
        telefone,
        perfil,
        codemp,
        ativo,
        verificado,
        ultimo_login,
        contador_logins,
        data_criacao,
        data_atualizacao,
        metadados
    `, [nome, email, cpf, telefone, perfil, codemp, ativo, metadados, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log(`[users:update] Usuário atualizado: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[users:update] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * DELETE /api/users/:id
 * Remove um usuário
 */
router.delete('/:id', async (req, res) => {
  const client = createPgClient();
  try {
    await client.connect();
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM usuarios WHERE codusuario = $1 RETURNING codusuario',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log(`[users:delete] Usuário deletado: ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('[users:delete] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * POST /api/users/search
 * Busca usuários por email ou nome
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
        u.codusuario,
        u.nome,
        u.email,
        u.cpf,
        u.telefone,
        u.perfil,
        u.codemp,
        e.nomeempresa,
        u.ativo,
        u.verificado,
        u.ultimo_login,
        u.contador_logins,
        u.data_criacao,
        u.data_atualizacao
      FROM usuarios u
      LEFT JOIN empresas e ON u.codemp = e.codemp
      WHERE
        u.nome ILIKE $1 OR
        u.email ILIKE $1 OR
        u.cpf ILIKE $1
      ORDER BY u.data_criacao DESC
      LIMIT 50
    `, [`%${query}%`]);

    res.json({
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('[users:search] erro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

module.exports = router;
