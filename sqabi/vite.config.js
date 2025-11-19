// vite.config.js (CommonJS)
const path = require('path');
const { defineConfig, loadEnv } = require('vite');
const reactImport = require('@vitejs/plugin-react');
const react = reactImport.default ?? reactImport;

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const SELF = env.VITE_SELF_HOSTED === 'true';
  const apiTarget = env.VITE_API_BASE || 'http://localhost:5174';

  // monta proxy só se tiver URL http(s) válida
  const proxy =
    SELF && isHttpUrl(apiTarget)
      ? {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy, // pode ficar undefined (sem proxy) se VITE_API_BASE não for http(s)
    },
    preview: {
      port: 5173,
    },
    // evita erros de libs que leem process.env no client
    define: { 'process.env': {} },
  };
});
