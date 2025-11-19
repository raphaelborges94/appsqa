# Configuração de Segurança - Bypass de Permissões

## ⚠️ IMPORTANTE - LEIA ANTES DE FAZER DEPLOY

Este diretório contém configurações de segurança que incluem **BYPASSES TEMPORÁRIOS** para facilitar o desenvolvimento.

## Bypass de Permissões Ativo

### O que é?

O arquivo `security.js` contém uma lista de emails que têm **acesso total** a todas as telas e funcionalidades do sistema, **ignorando completamente** as regras de controle de acesso configuradas no sistema.

### Por que existe?

Durante o desenvolvimento inicial, configurar permissões para cada tela pode ser trabalhoso e atrasar o desenvolvimento. Este bypass permite que desenvolvedores testem funcionalidades rapidamente sem precisar configurar permissões primeiro.

### Onde está sendo usado?

- **Frontend:** `src/components/access/PermissionChecker.jsx`
- **Configuração:** `src/config/security.js`

## 🚨 CHECKLIST PRÉ-PRODUÇÃO

Antes de fazer deploy em produção, **OBRIGATORIAMENTE**:

### Passo 1: Desabilitar o Bypass

Edite o arquivo `src/config/security.js`:

```javascript
// Mudar de:
export const ENABLE_PERMISSION_BYPASS = true;

// Para:
export const ENABLE_PERMISSION_BYPASS = false;
```

### Passo 2: Limpar Lista de Emails

No mesmo arquivo, remova ou comente todos os emails:

```javascript
export const BYPASS_EMAILS = [
  // Todos os emails devem ser removidos em produção
  // process.env.DEV_BYPASS_EMAIL || 'raphael@sqasistemas.com',
];
```

### Passo 3: Verificar Variáveis de Ambiente

Certifique-se de que `DEV_BYPASS_EMAIL` **NÃO** está definida no `.env` de produção.

### Passo 4: Configurar Permissões Real

Antes de desabilitar o bypass, certifique-se de que:

1. ✅ Todas as telas têm regras de controle de acesso configuradas
2. ✅ Usuários estão atribuídos aos grupos corretos
3. ✅ As permissões foram testadas com usuários reais (não bypass)

## Como Verificar se o Bypass Está Ativo

### No Console do Navegador

Quando o bypass está ativo, você verá mensagens como:

```
🔓 [BYPASS DE PERMISSÕES ATIVO] {
  email: "raphael@sqasistemas.com",
  action: "visualizar",
  timestamp: "2025-01-16T...",
  warning: "Este bypass deve ser desabilitado em produção"
}
```

### No Código

Verifique o arquivo `src/config/security.js`:

```javascript
export const ENABLE_PERMISSION_BYPASS = true; // ← Se estiver true, bypass está ATIVO
```

## Reversão Rápida

Se precisar reabilitar o bypass temporariamente:

1. Edite `src/config/security.js`
2. Mude `ENABLE_PERMISSION_BYPASS` para `true`
3. Adicione seu email em `BYPASS_EMAILS`
4. Reinicie o servidor de desenvolvimento

## Logs de Auditoria

Todos os usos do bypass são registrados no console com o formato:

```javascript
{
  email: "email@exemplo.com",
  action: "visualizar" | "incluir" | "alterar" | "excluir" | "exportar" | "importar",
  timestamp: "ISO 8601 timestamp",
  warning: "Este bypass deve ser desabilitado em produção"
}
```

## Contato

Se você encontrou este arquivo e não sabe o que fazer:

1. **NÃO faça deploy em produção** sem ler este documento
2. Entre em contato com o desenvolvedor responsável
3. Certifique-se de que o bypass foi desabilitado antes do deploy

---

**Última atualização:** 2025-01-16
**Responsável:** Equipe de Desenvolvimento SQA Sistemas
