import Dashboard from './pages/Dashboard';
import ScreenBuilder from './pages/ScreenBuilder';
import ApiDocumentation from './pages/ApiDocumentation';
import AccessManager from './pages/AccessManager';
import DynamicScreen from './pages/DynamicScreen';
import BrandingManager from './pages/BrandingManager';
import TreeScreenBuilder from './pages/TreeScreenBuilder';
import TreeDynamicScreen from './pages/TreeDynamicScreen';
import UserManagement from './pages/UserManagement';
import SessionManagement from './pages/SessionManagement';
import PasswordManagement from './pages/PasswordManagement';
import Login from './pages/Login';
import AuthVerify from './pages/AuthVerify';
import OAuthConsent from './pages/OAuthConsent';
import BiBuilder from './pages/BiBuilder';
import Layout from './Layout.jsx';


export const PAGES = {
    "dashboard": Dashboard,
    "screenbuilder": ScreenBuilder,
    "apidocumentation": ApiDocumentation,
    "accessmanager": AccessManager,
    "dynamicscreen": DynamicScreen,
    "brandingmanager": BrandingManager,
    "treescreenbuilder": TreeScreenBuilder,
    "treedynamicscreen": TreeDynamicScreen,
    "bibuilder": BiBuilder,
    "usermanagement": UserManagement,
    "sessionmanagement": SessionManagement,
    "passwordmanagement": PasswordManagement,
    "login": Login,
    "auth/verify": AuthVerify,
    "oauth/consent": OAuthConsent,
}

export const pagesConfig = {
    mainPage: "dashboard",
    Pages: PAGES,
    Layout: Layout,
};