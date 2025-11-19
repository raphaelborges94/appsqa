import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Save, Search, Monitor, Building2, Users, User, Check, CheckSquare, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AccessManager() {
  const queryClient = useQueryClient();
  
  // Estados de seleção MÚLTIPLA
  const [leftView, setLeftView] = useState("telas");
  const [rightView, setRightView] = useState("grupos");
  const [selectedLeftIds, setSelectedLeftIds] = useState([]);
  const [selectedRightIds, setSelectedRightIds] = useState([]);
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");
  
  // Permissões
  const [permissions, setPermissions] = useState({
    pode_visualizar: false,
    pode_incluir: false,
    pode_alterar: false,
    pode_excluir: false,
    pode_exportar: false,
    pode_importar: false,
  });

  // Queries
  const { data: screens = [], isLoading: loadingScreens } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.ScreenDefinition.list(),
  });

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.DynamicData.filter({ screen_id: "6914d5429593e2c566fdf236" }),
  });

  const { data: grupos = [], isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const allGrupos = await base44.entities.DynamicData.filter({ screen_id: "6914e66fd3185853648eb6b7" });
      return allGrupos.filter(g => g.data.nome?.toLowerCase() !== 'administradores');
    },
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const allUsers = await base44.entities.DynamicData.filter({ screen_id: "6914d466e7fd5cb9e8951dae" });
      const adminGroup = await base44.entities.DynamicData.filter({ 
        screen_id: "6914e66fd3185853648eb6b7" 
      });
      const adminGroupId = adminGroup.find(g => g.data.nome?.toLowerCase() === 'administradores')?.id;
      return allUsers.filter(u => u.data.grupo_id !== adminGroupId);
    },
  });

  const { data: existingAccess = [], refetch: refetchAccess } = useQuery({
    queryKey: ['access-all'],
    queryFn: () => base44.entities.AccessControl.list(),
  });

  // Carregar permissões existentes quando selecionar itens
  useEffect(() => {
    if (selectedLeftIds.length === 1 && selectedRightIds.length === 1) {
      const leftId = selectedLeftIds[0];
      const rightId = selectedRightIds[0];

      let existing = null;

      if (leftView === "telas") {
        if (rightView === "grupos") {
          existing = existingAccess.find(a => 
            a.screen_id === leftId &&
            !a.empresa_id &&
            a.grupo_id === rightId
          );
        } else {
          const usuario = usuarios.find(u => u.id === rightId);
          if (usuario) {
            existing = existingAccess.find(a => 
              a.screen_id === leftId &&
              !a.empresa_id &&
              a.usuario_email === usuario.data?.email
            );
          }
        }
      } else {
        if (screens.length > 0) {
          const firstScreen = screens[0];
          if (rightView === "grupos") {
            existing = existingAccess.find(a => 
              a.screen_id === firstScreen.id &&
              a.empresa_id === leftId &&
              a.grupo_id === rightId
            );
          } else {
            const usuario = usuarios.find(u => u.id === rightId);
            if (usuario) {
              existing = existingAccess.find(a => 
                a.screen_id === firstScreen.id &&
                a.empresa_id === leftId &&
                a.usuario_email === usuario.data?.email
              );
            }
          }
        }
      }

      if (existing) {
        setPermissions({
          pode_visualizar: existing.pode_visualizar || false,
          pode_incluir: existing.pode_incluir || false,
          pode_alterar: existing.pode_alterar || false,
          pode_excluir: existing.pode_excluir || false,
          pode_exportar: existing.pode_exportar || false,
          pode_importar: existing.pode_importar || false,
        });
      } else {
        setPermissions({
          pode_visualizar: false,
          pode_incluir: false,
          pode_alterar: false,
          pode_excluir: false,
          pode_exportar: false,
          pode_importar: false,
        });
      }
    } else if (selectedLeftIds.length === 0 || selectedRightIds.length === 0) {
      setPermissions({
        pode_visualizar: false,
        pode_incluir: false,
        pode_alterar: false,
        pode_excluir: false,
        pode_exportar: false,
        pode_importar: false,
      });
    }
  }, [selectedLeftIds, selectedRightIds, leftView, rightView, existingAccess, usuarios, screens]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessControl.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-all'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessControl.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-all'] });
    },
  });

  const getLeftItems = () => {
    const items = leftView === "telas" ? screens : empresas;
    return items.filter(item => {
      if (!searchLeft) return true;
      const name = leftView === "telas" 
        ? item.nome 
        : (item.data?.razao_social || item.data?.nome_fantasia || '');
      return name.toLowerCase().includes(searchLeft.toLowerCase());
    });
  };

  const getRightItems = () => {
    const items = rightView === "grupos" ? grupos : usuarios;
    return items.filter(item => {
      if (!searchRight) return true;
      const name = rightView === "grupos" 
        ? item.data?.nome 
        : (item.data?.nome || item.data?.email || '');
      return name.toLowerCase().includes(searchRight.toLowerCase());
    });
  };

  const toggleLeftSelection = (id) => {
    setSelectedLeftIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleRightSelection = (id) => {
    setSelectedRightIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllLeft = () => {
    setSelectedLeftIds(getLeftItems().map(i => i.id));
  };

  const clearLeftSelection = () => {
    setSelectedLeftIds([]);
  };

  const selectAllRight = () => {
    setSelectedRightIds(getRightItems().map(i => i.id));
  };

  const clearRightSelection = () => {
    setSelectedRightIds([]);
  };

  const hasAnyPermission = Object.values(permissions).some(p => p === true);
  const canSave = selectedLeftIds.length > 0 && selectedRightIds.length > 0 && hasAnyPermission;

  const getTotalCombinations = () => {
    if (leftView === "empresas") {
      return selectedLeftIds.length * screens.length * selectedRightIds.length;
    }
    return selectedLeftIds.length * selectedRightIds.length;
  };

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Selecione itens em ambos os lados e configure as permissões');
      return;
    }

    const totalCombos = getTotalCombinations();
    
    if (!confirm(`Isso criará/atualizará ${totalCombos} permissões. Continuar?`)) {
      return;
    }

    try {
      const promises = [];

      for (const leftId of selectedLeftIds) {
        for (const rightId of selectedRightIds) {
          const accessData = {
            tipo_acesso: rightView === "grupos" ? "grupo" : "usuario",
            ativa: true,
            prioridade: 0,
            ...permissions,
          };

          if (leftView === "telas") {
            accessData.screen_id = leftId;
            accessData.empresa_id = "";
            
            if (rightView === "grupos") {
              accessData.grupo_id = rightId;
              accessData.usuario_email = "";
            } else {
              const usuario = usuarios.find(u => u.id === rightId);
              accessData.usuario_email = usuario?.data?.email || "";
              accessData.grupo_id = "";
            }

            const existing = existingAccess.find(a => 
              a.screen_id === leftId &&
              !a.empresa_id &&
              ((rightView === "grupos" && a.grupo_id === rightId) ||
               (rightView === "usuarios" && a.usuario_email === accessData.usuario_email))
            );

            if (existing) {
              promises.push(
                deleteMutation.mutateAsync(existing.id)
                  .then(() => createMutation.mutateAsync(accessData))
              );
            } else {
              promises.push(createMutation.mutateAsync(accessData));
            }
          } else {
            for (const screen of screens) {
              const dataForScreen = { ...accessData };
              dataForScreen.screen_id = screen.id;
              dataForScreen.empresa_id = leftId;

              if (rightView === "grupos") {
                dataForScreen.grupo_id = rightId;
                dataForScreen.usuario_email = "";
              } else {
                const usuario = usuarios.find(u => u.id === rightId);
                dataForScreen.usuario_email = usuario?.data?.email || "";
                dataForScreen.grupo_id = "";
              }

              const existing = existingAccess.find(a => 
                a.screen_id === screen.id &&
                a.empresa_id === leftId &&
                ((rightView === "grupos" && a.grupo_id === rightId) ||
                 (rightView === "usuarios" && a.usuario_email === dataForScreen.usuario_email))
              );

              if (existing) {
                promises.push(
                  deleteMutation.mutateAsync(existing.id)
                    .then(() => createMutation.mutateAsync(dataForScreen))
                );
              } else {
                promises.push(createMutation.mutateAsync(dataForScreen));
              }
            }
          }
        }
      }

      await Promise.all(promises);
      
      toast.success(`${totalCombos} permissões configuradas com sucesso!`);
      
      setSelectedLeftIds([]);
      setSelectedRightIds([]);
      setPermissions({
        pode_visualizar: false,
        pode_incluir: false,
        pode_alterar: false,
        pode_excluir: false,
        pode_exportar: false,
        pode_importar: false,
      });
      
      refetchAccess();
    } catch (error) {
      toast.error('Erro ao salvar permissões');
      console.error(error);
    }
  };

  const PermissionCard = ({ icon: Icon, label, checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
        checked
          ? 'border-slate-400 bg-slate-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          checked ? 'bg-slate-200' : 'bg-slate-100'
        }`}>
          <Icon className={`w-6 h-6 ${checked ? 'text-slate-700' : 'text-slate-400'}`} />
        </div>
        <span className={`font-medium text-sm ${checked ? 'text-slate-900' : 'text-slate-600'}`}>
          {label}
        </span>
        {checked && (
          <Check className="absolute top-2 right-2 w-4 h-4 text-slate-700" />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Controle de Acesso
              </h1>
              <p className="text-sm text-slate-500">Configure permissões em massa</p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-300 text-slate-600">
            Administradores têm acesso total
          </Badge>
        </div>
      </div>

      {/* Main Content - 3 Colunas */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* PASSO 1: Lado Esquerdo */}
        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-200 bg-slate-50 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <CardTitle className="text-base">Selecione</CardTitle>
            </div>
            
            <Tabs value={leftView} onValueChange={(v) => { setLeftView(v); setSelectedLeftIds([]); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white">
                <TabsTrigger value="telas" className="data-[state=active]:bg-slate-200">
                  <Monitor className="w-4 h-4 mr-2" />
                  Telas
                </TabsTrigger>
                <TabsTrigger value="empresas" className="data-[state=active]:bg-slate-200">
                  <Building2 className="w-4 h-4 mr-2" />
                  Empresas
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchLeft}
                onChange={(e) => setSearchLeft(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 border-slate-300"
              />
            </div>

            {selectedLeftIds.length > 0 && (
              <div className="flex items-center justify-between mt-3 p-2 bg-slate-100 rounded-lg">
                <Badge variant="outline" className="border-slate-400 text-slate-700">
                  {selectedLeftIds.length} selecionado(s)
                </Badge>
                <Button size="sm" variant="ghost" onClick={clearLeftSelection} className="h-7 text-xs">
                  Limpar
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={selectAllLeft}
                  className="flex-1 text-xs"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearLeftSelection}
                  className="flex-1 text-xs"
                  disabled={selectedLeftIds.length === 0}
                >
                  <Square className="w-3 h-3 mr-1" />
                  Nenhum
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {(loadingScreens || loadingEmpresas) ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                ) : getLeftItems().length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum item
                  </div>
                ) : (
                  getLeftItems().map((item) => {
                    const isSelected = selectedLeftIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleLeftSelection(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'border-slate-400 bg-slate-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 pointer-events-none">
                          <div className="pointer-events-auto">
                            <Checkbox checked={isSelected} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {leftView === "telas" 
                                ? item.nome 
                                : (item.data?.razao_social || item.data?.nome_fantasia)}
                            </p>
                            {leftView === "telas" && (
                              <p className="text-xs text-slate-500 truncate">
                                {item.tabela_nome}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* PASSO 2: Centro - Permissões */}
        <Card className="col-span-6 border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <CardTitle className="text-base">Configure as Permissões</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-6">
            {selectedLeftIds.length === 0 || selectedRightIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-600 mb-2">
                    Selecione nos lados
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Badge variant={selectedLeftIds.length > 0 ? "default" : "outline"}>
                      {selectedLeftIds.length > 0 ? `✓ ${selectedLeftIds.length}` : '○'} Esquerda
                    </Badge>
                    <Badge variant={selectedRightIds.length > 0 ? "default" : "outline"}>
                      {selectedRightIds.length > 0 ? `✓ ${selectedRightIds.length}` : '○'} Direita
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 h-full flex flex-col">
                {/* Grid de Permissões */}
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <PermissionCard
                    icon={Check}
                    label="Visualizar"
                    checked={permissions.pode_visualizar}
                    onChange={(val) => setPermissions({...permissions, pode_visualizar: val})}
                  />
                  <PermissionCard
                    icon={Shield}
                    label="Incluir"
                    checked={permissions.pode_incluir}
                    onChange={(val) => setPermissions({...permissions, pode_incluir: val})}
                  />
                  <PermissionCard
                    icon={Shield}
                    label="Alterar"
                    checked={permissions.pode_alterar}
                    onChange={(val) => setPermissions({...permissions, pode_alterar: val})}
                  />
                  <PermissionCard
                    icon={Trash2}
                    label="Excluir"
                    checked={permissions.pode_excluir}
                    onChange={(val) => setPermissions({...permissions, pode_excluir: val})}
                  />
                  <PermissionCard
                    icon={Shield}
                    label="Exportar"
                    checked={permissions.pode_exportar}
                    onChange={(val) => setPermissions({...permissions, pode_exportar: val})}
                  />
                  <PermissionCard
                    icon={Shield}
                    label="Importar"
                    checked={permissions.pode_importar}
                    onChange={(val) => setPermissions({...permissions, pode_importar: val})}
                  />
                </div>

                {/* Botão */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    size="lg"
                    className="bg-slate-800 hover:bg-slate-900 px-8 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Tudo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PASSO 3: Lado Direito */}
        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-200 bg-slate-50 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <CardTitle className="text-base">Selecione</CardTitle>
            </div>

            <Tabs value={rightView} onValueChange={(v) => { setRightView(v); setSelectedRightIds([]); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white">
                <TabsTrigger value="grupos" className="data-[state=active]:bg-slate-200">
                  <Users className="w-4 h-4 mr-2" />
                  Grupos
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="data-[state=active]:bg-slate-200">
                  <User className="w-4 h-4 mr-2" />
                  Usuários
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchRight}
                onChange={(e) => setSearchRight(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 border-slate-300"
              />
            </div>

            {selectedRightIds.length > 0 && (
              <div className="flex items-center justify-between mt-3 p-2 bg-slate-100 rounded-lg">
                <Badge variant="outline" className="border-slate-400 text-slate-700">
                  {selectedRightIds.length} selecionado(s)
                </Badge>
                <Button size="sm" variant="ghost" onClick={clearRightSelection} className="h-7 text-xs">
                  Limpar
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={selectAllRight}
                  className="flex-1 text-xs"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearRightSelection}
                  className="flex-1 text-xs"
                  disabled={selectedRightIds.length === 0}
                >
                  <Square className="w-3 h-3 mr-1" />
                  Nenhum
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {(loadingGrupos || loadingUsuarios) ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                ) : getRightItems().length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum item
                  </div>
                ) : (
                  getRightItems().map((item) => {
                    const isSelected = selectedRightIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleRightSelection(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'border-slate-400 bg-slate-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 pointer-events-none">
                          <div className="pointer-events-auto">
                            <Checkbox checked={isSelected} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {rightView === "grupos" 
                                ? item.data?.nome 
                                : (item.data?.nome || item.data?.email)}
                            </p>
                            {rightView === "usuarios" && item.data?.email && (
                              <p className="text-xs text-slate-500 truncate">
                                {item.data.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}