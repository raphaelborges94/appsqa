module.exports = {
  apps: [
    {
      name: 'sqabi-backend',
      script: 'sqabi/server/index.js',
      cwd: '/app',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5174,
      },
    },
    {
      name: 'sqahub-backend',
      script: 'sqahub-backend/server.js',
      cwd: '/app',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'sqabi-frontend',
      script: 'npx',
      args: 'serve -s sqabi/dist -l 5173',
      cwd: '/app',
      watch: false,
    },
    {
      name: 'sqahub-frontend',
      script: 'npx',
      args: 'serve -s sqahub/dist -l 8080',
      cwd: '/app',
      watch: false,
    }
  ],
};
