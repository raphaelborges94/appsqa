import React, { useState, useMemo, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  FolderPlus, 
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_ICONS = [
  "Database", "Settings", "Users", "Building2", "FileText", 
  "LayoutDashboard", "ShoppingCart", "Package", "Calendar", "MessageSquare"
];

export default function MenuConfigurator({ menuStructure, onChange, availableScreens }) {
  const [structure, setStructure] = useState(menuStructure || []);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ title: "", icon: "Database" });
  const previousScreenIdsRef = useRef([]);

  // Sincronizar com menuStructure quando ele mudar externamente
  useEffect(() => {
    if (menuStructure && menuStructure.length > 0) {
      setStructure(menuStructure);
    }
  }, [menuStructure]);

  // Limpar estrutura de telas excluídas APENAS quando telas são removidas
  useEffect(() => {
    const currentScreenIds = availableScreens.map(s => s.id);
    const previousScreenIds = previousScreenIdsRef.current;
    
    // Verificar se alguma tela foi REMOVIDA
    const removedScreens = previousScreenIds.filter(id => !currentScreenIds.includes(id));
    
    if (removedScreens.length > 0 && structure.length > 0) {
      const cleanedStructure = structure.map(group => ({
        ...group,
        items: group.items.filter(item => !item.screen_id || currentScreenIds.includes(item.screen_id))
      }));
      
      setStructure(cleanedStructure);
      onChange(cleanedStructure);
    }
    
    previousScreenIdsRef.current = currentScreenIds;
  }, [availableScreens]);

  // Identificar telas não alocadas
  const allocatedScreenIds = useMemo(() => {
    const ids = [];
    structure.forEach(group => {
      group.items.forEach(item => {
        if (item.screen_id) {
          ids.push(item.screen_id);
        }
      });
    });
    return ids;
  }, [structure]);

  const unallocatedScreens = useMemo(() => {
    return availableScreens.filter(screen => !allocatedScreenIds.includes(screen.id));
  }, [availableScreens, allocatedScreenIds]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type, draggableId } = result;

    if (type === "group") {
      const newStructure = Array.from(structure);
      const [removed] = newStructure.splice(source.index, 1);
      newStructure.splice(destination.index, 0, removed);
      setStructure(newStructure);
      onChange(newStructure);
    } else if (type === "screen") {
      const newStructure = [...structure];

      // Arrastar de telas disponíveis para grupo
      if (source.droppableId === "available-screens") {
        const screenId = draggableId.replace('available-', '');
        const screen = availableScreens.find(s => s.id === screenId);
        const destGroupIndex = parseInt(destination.droppableId.split("-")[1]);
        
        if (screen && !isNaN(destGroupIndex)) {
          const newItem = {
            id: `item-${Date.now()}`,
            title: screen.nome,
            screen_id: screen.id,
            type: "screen"
          };

          newStructure[destGroupIndex].items.splice(destination.index, 0, newItem);
        }
      } 
      // Mover entre grupos ou dentro do mesmo grupo
      else {
        const sourceGroupIndex = parseInt(source.droppableId.split("-")[1]);
        const destGroupIndex = parseInt(destination.droppableId.split("-")[1]);
        
        if (!isNaN(sourceGroupIndex) && !isNaN(destGroupIndex)) {
          const sourceItems = [...newStructure[sourceGroupIndex].items];
          const [removed] = sourceItems.splice(source.index, 1);
          
          if (sourceGroupIndex === destGroupIndex) {
            sourceItems.splice(destination.index, 0, removed);
            newStructure[sourceGroupIndex].items = sourceItems;
          } else {
            const destItems = [...newStructure[destGroupIndex].items];
            destItems.splice(destination.index, 0, removed);
            newStructure[sourceGroupIndex].items = sourceItems;
            newStructure[destGroupIndex].items = destItems;
          }
        }
      }
      
      setStructure(newStructure);
      onChange(newStructure);
    }
  };

  const addNewGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      title: newGroupData.title,
      icon: newGroupData.icon,
      items: []
    };
    
    const newStructure = [...structure, newGroup];
    setStructure(newStructure);
    onChange(newStructure);
    setNewGroupDialog(false);
    setNewGroupData({ title: "", icon: "Database" });
    setExpandedGroups(prev => ({ ...prev, [newGroup.id]: true }));
  };

  const deleteGroup = (groupIndex) => {
    if (confirm('Deseja remover este grupo? Os itens dentro dele serão perdidos.')) {
      const newStructure = structure.filter((_, i) => i !== groupIndex);
      setStructure(newStructure);
      onChange(newStructure);
    }
  };

  const updateGroup = (groupIndex, updates) => {
    const newStructure = [...structure];
    newStructure[groupIndex] = { ...newStructure[groupIndex], ...updates };
    setStructure(newStructure);
    onChange(newStructure);
  };

  const removeItem = (groupIndex, itemIndex) => {
    const newStructure = [...structure];
    newStructure[groupIndex].items.splice(itemIndex, 1);
    setStructure(newStructure);
    onChange(newStructure);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Configuração do Menu Lateral</h3>
            <p className="text-sm text-slate-500">Arraste telas disponíveis para os grupos ou reorganize a estrutura</p>
          </div>
          <Button onClick={() => setNewGroupDialog(true)} size="sm">
            <FolderPlus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        {/* Layout 2 Colunas */}
        <div className="grid grid-cols-12 gap-4">
          {/* Coluna Esquerda: Telas Disponíveis */}
          <div className="col-span-4">
            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-700" />
                  Telas Disponíveis
                  <Badge variant="outline" className="ml-auto">{unallocatedScreens.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <Droppable droppableId="available-screens" type="screen" isDropDisabled={true}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-[400px] rounded-lg border-2 border-dashed p-3 ${
                        snapshot.isDraggingOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {unallocatedScreens.length === 0 ? (
                        <div className="text-center py-12">
                          <Database className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Todas as telas já estão no menu</p>
                          <p className="text-xs text-slate-400">Crie novas telas no Construtor</p>
                        </div>
                      ) : (
                        unallocatedScreens.map((screen, index) => (
                          <Draggable
                            key={screen.id}
                            draggableId={`available-${screen.id}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex items-center gap-2 p-3 rounded-lg bg-white border-2 cursor-grab active:cursor-grabbing ${
                                  snapshot.isDragging
                                    ? 'border-blue-400 shadow-lg'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <GripVertical className="w-4 h-4 text-slate-400" />
                                <Database className="w-4 h-4 text-blue-600" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {screen.nome}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {screen.tabela_nome}
                                  </p>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita: Estrutura do Menu */}
          <div className="col-span-8">
            <Droppable droppableId="groups" type="group">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {structure.map((group, groupIndex) => (
                    <Draggable
                      key={group.id}
                      draggableId={group.id}
                      index={groupIndex}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border-2 ${
                            snapshot.isDragging ? 'border-blue-400 shadow-lg' : 'border-slate-200'
                          }`}
                        >
                          <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5 text-slate-400" />
                              </div>

                              <button
                                onClick={() => toggleGroup(group.id)}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                {expandedGroups[group.id] ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>

                              {editingGroup === group.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <Input
                                    value={group.title}
                                    onChange={(e) => updateGroup(groupIndex, { title: e.target.value })}
                                    className="h-8"
                                  />
                                  <Select
                                    value={group.icon}
                                    onValueChange={(value) => updateGroup(groupIndex, { icon: value })}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {AVAILABLE_ICONS.map(icon => (
                                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingGroup(null)}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <CardTitle className="text-sm flex-1">{group.title}</CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingGroup(group.id)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteGroup(groupIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </CardHeader>

                          {expandedGroups[group.id] && (
                            <CardContent className="p-4">
                              <Droppable droppableId={`group-${groupIndex}`} type="screen">
                                {(provided, snapshot) => (
                                  <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`space-y-2 min-h-[80px] rounded-lg border-2 border-dashed p-3 ${
                                      snapshot.isDraggingOver
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-200 bg-slate-50'
                                    }`}
                                  >
                                    {group.items.length === 0 && (
                                      <p className="text-center text-sm text-slate-400 py-4">
                                        Arraste telas aqui
                                      </p>
                                    )}

                                    {group.items.map((item, itemIndex) => (
                                      <Draggable
                                        key={item.id}
                                        draggableId={item.id}
                                        index={itemIndex}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`flex items-center gap-2 p-2 rounded bg-white border ${
                                              snapshot.isDragging
                                                ? 'border-blue-400 shadow-lg'
                                                : 'border-slate-200'
                                            }`}
                                          >
                                            <div
                                              {...provided.dragHandleProps}
                                              className="cursor-grab active:cursor-grabbing"
                                            >
                                              <GripVertical className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <Database className="w-4 h-4 text-slate-600" />
                                            <span className="flex-1 text-sm font-medium text-slate-700">
                                              {item.title}
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => removeItem(groupIndex, itemIndex)}
                                              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </CardContent>
                          )}
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {structure.length === 0 && (
                    <Card className="border-dashed border-2 border-slate-300">
                      <CardContent className="p-12 text-center">
                        <FolderPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 mb-4">Nenhum grupo criado ainda</p>
                        <Button onClick={() => setNewGroupDialog(true)} variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeiro Grupo
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        {/* Dialog para Novo Grupo */}
        <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Grupo</DialogTitle>
              <DialogDescription>
                Defina o nome e ícone do novo grupo de menu
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-title">Nome do Grupo *</Label>
                <Input
                  id="group-title"
                  value={newGroupData.title}
                  onChange={(e) => setNewGroupData({ ...newGroupData, title: e.target.value })}
                  placeholder="Ex: Relatórios"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-icon">Ícone</Label>
                <Select
                  value={newGroupData.icon}
                  onValueChange={(value) => setNewGroupData({ ...newGroupData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewGroupDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={addNewGroup} disabled={!newGroupData.title.trim()}>
                Criar Grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DragDropContext>
  );
}