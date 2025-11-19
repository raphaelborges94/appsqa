import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Rotas que não requerem autenticação (login já redireciona se autenticado)
const PUBLIC_ROUTES = ['login', 'auth/verify'];

// Rotas que requerem autenticação mas não usam Layout (OAuth consent precisa de auth mas tem layout próprio)
const AUTH_NO_LAYOUT_ROUTES = ['oauth/consent'];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Rotas públicas (não requerem autenticação) */}
      {Object.entries(Pages)
        .filter(([path]) => PUBLIC_ROUTES.includes(path))
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<Page />}
          />
        ))}

      {/* Rotas autenticadas sem layout (OAuth consent, etc) */}
      {Object.entries(Pages)
        .filter(([path]) => AUTH_NO_LAYOUT_ROUTES.includes(path))
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute>
                <Page />
              </ProtectedRoute>
            }
          />
        ))}

      {/* Rota principal protegida */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      {/* Rotas protegidas (requerem autenticação + layout) */}
      {Object.entries(Pages)
        .filter(([path]) => !PUBLIC_ROUTES.includes(path) && !AUTH_NO_LAYOUT_ROUTES.includes(path))
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        ))}

      {/* 404 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
