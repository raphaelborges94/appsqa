import express from 'express';
import cors from 'cors';
import pool, { query } from './db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authMiddleware,
  optionalAuthMiddleware
} from './auth.js';
import authRoutes from './routes/auth.js';
import oauthRoutes from './routes/oauth.js';
import screensRoutes from './routes/screens.js';
import entitiesRoutes from './routes/entities.js';
import brandingRoutes from './routes/branding.js';
import usersRoutes from './routes/users.js';
import sessionsRoutes from './routes/sessions.js';
import passwordsRoutes from './routes/passwords.js';
import ssoRoutes from './routes/sso.js';

const app = express();
const PORT = process.env.PORT || 8547;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ===== Health Check =====
app.get('/api/health', async (req, res) => {
  try {
    // Testar conexão com o banco
    await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Backend rodando!',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ===== Auth Routes =====
// NOTA: As rotas de autenticação agora estão em routes/auth.js (passwordless login)
// As rotas antigas de login/register com senha foram removidas

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/oauth', oauthRoutes);
app.use('/', oauthRoutes); // Para /.well-known/openid-configuration
app.use('/api/screens', screensRoutes);
app.use('/api/entities', entitiesRoutes);
app.use('/api/branding', brandingRoutes); // Serve tanto /api/branding quanto /api/branding/menu-configs
app.use('/api/users', usersRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/passwords', passwordsRoutes);
app.use('/api/sso', ssoRoutes); // SSO para microserviços

// ===== Protected Routes Example =====
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.PGDATABASE} em ${process.env.PGHOST}:${process.env.PGPORT}`);
  console.log(`🔐 OAuth2/OIDC: ${process.env.OAUTH_ISSUER}`);
  console.log(`📧 Email: ${process.env.SMTP_USER}`);
});
