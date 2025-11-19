import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasPermissionBypass, logBypassUsage } from "@/config/security";

/**
 * Hook para verificar permissões de forma robusta
 * Considera: usuário individual, grupo de usuários, empresa e prioridade
 * As permissões são CUMULATIVAS - se tiver permissão em qualquer regra, tem acesso
 *
 * NOTA: Emails configurados em @/config/security.js podem ter bypass de permissões
 * durante desenvolvimento. Este bypass deve ser DESABILITADO em produção.
 */
export function usePermissions(screenId, currentUser) {
  const { data: accessRules = [] } = useQuery({
    queryKey: ['access', screenId],
    queryFn: async () => {
      const rules = await base44.entities.AccessControl.filter({ 
        screen_id: screenId,
        ativa: true 
      });
      // Ordenar por prioridade (maior primeiro)
      return rules.sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
    },
    enabled: !!screenId,
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-group', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      try {
        // FIXME: ID da tela de usuários hardcoded - precisa ser configurável
        // Por enquanto, desabilitado pois a tela não existe
        // const users = await base44.entities.DynamicData.filter({
        //   screen_id: "6914d466e7fd5cb9e8951dae"
        // });
        // const userData = users.find(u => u.data.email === currentUser.email);
        // return userData?.data?.grupo_id ? [userData.data.grupo_id] : [];

        return []; // Retornar vazio temporariamente
      } catch (err) {
        console.warn('Erro ao buscar grupos do usuário:', err.message);
        return [];
      }
    },
    enabled: !!currentUser?.email,
  });

  const checkPermission = (action) => {
    if (!currentUser || !screenId) return false;

    // ========================================================================
    // BYPASS DE PERMISSÕES - DESENVOLVIMENTO
    // ========================================================================
    // ATENÇÃO: Este bypass deve ser DESABILITADO em produção!
    // Configure em: src/config/security.js
    //
    // Permite que emails específicos (configurados para desenvolvimento)
    // tenham acesso total ao sistema sem precisar configurar permissões.
    //
    // Para desabilitar: defina ENABLE_PERMISSION_BYPASS = false em security.js
    // ========================================================================
    if (currentUser.email && hasPermissionBypass(currentUser.email)) {
      logBypassUsage(currentUser.email, action);
      return true; // Bypass ativo - acesso total concedido
    }
    // ========================================================================

    // Admins têm acesso total
    if (currentUser.role === 'admin') return true;

    // Verificar todas as regras aplicáveis ao usuário
    const applicableRules = accessRules.filter(rule => {
      // Regra global
      if (rule.tipo_acesso === 'global') return true;
      
      // Regra por usuário específico
      if (rule.tipo_acesso === 'usuario' && rule.usuario_email === currentUser.email) {
        return true;
      }
      
      // Regra por grupo
      if (rule.tipo_acesso === 'grupo' && rule.grupo_id && userGroups.includes(rule.grupo_id)) {
        return true;
      }
      
      return false;
    });

    // Se não há regras aplicáveis, não tem permissão
    if (applicableRules.length === 0) return false;

    // Permissão cumulativa: se QUALQUER regra dá permissão, o usuário tem acesso
    const hasPermission = applicableRules.some(rule => {
      switch (action) {
        case 'incluir': return rule.pode_incluir;
        case 'alterar': return rule.pode_alterar;
        case 'visualizar': return rule.pode_visualizar;
        case 'excluir': return rule.pode_excluir;
        case 'exportar': return rule.pode_exportar;
        case 'importar': return rule.pode_importar;
        default: return false;
      }
    });

    return hasPermission;
  };

  return {
    checkPermission,
    accessRules,
    userGroups,
    isLoading: !currentUser,
  };
}