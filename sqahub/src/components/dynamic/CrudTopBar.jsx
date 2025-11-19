import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Filter, Search, Download, FileText, FileSpreadsheet, FileType } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CrudTopBar({ 
  onNew, 
  onEdit, 
  onDelete,
  onSearch,
  onFilter,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  searchTerm,
  selectedRecords = [],
  canIncluir,
  canAlterar,
  canExcluir,
  canExportar = true,
  filterComponent,
}) {
  const hasSelection = selectedRecords.length > 0;
  const isSingleSelection = selectedRecords.length === 1;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-2">
        {canIncluir && (
          <Button
            size="sm"
            onClick={onNew}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Incluir
          </Button>
        )}
        
        {canAlterar && (
          <Button
            size="sm"
            onClick={onEdit}
            disabled={!isSingleSelection}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Editar
          </Button>
        )}
        
        {canExcluir && (
          <Button
            size="sm"
            onClick={onDelete}
            disabled={!hasSelection}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>
        )}

        {hasSelection && (
          <span className="text-sm text-slate-600 ml-2">
            {selectedRecords.length} {selectedRecords.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="pl-9 pr-4 h-9 w-64 bg-slate-50 border-slate-200"
          />
        </div>

        {filterComponent && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="border-slate-300">
                <Filter className="w-4 h-4 mr-1.5" />
                Filtro
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              {filterComponent}
            </PopoverContent>
          </Popover>
        )}

        {canExportar && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExportCSV} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              <div className="flex flex-col">
                <span className="font-medium">Exportar CSV</span>
                <span className="text-xs text-slate-500">Formato texto separado por vírgulas</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-600" />
              <div className="flex flex-col">
                <span className="font-medium">Exportar Excel</span>
                <span className="text-xs text-slate-500">Planilha compatível com Excel</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
              <FileType className="w-4 h-4 mr-2 text-slate-600" />
              <div className="flex flex-col">
                <span className="font-medium">Exportar PDF</span>
                <span className="text-xs text-slate-500">Documento formatado</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </div>
  );
}