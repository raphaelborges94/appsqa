import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, BarChart2, Database, Layers, Moon, Sun, Eye, Settings, User, LogOut, Bell, HelpCircle, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const navigationItems = [
    { title: "Dashboards", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Charts", url: createPageUrl("Charts"), icon: BarChart2 },
    { title: "DataSets", url: createPageUrl("DataSets"), icon: Layers },
    { title: "DashViewer", url: createPageUrl("DashViewer"), icon: Eye, highlight: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between max-w-full">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 flex-shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69102061978bbeff65d5e111/1b734b966_thumb-sqa.jpg" 
                alt="SQA BI" 
                className="h-8 w-auto"
              />
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                SQA BI
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? item.highlight 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold'
                          : 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold'
                        : item.highlight
                          ? 'text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/10'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Side - Theme Toggle & Settings */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              <span className="text-sm">{darkMode ? 'Claro' : 'Escuro'}</span>
            </Button>

            {/* Settings Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="w-4 h-4 mr-2" />
                  Notificações
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Preferências
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("Users")} className="cursor-pointer">
                    <Users className="w-4 h-4 mr-2" />
                    Usuários
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("Empresas")} className="cursor-pointer">
                    <Building2 className="w-4 h-4 mr-2" />
                    Empresas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("DataSources")} className="cursor-pointer">
                    <Database className="w-4 h-4 mr-2" />
                    Conexões
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ajuda & Suporte
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 dark:text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}