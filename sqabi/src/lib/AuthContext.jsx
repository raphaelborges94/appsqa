// src/lib/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { base44 } from '@/api/base44Client' // nosso cliente self-hosted
import { appParams } from '@/lib/app-params' // se o app usa params, continua valendo

// ---------- Util: base da API (aceita '/api' ou 'http://host:porta[/api]') ----------
const rawBase = import.meta.env.VITE_API_BASE || '/api'
const API_BASE = (() => {
  if (/^https?:\/\//i.test(rawBase)) {
    return rawBase.endsWith('/api') ? rawBase : rawBase.replace(/\/$/, '') + '/api'
  }
  return rawBase
})()

// ---------- Substituto do "createAxiosClient" do SDK ----------
function createAxiosClient({ baseURL = API_BASE, headers = {}, withCredentials = false } = {}) {
  const instance = axios.create({ baseURL, headers, withCredentials })
  // Interceptores simples (propaga token local se existir)
  instance.interceptors.request.use((config) => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (t && !config.headers?.Authorization) {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${t}` }
    }
    return config
  })
  return instance
}

// ---------- Contexto ----------
const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem('user_data')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  // Token (prioridade: appParams.token -> localStorage -> null)
  const [token, setToken] = useState(() => {
    if (appParams?.token) return appParams.token
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  })

  // Mantém token em localStorage para requests subsequentes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (token) localStorage.setItem('auth_token', token)
    else localStorage.removeItem('auth_token')
  }, [token])

  // Mantém user em localStorage (simples e compatível)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) localStorage.setItem('user_data', JSON.stringify(user))
    else localStorage.removeItem('user_data')
  }, [user])

  // Axios “compartilhado” no app
  const axiosClient = useMemo(() => createAxiosClient({ baseURL: API_BASE }), [])

  // Substituto para o antigo “checkAppState” do SDK
  const checkAppState = async () => {
    try {
      setLoading(true)
      setError(null)

      // Em self-hosted, basta checar o /health do nosso backend
      const r = await axiosClient.get('/health').catch(() => ({ data: null }))
      // Considera ok mesmo sem /health (para não travar o app)
      const ok = !!(r && r.data && (r.data.ok || r.data.status === 'ok'))

      if (!ok) {
        // não derruba o app; só loga
        console.warn('[Auth] /health não respondeu OK — seguindo mesmo assim.')
      }
      return { ok: true }
    } catch (e) {
      console.warn('App state check failed:', e?.message || e)
      setError(e)
      return { ok: false, error: e }
    } finally {
      setLoading(false)
    }
  }

  // Inicializa estado do app (equivalente ao velho SDK check)
  useEffect(() => {
    checkAppState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async ({ token: newToken, user: newUser } = {}) => {
    if (newToken) setToken(newToken)
    if (newUser) setUser(newUser)
    return { ok: true }
  }

  /**
   * Login via SSO - Valida token SSO do SQAHUB e recebe o biToken do BI
   * @param {string} ssoToken - Token SSO gerado pelo SQAHUB
   */
  const loginWithSSO = async (ssoToken) => {
    try {
      setLoading(true)
      setError(null)

      // Validar token SSO com o backend do BI
      const response = await axiosClient.post('/sso/validate', { token: ssoToken })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Falha na autenticação SSO')
      }

      const { user: authenticatedUser, biToken } = response.data.data || {}

      // Usa o token de sessão do BI quando disponível; fallback para ssoToken por compatibilidade
      const sessionToken = biToken || ssoToken

      setToken(sessionToken)
      setUser(authenticatedUser || null)

      if (typeof window !== 'undefined') {
        localStorage.setItem('sso_authenticated', 'true')
        if (authenticatedUser) {
          localStorage.setItem('user_data', JSON.stringify(authenticatedUser))
        }
      }

      console.log('[Auth] SSO login bem-sucedido:', authenticatedUser?.email || '(sem email)')

      return { ok: true, user: authenticatedUser }

    } catch (err) {
      console.error('[Auth] Erro no SSO login:', err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Erro na autenticação SSO'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Chamar endpoint de logout no servidor para invalidar a sessão
      if (token) {
        await axiosClient.post('/sso/logout').catch(err => {
          console.warn('[Auth] Erro ao chamar /sso/logout:', err.message)
          // Continua mesmo com erro (logout local sempre acontece)
        })
      }
    } catch (err) {
      console.error('[Auth] Erro no logout server-side:', err)
    }

    // Limpar estado local
    setToken(null)
    setUser(null)

    // Limpar dados SSO
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sso_authenticated')
      localStorage.removeItem('user_data')
      localStorage.removeItem('auth_token')
    }

    return { ok: true }
  }

  const value = useMemo(
    () => ({
      loading,
      error,
      user,
      token,
      setToken,
      setUser,
      axios: axiosClient,   // cliente axios para uso geral
      base44,               // mantém compat com código que chama base44.functions/entities
      checkAppState,
      login,
      loginWithSSO,         // nova função de login SSO (usa biToken)
      logout,
    }),
    [loading, error, user, token, axiosClient]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
