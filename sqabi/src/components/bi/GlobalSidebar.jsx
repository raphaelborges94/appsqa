import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ChevronDown, 
  ChevronRight, 
  Save, 
  Copy, 
  RotateCcw,
  FileJson,
  Eye
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GlobalSidebar({ 
  children,
  config,
  onSave,
  onDuplicate,
  onReset,
  onViewJSON,
  chartType = "pivot"
}) {
  const [openSections, setOpenSections] = useState({
    dataSource: true,
    structure: true,
    tools: false,
    filters: false,
    sorting: false,
    formatting: false,
  });

  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleViewJSON = () => {
    setJsonDialogOpen(true);
    if (onViewJSON) onViewJSON();
  };

  const sections = [
    {
      id: 'dataSource',
      title: 'Fonte de Dados',
      component: children?.dataSource
    },
    {
      id: 'structure',
      title: 'Estrutura',
      component: children?.structure
    },
    {
      id: 'filters',
      title: 'Filtros',
      component: children?.filters
    },
    {
      id: 'sorting',
      title: 'Ordenação',
      component: children?.sorting
    },
    {
      id: 'formatting',
      title: 'Formatação Condicional',
      component: children?.formatting
    },
    {
      id: 'tools',
      title: 'Ferramentas',
      component: (
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={onSave}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configuração
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={onDuplicate}
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleViewJSON}
          >
            <FileJson className="w-4 h-4 mr-2" />
            Ver JSON
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700" 
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">
            Configurações
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personalize sua visualização
          </p>
        </div>

        <div className="p-4 space-y-2">
          {sections.map((section) => section.component && (
            <Collapsible
              key={section.id}
              open={openSections[section.id]}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="w-full">
                <Card className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {section.title}
                    </h3>
                    {openSections[section.id] ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 ml-2">
                <div className="p-3 border-l-2 border-slate-200 dark:border-slate-700">
                  {section.component}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Configuração JSON</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}