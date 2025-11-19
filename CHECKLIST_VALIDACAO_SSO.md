# ✅ Checklist de Validação - Sistema SSO

Use este checklist para validar que o sistema SSO foi implementado corretamente.

---

## 📋 Pré-Requisitos

### Banco de Dados

- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados `sqahub` criado
- [ ] Usuário PostgreSQL configurado com permissões
- [ ] Tabela `sso_tokens` existe (verificar com `\dt` no psql)

**Comando de verificação**:
```bash
psql -U postgres -d sqahub -c "\dt sso_tokens"
```

### Dependências Instaladas

- [ ] Node.js >= 18.x instalado
- [ ] `npm install` executado no SQAHUB
- [ ] `npm install` executado no SQABI
- [ ] `node-fetch` instalado no servidor do BI

**Comandos de verificação**:
```bash
# SQAHUB
cd "SQA HUB"
npm list jsonwebtoken

# SQABI
cd "SQA BI/server"
npm list node-fetch
```

### Variáveis de Ambiente

- [ ] `SQA HUB/.env.local` criado e configurado
- [ ] `SQA BI/.env.local` configurado
- [ ] `SQAHUB_API_URL` definido no BI
- [ ] `SQA_BI_URL` definido no HUB
- [ ] `SSO_SECRET` definido no HUB (diferente de `JWT_SECRET`)

**Arquivo de exemplo**: `.env.example`

---

## 🏗️ Arquivos Criados/Modificados

### SQAHUB

- [ ] `src/Layout.jsx` - Item "Construtor de BI" adicionado ao menu
- [ ] `src/pages/BiBuilder.jsx` - Página criada
- [ ] `src/pages.config.js` - Rota `bibuilder` registrada
- [ ] `src/backend/routes/sso.js` - Rotas SSO criadas
- [ ] `src/backend/server.js` - Rotas SSO registradas
- [ ] `src/backend/migrations/012_create_sso_tokens_table.sql` - Migration criada
- [ ] `.env.example` - Variáveis SSO adicionadas

### SQABI

- [ ] `src/pages/SSOCallback.jsx` - Página criada
- [ ] `src/pages.config.js` - Rota `sso/callback` registrada
- [ ] `src/lib/AuthContext.jsx` - Função `loginWithSSO` adicionada
- [ ] `server/routes/sso.js` - Rotas SSO criadas
- [ ] `server/index.js` - Rotas SSO registradas
- [ ] `.env.local` - Variável `SQAHUB_API_URL` adicionada

### Documentação

- [ ] `SSO_DOCUMENTATION.md` criado
- [ ] `SSO_SETUP_GUIDE.md` criado
- [ ] `RESUMO_SSO_IMPLEMENTACAO.md` criado
- [ ] `CHECKLIST_VALIDACAO_SSO.md` criado (este arquivo)

---

## 🚀 Testes de Funcionalidade

### 1. Inicialização dos Serviços

#### SQAHUB

- [ ] Backend inicia sem erros na porta 8547
- [ ] Frontend inicia sem erros na porta 8546
- [ ] Endpoint `/api/health` responde com status 200
- [ ] Console não mostra erros de import/require

**Comandos**:
```bash
cd "SQA HUB"
npm run dev
```

**Verificar**:
- Terminal mostra: `🚀 Backend rodando em http://localhost:8547`
- Acessar: http://localhost:8547/api/health

#### SQABI

- [ ] Backend inicia sem erros na porta 5174
- [ ] Frontend inicia sem erros na porta 5173
- [ ] Endpoint `/api/health` responde com status 200
- [ ] Console não mostra erros de import/require

**Comandos**:
```bash
cd "SQA BI"
npm run dev
```

**Verificar**:
- Terminal mostra: `[self-hosted] API rodando em http://localhost:5174/api`
- Acessar: http://localhost:5174/api/health

### 2. Menu e Interface

- [ ] Login no SQAHUB funciona (passwordless)
- [ ] Menu lateral carrega corretamente
- [ ] Grupo "Construtores de Tela" está visível
- [ ] Item "Construtor de BI" aparece no menu
- [ ] Ícone `BarChart3` está visível ao lado do item
- [ ] Clicar no item redireciona para `/bibuilder`

**Caminho**: Construtores de Tela → Construtor de BI

### 3. Página BiBuilder

- [ ] Página `/bibuilder` carrega sem erros
- [ ] Informações do usuário aparecem corretamente
- [ ] Card "Autenticação SSO" mostra email do usuário
- [ ] Lista de recursos do BI está visível
- [ ] Botão "Abrir SQABI em Nova Janela" está presente
- [ ] Card de "Segurança e Privacidade" está visível

### 4. Geração de Token SSO

- [ ] Clicar no botão mostra loading "Autenticando..."
- [ ] Console do backend mostra: `📨 POST /api/sso/generate-token`
- [ ] Console mostra: `[SSO] Token gerado para usuário...`
- [ ] Alert verde de sucesso aparece
- [ ] Mensagem "Token SSO Gerado" é exibida
- [ ] Token tem validade de 5 minutos

**Verificar no console do navegador (F12)**:
```javascript
// Deve mostrar objeto com token, redirectUrl, etc.
```

### 5. Redirecionamento para BI

- [ ] Nova janela/aba abre automaticamente
- [ ] URL contém: `http://localhost:5173/sso/callback?token=...`
- [ ] Página de callback SSO carrega
- [ ] Loading aparece com mensagem "Autenticando..."
- [ ] Três indicadores de progresso aparecem
- [ ] Sem erros no console do navegador

### 6. Validação do Token

#### Backend do BI

- [ ] Console mostra: `[api] POST /api/sso/validate`
- [ ] Requisição é feita para o SQAHUB
- [ ] Console mostra: `[SSO] Token validado: usuario@email.com`
- [ ] Nenhum erro 500/401/403 aparece

#### Backend do HUB

- [ ] Console mostra: `📨 POST /api/sso/validate-token`
- [ ] Token é encontrado no banco de dados
- [ ] Token é marcado como usado (`used = TRUE`)
- [ ] Console mostra: `[SSO] Token validado com sucesso: ...`

**Verificar no banco de dados**:
```sql
SELECT * FROM sso_tokens ORDER BY created_at DESC LIMIT 1;
-- Deve mostrar used = TRUE
```

### 7. Autenticação no BI

- [ ] Página de callback mostra sucesso
- [ ] Alert verde "Conexão Segura Estabelecida" aparece
- [ ] Mensagem "Você está sendo redirecionado..." aparece
- [ ] Redirecionamento para `/dashboard` acontece
- [ ] Usuário está autenticado no BI
- [ ] Dados do usuário aparecem no BI

**Verificar localStorage (F12 → Application → Local Storage)**:
- `sso_authenticated`: "true"
- `user_data`: JSON com dados do usuário

### 8. Sessão no BI

- [ ] Dashboard do BI carrega normalmente
- [ ] Menu lateral funciona
- [ ] Nome do usuário aparece no header/menu
- [ ] Email do usuário está correto
- [ ] Permissões do HUB são respeitadas

---

## 🔒 Testes de Segurança

### 1. Expiração de Tokens

- [ ] Tentar usar um token após 5 minutos falha
- [ ] Mensagem "Token expirado" aparece
- [ ] Erro 401 retornado

**Teste**:
1. Gerar token
2. Esperar 6 minutos
3. Tentar usar o token
4. Verificar erro

### 2. Reutilização de Tokens

- [ ] Tentar usar o mesmo token duas vezes falha
- [ ] Mensagem "Token já foi utilizado" aparece
- [ ] Campo `used` no banco está como `TRUE`

**Teste**:
1. Gerar token
2. Usar token com sucesso
3. Tentar usar novamente
4. Verificar erro

**SQL de verificação**:
```sql
SELECT used, used_at FROM sso_tokens
WHERE token = 'seu_token_aqui';
```

### 3. Token Inválido

- [ ] Token manipulado/corrompido é rejeitado
- [ ] Mensagem "Token JWT inválido" aparece
- [ ] Erro 401 retornado

**Teste**:
```bash
# Tentar com token fake
curl -X POST http://localhost:5174/api/sso/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "token_fake_123"}'
```

### 4. Serviço Inválido

- [ ] Token para serviço errado é rejeitado
- [ ] Mensagem "Serviço não permitido" ou "Service mismatch"
- [ ] Erro 400/401 retornado

### 5. Auditoria

- [ ] IP do cliente é registrado na tabela `sso_tokens`
- [ ] User-Agent é registrado
- [ ] Timestamps (`created_at`, `used_at`) estão corretos
- [ ] Logs no console mostram email do usuário

**SQL de verificação**:
```sql
SELECT
  user_id,
  service,
  ip_address,
  user_agent,
  created_at,
  used,
  used_at
FROM sso_tokens
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔄 Testes de Fluxo Completo

### Teste 1: Fluxo Normal (Caminho Feliz)

1. [ ] Fazer login no SQAHUB
2. [ ] Navegar para "Construtor de BI"
3. [ ] Clicar em "Abrir SQABI"
4. [ ] Nova janela abre
5. [ ] Token é validado
6. [ ] Usuário autenticado no BI
7. [ ] Dashboard do BI carrega

**Tempo esperado**: < 5 segundos

### Teste 2: Múltiplos Tokens

1. [ ] Gerar token 1
2. [ ] NÃO usar o token 1
3. [ ] Gerar token 2
4. [ ] Usar token 2 com sucesso
5. [ ] Verificar que token 1 ainda está válido (não expirado)

**SQL de verificação**:
```sql
SELECT COUNT(*) FROM sso_tokens
WHERE user_id = 'seu_user_id'
AND expires_at > CURRENT_TIMESTAMP
AND used = FALSE;
-- Deve retornar 1 (token 1)
```

### Teste 3: Logout no HUB

1. [ ] Autenticar no BI via SSO
2. [ ] Fazer logout no SQAHUB
3. [ ] Verificar que sessão no BI continua ativa
4. [ ] *Nota*: Single Logout (SLO) não está implementado ainda

### Teste 4: Reconexão

1. [ ] Autenticar no BI via SSO
2. [ ] Fechar janela do BI
3. [ ] Abrir BI novamente via HUB
4. [ ] Novo token SSO é gerado
5. [ ] Autenticação funciona novamente

---

## 📊 Endpoints da API

### SQAHUB

#### 1. Gerar Token SSO

```bash
curl -X POST http://localhost:8547/api/sso/generate-token \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service": "sqa-bi"}'
```

**Checklist**:
- [ ] Status 200 retornado
- [ ] JSON contém `success: true`
- [ ] Campo `token` presente
- [ ] Campo `redirectUrl` presente
- [ ] `expiresIn` é 300 (5 minutos)

#### 2. Validar Token SSO

```bash
curl -X POST http://localhost:8547/api/sso/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "SEU_TOKEN_SSO", "service": "sqa-bi"}'
```

**Checklist**:
- [ ] Status 200 retornado (primeira vez)
- [ ] JSON contém `success: true`
- [ ] Dados do usuário presentes
- [ ] Status 401 retornado (segunda tentativa)
- [ ] Mensagem "Token already used"

#### 3. Listar Tokens Ativos

```bash
curl -X GET http://localhost:8547/api/sso/active-tokens \
  -H "Authorization: Bearer SEU_AUTH_TOKEN"
```

**Checklist**:
- [ ] Status 200 retornado
- [ ] Array de tokens retornado
- [ ] Campo `count` presente
- [ ] Tokens expirados não aparecem

#### 4. Revogar Token

```bash
curl -X DELETE http://localhost:8547/api/sso/revoke-token/TOKEN_ID \
  -H "Authorization: Bearer SEU_AUTH_TOKEN"
```

**Checklist**:
- [ ] Status 200 retornado
- [ ] Mensagem de sucesso
- [ ] Token marcado como `used = TRUE` no banco

### SQABI

#### 1. Validar Token

```bash
curl -X POST http://localhost:5174/api/sso/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "SEU_TOKEN_SSO"}'
```

**Checklist**:
- [ ] Status 200 retornado
- [ ] JSON contém `success: true`
- [ ] Dados do usuário presentes
- [ ] Campo `authenticatedAt` presente

#### 2. Status SSO

```bash
curl -X GET http://localhost:5174/api/sso/status
```

**Checklist**:
- [ ] Status 200 retornado
- [ ] `ssoEnabled: true`
- [ ] `hubConnected: true` (se HUB estiver rodando)
- [ ] `hubUrl` correto

---

## 🐛 Troubleshooting

### Problema: Menu "Construtor de BI" não aparece

**Verificar**:
- [ ] Arquivo `Layout.jsx` foi modificado corretamente
- [ ] `BarChart3` foi importado
- [ ] Ícone adicionado ao `ICON_MAP`
- [ ] Item adicionado ao `staticNavigationItems`

**Solução**: Reiniciar o frontend do HUB

### Problema: Erro 404 ao acessar `/bibuilder`

**Verificar**:
- [ ] Rota registrada em `pages.config.js`
- [ ] Import de `BiBuilder` está correto
- [ ] Arquivo `BiBuilder.jsx` existe

**Solução**: Verificar paths e reiniciar

### Problema: "Cannot find module 'node-fetch'"

**Verificar**:
- [ ] `node-fetch` instalado em `SQA BI/server`

**Solução**:
```bash
cd "SQA BI/server"
npm install node-fetch@3.3.2
```

### Problema: "relation 'sso_tokens' does not exist"

**Verificar**:
- [ ] Migrations executadas

**Solução**:
```bash
cd "SQA HUB"
node src/backend/migrate.js
```

### Problema: CORS error no BI

**Verificar**:
- [ ] `CORS_ORIGIN` no `.env.local` do BI
- [ ] Frontend do BI rodando na porta correta

**Solução**: Adicionar `http://localhost:5173` ao CORS_ORIGIN

---

## ✅ Checklist Final

### Funcionalidades Essenciais

- [ ] Menu "Construtor de BI" visível
- [ ] Página BiBuilder carrega
- [ ] Token SSO é gerado
- [ ] Redirecionamento para BI funciona
- [ ] Token é validado com sucesso
- [ ] Usuário autenticado no BI
- [ ] Dados do usuário corretos

### Segurança

- [ ] Tokens expiram após 5 minutos
- [ ] Tokens são de uso único
- [ ] Auditoria registra IP e User-Agent
- [ ] JWT assinado corretamente
- [ ] Validação multi-camadas funciona

### Performance

- [ ] Autenticação completa em < 5 segundos
- [ ] Sem erros no console
- [ ] Sem warnings no console
- [ ] Redirecionamento é rápido

### Documentação

- [ ] Documentação técnica disponível
- [ ] Guia de setup disponível
- [ ] Resumo executivo criado
- [ ] Checklist de validação (este arquivo)

---

## 📝 Assinatura de Validação

**Data**: ____/____/________

**Validado por**: __________________________

**Status Final**: 🟢 Aprovado / 🟡 Aprovado com Ressalvas / 🔴 Reprovado

**Observações**:
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

---

## 📞 Próximos Passos

Após validação bem-sucedida:

1. [ ] Configurar variáveis de produção
2. [ ] Executar build de produção
3. [ ] Configurar HTTPS/SSL
4. [ ] Deploy em ambiente de staging
5. [ ] Testes de penetração
6. [ ] Deploy em produção
7. [ ] Monitoramento contínuo

---

**Boa sorte com a validação! 🚀**
