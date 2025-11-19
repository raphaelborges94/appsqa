import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wrench, Shield, BookOpen, LogOut, Database, ChevronDown, ChevronRight, Users, Building2, LayoutDashboard, Palette, Settings, FileText, ShoppingCart, Package, Calendar, MessageSquare, PanelLeftClose, PanelLeft, Network, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

const ICON_MAP = {
  Wrench,
  Shield,
  BookOpen,
  Database,
  Users,
  Building2,
  LayoutDashboard,
  Palette,
  Settings,
  FileText,
  ShoppingCart,
  Package,
  Calendar,
  MessageSquare,
  Network,
  BarChart3,
};

const staticNavigationItems = [
  {
    title: "Construtores de Tela",
    icon: LayoutDashboard,
    items: [
      {
        title: "Construtor CRUD",
        url: createPageUrl("screenbuilder"),
        icon: Database,
      },
      {
        title: "Construtor Árvore",
        url: createPageUrl("treescreenbuilder"),
        icon: Network,
      },
      {
        title: "Construtor de BI",
        url: createPageUrl("bibuilder"),
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Configurações",
    icon: Settings,
    items: [
      {
        title: "Controle de Acesso",
        url: createPageUrl("accessmanager"),
        icon: Shield,
      },
      {
        title: "Personalização",
        url: createPageUrl("brandingmanager"),
        icon: Palette,
      },
      {
        title: "Documentação API",
        url: createPageUrl("apidocumentation"),
        icon: BookOpen,
      },
    ],
  },
];

function SidebarToggleButton() {
  const { open, toggleSidebar } = useSidebar();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-8 w-8 hover:bg-slate-100 transition-colors"
      title={open ? "Recolher menu" : "Expandir menu"}
    >
      {open ? (
        <PanelLeftClose className="h-4 w-4 text-slate-500" />
      ) : (
        <PanelLeft className="h-4 h-4 text-slate-500" />
      )}
    </Button>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = React.useState({ "Construtores de Tela": true, "Configurações": true });

  const { data: brandingConfigs } = useQuery({
    queryKey: ['branding-configs'],
    queryFn: () => base44.entities.BrandingConfig.list('-created_date'),
    initialData: [],
  });

  const { data: menuConfigs } = useQuery({
    queryKey: ['menu-configs'],
    queryFn: () => base44.entities.MenuConfig.list('-created_date'),
    initialData: [],
  });

  const { data: crudScreens } = useQuery({
    queryKey: ['active-crud-screens', 'v2'], // v2 para invalidar cache antigo
    queryFn: async () => {
      const allScreens = await base44.entities.ScreenDefinition.list('-created_date');
      console.log('🔍 CRUD Screens carregadas:', allScreens.length);
      console.log('📋 Detalhes CRUD:', allScreens.map(s => ({
        nome: s.nome,
        screen_type: s.screen_type,
        ativa: s.ativa
      })));
      const filtered = allScreens.filter(s => s.ativa);
      console.log('✅ CRUD Screens ativas:', filtered.length);
      return filtered;
    },
    initialData: [],
  });

  const { data: treeScreens } = useQuery({
    queryKey: ['active-tree-screens', 'v2'], // v2 para invalidar cache antigo
    queryFn: async () => {
      const allTreeScreens = await base44.entities.TreeScreenDefinition.list('-created_date');
      console.log('🌳 TreeScreenDefinition.list() retornou:', allTreeScreens.length, 'telas');
      console.log('🌳 Telas de árvore:', allTreeScreens.map(s => ({
        nome: s.nome,
        screen_type: s.screen_type,
        campo_nome: s.campo_nome
      })));
      return allTreeScreens.filter(s => s.ativa);
    },
    initialData: [],
  });

  const branding = brandingConfigs.find(c => c.is_active) || brandingConfigs[0] || {
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
  };

  const activeMenuConfig = menuConfigs.find(c => c.is_active);

  // Debug: Log quando menu config muda
  React.useEffect(() => {
    console.log('🔍 Layout - Menu configs carregados:', {
      total: menuConfigs.length,
      activeConfig: activeMenuConfig ? {
        id: activeMenuConfig.id,
        is_active: activeMenuConfig.is_active,
        has_menu_structure: !!activeMenuConfig.menu_structure,
        menu_structure_type: typeof activeMenuConfig.menu_structure,
        menu_structure_length: Array.isArray(activeMenuConfig.menu_structure) ? activeMenuConfig.menu_structure.length : 'not array'
      } : 'none'
    });
  }, [menuConfigs, activeMenuConfig]);

  const navigationItems = React.useMemo(() => {
    // Criar um Map para evitar duplicatas baseado no título do grupo
    const itemsMap = new Map();

    // Adicionar itens estáticos primeiro
    staticNavigationItems.forEach(item => {
      itemsMap.set(item.title, item);
    });

    if (activeMenuConfig?.menu_structure) {
      console.log('🎨 Construindo menu com config ativa:', activeMenuConfig.menu_structure);
      const initialOpenGroups = { "Construtores de Tela": true, "Configurações": true };
      const allScreenIds = [...crudScreens.map(s => s.id), ...treeScreens.map(s => s.id)];

      activeMenuConfig.menu_structure.forEach(group => {
        const Icon = ICON_MAP[group.icon] || Database;

        console.log(`📁 Processando grupo "${group.title}" com ${group.items.length} itens`);
        console.log('📋 IDs de telas disponíveis:', allScreenIds);

        const validItems = group.items.filter(item => {
          const isValid = !item.screen_id || allScreenIds.includes(item.screen_id);
          if (!isValid && item.screen_id) {
            console.warn(`⚠️ Item "${item.title}" (screen_id: ${item.screen_id}) não encontrado nas telas ativas`);
          }
          return isValid;
        }).map(item => {
          const isCrudScreen = crudScreens.some(s => s.id === item.screen_id);
          const isTreeScreen = treeScreens.some(s => s.id === item.screen_id);

          // Aceitar tanto 'url' quanto 'path' do menu_structure
          let url = item.url || item.path;
          if (isCrudScreen) {
            url = `${createPageUrl("dynamicscreen")}?screen_id=${item.screen_id}`;
          } else if (isTreeScreen) {
            url = `${createPageUrl("treedynamicscreen")}?screen_id=${item.screen_id}`;
          }

          return {
            title: item.title,
            url: url,
            icon: ICON_MAP[item.icon] || Database,
          };
        });

        if (validItems.length > 0) {
          // Se o grupo já existe (mesmo título), mesclar os itens
          if (itemsMap.has(group.title)) {
            const existingGroup = itemsMap.get(group.title);
            // Combinar itens, evitando duplicatas por título
            const existingItemsMap = new Map(existingGroup.items.map(item => [item.title, item]));
            validItems.forEach(item => {
              existingItemsMap.set(item.title, item);
            });
            existingGroup.items = Array.from(existingItemsMap.values());
          } else {
            // Adicionar novo grupo
            itemsMap.set(group.title, {
              title: group.title,
              icon: Icon,
              items: validItems
            });
          }

          initialOpenGroups[group.title] = true;
        }
      });

      setOpenGroups(prev => ({ ...initialOpenGroups, ...prev }));
    }

    return Array.from(itemsMap.values());
  }, [activeMenuConfig, crudScreens, treeScreens]);

  const toggleGroup = (groupTitle) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const isGroupActive = (group) => {
    return group.items.some(item => location.pathname + location.search === item.url);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <style>{`
        :root {
          --sidebar-bg: ${branding.sidebar_bg_color};
          --sidebar-text: ${branding.sidebar_text_color};
          --sidebar-active-bg: ${branding.sidebar_active_bg};
          --sidebar-active-text: ${branding.sidebar_active_text};
          --primary-color: ${branding.primary_color};
          --secondary-color: ${branding.secondary_color};
          --accent-color: ${branding.accent_color};
        }
      `}</style>
      
      <div className="min-h-screen flex w-full bg-slate-50">
        <Sidebar 
          collapsible="icon"
          className="border-r border-slate-100 flex-shrink-0"
          style={{ backgroundColor: branding.sidebar_bg_color }}
        >
          <SidebarHeader className="border-b border-slate-50 px-5 py-4">
            <div className="flex items-center gap-2.5 justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {branding.logo_url ? (
                  <img 
                    src={branding.logo_url} 
                    alt={branding.app_name}
                    className="w-7 h-7 object-contain opacity-70 flex-shrink-0"
                  />
                ) : (
                  <div 
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: 'rgba(100, 116, 139, 0.08)'
                    }}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <h2 className="font-medium text-sm text-slate-700 truncate">
                    {branding.app_name}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {branding.app_subtitle}
                  </p>
                </div>
              </div>
              <SidebarToggleButton />
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2 py-3">
            <SidebarMenu>
              {navigationItems.map((group) => {
                const isActive = isGroupActive(group);
                const isOpen = openGroups[group.title];
                
                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <SidebarGroup>
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel 
                          className="cursor-pointer text-xs font-medium uppercase tracking-wide px-2.5 py-1.5 rounded hover:bg-slate-50/50 transition-colors flex items-center justify-between group mb-0.5 text-slate-500"
                        >
                          <div className="flex items-center gap-2">
                            <group.icon className="w-3.5 h-3.5 opacity-60" />
                            <span className="group-data-[collapsible=icon]:hidden">{group.title}</span>
                          </div>
                          <div className="group-data-[collapsible=icon]:hidden">
                            {isOpen ? (
                              <ChevronDown className="w-3 h-3 opacity-40" />
                            ) : (
                              <ChevronRight className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </SidebarGroupLabel>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {group.items.map((item, itemIndex) => {
                              const isItemActive = location.pathname + location.search === item.url || location.pathname === item.url;
                              // Criar chave única combinando grupo, título e índice
                              const uniqueKey = `${group.title}-${item.title}-${itemIndex}`;
                              return (
                                <SidebarMenuItem key={uniqueKey}>
                                  <SidebarMenuButton
                                    asChild
                                    className="hover:bg-slate-50/70 transition-colors rounded ml-3 mb-0.5 group-data-[collapsible=icon]:ml-0"
                                    style={isItemActive ? {
                                      backgroundColor: 'rgba(15, 23, 42, 0.04)',
                                      color: branding.sidebar_text_color
                                    } : {
                                      color: '#64748b'
                                    }}
                                    tooltip={item.title}
                                  >
                                    <Link to={item.url} className="flex items-center gap-2.5 px-2.5 py-1.5 relative">
                                      {isItemActive && (
                                        <div
                                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-slate-700"
                                        />
                                      )}
                                      <item.icon className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                                      <span className="text-sm font-normal group-data-[collapsible=icon]:hidden">{item.title}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-50 p-2.5 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2.5 w-full p-2 rounded hover:bg-slate-50/70 transition-colors group text-slate-600"
                >
                  <div 
                    className="w-7 h-7 rounded flex items-center justify-center text-white font-medium text-xs bg-slate-300 flex-shrink-0"
                  >
                    {getInitials(user?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                    <p className="font-medium text-xs truncate text-slate-700">
                      {user?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs truncate text-slate-400">
                      {user?.email || ''}
                    </p>
                  </div>
                  <ChevronRight 
                    className="w-3.5 h-3.5 opacity-30 group-hover:opacity-50 transition-opacity group-data-[collapsible=icon]:hidden" 
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-slate-600">
                  <span className="font-medium">{user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-600">
                  <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                    {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-slate-50">
          <header className="bg-white border-b border-slate-100 px-6 py-4 md:hidden shadow-sm flex-shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 
                className="text-lg font-semibold"
                style={{ color: branding.sidebar_text_color }}
              >
                {branding.app_name}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}