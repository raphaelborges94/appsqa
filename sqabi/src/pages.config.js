import Dashboard from './pages/Dashboard';
import DataSources from './pages/DataSources';
import PivotMatrix from './pages/PivotMatrix';
import KPICards from './pages/KPICards';
import BarChart from './pages/BarChart';
import Charts from './pages/Charts';
import ViewDashboard from './pages/ViewDashboard';
import EditDashboard from './pages/EditDashboard';
import DataSets from './pages/DataSets';
import DashViewer from './pages/DashViewer';
import ViewOnlyDashboard from './pages/ViewOnlyDashboard';
import Users from './pages/Users';
import Empresas from './pages/Empresas';
import SSOCallback from './pages/SSOCallback';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DataSources": DataSources,
    "PivotMatrix": PivotMatrix,
    "KPICards": KPICards,
    "BarChart": BarChart,
    "Charts": Charts,
    "ViewDashboard": ViewDashboard,
    "EditDashboard": EditDashboard,
    "DataSets": DataSets,
    "DashViewer": DashViewer,
    "ViewOnlyDashboard": ViewOnlyDashboard,
    "Users": Users,
    "Empresas": Empresas,
    "sso/callback": SSOCallback,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};
