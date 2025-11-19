import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌ ERRO CRÍTICO: VAULT_ENCRYPTION_KEY não definida no .env.local');
  console.error('   Execute: node generate-encryption-key.js');
  process.exit(1); // Parar servidor se não tiver chave
}

// Validar tamanho mínimo da chave (256 bits = 64 caracteres hex)
if (ENCRYPTION_KEY.length < 64) {
  console.error('❌ ERRO CRÍTICO: VAULT_ENCRYPTION_KEY muito curta (mínimo 64 caracteres)');
  console.error('   Execute: node generate-encryption-key.js');
  process.exit(1);
}

// Rate limiting para revelar senhas (máximo 10 por minuto por usuário)
const revealAttempts = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userAttempts = revealAttempts.get(userId) || [];

  // Remover tentativas antigas (> 1 minuto)
  const recentAttempts = userAttempts.filter(time => now - time < 60000);

  if (recentAttempts.length >= 10) {
    return false; // Bloqueado
  }

  recentAttempts.push(now);
  revealAttempts.set(userId, recentAttempts);
  return true; // Permitido
}

// Validação de entrada
function validatePasswordData(data) {
  const errors = [];

  if (!data.descricao || data.descricao.trim().length === 0) {
    errors.push('Descrição é obrigatória');
  }

  if (data.descricao && data.descricao.length > 255) {
    errors.push('Descrição muito longa (máximo 255 caracteres)');
  }

  if (data.url && data.url.length > 2048) {
    errors.push('URL muito longa (máximo 2048 caracteres)');
  }

  if (data.usuario && data.usuario.length > 255) {
    errors.push('Usuário muito longo (máximo 255 caracteres)');
  }

  if (data.senha && data.senha.length > 1000) {
    errors.push('Senha muito longa (máximo 1000 caracteres)');
  }

  return errors;
}

/**
 * Registrar ação de auditoria
 */
async function auditLog(passwordId, userId, action, req) {
  try {
    await query(
      `INSERT INTO passwords_vault_audit (password_id, user_id, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [passwordId, userId, action, req.ip, req.headers['user-agent']]
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

/**
 * GET /api/passwords
 * Listar todas as senhas (sem mostrar a senha descriptografada)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        p.id,
        p.descricao,
        p.grupo_empresa_id,
        g.nome as grupo_empresa_nome,
        p.url,
        p.usuario,
        p.observacoes,
        p.created_at,
        p.updated_at,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM passwords_vault p
      LEFT JOIN sqausugru g ON p.grupo_empresa_id = g.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      ORDER BY p.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching passwords:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/passwords/:id
 * Buscar senha por ID (sem mostrar senha descriptografada)
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        p.id,
        p.descricao,
        p.grupo_empresa_id,
        g.nome as grupo_empresa_nome,
        p.url,
        p.usuario,
        p.observacoes,
        p.created_at,
        p.updated_at
      FROM passwords_vault p
      LEFT JOIN sqausugru g ON p.grupo_empresa_id = g.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/passwords/:id/reveal
 * Revelar senha (descriptografar) - COM RATE LIMITING
 */
router.post('/:id/reveal', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // SEGURANÇA: Rate limiting
    if (!checkRateLimit(req.user.id)) {
      console.warn(`⚠️  Rate limit excedido para usuário ${req.user.id}`);
      return res.status(429).json({
        error: 'Muitas tentativas de revelar senhas. Aguarde 1 minuto.'
      });
    }

    // Buscar senha criptografada
    const result = await query(
      'SELECT senha_encrypted FROM passwords_vault WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password not found' });
    }

    // Descriptografar senha usando função PostgreSQL
    const decryptResult = await query(
      'SELECT decrypt_password($1, $2) as senha',
      [result.rows[0].senha_encrypted, ENCRYPTION_KEY]
    );

    // Registrar auditoria (CRÍTICO - não deve falhar)
    try {
      await auditLog(id, req.user.id, 'view', req);
    } catch (auditError) {
      console.error('❌ ERRO CRÍTICO: Falha ao registrar auditoria:', auditError);
      // Continua mas loga o erro
    }

    res.json({ senha: decryptResult.rows[0].senha });
  } catch (error) {
    console.error('Error revealing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/passwords
 * Criar nova senha - COM VALIDAÇÃO ROBUSTA
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      descricao,
      grupo_empresa_id,
      url,
      usuario,
      senha,
      observacoes
    } = req.body;

    // SEGURANÇA: Validação robusta de entrada
    const validationErrors = validatePasswordData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationErrors
      });
    }

    // Validações obrigatórias
    if (!descricao || !senha) {
      return res.status(400).json({ error: 'Descrição e senha são obrigatórias' });
    }

    // SEGURANÇA: Sanitização (trim em strings)
    const sanitizedData = {
      descricao: descricao.trim(),
      grupo_empresa_id: grupo_empresa_id || null,
      url: url?.trim() || null,
      usuario: usuario?.trim() || null,
      senha: senha, // Não fazer trim na senha (pode ter espaços intencionais)
      observacoes: observacoes?.trim() || null
    };

    // Criptografar senha usando função PostgreSQL
    const result = await query(
      `INSERT INTO passwords_vault
       (descricao, grupo_empresa_id, url, usuario, senha_encrypted, observacoes, created_by, updated_by)
       VALUES ($1, $2, $3, $4, encrypt_password($5, $6), $7, $8, $8)
       RETURNING id, descricao, grupo_empresa_id, url, usuario, observacoes, created_at, updated_at`,
      [
        sanitizedData.descricao,
        sanitizedData.grupo_empresa_id,
        sanitizedData.url,
        sanitizedData.usuario,
        sanitizedData.senha,
        ENCRYPTION_KEY,
        sanitizedData.observacoes,
        req.user.id
      ]
    );

    // Registrar auditoria
    try {
      await auditLog(result.rows[0].id, req.user.id, 'create', req);
    } catch (auditError) {
      console.error('❌ ERRO: Falha ao registrar auditoria de criação:', auditError);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/passwords/:id
 * Atualizar senha
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      descricao,
      grupo_empresa_id,
      url,
      usuario,
      senha,
      observacoes
    } = req.body;

    // Verificar se senha existe
    const existing = await query('SELECT id FROM passwords_vault WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Password not found' });
    }

    let result;

    // Se senha foi alterada, criptografar nova senha
    if (senha) {
      result = await query(
        `UPDATE passwords_vault SET
          descricao = COALESCE($1, descricao),
          grupo_empresa_id = COALESCE($2, grupo_empresa_id),
          url = COALESCE($3, url),
          usuario = COALESCE($4, usuario),
          senha_encrypted = encrypt_password($5, $6),
          observacoes = COALESCE($7, observacoes),
          updated_by = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING id, descricao, grupo_empresa_id, url, usuario, observacoes, created_at, updated_at`,
        [descricao, grupo_empresa_id, url, usuario, senha, ENCRYPTION_KEY, observacoes, req.user.id, id]
      );
    } else {
      // Atualizar sem alterar senha
      result = await query(
        `UPDATE passwords_vault SET
          descricao = COALESCE($1, descricao),
          grupo_empresa_id = COALESCE($2, grupo_empresa_id),
          url = COALESCE($3, url),
          usuario = COALESCE($4, usuario),
          observacoes = COALESCE($5, observacoes),
          updated_by = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING id, descricao, grupo_empresa_id, url, usuario, observacoes, created_at, updated_at`,
        [descricao, grupo_empresa_id, url, usuario, observacoes, req.user.id, id]
      );
    }

    // Registrar auditoria
    await auditLog(id, req.user.id, 'update', req);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/passwords/:id
 * Deletar senha
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Registrar auditoria antes de deletar
    await auditLog(id, req.user.id, 'delete', req);

    const result = await query(
      'DELETE FROM passwords_vault WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password not found' });
    }

    res.json({ message: 'Password deleted successfully' });
  } catch (error) {
    console.error('Error deleting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/passwords/:id/audit
 * Buscar histórico de auditoria de uma senha
 */
router.get('/:id/audit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        a.id,
        a.action,
        a.ip_address,
        a.timestamp,
        u.full_name as user_name,
        u.email as user_email
      FROM passwords_vault_audit a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.password_id = $1
      ORDER BY a.timestamp DESC
      LIMIT 100`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
