
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Zap, X, Code, Info, Edit, ChevronDown, ChevronRight, Database, Send, Download, Settings, FileSpreadsheet, Mail, Copy, CheckCircle, Calendar, RefreshCw, FileText, Upload, Calculator, MessageCircle, TrendingUp, Bell, Clipboard, Filter } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ParameterManager from "./ParameterManager";

export default function ActionButtonManager({ screenId, fields = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingButton, setEditingButton] = useState(null);
  const [showSystemVars, setShowSystemVars] = useState(false);
  const [showFieldVars, setShowFieldVars] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    codigo_js: "",
    posicao: "toolbar",
    icone: "Zap",
    cor: "#3B82F6",
    condicao_visibilidade: "",
    ordem: 0,
    ativo: true,
    exibir_modal_confirmacao: false,
    mensagem_confirmacao: "",
    parametros: [],
  });

  const { data: buttons, isLoading } = useQuery({
    queryKey: ['action-buttons', screenId],
    queryFn: () => base44.entities.ActionButton.filter({ screen_id: screenId }, 'ordem'),
    initialData: [],
    enabled: !!screenId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ActionButton.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-buttons', screenId] });
      toast.success('Botão de ação criado!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ActionButton.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-buttons', screenId] });
      toast.success('Botão de ação atualizado!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ActionButton.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-buttons', screenId] });
      toast.success('Botão de ação removido!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.codigo_js.trim()) {
      toast.error('Preencha nome e código do botão');
      return;
    }

    if (editingButton) {
      updateMutation.mutate({ 
        id: editingButton.id, 
        data: formData 
      });
    } else {
      createMutation.mutate({
        ...formData,
        screen_id: screenId,
      });
    }
  };

  const handleEdit = (button) => {
    setEditingButton(button);
    setFormData({
      nome: button.nome,
      codigo_js: button.codigo_js,
      posicao: button.posicao,
      icone: button.icone,
      cor: button.cor,
      condicao_visibilidade: button.condicao_visibilidade || "",
      ordem: button.ordem,
      ativo: button.ativo,
      exibir_modal_confirmacao: button.exibir_modal_confirmacao,
      mensagem_confirmacao: button.mensagem_confirmacao || "",
      parametros: button.parametros || [],
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Deseja remover este botão de ação?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      codigo_js: "",
      posicao: "toolbar",
      icone: "Zap",
      cor: "#3B82F6",
      condicao_visibilidade: "",
      ordem: 0,
      ativo: true,
      exibir_modal_confirmacao: false,
      mensagem_confirmacao: "",
      parametros: [],
    });
    setEditingButton(null);
    setShowForm(false);
  };

  const insertVariable = (varName) => {
    const textarea = document.getElementById('codigo_js');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.codigo_js;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + varName + after;
      setFormData({ ...formData, codigo_js: newText });
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length, start + varName.length);
      }, 0);
    }
  };

  const insertTemplate = (template) => {
    setFormData({ ...formData, codigo_js: template });
    toast.success('Template inserido!');
  };

  const availableVariables = [
    { name: 'record', description: 'Registro atual (todos os campos)', example: 'record.nome_campo' },
    { name: 'fields', description: 'Definições dos campos da tela', example: 'fields[0].label' },
    { name: 'user', description: 'Usuário logado', example: 'user.email' },
    { name: 'parametros', description: 'Valores dos parâmetros informados', example: 'parametros.data_inicio' },
    { name: 'toast', description: 'Exibir mensagens', example: 'toast.success("Ok!")' },
    { name: 'navigate', description: 'Navegar para outra tela', example: 'navigate("/page")' },
    { name: 'refresh', description: 'Recarregar dados da tela', example: 'refresh()' },
    { name: 'selectedRecords', description: 'IDs dos registros selecionados', example: 'selectedRecords.length' },
    { name: 'records', description: 'Todos os registros da tela', example: 'records.find(r => r.id === id)' },
    { name: 'base44', description: 'Cliente de API Entities', example: 'base44.entities.Table.create(data)' },
    { name: 'screenId', description: 'ID da tela atual', example: 'screenId' },
  ];

  const buttonTemplates = [
    {
      id: 'send_whatsapp_consolidated',
      name: 'WhatsApp - Lista Consolidada',
      description: 'Envia 1 mensagem com lista de TODOS os registros (1 aba apenas)',
      icon: MessageCircle,
      color: 'bg-green-100 text-green-700 border-green-300',
      code: `// Template: WhatsApp Lista Consolidada (1 ABA)
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

// Validar parâmetros
if (!parametros.telefone) {
  toast.error('Informe o número de telefone de destino');
  return;
}

if (!parametros.titulo) {
  toast.error('Informe o título da mensagem');
  return;
}

toast.info('Preparando mensagem com ' + selectedRecords.length + ' registro(s)...');

// Limpar telefone
let telefone = parametros.telefone.replace(/\\D/g, '');

// Validar telefone
if (telefone.length < 10 || telefone.length > 11) {
  toast.error('Telefone inválido. Use formato: (11) 98888-8888');
  return;
}

// Adicionar código do país
if (!telefone.startsWith('55')) {
  telefone = '55' + telefone;
}

// Construir lista consolidada
let mensagemCompleta = '*' + parametros.titulo + '*\\n\\n';

// AJUSTE OS CAMPOS QUE DESEJA EXIBIR
selectedRecords.forEach((recordId, index) => {
  const registro = records.find(r => r.id === recordId);
  if (!registro) return;
  
  mensagemCompleta += (index + 1) + '. ';
  
  // Exemplo: exibir nome e valor
  if (registro.data.nome) {
    mensagemCompleta += '*' + registro.data.nome + '*';
  }
  
  if (registro.data.valor) {
    mensagemCompleta += ' - R$ ' + registro.data.valor;
  }
  
  if (registro.data.status) {
    mensagemCompleta += ' [' + registro.data.status + ']';
  }
  
  mensagemCompleta += '\\n';
});

// Adicionar rodapé
mensagemCompleta += '\\n_Total: ' + selectedRecords.length + ' ' + (selectedRecords.length === 1 ? 'item' : 'itens') + '_';

if (parametros.observacao) {
  mensagemCompleta += '\\n\\n📝 *Observação:*\\n' + parametros.observacao;
}

// Validar tamanho (WhatsApp tem limite)
if (mensagemCompleta.length > 4000) {
  toast.warning('Mensagem muito longa! Considere selecionar menos registros.');
}

// Codificar e abrir WhatsApp (APENAS 1 ABA)
const mensagemCodificada = encodeURIComponent(mensagemCompleta);
const whatsappUrl = 'https://wa.me/' + telefone + '?text=' + mensagemCodificada;
window.open(whatsappUrl, '_blank');

toast.success('WhatsApp aberto! Revise e envie a mensagem.');
console.log('Mensagem preparada:', mensagemCompleta);`
    },
    {
      id: 'post_sankhya',
      name: 'POST HTTP Sankhya (OAuth 2.0)',
      description: 'Envia dados selecionados via POST para API Sankhya',
      icon: Send,
      color: 'bg-green-100 text-green-700 border-green-300',
      code: `// Template: POST HTTP Sankhya (OAuth 2.0)
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Enviando ' + selectedRecords.length + ' registro(s) para Sankhya...');

const SANKHYA_CONFIG = {
  tokenUrl: 'https://api.sankhya.com.br/token',
  apiUrl: 'https://api.sankhya.com.br/gateway/v1',
  clientId: 'SEU_CLIENT_ID',
  clientSecret: 'SEU_CLIENT_SECRET',
  username: 'SEU_USUARIO',
  password: 'SUA_SENHA'
};

try {
  // Autenticação OAuth 2.0
  const tokenResponse = await fetch(SANKHYA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: SANKHYA_CONFIG.clientId,
      client_secret: SANKHYA_CONFIG.clientSecret,
      username: SANKHYA_CONFIG.username,
      password: SANKHYA_CONFIG.password
    })
  });
  
  if (!tokenResponse.ok) throw new Error('Falha na autenticação');
  
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  
  let sucessos = 0;
  let erros = 0;
  
  // Enviar cada registro
  for (const recordId of selectedRecords) {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    const payload = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        dataSet: {
          rootEntity: 'NOME_ENTIDADE_SANKHYA',
          entity: {
            fieldset: {
              list: [
                { field: 'CAMPO1', value: registro.data.campo1 },
                { field: 'CAMPO2', value: registro.data.campo2 }
              ]
            }
          }
        }
      }
    };
    
    const response = await fetch(SANKHYA_CONFIG.apiUrl + '/service', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) { sucessos++; } else { erros++; }
  }
  
  if (sucessos > 0) toast.success(sucessos + ' enviado(s) para Sankhya!');
  if (erros > 0) toast.error(erros + ' com erro');
  
  refresh();
} catch (error) {
  toast.error('Erro: ' + error.message);
}`
    },
    {
      id: 'get_sankhya',
      name: 'GET HTTP Sankhya (OAuth 2.0)',
      description: 'Busca dados da API Sankhya e importa para o sistema',
      icon: Download,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      code: `// Template: GET HTTP Sankhya (OAuth 2.0)
toast.info('Buscando dados do Sankhya...');

const SANKHYA_CONFIG = {
  tokenUrl: 'https://api.sankhya.com.br/token',
  apiUrl: 'https://api.sankhya.com.br/gateway/v1',
  clientId: 'SEU_CLIENT_ID',
  clientSecret: 'SEU_CLIENT_SECRET',
  username: 'SEU_USUARIO',
  password: 'SUA_SENHA'
};

try {
  // Autenticação OAuth 2.0
  const tokenResponse = await fetch(SANKHYA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: SANKHYA_CONFIG.clientId,
      client_secret: SANKHYA_CONFIG.clientSecret,
      username: SANKHYA_CONFIG.username,
      password: SANKHYA_CONFIG.password
    })
  });
  
  if (!tokenResponse.ok) throw new Error('Falha na autenticação');
  
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  
  // Buscar dados
  const queryPayload = {
    serviceName: 'CRUDServiceProvider.loadRecords',
    requestBody: {
      dataSet: {
        rootEntity: 'NOME_ENTIDADE_SANKHYA',
        entity: {
          fieldset: { list: ['CAMPO1', 'CAMPO2', 'CAMPO3'] }
        }
      }
    }
  };
  
  const response = await fetch(SANKHYA_CONFIG.apiUrl + '/service', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryPayload)
  });
  
  if (!response.ok) throw new Error('Erro ao buscar dados');
  
  const responseData = await response.json();
  const registros = responseData.responseBody?.rows || [];
  
  if (registros.length === 0) {
    toast.info('Nenhum registro encontrado');
    return;
  }
  
  toast.info(registros.length + ' registro(s) encontrado(s). Importando...');
  
  let sucessos = 0;
  let erros = 0;
  
  for (const reg of registros) {
    try {
      await base44.entities.DynamicData.create({
        screen_id: screenId,
        table_name: 'NOME_TABELA',
        data: {
          campo1: reg[0],
          campo2: reg[1],
          importado_sankhya: true,
          data_importacao: new Date().toISOString()
        }
      });
      sucessos++;
    } catch (error) {
      erros++;
    }
  }
  
  if (sucessos > 0) toast.success(sucessos + ' importado(s)!');
  if (erros > 0) toast.error(erros + ' com erro');
  
  refresh();
} catch (error) {
  toast.error('Erro: ' + error.message);
}`
    },
    {
      id: 'update_field_batch',
      name: 'Atualizar Campo em Lote',
      description: 'Atualiza um campo específico em múltiplos registros',
      icon: Edit,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      code: `// Template: Atualizar Campo em Lote
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

// Validar parâmetro
if (!parametros.campo || parametros.novo_valor === undefined || parametros.novo_valor === '') {
  toast.error('Informe o campo e o novo valor');
  return;
}

const confirmar = confirm(
  'Confirma a atualização do campo "' + parametros.campo + '" em ' + selectedRecords.length + ' registro(s)?'
);

if (!confirmar) {
  toast.info('Operação cancelada');
  return;
}

toast.info('Atualizando ' + selectedRecords.length + ' registro(s)...');

let atualizados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    // Atualizar campo específico
    const dadosAtualizados = { ...registro.data };
    dadosAtualizados[parametros.campo] = parametros.novo_valor;
    
    await base44.entities.DynamicData.update(registro.id, {
      data: dadosAtualizados
    });
    
    atualizados++;
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    erros++;
  }
}

if (atualizados > 0) {
  toast.success(atualizados + ' registro(s) atualizado(s)!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    },
    {
      id: 'approve_batch',
      name: 'Aprovar/Rejeitar em Lote',
      description: 'Aprova ou rejeita múltiplos registros com justificativa',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 border-green-300',
      code: `// Template: Aprovar/Rejeitar em Lote
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

// Validar parâmetro de ação
if (!parametros.acao) {
  toast.error('Selecione a ação (Aprovar ou Rejeitar)');
  return;
}

const acao = parametros.acao;
const status = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
const motivo = parametros.motivo || '';

const confirmar = confirm(
  'Confirma ' + acao + ' ' + selectedRecords.length + ' registro(s)?'
);

if (!confirmar) {
  toast.info('Operação cancelada');
  return;
}

toast.info('Processando ' + selectedRecords.length + ' registro(s)...');

let processados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    
    if (!registro) {
      erros++;
      continue;
    }
    
    // Atualizar status
    await base44.entities.DynamicData.update(registro.id, {
      data: {
        ...registro.data,
        status: status,
        data_aprovacao: new Date().toISOString(),
        aprovador: user.email,
        motivo: motivo
      }
    });
    
    processados++;
    
  } catch (error) {
    console.error('Erro ao processar:', error);
    erros++;
  }
}

if (processados > 0) {
  toast.success(processados + ' registro(s) ' + status + '(s)!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    },
    {
      id: 'schedule_task',
      name: 'Agendar Tarefa/Lembrete',
      description: 'Cria tarefas agendadas baseadas nos registros',
      icon: Calendar,
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      code: `// Template: Agendar Tarefa
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

// Validar parâmetros
if (!parametros.data_agendamento) {
  toast.error('Informe a data de agendamento');
  return;
}

toast.info('Agendando ' + selectedRecords.length + ' tarefa(s)...');

let agendadas = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    // Criar tarefa
    await base44.entities.DynamicData.create({
      screen_id: 'ID_TELA_TAREFAS', // AJUSTE
      table_name: 'tarefas',
      data: {
        titulo: 'Tarefa: ' + (registro.data.nome || 'Sem título'),
        descricao: parametros.descricao || '',
        data_agendamento: parametros.data_agendamento,
        prioridade: parametros.prioridade || 'media',
        status: 'agendada',
        origem_id: registro.id,
        origem_tabela: registro.table_name,
        responsavel: user.email,
        criado_em: new Date().toISOString()
      }
    });
    
    agendadas++;
    
  } catch (error) {
    console.error('Erro ao agendar:', error);
    erros++;
  }
}

if (agendadas > 0) {
  toast.success(agendadas + ' tarefa(s) agendada(s)!');
}
if (erros > 0) {
  toast.error(erros + ' tarefa(s) com erro');
}

refresh();`
    },
    {
      id: 'sync_erp',
      name: 'Sincronizar com ERP Externo',
      description: 'Sincroniza registros com sistema ERP via API REST',
      icon: RefreshCw,
      color: 'bg-violet-100 text-violet-700 border-violet-300',
      code: `// Template: Sincronizar com ERP
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro para sincronizar');
  return;
}

const confirmar = confirm(
  'Confirma a sincronização de ' + selectedRecords.length + ' registro(s) com o ERP?'
);

if (!confirmar) {
  toast.info('Sincronização cancelada');
  return;
}

toast.info('Sincronizando ' + selectedRecords.length + ' registro(s) com ERP...');

const ERP_CONFIG = {
  url: 'https://seu-erp.com/api',
  apiKey: 'SUA_API_KEY'
};

let sincronizados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    // Preparar payload para o ERP
    const payload = {
      codigo_interno: registro.id,
      nome: registro.data.nome,
      // Adicione mais campos conforme necessário
      data_sincronizacao: new Date().toISOString()
    };
    
    // Enviar para ERP
    const response = await fetch(ERP_CONFIG.url + '/produtos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ERP_CONFIG.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Erro HTTP: ' + response.status);
    }
    
    const resultado = await response.json();
    
    // Atualizar registro local com ID do ERP
    await base44.entities.DynamicData.update(registro.id, {
      data: {
        ...registro.data,
        erp_id: resultado.id,
        sincronizado: true,
        data_sincronizacao: new Date().toISOString()
      }
    });
    
    sincronizados++;
    
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    erros++;
  }
}

if (sincronizados > 0) {
  toast.success(sincronizados + ' registro(s) sincronizado(s) com ERP!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro na sincronização');
}

refresh();`
    },
    {
      id: 'update_status_batch',
      name: 'Atualizar Status em Lote',
      description: 'Atualiza o status de múltiplos registros simultaneamente',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      code: `// Template: Atualizar Status em Lote
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

if (!parametros.novo_status) {
  toast.error('Informe o novo status');
  return;
}

const confirmar = confirm(
  'Confirma a alteração de status de ' + selectedRecords.length + ' registro(s) para "' + parametros.novo_status + '"?'
);

if (!confirmar) {
  toast.info('Operação cancelada');
  return;
}

toast.info('Atualizando ' + selectedRecords.length + ' registro(s)...');

let atualizados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    await base44.entities.DynamicData.update(registro.id, {
      data: {
        ...registro.data,
        status: parametros.novo_status,
        data_atualizacao_status: new Date().toISOString(),
        usuario_atualizacao: user.email,
        observacao_status: parametros.observacao || ''
      }
    });
    
    atualizados++;
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    erros++;
  }
}

if (atualizados > 0) {
  toast.success(atualizados + ' registro(s) atualizado(s)!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    },
    {
      id: 'send_notification',
      name: 'Enviar Notificação por E-mail',
      description: 'Notifica responsáveis sobre os registros selecionados',
      icon: Bell,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      code: `// Template: Enviar Notificação
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

if (!parametros.email_destino) {
  toast.error('Informe o e-mail de destino');
  return;
}

toast.info('Preparando notificação...');

// Construir lista de registros
let listaRegistros = '';
selectedRecords.forEach((recordId, index) => {
  const registro = records.find(r => r.id === recordId);
  if (!registro) return;
  
  listaRegistros += (index + 1) + '. ';
  
  // AJUSTE OS CAMPOS CONFORME NECESSÁRIO
  if (registro.data.nome) {
    listaRegistros += registro.data.nome;
  }
  if (registro.data.codigo) {
    listaRegistros += ' (Cód: ' + registro.data.codigo + ')';
  }
  if (registro.data.status) {
    listaRegistros += ' - Status: ' + registro.data.status;
  }
  
  listaRegistros += '\\n';
});

// Montar corpo do e-mail
const corpoEmail = 'Olá,\\n\\n' +
  'Seguem os registros selecionados para sua atenção:\\n\\n' +
  listaRegistros +
  '\\nTotal: ' + selectedRecords.length + ' registro(s)\\n\\n' +
  (parametros.mensagem_adicional ? parametros.mensagem_adicional + '\\n\\n' : '') +
  'Atenciosamente,\\n' +
  user.full_name +
  '\\n\\nEnviado automaticamente pelo Sistema em ' + new Date().toLocaleString('pt-BR');

// Enviar e-mail
await base44.integrations.Core.SendEmail({
  to: parametros.email_destino,
  subject: parametros.assunto || 'Notificação de Registros - ' + new Date().toLocaleDateString('pt-BR'),
  body: corpoEmail
});

toast.success('Notificação enviada para ' + parametros.email_destino);
refresh();`
    },
    {
      id: 'copy_to_clipboard',
      name: 'Copiar Dados para Área de Transferência',
      description: 'Copia lista formatada dos registros selecionados',
      icon: Clipboard,
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      code: `// Template: Copiar para Área de Transferência
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Preparando dados...');

// Construir texto formatado
let textoFormatado = '=== LISTA DE REGISTROS ===\\n\\n';

selectedRecords.forEach((recordId, index) => {
  const registro = records.find(r => r.id === recordId);
  if (!registro) return;
  
  textoFormatado += '--- Registro ' + (index + 1) + ' ---\\n';
  
  // AJUSTE OS CAMPOS CONFORME NECESSÁRIO
  fields.forEach(field => {
    if (field.nome_campo !== 'id' && field.nome_campo !== 'dhinc' && field.nome_campo !== 'dhalter') {
      const valor = registro.data[field.nome_campo] || '-';
      textoFormatado += field.label + ': ' + valor + '\\n';
    }
  });
  
  textoFormatado += '\\n';
});

textoFormatado += '=== TOTAL: ' + selectedRecords.length + ' REGISTRO(S) ===\\n';
textoFormatado += 'Gerado em: ' + new Date().toLocaleString('pt-BR') + '\\n';
textoFormatado += 'Por: ' + user.full_name;

// Copiar para clipboard
navigator.clipboard.writeText(textoFormatado);

toast.success(selectedRecords.length + ' registro(s) copiado(s) para área de transferência!');`
    },
    {
      id: 'mark_as_read',
      name: 'Marcar Como Lido/Processado',
      description: 'Marca registros como lidos ou processados rapidamente',
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      code: `// Template: Marcar Como Lido/Processado
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Marcando ' + selectedRecords.length + ' registro(s)...');

let marcados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    await base44.entities.DynamicData.update(registro.id, {
      data: {
        ...registro.data,
        lido: true,
        processado: true,
        data_leitura: new Date().toISOString(),
        lido_por: user.email
      }
    });
    
    marcados++;
  } catch (error) {
    console.error('Erro ao marcar:', error);
    erros++;
  }
}

if (marcados > 0) {
  toast.success(marcados + ' registro(s) marcado(s) como lido!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    },
    {
      id: 'filter_and_export',
      name: 'Filtrar e Exportar Avançado',
      description: 'Aplica filtros e exporta dados filtrados',
      icon: Filter,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      code: `// Template: Filtrar e Exportar
toast.info('Aplicando filtros e exportando...');

// Aplicar filtros
let dadosFiltrados = records;

// AJUSTE OS FILTROS CONFORME NECESSÁRIO
if (parametros.data_inicio) {
  dadosFiltrados = dadosFiltrados.filter(r => {
    const dataRegistro = new Date(r.data.data_criacao || r.created_date);
    const dataInicio = new Date(parametros.data_inicio);
    return dataRegistro >= dataInicio;
  });
}

if (parametros.data_fim) {
  dadosFiltrados = dadosFiltrados.filter(r => {
    const dataRegistro = new Date(r.data.data_criacao || r.created_date);
    const dataFim = new Date(parametros.data_fim);
    return dataRegistro <= dataFim;
  });
}

if (parametros.status && parametros.status !== 'todos') {
  dadosFiltrados = dadosFiltrados.filter(r => r.data.status === parametros.status);
}

if (parametros.valor_minimo) {
  dadosFiltrados = dadosFiltrados.filter(r => {
    const valor = parseFloat(r.data.valor) || 0;
    return valor >= parseFloat(parametros.valor_minimo);
  });
}

if (dadosFiltrados.length === 0) {
  toast.error('Nenhum registro encontrado com os filtros aplicados');
  return;
}

toast.info('Exportando ' + dadosFiltrados.length + ' registro(s) filtrado(s)...');

// Preparar dados
const dadosExportacao = dadosFiltrados.map(registro => {
  const linha = {};
  
  fields.forEach(field => {
    if (field.nome_campo !== 'id' && field.nome_campo !== 'dhinc' && field.nome_campo !== 'dhalter') {
      linha[field.label] = registro.data[field.nome_campo] || '';
    }
  });
  
  return linha;
});

// Gerar CSV
const headers = Object.keys(dadosExportacao[0]);
const csv = [
  headers.join(','),
  ...dadosExportacao.map(row => 
    headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }).join(',')
  )
].join('\\n');

// Download
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filtrado_' + new Date().toISOString().split('T')[0] + '.csv';
a.click();
window.URL.revokeObjectURL(url);

toast.success('Exportado ' + dadosFiltrados.length + ' registro(s) filtrado(s)!');`
    },
    {
      id: 'duplicate_records',
      name: 'Duplicar Registros',
      description: 'Cria cópias dos registros selecionados',
      icon: Copy,
      color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      code: `// Template: Duplicar Registros
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro para duplicar');
  return;
}

const confirmar = confirm(
  'Confirma a duplicação de ' + selectedRecords.length + ' registro(s)?'
);

if (!confirmar) {
  toast.info('Operação cancelada');
  return;
}

toast.info('Duplicando ' + selectedRecords.length + ' registro(s)...');

let duplicados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registroOriginal = records.find(r => r.id === recordId);
    
    if (!registroOriginal) {
      erros++;
      continue;
    }
    
    // Criar cópia dos dados
    const dadosCopia = { ...registroOriginal.data };
    
    // Adicionar sufixo em campos texto
    if (dadosCopia.nome) {
      dadosCopia.nome = dadosCopia.nome + ' (Cópia)';
    }
    if (dadosCopia.titulo) {
      dadosCopia.titulo = dadosCopia.titulo + ' (Cópia)';
    }
    
    // Limpar campos únicos se necessário
    // dadosCopia.codigo_unico = null;
    
    await base44.entities.DynamicData.create({
      screen_id: screenId,
      table_name: registroOriginal.table_name,
      data: dadosCopia
    });
    
    duplicados++;
    
  } catch (error) {
    console.error('Erro ao duplicar:', error);
    erros++;
  }
}

if (duplicados > 0) {
  toast.success(duplicados + ' registro(s) duplicado(s)!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    },
    {
      id: 'calculate_totals',
      name: 'Calcular Totalizadores',
      description: 'Calcula soma, média, máximo e mínimo',
      icon: Calculator,
      color: 'bg-pink-100 text-pink-700 border-pink-300',
      code: `// Template: Calcular Totalizadores
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Calculando totalizadores...');

let soma = 0;
let quantidade = 0;
let maiorValor = -Infinity;
let menorValor = Infinity;

for (const recordId of selectedRecords) {
  const registro = records.find(r => r.id === recordId);
  if (!registro) continue;
  
  // AJUSTE O CAMPO QUE DESEJA TOTALIZAR
  const valor = parseFloat(registro.data.valor) || 0;
  
  soma += valor;
  quantidade++;
  
  if (valor > maiorValor) maiorValor = valor;
  if (valor < menorValor) menorValor = valor;
}

const media = quantidade > 0 ? soma / quantidade : 0;

// Exibir resultados
const mensagem = '\\n📊 Totalizadores Calculados:\\n\\n' +
  '• Total: R$ ' + soma.toFixed(2) + '\\n' +
  '• Média: R$ ' + media.toFixed(2) + '\\n' +
  '• Maior: R$ ' + maiorValor.toFixed(2) + '\\n' +
  '• Menor: R$ ' + menorValor.toFixed(2) + '\\n' +
  '• Quantidade: ' + quantidade + ' registro(s)\\n';

alert(mensagem);

toast.success('Totalizadores calculados!');`
    },
    {
      id: 'export_excel',
      name: 'Exportar para Excel',
      description: 'Exporta registros selecionados para planilha',
      icon: FileSpreadsheet,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      code: `// Template: Exportar para Excel
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro para exportar');
  return;
}

toast.info('Gerando Excel com ' + selectedRecords.length + ' registro(s)...');

const dadosExportacao = selectedRecords.map(recordId => {
  const registro = records.find(r => r.id === recordId);
  if (!registro) return null;
  
  const linha = {};
  
  fields.forEach(field => {
    if (field.nome_campo !== 'id' && field.nome_campo !== 'dhinc' && field.nome_campo !== 'dhalter') {
      linha[field.label] = registro.data[field.nome_campo] || '';
    }
  });
  
  return linha;
}).filter(Boolean);

if (dadosExportacao.length === 0) {
  toast.error('Nenhum dado para exportar');
  return;
}

// Gerar TSV (Excel)
const headers = Object.keys(dadosExportacao[0]);
const tsv = [
  headers.join('\\t'),
  ...dadosExportacao.map(row => 
    headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/\\t/g, ' ');
    }).join('\\t')
  )
].join('\\n');

// Download
const blob = new Blob(['\\uFEFF' + tsv], { 
  type: 'application/vnd.ms-excel;charset=utf-8;' 
});
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'exportacao_' + new Date().toISOString().split('T')[0] + '.xls';
a.click();
window.URL.revokeObjectURL(url);

toast.success('Excel gerado com ' + dadosExportacao.length + ' registro(s)!');`
    },
    {
      id: 'generate_pdf',
      name: 'Gerar Relatório PDF',
      description: 'Cria PDF formatado dos registros selecionados',
      icon: FileText,
      color: 'bg-red-100 text-red-700 border-red-300',
      code: `// Template: Gerar Relatório PDF
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Gerando PDF com ' + selectedRecords.length + ' registro(s)...');

const dadosRelatorio = selectedRecords.map(recordId => {
  const registro = records.find(r => r.id === recordId);
  if (!registro) return null;
  
  const linha = {};
  fields.forEach(field => {
    if (field.nome_campo !== 'id' && field.nome_campo !== 'dhinc' && field.nome_campo !== 'dhalter') {
      linha[field.label] = registro.data[field.nome_campo] || '-';
    }
  });
  
  return linha;
}).filter(Boolean);

const headers = Object.keys(dadosRelatorio[0] || {});

const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório</title><style>' +
  '@page { size: A4 landscape; margin: 1cm; }' +
  'body { font-family: Arial; font-size: 9px; }' +
  'h1 { text-align: center; color: #1e40af; font-size: 16px; margin-bottom: 5px; }' +
  '.subtitle { text-align: center; color: #64748b; font-size: 10px; margin-bottom: 20px; }' +
  'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
  'th { background: #f1f5f9; color: #1e293b; padding: 8px; border: 1px solid #cbd5e1; font-weight: 600; font-size: 8px; text-transform: uppercase; }' +
  'td { padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8px; }' +
  'tr:nth-child(even) { background: #f8fafc; }' +
  '.footer { margin-top: 20px; text-align: center; font-size: 8px; color: #94a3b8; }' +
  '</style></head><body>' +
  '<h1>Relatório de Dados</h1>' +
  '<div class="subtitle">Gerado em ' + new Date().toLocaleString('pt-BR') + ' por ' + user.full_name + ' | Total: ' + dadosRelatorio.length + ' registro(s)</div>' +
  '<table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
  dadosRelatorio.map(row => '<tr>' + headers.map(h => '<td>' + row[h] + '</td>').join('') + '</tr>').join('') +
  '</tbody></table>' +
  '<div class="footer">Documento gerado automaticamente | © ' + new Date().getFullYear() + '</div>' +
  '</body></html>';

const printWindow = window.open('', '_blank');
printWindow.document.write(html);
printWindow.document.close();

printWindow.onload = () => {
  setTimeout(() => {
    printWindow.print();
    toast.success('PDF aberto para impressão!');
  }, 250);
};`
    },
    {
      id: 'send_email_batch',
      name: 'Enviar E-mail Personalizado em Lote',
      description: 'Envia e-mails personalizados para cada registro',
      icon: Mail,
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      code: `// Template: Enviar E-mail em Lote
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

if (!parametros.assunto || !parametros.mensagem) {
  toast.error('Preencha assunto e mensagem do e-mail');
  return;
}

toast.info('Enviando e-mail para ' + selectedRecords.length + ' registro(s)...');

let enviados = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    if (!registro) { erros++; continue; }
    
    if (!registro.data.email) {
      console.log('Registro sem e-mail:', registro.id);
      erros++;
      continue;
    }
    
    // Personalizar mensagem com dados do registro
    let mensagemPersonalizada = parametros.mensagem;
    
    // Substituir variáveis: {{nome_campo}}
    Object.keys(registro.data).forEach(campo => {
      const valor = registro.data[campo] || '';
      const regex = new RegExp('{{\\\\s*' + campo + '\\\\s*}}', 'g');
      mensagemPersonalizada = mensagemPersonalizada.replace(regex, valor);
    });
    
    await base44.integrations.Core.SendEmail({
      to: registro.data.email,
      subject: parametros.assunto,
      body: mensagemPersonalizada
    });
    
    enviados++;
    
    // Delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    erros++;
  }
}

if (enviados > 0) {
  toast.success(enviados + ' e-mail(s) enviado(s)!');
}
if (erros > 0) {
  toast.error(erros + ' com erro ou sem e-mail');
}

refresh();`
    },
    {
      id: 'import_csv',
      name: 'Importar Dados de CSV/Excel',
      description: 'Importa dados de arquivo CSV ou Excel',
      icon: Upload,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      code: `// Template: Importar CSV/Excel
const input = document.createElement('input');
input.type = 'file';
input.accept = '.csv,.xls,.xlsx';

input.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  toast.info('Lendo arquivo...');
  
  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const resultado = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                // AJUSTE OS CAMPOS DE ACORDO COM SEU CSV
                nome: { type: 'string' },
                email: { type: 'string' },
                telefone: { type: 'string' }
              }
            }
          }
        }
      }
    });
    
    if (resultado.status === 'error') {
      toast.error('Erro: ' + resultado.details);
      return;
    }
    
    const dados = resultado.output?.data || resultado.output || [];
    
    if (!dados || dados.length === 0) {
      toast.error('Nenhum dado encontrado no arquivo');
      return;
    }
    
    toast.info(dados.length + ' registro(s) encontrado(s). Importando...');
    
    let importados = 0;
    let erros = 0;
    
    for (const linha of dados) {
      try {
        await base44.entities.DynamicData.create({
          screen_id: screenId,
          table_name: 'NOME_DA_TABELA',
          data: {
            ...linha,
            importado: true,
            data_importacao: new Date().toISOString(),
            importado_por: user.email
          }
        });
        
        importados++;
      } catch (error) {
        console.error('Erro ao importar:', error);
        erros++;
      }
    }
    
    if (importados > 0) {
      toast.success(importados + ' registro(s) importado(s)!');
    }
    if (erros > 0) {
      toast.error(erros + ' registro(s) com erro');
    }
    
    refresh();
    
  } catch (error) {
    toast.error('Erro: ' + error.message);
  }
};

input.click();`
    },
    {
      id: 'db_action',
      name: 'Processar e Inserir em Outra Tabela',
      description: 'Processa registros e insere em outra tabela',
      icon: Database,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      code: `// Template: Processar e Inserir
if (!selectedRecords || selectedRecords.length === 0) {
  toast.error('Selecione ao menos um registro');
  return;
}

toast.info('Processando ' + selectedRecords.length + ' registro(s)...');

let sucessos = 0;
let erros = 0;

for (const recordId of selectedRecords) {
  try {
    const registro = records.find(r => r.id === recordId);
    
    if (!registro) {
      erros++;
      continue;
    }
    
    // Inserir em outra tabela
    await base44.entities.NOME_DA_TABELA.create({
      campo1: registro.data.campo_origem,
      campo2: registro.data.outro_campo,
      origem_id: registro.id,
      usuario_processamento: user.email,
      data_processamento: new Date().toISOString()
    });
    
    sucessos++;
  } catch (error) {
    console.error('Erro ao processar:', error);
    erros++;
  }
}

if (sucessos > 0) {
  toast.success(sucessos + ' registro(s) processado(s)!');
}
if (erros > 0) {
  toast.error(erros + ' registro(s) com erro');
}

refresh();`
    }
  ];

  if (!screenId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Salve a tela primeiro para poder adicionar botões de ação.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão Novo no Topo */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            Configure botões personalizados com código JavaScript
          </h3>
          <p className="text-xs text-slate-500">
            Use as variáveis, templates e parâmetros à esquerda para construir a lógica do seu botão
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-slate-800 hover:bg-slate-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Botão
          </Button>
        )}
      </div>

      {/* Layout 2 Colunas */}
      <div className="grid grid-cols-12 gap-4">
        {/* Coluna Esquerda: Variáveis + Templates + Parâmetros */}
        <div className="col-span-4 space-y-4">
          {/* Variáveis do Sistema */}
          <Collapsible open={showSystemVars} onOpenChange={setShowSystemVars}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="border-b border-slate-200 bg-slate-50 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Code className="w-4 h-4 text-slate-700" />
                      Variáveis do Sistema
                    </CardTitle>
                    {showSystemVars ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 space-y-2">
                  {availableVariables.map((variable) => (
                    <div key={variable.name} className="p-2 bg-slate-50 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <code className="text-xs font-mono text-blue-600 font-semibold">{variable.name}</code>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => insertVariable(variable.name)}
                          className="h-5 px-2 text-xs hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600">{variable.description}</p>
                      <code className="text-xs text-slate-500 bg-slate-100 px-1 py-0.5 rounded mt-1 inline-block">
                        {variable.example}
                      </code>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Campos da Tela */}
          {fields.length > 0 && (
            <Collapsible open={showFieldVars} onOpenChange={setShowFieldVars}>
              <Card className="border-slate-200 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="border-b border-slate-200 bg-slate-50 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Code className="w-4 h-4 text-slate-700" />
                        Campos da Tela ({fields.length})
                      </CardTitle>
                      {showFieldVars ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-3 space-y-2 max-h-96 overflow-y-auto">
                    {fields.map((field) => (
                      <div key={field.id} className="p-2 bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <code className="text-xs font-mono text-blue-700 font-semibold block truncate">
                              record.{field.nome_campo}
                            </code>
                            <span className="text-xs text-slate-600 block truncate">{field.label}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => insertVariable(`record.${field.nome_campo}`)}
                            className="h-5 px-2 text-xs hover:bg-blue-100 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Parâmetros */}
          {showForm && (
            <Collapsible open={showParameters} onOpenChange={setShowParameters}>
              <Card className="border-blue-300 shadow-sm bg-blue-50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="border-b border-blue-200 bg-blue-100 py-3 cursor-pointer hover:bg-blue-150 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4 text-blue-700" />
                        Parâmetros ({formData.parametros?.length || 0})
                      </CardTitle>
                      {showParameters ? (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Campos que o usuário preencherá ao executar
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-3">
                    <ParameterManager
                      parameters={formData.parametros || []}
                      onChange={(params) => setFormData({ ...formData, parametros: params })}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Templates para Botões */}
          <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="border-b border-slate-200 bg-slate-50 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-slate-700" />
                      Templates para Botões ({buttonTemplates.length})
                    </CardTitle>
                    {showTemplates ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {buttonTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div key={template.id} className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-all hover:shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${template.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-slate-900">{template.name}</h4>
                              <p className="text-xs text-slate-600 mt-0.5">{template.description}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => insertTemplate(template.code)}
                          className="w-full h-7 text-xs mt-2 border-slate-300 hover:bg-slate-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Usar Template
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Coluna Direita: Formulário + Lista */}
        <div className="col-span-8 space-y-4">
          {/* Formulário de Botão */}
          {showForm && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {editingButton ? 'Editar Botão de Ação' : 'Novo Botão de Ação'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetForm}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome" className="text-sm">Nome do Botão *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Aprovar Pedido"
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="posicao" className="text-sm">Posição</Label>
                      <Select
                        value={formData.posicao}
                        onValueChange={(value) => setFormData({ ...formData, posicao: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toolbar">Barra de Ferramentas</SelectItem>
                          <SelectItem value="form_top">Topo do Formulário</SelectItem>
                          <SelectItem value="form_bottom">Rodapé do Formulário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigo_js" className="text-sm flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Código JavaScript *
                    </Label>
                    <Textarea
                      id="codigo_js"
                      value={formData.codigo_js}
                      onChange={(e) => setFormData({ ...formData, codigo_js: e.target.value })}
                      placeholder="// Seu código JavaScript aqui...&#10;toast.success('Ação executada!');&#10;console.log(parametros);&#10;refresh();"
                      required
                      rows={12}
                      className="font-mono text-sm bg-slate-950 text-green-400 border-slate-700 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500 resize-none"
                      style={{
                        caretColor: '#4ade80'
                      }}
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Plus className="w-3 h-3 inline" />
                      Use as variáveis, parâmetros e templates à esquerda
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="condicao_visibilidade" className="text-sm">
                      Condição de Visibilidade (opcional)
                    </Label>
                    <Input
                      id="condicao_visibilidade"
                      value={formData.condicao_visibilidade}
                      onChange={(e) => setFormData({ ...formData, condicao_visibilidade: e.target.value })}
                      placeholder="Ex: record.status === 'pendente'"
                      className="h-9 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Código JavaScript que retorna true/false
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="icone" className="text-sm">Ícone</Label>
                      <Input
                        id="icone"
                        value={formData.icone}
                        onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                        placeholder="Zap"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cor" className="text-sm">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.cor}
                          onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                          className="w-16 h-9"
                        />
                        <Input
                          value={formData.cor}
                          onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                          placeholder="#3B82F6"
                          className="h-9 flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ordem" className="text-sm">Ordem</Label>
                      <Input
                        id="ordem"
                        type="number"
                        value={formData.ordem}
                        onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="exibir_modal_confirmacao" className="text-sm font-medium">
                          Modal de Confirmação
                        </Label>
                        <p className="text-xs text-slate-500">Pedir confirmação antes de executar</p>
                      </div>
                      <Switch
                        id="exibir_modal_confirmacao"
                        checked={formData.exibir_modal_confirmacao}
                        onCheckedChange={(checked) => setFormData({ ...formData, exibir_modal_confirmacao: checked })}
                      />
                    </div>

                    {formData.exibir_modal_confirmacao && (
                      <div className="space-y-1.5">
                        <Label htmlFor="mensagem_confirmacao" className="text-sm">
                          Mensagem de Confirmação
                        </Label>
                        <Input
                          id="mensagem_confirmacao"
                          value={formData.mensagem_confirmacao}
                          onChange={(e) => setFormData({ ...formData, mensagem_confirmacao: e.target.value })}
                          placeholder="Tem certeza que deseja executar esta ação?"
                          className="h-9"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <Label htmlFor="ativo" className="text-sm font-medium">Botão Ativo</Label>
                      <p className="text-xs text-slate-500">Exibir este botão na tela</p>
                    </div>
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-slate-800 hover:bg-slate-900 h-9"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingButton ? 'Atualizar' : 'Criar'} Botão
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="h-9 border-slate-300"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de Botões */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-slate-700" />
                Botões Criados ({buttons.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : buttons.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Nenhum botão de ação criado</p>
                  <p className="text-xs text-slate-400 mb-4">Clique em "Novo Botão" ou use um template</p>
                  {!showForm && (
                    <Button
                      size="sm"
                      onClick={() => setShowForm(true)}
                      variant="outline"
                      className="border-slate-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Botão
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {buttons.map((button) => (
                    <div key={button.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{button.nome}</h3>
                            {!button.ativo && (
                              <Badge variant="outline" className="text-xs">Inativo</Badge>
                            )}
                            {button.parametros && button.parametros.length > 0 && (
                              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                <Settings className="w-3 h-3 mr-1" />
                                {button.parametros.length} parâmetro{button.parametros.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {button.posicao === 'toolbar' && (
                              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Toolbar</Badge>
                            )}
                            {button.posicao === 'form_top' && (
                              <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Topo</Badge>
                            )}
                            {button.posicao === 'form_bottom' && (
                              <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">Rodapé</Badge>
                            )}
                          </div>
                          <pre className="text-xs bg-slate-950 text-green-400 p-3 rounded font-mono overflow-x-auto max-h-32 border border-slate-800">
                            {button.codigo_js}
                          </pre>
                          {button.condicao_visibilidade && (
                            <div className="mt-2">
                              <span className="text-xs text-slate-600">Visível quando: </span>
                              <code className="text-xs bg-yellow-50 text-yellow-800 px-1 py-0.5 rounded border border-yellow-200">
                                {button.condicao_visibilidade}
                              </code>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(button)}
                            className="h-8 w-8 hover:bg-slate-200"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(button.id)}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
