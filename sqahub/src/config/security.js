/**
 * ============================================================================
 * CONFIGURAÇÕES DE SEGURANÇA - BYPASS TEMPORÁRIO
 * ============================================================================
 *
 * ATENÇÃO: Este arquivo contém configurações de bypass que devem ser
 * REMOVIDAS ou DESABILITADAS em produção.
 *
 * Estas configurações são para DESENVOLVIMENTO e TESTES apenas.
 *
 * ANTES DE FAZER DEPLOY EM PRODUÇÃO:
 * 1. Definir ENABLE_PERMISSION_BYPASS = false
 * 2. Remover ou limpar o array BYPASS_EMAILS
 * 3. Verificar que nenhum email de produção está na lista
 *
 * ============================================================================
 */

/**
 * BYPASS DE PERMISSÕES - DESENVOLVIMENTO
 *
 * Quando habilitado, os emails listados abaixo terão acesso TOTAL a todas
 * as telas e funcionalidades, independente das regras de controle de acesso.
 *
 * USO RECOMENDADO:
 * - Apenas durante desenvolvimento
 * - Para contas de teste/desenvolvimento
 * - Para facilitar configuração inicial do sistema
 *
 * NUNCA use emails de usuários reais ou contas de produção aqui!
 */
export const ENABLE_PERMISSION_BYPASS = true; // ← Mudar para false em produção

/**
 * Lista de emails que terão bypass de permissões
 *
 * IMPORTANTE: Use apenas emails de desenvolvimento/teste
 */
export const BYPASS_EMAILS = [
  // Email do desenvolvedor/administrador para testes
  // Configurado via variável de ambiente VITE_DEV_BYPASS_EMAIL
  // Nota: No Vite, variáveis de ambiente devem começar com VITE_ para serem acessíveis
  ...(import.meta.env?.VITE_DEV_BYPASS_EMAIL ? [import.meta.env.VITE_DEV_BYPASS_EMAIL] : []),

  // Fallback hardcoded (apenas durante desenvolvimento inicial)
  // IMPORTANTE: Comentar ou remover em produção!
  'raphael.borges94@gmail.com',

  // Adicione outros emails de teste aqui se necessário:
  // 'teste@sqasistemas.com',
  // 'dev@sqasistemas.com',
].filter(Boolean); // Remove valores vazios/undefined

/**
 * Verifica se um email está na lista de bypass
 * @param {string} email - Email do usuário
 * @returns {boolean} - true se o email tem bypass ativo
 */
export function hasPermissionBypass(email) {
  if (!ENABLE_PERMISSION_BYPASS) return false;
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  return BYPASS_EMAILS.some(bypassEmail =>
    bypassEmail && bypassEmail.toLowerCase().trim() === normalizedEmail
  );
}

/**
 * Log de auditoria para uso de bypass
 * @param {string} email - Email do usuário
 * @param {string} action - Ação sendo executada
 */
export function logBypassUsage(email, action) {
  if (hasPermissionBypass(email)) {
    // Log comentado para manter o console limpo durante desenvolvimento
    // console.warn('🔓 [BYPASS DE PERMISSÕES ATIVO]', {
    //   email,
    //   action,
    //   timestamp: new Date().toISOString(),
    //   warning: 'Este bypass deve ser desabilitado em produção'
    // });
  }
}
