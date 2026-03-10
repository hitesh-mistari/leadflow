import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SearchProvider, useSearch } from './context/SearchContext';
import { ToastProvider } from './context/ToastContext';
import {
  LayoutDashboard,
  Users,
  Kanban as KanbanIcon,
  LogOut,
  PhoneCall,
  Settings,
  Search,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './pages/Dashboard';
import LeadsTable from './pages/LeadsTable';
import Kanban from './pages/Kanban';
import LeadDetails from './pages/LeadDetails';
import Login from './pages/Login';
import Register from './pages/Register';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

interface NavItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${active
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
      : 'text-slate-600 hover:bg-slate-100'
      }`}
  >
    <Icon size={18} />
    <span className="font-semibold text-sm">{label}</span>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { logout, user } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();

  const navigationLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/kanban', icon: KanbanIcon, label: 'Pipeline' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <PhoneCall size={24} />
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">LeadFlow</h1>
            </div>

            <div className="flex-1 max-w-md mx-4 relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg hidden sm:block">
                <Settings size={20} />
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
              <div className="flex items-center gap-3 pl-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {(user?.name || user?.email || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user?.name || user?.email}</span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-slate-50">
            {navigationLinks.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                icon={link.icon}
                label={link.label}
                active={location.pathname === link.to}
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/leads" element={<PrivateRoute><Layout><LeadsTable /></Layout></PrivateRoute>} />
              <Route path="/kanban" element={<PrivateRoute><Layout><Kanban /></Layout></PrivateRoute>} />
              <Route path="/leads/:id" element={<PrivateRoute><Layout><LeadDetails /></Layout></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ToastProvider>
      </SearchProvider>
    </AuthProvider>
  );
}
