import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy, Check, Database, ChevronDown, ChevronRight, Network } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const HTTP_METHODS = {
  GET: { color: "bg-green-100 text-green-700 border-green-300", label: "GET" },
  POST: { color: "bg-blue-100 text-blue-700 border-blue-300", label: "POST" },
  PUT: { color: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "PUT" },
  DELETE: { color: "bg-red-100 text-red-700 border-red-300", label: "DELETE" },
};

function EndpointCard({ method, path, description, request, response, expanded, onToggle }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <Badge className={`${HTTP_METHODS[method].color} border font-mono`}>
            {HTTP_METHODS[method].label}
          </Badge>
          <code className="font-mono text-sm text-slate-700">{path}</code>
        </div>
        <p className="text-sm text-slate-600 hidden md:block">{description}</p>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Descrição</h4>
            <p className="text-sm text-slate-600">{description}</p>
          </div>

          {request && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700">Request Body</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(JSON.stringify(request, null, 2))}
                >
                  {copied ? (
                    <Check className="w-3 h-3 mr-1 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  Copiar
                </Button>
              </div>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
          )}

          {response && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Response (200 OK)</h4>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocumentation() {
  const [expandedScreens, setExpandedScreens] = useState({});
  const [expandedEndpoints, setExpandedEndpoints] = useState({});

  const { data: screens, isLoading: screensLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.ScreenDefinition.list('-created_date'),
    initialData: [],
  });

  const { data: treeScreens, isLoading: treeScreensLoading } = useQuery({
    queryKey: ['tree-screens'],
    queryFn: () => base44.entities.TreeScreenDefinition.list('-created_date'),
    initialData: [],
  });

  const { data: fields } = useQuery({
    queryKey: ['all-fields'],
    queryFn: () => base44.entities.FieldDefinition.list(),
    initialData: [],
  });

  const allScreens = React.useMemo(() => {
    return [
      ...screens.map(s => ({ ...s, type: 'crud' })),
      ...treeScreens.map(s => ({ ...s, type: 'tree' }))
    ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [screens, treeScreens]);

  const isLoading = screensLoading || treeScreensLoading;

  const toggleScreen = (screenId) => {
    setExpandedScreens(prev => ({
      ...prev,
      [screenId]: !prev[screenId]
    }));
  };

  const toggleEndpoint = (key) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const generateEndpoints = (screen) => {
    const screenFields = fields.filter(f => f.screen_id === screen.id);
    const sampleRecord = {};
    
    screenFields.forEach(field => {
      switch (field.tipo) {
        case 'inteiro':
          sampleRecord[field.nome_campo] = 123;
          break;
        case 'decimal':
          sampleRecord[field.nome_campo] = 99.99;
          break;
        case 'data':
          sampleRecord[field.nome_campo] = "2025-01-15";
          break;
        case 'datetime':
          sampleRecord[field.nome_campo] = "2025-01-15T10:30:00Z";
          break;
        default:
          sampleRecord[field.nome_campo] = "valor exemplo";
      }
    });

    const baseFields = {
      id: "uuid-gerado-automaticamente",
      codemp: screen.codemp,
      codgrupoemp: screen.codgrupoemp,
      created_date: "2025-01-15T10:00:00Z",
      updated_date: "2025-01-15T10:00:00Z",
    };

    return [
      {
        method: "GET",
        path: `/api/entities/${screen.tabela_nome}`,
        description: `Lista todos os registros de ${screen.nome}`,
        response: [{ ...baseFields, ...sampleRecord }],
      },
      {
        method: "GET",
        path: `/api/entities/${screen.tabela_nome}/{id}`,
        description: `Busca um registro específico de ${screen.nome}`,
        response: { ...baseFields, ...sampleRecord },
      },
      {
        method: "POST",
        path: `/api/entities/${screen.tabela_nome}`,
        description: `Cria um novo registro em ${screen.nome}`,
        request: sampleRecord,
        response: { ...baseFields, ...sampleRecord },
      },
      {
        method: "PUT",
        path: `/api/entities/${screen.tabela_nome}/{id}`,
        description: `Atualiza um registro existente em ${screen.nome}`,
        request: sampleRecord,
        response: { ...baseFields, ...sampleRecord },
      },
      {
        method: "DELETE",
        path: `/api/entities/${screen.tabela_nome}/{id}`,
        description: `Exclui um registro de ${screen.nome}`,
        response: { success: true, message: "Registro excluído com sucesso" },
      },
    ];
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Documentação da API
          </h1>
          <p className="text-slate-600">
            Endpoints REST disponíveis para cada tela criada
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Base URL: <code className="ml-1">/api</code>
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allScreens.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Database className="w-16 h-16 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhuma tela criada ainda</p>
            <p className="text-sm text-slate-400">Crie uma tela para ver sua documentação da API aqui</p>
          </CardContent>
        </Card>
      ) : (
        allScreens.map((screen) => {
          const endpoints = generateEndpoints(screen);
          const Icon = screen.type === 'tree' ? Network : Database;
          const isExpanded = expandedScreens[screen.id];
          
          return (
            <Card key={screen.id} className="border-none shadow-lg">
              <CardHeader 
                className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleScreen(screen.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${screen.cor_primaria || '#64748B'}20` }}
                    >
                      <Icon 
                        className="w-5 h-5"
                        style={{ color: screen.cor_primaria || '#64748B' }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        {screen.nome}
                        {screen.type === 'tree' && (
                          <Badge variant="outline" className="text-xs">Árvore</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 font-normal">
                        Tabela: <code className="text-blue-600">{screen.tabela_nome}</code>
                      </p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {endpoints.length} endpoints
                    </Badge>
                    {screen.ativa ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inativa</Badge>
                    )}
                  </div>
                </div>
                {screen.descricao && isExpanded && (
                  <p className="text-sm text-slate-600 mt-2 ml-14">{screen.descricao}</p>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="p-6 space-y-2">
                  {endpoints.map((endpoint, idx) => (
                    <EndpointCard
                      key={`${screen.id}-${idx}`}
                      {...endpoint}
                      expanded={expandedEndpoints[`${screen.id}-${idx}`]}
                      onToggle={() => toggleEndpoint(`${screen.id}-${idx}`)}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}