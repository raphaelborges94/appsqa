// src/api/base44Client.js
// Cliente self-hosted (sem @base44/sdk)
import axios from 'axios'

// Normaliza base da API: aceita '/api', 'http://localhost:5174' ou 'http://localhost:5174/api'
const rawBase = import.meta.env.VITE_API_BASE || '/api'
const API_BASE = (() => {
  if (/^https?:\/\//i.test(rawBase)) {
    return rawBase.endsWith('/api') ? rawBase : rawBase.replace(/\/$/, '') + '/api'
  }
  return rawBase
})()

// Instância HTTP
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
})

/**
 * Interceptor: injeta o token do BI (se existir) em todas as chamadas.
 * O token é salvo como 'auth_token' no localStorage pelo AuthContext.
 */
http.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('auth_token')
      if (t && !config.headers?.Authorization) {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${t}` }
      }
    }
  } catch {
    // sem impacto: apenas não injeta o header
  }
  return config
})

/**
 * (Opcional) Interceptor de resposta: loga 401/403 para facilitar debug.
 * Não altera o fluxo padrão do axios (erros continuam sendo "reject").
 */
http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      // Você pode, se quiser, limpar o token/estado aqui.
      // Mantemos só o log para não interferir no fluxo atual da aplicação.
      console.warn('[base44] requisição não autorizada:', status, err?.response?.data)
    }
    return Promise.reject(err)
  }
)

// CRUD genérico de entidades em /api/entities/:resource
function makeEntity(resource) {
  return {
    async list(params = {}) {
      const r = await http.get(`/entities/${resource}`, { params })
      const raw = r?.data

      // Normalização: sempre { items, total, ...raw }
      let items, total
      if (Array.isArray(raw)) {
        items = raw
        total = raw.length
        return { items, total }
      }
      if (raw && typeof raw === 'object') {
        items = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.data) ? raw.data : [])
        total = typeof raw.total === 'number' ? raw.total : items.length
        return { ...raw, items, total }
      }
      return { items: [], total: 0 }
    },

    async create(data) {
      const r = await http.post(`/entities/${resource}`, data)
      return r.data
    },
    async get(id) {
      const r = await http.get(`/entities/${resource}/${id}`)
      return r.data
    },
    async update(id, data) {
      const r = await http.put(`/entities/${resource}/${id}`, data)
      return r.data
    },
    async delete(id) {
      const r = await http.delete(`/entities/${resource}/${id}`)
      return r.data
    },
  }
}

// CRUD específico para usuários (PostgreSQL via /api/users)
function makeUserEntity() {
  return {
    async list(params = {}) {
      const r = await http.get('/users', { params })
      const raw = r?.data

      // Normalização: sempre { items, total, ...raw }
      let items, total
      if (Array.isArray(raw)) {
        items = raw
        total = raw.length
        return { items, total }
      }
      if (raw && typeof raw === 'object') {
        items = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.data) ? raw.data : [])
        total = typeof raw.total === 'number' ? raw.total : items.length
        return { ...raw, items, total }
      }
      return { items: [], total: 0 }
    },

    async create(data) {
      const r = await http.post('/users', data)
      return r.data
    },
    async get(id) {
      const r = await http.get(`/users/${id}`)
      return r.data
    },
    async update(id, data) {
      const r = await http.put(`/users/${id}`, data)
      return r.data
    },
    async delete(id) {
      const r = await http.delete(`/users/${id}`)
      return r.data
    },
    async search(query) {
      const r = await http.post('/users/search', { query })
      return r.data
    },
  }
}

// CRUD específico para empresas (PostgreSQL via /api/empresas)
function makeEmpresaEntity() {
  return {
    async list(params = {}) {
      const r = await http.get('/empresas', { params })
      const raw = r?.data

      // Normalização: sempre { items, total, ...raw }
      let items, total
      if (Array.isArray(raw)) {
        items = raw
        total = raw.length
        return { items, total }
      }
      if (raw && typeof raw === 'object') {
        items = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.data) ? raw.data : [])
        total = typeof raw.total === 'number' ? raw.total : items.length
        return { ...raw, items, total }
      }
      return { items: [], total: 0 }
    },

    async create(data) {
      const r = await http.post('/empresas', data)
      return r.data
    },
    async get(id) {
      const r = await http.get(`/empresas/${id}`)
      return r.data
    },
    async update(id, data) {
      const r = await http.put(`/empresas/${id}`, data)
      return r.data
    },
    async delete(id) {
      const r = await http.delete(`/empresas/${id}`)
      return r.data
    },
    async search(query) {
      const r = await http.post('/empresas/search', { query })
      return r.data
    },
  }
}

// Mapa de funções → rotas REST locais (suporta nomes antigos e novos)
const functionRoutes = {
  // --- Conexões / DB ---
  testDatabaseConnection: '/db/test-connection',
  testConnection: '/db/test-connection',
  db_testConnection: '/db/test-connection',

  // --- Metadados (tabelas/views) ---
  listDatabaseObjects: '/db/list-objects',
  listTablesAndViews: '/db/list-objects',
  db_listDatabaseObjects: '/db/list-objects',

  // --- Validação / Preview ---
  validateDatasetQuery: '/dataset/validate',
  validateSQL: '/dataset/validate',
  db_validateDatasetQuery: '/dataset/validate',

  // --- Busca de dados ---
  fetchDatasetData: '/dataset/fetch',
  previewDataset: '/dataset/fetch',
  db_fetchDatasetData: '/dataset/fetch',

  // --- Health opcional ---
  health: '/health',
}

// Cliente self-hosted (Express)
const selfClient = {
  entities: {
    Connection: makeEntity('Connection'),
    DataSource: makeEntity('DataSource'),
    ChartConfig: makeEntity('ChartConfig'),
    Dashboard: makeEntity('Dashboard'),
    User: makeUserEntity(),
    Empresa: makeEmpresaEntity(),
  },

  functions: {
    async invoke(name, payload = {}) {
      const path = functionRoutes[name]
      if (!path) {
        const known = Object.keys(functionRoutes).join(', ')
        throw new Error(`função desconhecida: ${name}. Suportadas: ${known}`)
      }
      const r = await http.post(path, payload)
      const raw = r?.data ?? {}

      // Normalização p/ funções: sempre expõe { data, result } com o objeto útil
      const useful =
        (raw && typeof raw === 'object' && 'result' in raw && raw.result) ? raw.result : raw
      return { ...raw, data: useful, result: useful }
    },
  },

  async health() {
    const r = await http.get('/health')
    return r.data
  },
}

export const base44 = selfClient
