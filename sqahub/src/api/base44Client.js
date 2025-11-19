// Wrapper de compatibilidade para API entities
// Este arquivo mantém a interface legada mas usa o apiClient por baixo
import { apiClient } from './client';

// Cliente de entidades (mantém nome 'base44' por compatibilidade)
export const base44 = {
  // Auth methods - usar AuthContext ao invés destes métodos
  auth: apiClient.auth,

  // Entities/Database methods (para compatibilidade)
  entities: {
    // Métodos genéricos
    create: (entityName, data) => apiClient.post(`/api/entities/${entityName}`, data),
    read: (entityName, id) => apiClient.get(`/api/entities/${entityName}/${id}`),
    update: (entityName, id, data) => apiClient.put(`/api/entities/${entityName}/${id}`, data),
    delete: (entityName, id) => apiClient.delete(`/api/entities/${entityName}/${id}`),
    list: (entityName, params) => apiClient.get(`/api/entities/${entityName}`, params),
    query: (entityName, query) => apiClient.post(`/api/entities/${entityName}/query`, query),

    // Entidades específicas do Screen Builder
    ScreenDefinition: {
      list: async (sort) => {
        const response = await apiClient.get('/api/screens', { sort });
        // Filtrar CRUDs e Subtables (excluir apenas trees)
        return response.filter(screen =>
          screen.screen_type === 'crud' ||
          screen.screen_type === 'subtable' ||
          !screen.screen_type
        );
      },
      get: async (id) => {
        return await apiClient.get(`/api/screens/${id}`);
      },
      create: async (data) => {
        return await apiClient.post('/api/screens', data);
      },
      update: async (id, data) => {
        return await apiClient.put(`/api/screens/${id}`, data);
      },
      delete: async (id) => {
        return await apiClient.delete(`/api/screens/${id}`);
      },
      syncTable: async (screenId) => {
        return await apiClient.post(`/api/screens/${screenId}/sync-table`);
      },
    },

    FieldDefinition: {
      list: async () => {
        // Buscar todos os fields de todas as screens
        const screens = await apiClient.get('/api/screens');
        const allFields = [];
        for (const screen of screens) {
          const fields = await apiClient.get(`/api/screens/${screen.id}/fields`);
          allFields.push(...fields);
        }
        return allFields;
      },
      filter: async (params, sort) => {
        const { screen_id } = params;
        if (screen_id) {
          const fields = await apiClient.get(`/api/screens/${screen_id}/fields`);
          // Ordenar se necessário
          if (sort) {
            const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
            const sortDir = sort.startsWith('-') ? -1 : 1;
            fields.sort((a, b) => {
              const aVal = a[sortField] || 0;
              const bVal = b[sortField] || 0;
              return sortDir * (aVal - bVal);
            });
          }
          return fields;
        }
        return [];
      },
      listByScreen: async (screenId) => {
        return await apiClient.get(`/api/screens/${screenId}/fields`);
      },
      create: async (data) => {
        const { screen_id, ...fieldData } = data;
        return await apiClient.post(`/api/screens/${screen_id}/fields`, fieldData);
      },
      update: async (id, data) => {
        const { screen_id, ...fieldData } = data;
        return await apiClient.put(`/api/screens/${screen_id}/fields/${id}`, fieldData);
      },
      delete: async (id, screenId) => {
        return await apiClient.delete(`/api/screens/${screenId}/fields/${id}`);
      },
    },

    ActionButton: {
      list: async () => {
        // Buscar todos os buttons de todas as screens
        const screens = await apiClient.get('/api/screens');
        const allButtons = [];
        for (const screen of screens) {
          const buttons = await apiClient.get(`/api/screens/${screen.id}/buttons`);
          allButtons.push(...buttons);
        }
        return allButtons;
      },
      listByScreen: async (screenId) => {
        return await apiClient.get(`/api/screens/${screenId}/buttons`);
      },
      create: async (data) => {
        const { screen_id, ...buttonData } = data;
        return await apiClient.post(`/api/screens/${screen_id}/buttons`, buttonData);
      },
      update: async (id, data) => {
        const { screen_id, ...buttonData } = data;
        return await apiClient.put(`/api/screens/${screen_id}/buttons/${id}`, buttonData);
      },
      delete: async (id, screenId) => {
        return await apiClient.delete(`/api/screens/${screenId}/buttons/${id}`);
      },
    },

    BrandingConfig: {
      list: async (sort) => {
        return await apiClient.get('/api/branding', { sort });
      },
      getActive: async () => {
        return await apiClient.get('/api/branding/active');
      },
      get: async (id) => {
        return await apiClient.get(`/api/branding/${id}`);
      },
      create: async (data) => {
        return await apiClient.post('/api/branding', data);
      },
      update: async (id, data) => {
        return await apiClient.put(`/api/branding/${id}`, data);
      },
      delete: async (id) => {
        return await apiClient.delete(`/api/branding/${id}`);
      },
    },

    MenuConfig: {
      list: async (sort) => {
        return await apiClient.get('/api/branding/menu-configs', { sort });
      },
      getActive: async () => {
        return await apiClient.get('/api/branding/menu-configs/active');
      },
      get: async (id) => {
        return await apiClient.get(`/api/branding/menu-configs/${id}`);
      },
      create: async (data) => {
        return await apiClient.post('/api/branding/menu-configs', data);
      },
      update: async (id, data) => {
        return await apiClient.put(`/api/branding/menu-configs/${id}`, data);
      },
      delete: async (id) => {
        return await apiClient.delete(`/api/branding/menu-configs/${id}`);
      },
    },

    // TreeScreenDefinition - Telas em estrutura de árvore
    TreeScreenDefinition: {
      list: async (sort) => {
        const response = await apiClient.get('/api/screens', { sort });
        // Filtrar por screen_type (novo campo explícito)
        return response.filter(screen => screen.screen_type === 'tree');
      },
      get: async (id) => {
        return await apiClient.get(`/api/screens/${id}`);
      },
      create: async (data) => {
        return await apiClient.post('/api/screens', data);
      },
      update: async (id, data) => {
        return await apiClient.put(`/api/screens/${id}`, data);
      },
      delete: async (id) => {
        return await apiClient.delete(`/api/screens/${id}`);
      },
      syncTable: async (screenId) => {
        return await apiClient.post(`/api/screens/${screenId}/sync-table`);
      },
    },

    // DynamicData - Dados de tabelas dinâmicas criadas pelo Screen Builder
    DynamicData: {
      list: async (tableName, sort) => {
        return await apiClient.get(`/api/entities/${tableName}`, { sort });
      },
      filter: async (params, sort) => {
        const { screen_id, ...otherParams } = params;
        // Buscar nome da tabela pela screen_id
        const screen = await apiClient.get(`/api/screens/${screen_id}`);
        const tableName = screen.tabela_nome;
        return await apiClient.get(`/api/entities/${tableName}`, {
          sort,
          filter: JSON.stringify(otherParams)
        });
      },
      get: async (tableName, id) => {
        return await apiClient.get(`/api/entities/${tableName}/${id}`);
      },
      create: async (params) => {
        const { screen_id, table_name, data } = params;
        // Usar table_name se fornecido, senão buscar pela screen_id
        let tableName = table_name;
        if (!tableName && screen_id) {
          const screen = await apiClient.get(`/api/screens/${screen_id}`);
          tableName = screen.tabela_nome;
        }
        return await apiClient.post(`/api/entities/${tableName}`, data);
      },
      update: async (id, params) => {
        const { table_name, data } = params;
        return await apiClient.put(`/api/entities/${table_name}/${id}`, data);
      },
      delete: async (id, tableName) => {
        return await apiClient.delete(`/api/entities/${tableName}/${id}`);
      },
    },
  },

  // Functions/Integrations methods
  functions: {
    call: (functionName, params) => apiClient.post(`/api/functions/${functionName}`, params),
    invoke: async (functionName, params) => {
      // Para compatibilidade com código antigo
      if (functionName === 'generateEntityFile') {
        // Gerar JSON entity file para a screen
        const { screenId } = params;

        // Buscar screen e fields
        const screen = await apiClient.get(`/api/screens/${screenId}`);
        const fields = await apiClient.get(`/api/screens/${screenId}/fields`);

        // Gerar JSON no formato esperado
        const entityJson = {
          name: screen.tabela_nome,
          fields: fields.map(field => ({
            name: field.nome_campo,
            label: field.label,
            type: field.tipo,
            required: field.obrigatorio,
            readonly: field.somente_leitura,
            unique: field.unico,
            maxLength: field.tamanho_maximo,
            defaultValue: field.valor_padrao,
            fkScreen: field.fk_screen_id,
            fkDisplayField: field.fk_display_field,
          })),
        };

        return {
          success: true,
          json: entityJson,
          fileName: `${screen.tabela_nome}.json`,
        };
      }

      // Outras functions podem ser adicionadas aqui
      return apiClient.post(`/api/functions/${functionName}`, params);
    },
  },

  // Socket/Realtime - Desabilitado para aplicação self-hosted
  socket: {
    on: () => console.warn('Socket.io não disponível em modo self-hosted'),
    off: () => {},
    emit: () => console.warn('Socket.io não disponível em modo self-hosted'),
    connected: false,
  },

  // Storage/Files methods
  storage: {
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/api/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    delete: (fileId) => apiClient.delete(`/api/storage/${fileId}`),
    getUrl: (fileId) => `${apiClient.baseURL}/api/storage/${fileId}`,
  }
};

// Para compatibilidade com código antigo que pode usar isso
export default base44;
