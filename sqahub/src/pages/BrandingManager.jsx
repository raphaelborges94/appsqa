
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save, Upload, Eye, RefreshCw, Menu } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MenuConfigurator from "../components/menu/MenuConfigurator";

export default function BrandingManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");

  const { data: configs, isLoading } = useQuery({
    queryKey: ['branding-configs'],
    queryFn: () => base44.entities.BrandingConfig.list('-created_date'),
    initialData: [],
  });

  const { data: menuConfigs, isLoading: menuLoading } = useQuery({
    queryKey: ['menu-configs'],
    queryFn: () => base44.entities.MenuConfig.list('-created_date'),
    initialData: [],
  });

  const { data: crudScreens, refetch: refetchCrudScreens } = useQuery({
    queryKey: ['crud-screens'],
    queryFn: async () => {
      const allScreens = await base44.entities.ScreenDefinition.list('-created_date');
      return allScreens.filter(s => s.ativa && !s.is_subtable);
    },
    initialData: [],
  });

  const { data: treeScreens, refetch: refetchTreeScreens } = useQuery({
    queryKey: ['tree-screens-menu'],
    queryFn: async () => {
      const allTreeScreens = await base44.entities.TreeScreenDefinition.list('-created_date');
      return allTreeScreens.filter(s => s.ativa);
    },
    initialData: [],
  });

  const allScreens = React.useMemo(() => {
    return [...crudScreens, ...treeScreens];
  }, [crudScreens, treeScreens]);

  const activeConfig = configs.find(c => c.is_active) || configs[0];
  const activeMenuConfig = menuConfigs.find(c => c.is_active) || menuConfigs[0];

  const [formData, setFormData] = useState({
    app_name: "SQA HUB",
    app_subtitle: "Enterprise Platform",
    logo_url: "",
    primary_color: "#0F172A",
    secondary_color: "#64748B",
    accent_color: "#3B82F6",
    sidebar_bg_color: "#FFFFFF",
    sidebar_text_color: "#0F172A",
    sidebar_active_bg: "#0F172A",
    sidebar_active_text: "#FFFFFF",
    favicon_url: "",
    company_name: "",
    support_email: "",
    support_phone: "",
    is_active: true,
  });

  const [menuStructure, setMenuStructure] = useState([
    {
      id: "config-group",
      title: "Configurações",
      icon: "Settings", // Assuming 'Settings' is an icon string name that MenuConfigurator maps
      items: []
    }
  ]);

  useEffect(() => {
    if (activeConfig) {
      setFormData(activeConfig);
    }
  }, [activeConfig]);

  useEffect(() => {
    if (activeMenuConfig && activeMenuConfig.menu_structure) {
      console.log('📋 Carregando menu structure do banco:', activeMenuConfig.menu_structure);
      setMenuStructure(activeMenuConfig.menu_structure);
    } else if (!activeMenuConfig && allScreens.length > 0) {
      // Estrutura inicial padrão APENAS se não existe config salva
      console.log('📋 Criando estrutura padrão de menu');
      setMenuStructure([
        {
          id: "config-group",
          title: "Configurações",
          icon: "Settings",
          items: []
        },
        {
          id: "screens-group",
          title: "Telas",
          icon: "Database",
          items: allScreens.map(screen => ({
            id: `screen-${screen.id}`,
            title: screen.nome,
            screen_id: screen.id,
            type: "screen"
          }))
        }
      ]);
    }
  }, [activeMenuConfig]); // REMOVIDO allScreens da dependência para evitar resets

  // Recarregar telas quando mudar para aba de menu
  useEffect(() => {
    if (activeTab === "menu") {
      refetchCrudScreens(); // Refetch CRUD screens
      refetchTreeScreens(); // Refetch Tree screens
    }
  }, [activeTab, refetchCrudScreens, refetchTreeScreens]); // Updated dependencies

  const createBrandingMutation = useMutation({
    mutationFn: (data) => base44.entities.BrandingConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-configs'] });
      toast.success('Configurações de marca salvas!');
      window.location.reload();
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BrandingConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-configs'] });
      toast.success('Configurações de marca atualizadas!');
      window.location.reload();
    },
  });

  const createMenuMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
      toast.success('Configurações do menu salvas!');
      window.location.reload();
    },
  });

  const updateMenuMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
      toast.success('Configurações do menu atualizadas!');
      window.location.reload();
    },
  });

  const handleFileUpload = async (file, field) => {
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleBrandingSubmit = (e) => {
    e.preventDefault();
    
    if (activeConfig?.id) {
      updateBrandingMutation.mutate({ id: activeConfig.id, data: formData });
    } else {
      createBrandingMutation.mutate(formData);
    }
  };

  const handleMenuSave = () => {
    const menuData = {
      menu_structure: menuStructure,
      is_active: true // Assuming the saved menu config should be active
    };

    if (activeMenuConfig?.id) {
      updateMenuMutation.mutate({ id: activeMenuConfig.id, data: menuData });
    } else {
      createMenuMutation.mutate(menuData);
    }
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      setFormData({
        app_name: "SQA HUB",
        app_subtitle: "Enterprise Platform",
        logo_url: "",
        primary_color: "#0F172A",
        secondary_color: "#64748B",
        accent_color: "#3B82F6",
        sidebar_bg_color: "#FFFFFF",
        sidebar_text_color: "#0F172A",
        sidebar_active_bg: "#0F172A",
        sidebar_active_text: "#FFFFFF",
        favicon_url: "",
        company_name: "",
        support_email: "",
        support_phone: "",
        is_active: true,
      });
      toast.success('Configurações resetadas!');
    }
  };

  if (isLoading || menuLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Personalização
          </h1>
          <p className="text-slate-600">
            Configure a identidade visual e estrutura do menu
          </p>
        </div>
        {activeTab === "branding" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Ocultar Preview' : 'Visualizar Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar Padrão
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            Configurações de Marca
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-2">
            <Menu className="w-4 h-4" />
            Configurações do Menu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-600" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>
                  Personalize a aparência da sua aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleBrandingSubmit} className="space-y-6">
                  <Tabs defaultValue="identity" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="identity">Identidade</TabsTrigger>
                      <TabsTrigger value="colors">Cores</TabsTrigger>
                      <TabsTrigger value="contact">Contato</TabsTrigger>
                    </TabsList>

                    <TabsContent value="identity" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="app_name">Nome da Aplicação *</Label>
                        <Input
                          id="app_name"
                          value={formData.app_name}
                          onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                          placeholder="SQA HUB"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="app_subtitle">Subtítulo</Label>
                        <Input
                          id="app_subtitle"
                          value={formData.app_subtitle}
                          onChange={(e) => setFormData({ ...formData, app_subtitle: e.target.value })}
                          placeholder="Enterprise Platform"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo">Logotipo</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e.target.files[0], 'logo_url')}
                            disabled={uploading}
                            className="flex-1"
                          />
                          {formData.logo_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => window.open(formData.logo_url, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {formData.logo_url && (
                          <img 
                            src={formData.logo_url} 
                            alt="Logo preview" 
                            className="w-24 h-24 object-contain bg-slate-50 rounded-lg border border-slate-200 p-2"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="favicon">Favicon</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files[0], 'favicon_url')}
                          disabled={uploading}
                        />
                        {formData.favicon_url && (
                          <img 
                            src={formData.favicon_url} 
                            alt="Favicon preview" 
                            className="w-8 h-8 object-contain bg-slate-50 rounded border border-slate-200 p-1"
                          />
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="colors" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primary_color">Cor Primária</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              placeholder="#0F172A"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="secondary_color">Cor Secundária</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              placeholder="#64748B"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accent_color">Cor de Destaque</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              placeholder="#3B82F6"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sidebar_bg_color">Fundo da Sidebar</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.sidebar_bg_color}
                              onChange={(e) => setFormData({ ...formData, sidebar_bg_color: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.sidebar_bg_color}
                              onChange={(e) => setFormData({ ...formData, sidebar_bg_color: e.target.value })}
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sidebar_text_color">Texto da Sidebar</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.sidebar_text_color}
                              onChange={(e) => setFormData({ ...formData, sidebar_text_color: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.sidebar_text_color}
                              onChange={(e) => setFormData({ ...formData, sidebar_text_color: e.target.value })}
                              placeholder="#0F172A"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sidebar_active_bg">Item Ativo (Fundo)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.sidebar_active_bg}
                              onChange={(e) => setFormData({ ...formData, sidebar_active_bg: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.sidebar_active_bg}
                              onChange={(e) => setFormData({ ...formData, sidebar_active_bg: e.target.value })}
                              placeholder="#0F172A"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sidebar_active_text">Item Ativo (Texto)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.sidebar_active_text}
                              onChange={(e) => setFormData({ ...formData, sidebar_active_text: e.target.value })}
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.sidebar_active_text}
                              onChange={(e) => setFormData({ ...formData, sidebar_active_text: e.target.value })}
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="contact" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Nome da Empresa</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Sua Empresa LTDA"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="support_email">Email de Suporte</Label>
                        <Input
                          id="support_email"
                          type="email"
                          value={formData.support_email}
                          onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                          placeholder="suporte@empresa.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="support_phone">Telefone de Suporte</Label>
                        <Input
                          id="support_phone"
                          value={formData.support_phone}
                          onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                          placeholder="(11) 1234-5678"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={createBrandingMutation.isPending || updateBrandingMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configurações de Marca
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Preview */}
            {previewMode && (
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>Preview da Sidebar</CardTitle>
                  <CardDescription>
                    Visualização em tempo real das suas alterações
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div 
                    className="w-full rounded-lg border-2 border-slate-200 overflow-hidden shadow-lg"
                    style={{ backgroundColor: formData.sidebar_bg_color }}
                  >
                    {/* Header Preview */}
                    <div className="border-b border-slate-100 px-6 py-5">
                      <div className="flex items-center gap-3">
                        {formData.logo_url ? (
                          <img 
                            src={formData.logo_url} 
                            alt="Logo" 
                            className="w-10 h-10 object-contain rounded-lg"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` 
                            }}
                          >
                            <span className="text-white text-xs font-bold">
                              {formData.app_name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h2 
                            className="font-semibold text-base tracking-tight"
                            style={{ color: formData.sidebar_text_color }}
                          >
                            {formData.app_name}
                          </h2>
                          <p 
                            className="text-xs"
                            style={{ color: formData.secondary_color }}
                          >
                            {formData.app_subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Preview */}
                    <div className="p-4 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider px-3 py-2">
                        <span style={{ color: formData.secondary_color }}>Menu</span>
                      </div>
                      
                      <div 
                        className="px-3 py-2 rounded-lg"
                        style={{ 
                          backgroundColor: formData.sidebar_active_bg,
                          color: formData.sidebar_active_text 
                        }}
                      >
                        Item Ativo
                      </div>
                      
                      <div 
                        className="px-3 py-2 rounded-lg"
                        style={{ color: formData.sidebar_text_color }}
                      >
                        Item Normal
                      </div>
                      
                      <div 
                        className="px-3 py-2 rounded-lg"
                        style={{ color: formData.sidebar_text_color }}
                      >
                        Item Normal
                      </div>
                    </div>

                    {/* Footer Preview */}
                    <div className="border-t border-slate-100 p-4 mt-4">
                      <div className="text-xs text-center" style={{ color: formData.secondary_color }}>
                        {formData.company_name || 'Nome da Empresa'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <MenuConfigurator
                menuStructure={menuStructure}
                onChange={setMenuStructure}
                availableScreens={allScreens} // Pass allScreens here
              />
              
              <div className="mt-6 pt-6 border-t">
                <Button 
                  onClick={handleMenuSave}
                  className="w-full gap-2"
                  disabled={createMenuMutation.isPending || updateMenuMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                  Salvar Configurações do Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
