import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/usePermissions';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  TrendingUp,
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Landmark,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Store,
  Wallet,
  Banknote,
  Receipt,
  ArrowUpDown,
  ShieldCheck,
  ScrollText,
  Shield,
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  FileInput,
  RotateCcw,
  Sun,
  Moon,
  UserCircle,
} from 'lucide-react';

// ── Theme styles ─────────────────────────────────────────────────────────────
const S_BANKING = {
  pageBg:        'bg-[#f8fafc]',
  sidebarBg:     'bg-[#0f172a] border-r border-[#1e293b]',
  sidebarBorder: 'border-[#1e293b]',
  headerBg:      'bg-white/90 backdrop-blur-sm border-b border-[#e2e8f0]',
  logoBg:        'bg-gradient-to-br from-[#1a8220] to-[#15691a]',
  logoIcon:      '!text-white',
  logoText:      '!text-white',
  navActive:     'bg-[#1a8220]/15 !text-[#86efac] border-l-2 border-[#1a8220]',
  navInactive:   '!text-[#64748b] hover:!text-[#e2e8f0] hover:bg-white/8 border-l-2 border-transparent',
  navSection:    '!text-[#475569]',
  userText:      '!text-white',
  userSubText:   '!text-[#94a3b8]',
  avatarBg:      'bg-[#1a8220]/20 !text-[#86efac]',
  avatarBorder:  'border-[#1a8220]/30',
  dropdownBg:    'bg-white border-[#e2e8f0] text-slate-800',
  dropdownHover: 'hover:bg-slate-100 focus:bg-slate-100',
  dropdownBorder:'bg-[#e2e8f0]',
  headerBtn:     'text-slate-500 hover:bg-slate-100',
  userMenuBtn:   'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  mainBg:        'bg-[#f8fafc]',
  themeToggle:   'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
};

const S_DARK = {
  pageBg:        'bg-[#060d1a]',
  sidebarBg:     'bg-[#0a1628] border-r border-[#1e293b]/80',
  sidebarBorder: 'border-[#1e293b]/80',
  headerBg:      'bg-[#0a1628] border-b border-[#1e293b]/80',
  logoBg:        'bg-gradient-to-br from-[#1a8220] to-[#0f4d13]',
  logoIcon:      '!text-white',
  logoText:      '!text-white',
  navActive:     'bg-[#1a8220]/10 !text-[#4ade80] border-l-2 border-[#1a8220]',
  navInactive:   '!text-[#64748b] hover:!text-[#94a3b8] hover:bg-[#1a8220]/5 border-l-2 border-transparent',
  navSection:    '!text-[#334155]',
  userText:      '!text-[#e2e8f0]',
  userSubText:   '!text-[#475569]',
  avatarBg:      'bg-[#1a8220]/20 !text-[#4ade80]',
  avatarBorder:  'border-[#1a8220]/30',
  dropdownBg:    'bg-[#0d1f35] border-[#1e293b] text-slate-200',
  dropdownHover: 'hover:bg-[#1e293b] focus:bg-[#1e293b]',
  dropdownBorder:'bg-[#1e293b]',
  headerBtn:     'text-slate-400 hover:bg-[#1e293b]',
  userMenuBtn:   'text-slate-300 hover:text-slate-100 hover:bg-[#1e293b]',
  mainBg:        'bg-[#060d1a]',
  themeToggle:   'text-amber-400 hover:bg-[#1e293b] hover:text-amber-300',
};

export default function Layout() {
  const { user, logout, impersonating, adminName, stopImpersonation } = useAuth();
  const { canView, loading: permissionsLoading } = usePermissions();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    approvals: 0,
    messages: 0,
    txRequests: 0
  });

  const s = isDark ? S_DARK : S_BANKING;
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch notification counts
  const fetchNotificationCounts = useCallback(async () => {
    if (!user || user.role === 'vendor') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Fetch all pending approvals count
      const [txResponse, allPendingRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions?status=pending&page_size=1`, { headers }),
        fetch(`${API_URL}/api/pending-approvals/all`, { headers }),
      ]);
      let totalPending = 0;
      if (txResponse.ok) {
        const txData = await txResponse.json();
        totalPending += txData.total || (Array.isArray(txData) ? txData.length : 0);
      }
      if (allPendingRes.ok) {
        const apData = await allPendingRes.json();
        const c = apData.counts || {};
        totalPending += (c.income_expenses || 0) + (c.loans || 0) + (c.loan_repayments || 0) + (c.psp_settlements || 0);
      }
      setNotificationCounts(prev => ({ ...prev, approvals: totalPending }));

      // Fetch unread messages count
      const msgResponse = await fetch(`${API_URL}/api/messages/unread-count`, { headers });
      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        setNotificationCounts(prev => ({
          ...prev,
          messages: msgData.count || 0
        }));
      }

      // Fetch pending TX requests count
      const txReqRes = await fetch(`${API_URL}/api/transaction-requests/pending-count`, { headers });
      if (txReqRes.ok) {
        const txReqData = await txReqRes.json();
        setNotificationCounts(prev => ({ ...prev, txRequests: txReqData.count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  }, [user, API_URL]);

  // Fetch counts on mount and periodically
  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotificationCounts]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    navigate('/settings');
  };

  const isExchanger = user?.role === 'vendor';

  // Exchanger-specific navigation
  const vendorNavItems = [
    { to: '/vendor-portal', icon: Store, label: 'My Portal' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Permission-based navigation for all non-vendor users
  const allNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
    { to: '/clients', icon: Users, label: 'Clients', module: 'clients' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions Summary', module: 'transactions' },
    { to: '/transaction-requests', icon: FileInput, label: 'TX Requests', module: 'transaction_requests' },
    { to: '/treasury', icon: Landmark, label: 'Treasury', module: 'treasury' },
    { to: '/lp-accounts', icon: TrendingUp, label: 'LP Management', module: 'lp_management' },
    { to: '/income-expenses', icon: Wallet, label: 'Income & Expenses', module: 'income_expenses' },
    { to: '/loans', icon: Banknote, label: 'Loans', module: 'loans' },
    { to: '/debts', icon: Receipt, label: 'O/S Accounts', module: 'debts' },
    { to: '/psp', icon: CreditCard, label: 'PSP', module: 'psp' },
    { to: '/vendors', icon: Store, label: 'Exchangers', module: 'exchangers' },
    { to: '/reconciliation', icon: ArrowUpDown, label: 'Reconciliation', module: 'reconciliation' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', module: 'messages' },
    { to: '/audit', icon: ShieldCheck, label: 'Audit', module: 'audit' },
    { to: '/logs', icon: ScrollText, label: 'Logs', module: 'logs' },
    { to: '/reports', icon: BarChart3, label: 'Reports', module: 'reports' },
    { to: '/accountant', icon: ClipboardCheck, label: 'Approvals', module: 'approvals' },
    { to: '/roles', icon: Shield, label: 'Roles & Permissions', module: 'roles' },
    { to: '/reinstate', icon: RotateCcw, label: 'Reinstate Center', module: 'reinstate', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'Settings', module: null },
  ];

  // Filter navigation items based on permissions (show all while loading)
  const filteredNavItems = allNavItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    return !item.module || permissionsLoading || canView(item.module);
  });

  // Select nav items based on role
  const navItems = isExchanger ? vendorNavItems : filteredNavItems;

  // Get badge count for a nav item
  const getBadgeCount = (label) => {
    if (label === 'Approvals') return notificationCounts.approvals;
    if (label === 'Messages') return notificationCounts.messages;
    if (label === 'TX Requests') return notificationCounts.txRequests;
    return 0;
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const badgeCount = getBadgeCount(label);
    return (
      <NavLink
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 tracking-normal ${
            isActive ? s.navActive : s.navInactive
          }`
        }
        data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {badgeCount > 0 && (
          <Badge
            variant="destructive"
            className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs font-bold px-1.5 rounded-full"
            data-testid={`badge-${label.toLowerCase().replace(' ', '-')}`}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </Badge>
        )}
      </NavLink>
    );
  };

  return (
    <div className={`min-h-screen flex theme-transition ${s.pageBg}`}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shadow-sm transform transition-transform duration-200 theme-transition ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${s.sidebarBg}`}
      >
        <div className="flex flex-col h-full">

          {/* Logo row */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${s.sidebarBorder}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${s.logoBg}`}>
                <TrendingUp className={`w-4 h-4 ${s.logoIcon}`} />
              </div>
              <span className={`text-[15px] font-semibold tracking-tight ${s.logoText}`}>
                Carlton Fx
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden opacity-60 hover:opacity-100 transition-opacity ${s.logoText}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>


          {/* User profile */}
          <div className={`p-3 border-t ${s.sidebarBorder}`}>
            <div className="flex items-center gap-3 px-1">
              <Avatar className={`w-9 h-9 border ${s.avatarBorder}`}>
                <AvatarImage src={user?.picture} />
                <AvatarFallback className={`text-xs font-semibold ${s.avatarBg}`}>
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${s.userText}`}>{user?.name}</p>
                <p className={`text-xs truncate capitalize ${s.userSubText}`}>{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Impersonation Banner */}
        {impersonating && (
          <div
            className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 bg-red-600 text-white shadow-lg"
            data-testid="impersonation-banner"
          >
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <AlertTriangle className="w-4 h-4" />
              <span>You are impersonating <strong>{user?.name}</strong> ({user?.role})</span>
              <span className="hidden sm:inline text-red-200 ml-1">— Logged in by {adminName}</span>
            </div>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-[4px] font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-colors"
              data-testid="stop-impersonation-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Admin
            </button>
          </div>
        )}

        {/* Header */}
        <header className={`sticky ${impersonating ? 'top-[42px]' : 'top-0'} z-30 h-14 border-b theme-transition ${s.headerBg}`}>
          <div className="flex items-center justify-between h-full px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-1.5 rounded-[6px] transition-colors ${s.headerBtn}`}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-[6px] transition-colors mr-1 ${s.themeToggle}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 h-9 px-2 rounded-[6px] ${s.userMenuBtn}`}
                  data-testid="user-menu-btn"
                >
                  <Avatar className={`w-7 h-7 border ${s.avatarBorder}`}>
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className={`text-xs font-semibold ${s.avatarBg}`}>
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{user?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-56 rounded-[8px] ${s.dropdownBg}`}
              >
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className={`text-xs mt-0.5 ${s.userSubText}`}>{user?.email}</p>
                </div>
                <DropdownMenuSeparator className={s.dropdownBorder} />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className={`cursor-pointer rounded-[4px] ${s.dropdownHover}`}
                >
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className={`cursor-pointer rounded-[4px] ${s.dropdownHover}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className={s.dropdownBorder} />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className={`cursor-pointer text-red-500 rounded-[4px] ${s.dropdownHover}`}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className={`flex-1 p-4 md:p-6 lg:p-8 ${s.mainBg}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
