/**
 * Routing Utilities
 * Utilitários de roteamento para SQA HUB
 */

/**
 * Cria URL para navegação entre páginas
 * @param {string} pageName - Nome da página (ex: "ScreenBuilder")
 * @param {object} params - Parâmetros URL opcionais
 * @returns {string} URL da página
 */
export function createPageUrl(pageName, params) {
  if (!pageName) return '/';
  
  const basePath = `/${String(pageName).toLowerCase()}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${basePath}?${searchParams.toString()}`;
  }
  
  return basePath;
}

/**
 * Navega para uma página programaticamente
 * @param {string} pageName - Nome da página
 * @param {object} params - Parâmetros URL opcionais
 */
export function navigateToPage(pageName, params) {
  const url = createPageUrl(pageName, params);
  window.location.href = url;
}

/**
 * Obtém parâmetros da URL atual
 * @returns {URLSearchParams} Objeto com parâmetros da URL
 */
export function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

/**
 * Obtém um parâmetro específico da URL
 * @param {string} key - Nome do parâmetro
 * @returns {string|null} Valor do parâmetro ou null
 */
export function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}