import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Billing from "./pages/Billing";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Insights from "./pages/Insights";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import About from "./pages/About";

export type Page =
  | "landing" | "login" | "register"
  | "dashboard" | "inventory" | "billing" | "customers"
  | "expenses" | "sales" | "reports" | "insights"
  | "notifications" | "settings" | "help" | "about";

// ---------------------------------------------------------------------
// URL <-> Page mapping
// ---------------------------------------------------------------------
// This app doesn't use a routing library (no react-router in package.json);
// navigation has always been plain React state (`page`) rendered by
// AppShell below. That's fine, but the *initial* page used to be restored
// from `localStorage.getItem("currentPage")` — so opening the bare site
// URL (`/`) after having visited, say, Billing, would immediately show
// Billing again instead of the Landing Page. This block replaces that
// with real URL-path syncing via the browser's native History API:
//   - "/"           -> landing (always, regardless of auth or history)
//   - "/login"       -> login
//   - "/register"    -> register
//   - "/dashboard"   -> dashboard
//   - "/inventory" or "/products" -> inventory (the Products/Inventory page)
//   - "/billing"     -> billing
//   - "/customers"   -> customers
//   - "/expenses"    -> expenses
//   - "/sales"       -> sales
//   - "/reports"     -> reports
//   - "/insights"    -> insights
//   - "/notifications" -> notifications
//   - "/settings"    -> settings
//   - "/help"        -> help
// Any unrecognized path also falls back to landing, rather than whatever
// page happened to be open last.
const PATH_TO_PAGE: Record<string, Page> = {
  "/": "landing",
  "/login": "login",
  "/register": "register",
  "/dashboard": "dashboard",
  "/inventory": "inventory",
  "/products": "inventory",
  "/billing": "billing",
  "/customers": "customers",
  "/expenses": "expenses",
  "/sales": "sales",
  "/reports": "reports",
  "/insights": "insights",
  "/notifications": "notifications",
  "/settings": "settings",
  "/help": "help",
  "/about": "about",
};

const PAGE_TO_PATH: Record<Page, string> = {
  landing: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  inventory: "/products",
  billing: "/billing",
  customers: "/customers",
  expenses: "/expenses",
  sales: "/sales",
  reports: "/reports",
  insights: "/insights",
  notifications: "/notifications",
  settings: "/settings",
  help: "/help",
  about: "/about",
};

function pageFromLocation(): Page {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE[path] || "landing";
}

function AppShell() {
  // Source of truth is the URL, not localStorage — so `/` is always the
  // Landing Page on first load and after a refresh, and a direct link
  // like `/dashboard` opens that page directly.
  const [page, setPageState] = useState<Page>(() => pageFromLocation());

  const navigate = React.useCallback((next: Page) => {
    const path = PAGE_TO_PATH[next];
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setPageState(next);
  }, []);

  // Keep state in sync with the browser's Back/Forward buttons.
  React.useEffect(() => {
    const onPopState = () => setPageState(pageFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const appPages: Page[] = [
    "dashboard", "inventory", "billing", "customers",
    "expenses", "sales", "reports", "insights", "notifications", "settings", "help", "about",
  ];

  if (page === "landing") return <Landing onNavigate={navigate} />;
  if (page === "login") return <Login onNavigate={navigate} />;
  if (page === "register") return <Register onNavigate={navigate} />;

  if (appPages.includes(page)) {
    const pageMap: Record<string, React.ReactElement> = {
      dashboard: <Dashboard onNavigate={navigate} />,
      inventory: <Inventory />,
      billing: <Billing />,
      customers: <Customers />,
      expenses: <Expenses />,
      sales: <Sales onNavigate={navigate} />,
      reports: <Reports onNavigate={navigate} />,
      insights: <Insights />,
      notifications: <Notifications />,
      settings: <Settings />,
      help: <Help />,
      about: <About />,
    };
    return (
      <Layout currentPage={page} onNavigate={navigate}>
        {pageMap[page]}
      </Layout>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </AuthProvider>
  );
}
