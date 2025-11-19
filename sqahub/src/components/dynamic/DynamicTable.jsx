import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Image, FileText, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function DynamicTable({ 
  screen, 
  fields, 
  records, 
  isLoading,
  selectedRecords = [],
  onSelectionChange,
}) {
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 50,
    id: 100,
    dhinc: 150,
    dhalter: 150,
  });
  const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
  const [resizing, setResizing] = useState(null);
  const [dragging, setDragging] = useState(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  
  const tableRef = useRef(null);

  // Filtrar campos do sistema (id, dhinc, dhalter)
  const customFields = fields.filter(f =>
    f.nome_campo !== 'id' &&
    f.nome_campo !== 'dhinc' &&
    f.nome_campo !== 'dhalter'
  );

  // Inicializar ordem e larguras das colunas
  useEffect(() => {
    if (customFields.length > 0) {
      // Criar cópias ordenadas para comparação (sem modificar originais)
      const currentFieldIds = [...customFields.map(f => f.id)].sort().join(',');
      const orderedFieldIds = [...columnOrder].sort().join(',');
      
      // Reinicializa se não há colunas OU se os campos mudaram (não apenas a ordem)
      if (columnOrder.length === 0 || currentFieldIds !== orderedFieldIds) {
        setColumnOrder(customFields.map(f => f.id));
        
        const newWidths = {
          checkbox: 50,
          id: 100,
          dhinc: 150,
          dhalter: 150,
        };
        
        customFields.forEach(field => {
          // Preserva largura customizada se já existir
          newWidths[field.id] = columnWidths[field.id] || 150;
        });
        
        setColumnWidths(newWidths);
      }
    }
  }, [customFields]);

  // Resetar página ao mudar registros
  useEffect(() => {
    setCurrentPage(1);
  }, [records.length]);

  // Formatação de valores
  const formatValue = (value, field) => {
    if (value === null || value === undefined) return '-';

    switch (field.tipo) {
      case 'data':
        try {
          return format(new Date(value), 'dd/MM/yyyy');
        } catch {
          return value;
        }
      
      case 'datetime':
        try {
          return format(new Date(value), 'dd/MM/yyyy HH:mm');
        } catch {
          return value;
        }

      case 'hora':
        return value;
      
      case 'decimal':
        return typeof value === 'number' ? value.toFixed(2) : value;
      
      case 'inteiro':
        return value;

      case 'checkbox':
        return value === true || value === 'true' ? (
          <Badge className="bg-green-100 text-green-700">Sim</Badge>
        ) : (
          <Badge variant="outline">Não</Badge>
        );

      case 'imagem':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
            <Image className="w-4 h-4" />
            Ver
          </a>
        ) : '-';

      case 'anexo':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
            <FileText className="w-4 h-4" />
            Baixar
          </a>
        ) : '-';

      case 'texto_longo':
        return value ? (
          <span className="line-clamp-1">{value}</span>
        ) : '-';
      
      default:
        return value;
    }
  };

  // Seleção
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(paginatedRecords.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRecord = (recordId, checked) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId));
    }
  };

  // Ordenação
  const handleSort = (fieldId) => {
    let direction = 'asc';
    if (sortConfig.field === fieldId) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
        fieldId = null;
      }
    }
    setSortConfig({ field: fieldId, direction });
  };

  const getSortIcon = (fieldId) => {
    if (sortConfig.field !== fieldId) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  };

  // Ordenar registros
  const sortedRecords = React.useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) return records;

    if (sortConfig.field === 'id') {
      return [...records].sort((a, b) => {
        const comparison = a.id.localeCompare(b.id);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    if (sortConfig.field === 'dhinc' || sortConfig.field === 'dhalter') {
      return [...records].sort((a, b) => {
        const aDate = new Date(a[sortConfig.field]);
        const bDate = new Date(b[sortConfig.field]);
        const comparison = aDate - bDate;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    const field = customFields.find(f => f.id === sortConfig.field);
    if (!field) return records;

    return [...records].sort((a, b) => {
      const aVal = a[field.nome_campo];
      const bVal = b[field.nome_campo];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [records, sortConfig, customFields]);

  // Paginação
  const totalRecords = sortedRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRecordsPerPageChange = (value) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Drag and Drop para reordenar colunas
  const handleDragStart = (e, fieldId) => {
    setDragging(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, fieldId) => {
    e.preventDefault();
    if (!dragging || dragging === fieldId) return;

    const newOrder = [...columnOrder];
    const dragIndex = newOrder.indexOf(dragging);
    const dropIndex = newOrder.indexOf(fieldId);

    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragging);

    setColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  // Resize de colunas
  const handleResizeStart = (e, fieldId) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      fieldId,
      startX: e.clientX,
      startWidth: columnWidths[fieldId] || 200
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizing.fieldId]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  // Campos ordenados
  const orderedFields = columnOrder
    .map(id => customFields.find(f => f.id === id))
    .filter(Boolean);

  const isAllSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRecords.includes(r.id));
  const isSomeSelected = selectedRecords.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Card className="border-none shadow-lg bg-white flex-1 flex flex-col">
          <CardContent className="p-6 space-y-3 flex-1">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <Card className="border-none shadow-lg bg-white flex-1 flex flex-col">
          <CardContent className="p-16 text-center flex-1 flex flex-col items-center justify-center">
            <Database className="w-16 h-16 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhum registro encontrado</p>
            <p className="text-sm text-slate-400">Use os botões acima para adicionar registros</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="border-none shadow-lg flex-1 flex flex-col overflow-hidden">
        {/* Tabela - Ocupa todo espaço disponível menos o rodapé */}
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <table className="w-full border-collapse" style={{ tableLayout: 'auto', minWidth: 'max-content' }}>
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Checkbox */}
                <th 
                  className="sticky left-0 bg-slate-50 z-20 border-r border-slate-200"
                  style={{ 
                    width: `${columnWidths.checkbox}px`, 
                    minWidth: `${columnWidths.checkbox}px`,
                    maxWidth: `${columnWidths.checkbox}px`
                  }}
                >
                  <div className="p-2 flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                      className={isSomeSelected ? "data-[state=checked]:bg-blue-600" : ""}
                    />
                  </div>
                </th>

                {/* ID do Sistema */}
                <th 
                  className="sticky bg-slate-50 z-20 border-r border-slate-200 group"
                  style={{ 
                    left: `${columnWidths.checkbox}px`,
                    width: `${columnWidths.id}px`,
                    minWidth: `${columnWidths.id}px`,
                    maxWidth: `${columnWidths.id}px`
                  }}
                >
                  <div 
                    className="px-2 py-2 flex items-center justify-between font-semibold text-xs uppercase text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => handleSort('id')}
                  >
                    <span>ID</span>
                    {getSortIcon('id')}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-30"
                    onMouseDown={(e) => handleResizeStart(e, 'id')}
                    style={{ backgroundColor: resizing?.fieldId === 'id' ? '#3b82f6' : undefined }}
                  />
                </th>

                {/* Campos Customizados */}
                {orderedFields.map((field) => (
                  <th
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.id)}
                    onDragOver={(e) => handleDragOver(e, field.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-slate-50 border-r border-slate-200 group ${dragging === field.id ? 'opacity-50' : ''}`}
                    style={{ 
                      width: `${columnWidths[field.id] || 150}px`,
                      minWidth: `${columnWidths[field.id] || 150}px`,
                      position: 'relative'
                    }}
                  >
                    <div className="px-2 py-2 flex items-center justify-between font-semibold text-xs uppercase text-slate-700 hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center gap-1 flex-1">
                        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-move transition-opacity" />
                        <span 
                          className="cursor-pointer flex-1 truncate"
                          onClick={() => handleSort(field.id)}
                        >
                          {field.label}
                        </span>
                        <span onClick={() => handleSort(field.id)} className="cursor-pointer">
                          {getSortIcon(field.id)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-30"
                      onMouseDown={(e) => handleResizeStart(e, field.id)}
                      style={{ backgroundColor: resizing?.fieldId === field.id ? '#3b82f6' : undefined }}
                    />
                  </th>
                ))}

                {/* Data Inclusão */}
                <th
                  className="bg-slate-50 border-r border-slate-200 group"
                  style={{
                    width: `${columnWidths.dhinc}px`,
                    minWidth: `${columnWidths.dhinc}px`,
                    position: 'relative'
                  }}
                >
                  <div
                    className="px-2 py-2 flex items-center justify-between font-semibold text-xs uppercase text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => handleSort('dhinc')}
                  >
                    <span className="truncate">Data Inclusão</span>
                    {getSortIcon('dhinc')}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-30"
                    onMouseDown={(e) => handleResizeStart(e, 'dhinc')}
                    style={{ backgroundColor: resizing?.fieldId === 'dhinc' ? '#3b82f6' : undefined }}
                  />
                </th>

                {/* Data Alteração */}
                <th
                  className="bg-slate-50 border-r border-slate-200 group"
                  style={{
                    width: `${columnWidths.dhalter}px`,
                    minWidth: `${columnWidths.dhalter}px`,
                    position: 'relative'
                  }}
                >
                  <div
                    className="px-2 py-2 flex items-center justify-between font-semibold text-xs uppercase text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => handleSort('dhalter')}
                  >
                    <span className="truncate">Data Alteração</span>
                    {getSortIcon('dhalter')}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-30"
                    onMouseDown={(e) => handleResizeStart(e, 'dhalter')}
                    style={{ backgroundColor: resizing?.fieldId === 'dhalter' ? '#3b82f6' : undefined }}
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.map((record) => {
                const isSelected = selectedRecords.includes(record.id);
                
                return (
                  <tr 
                    key={record.id} 
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    {/* Checkbox */}
                    <td 
                      className="sticky left-0 z-10 border-r border-slate-100"
                      style={{ 
                        width: `${columnWidths.checkbox}px`,
                        maxWidth: `${columnWidths.checkbox}px`,
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff'
                      }}
                    >
                      <div className="p-2 flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRecord(record.id, checked)}
                          aria-label="Selecionar registro"
                        />
                      </div>
                    </td>

                    {/* ID do Sistema */}
                    <td 
                      className="font-mono text-xs text-slate-600 sticky z-10 border-r border-slate-100"
                      style={{ 
                        left: `${columnWidths.checkbox}px`,
                        width: `${columnWidths.id}px`,
                        maxWidth: `${columnWidths.id}px`,
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff'
                      }}
                    >
                      <div className="px-2 py-2 text-xs">
                        {String(record.id).substring(0, 8)}...
                      </div>
                    </td>

                    {/* Campos Customizados */}
                    {orderedFields.map((field) => (
                      <td
                        key={field.id}
                        className="text-sm text-slate-700 border-r border-slate-100"
                        style={{ width: `${columnWidths[field.id] || 150}px` }}
                      >
                        <div className="px-2 py-2 text-xs truncate">
                          {formatValue(record[field.nome_campo], field)}
                        </div>
                      </td>
                    ))}

                    {/* Data Inclusão */}
                    <td
                      className="text-sm text-slate-600 border-r border-slate-100"
                      style={{ width: `${columnWidths.dhinc}px` }}
                    >
                      <div className="px-2 py-2 text-xs">
                        {format(new Date(record.dhinc), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>

                    {/* Data Alteração */}
                    <td
                      className="text-sm text-slate-600 border-r border-slate-100"
                      style={{ width: `${columnWidths.dhalter}px` }}
                    >
                      <div className="px-2 py-2 text-xs">
                        {format(new Date(record.dhalter), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé com Paginação - FIXO NA PARTE INFERIOR */}
        <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Informações de Registros */}
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium">Registros por página:</span>
                <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                  <SelectTrigger className="w-20 h-8 bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-slate-700 font-medium border-l border-slate-300 pl-4">
                Exibindo <span className="text-blue-600">{startIndex + 1}</span> a{' '}
                <span className="text-blue-600">{Math.min(endIndex, totalRecords)}</span> de{' '}
                <span className="text-blue-600">{totalRecords}</span> registros
              </div>
              
              {selectedRecords.length > 0 && (
                <Badge className="bg-blue-600 text-white ml-2">
                  {selectedRecords.length} selecionado{selectedRecords.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Controles de Navegação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {/* Páginas próximas */}
                {[...Array(totalPages)].map((_, idx) => {
                  const page = idx + 1;
                  // Mostrar apenas páginas próximas
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={`h-8 min-w-8 ${
                          page === currentPage 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-white'
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="text-slate-400 px-1">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}