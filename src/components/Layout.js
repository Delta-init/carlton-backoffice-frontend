import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePermissions } from "../context/usePermissions";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  Sun,
  Moon,
  ScrollText,
  Shield,
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  FileInput,
  RotateCcw,
} from "lucide-react";

export default function Layout() {
  const { user, logout, impersonating, adminName, stopImpersonation } =
    useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canView, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    approvals: 0,
    messages: 0,
    txRequests: 0
  });

  const isDark = theme === "dark";
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch notification counts
  const fetchNotificationCounts = useCallback(async () => {
    if (!user || user.role === "vendor") return;

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

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
      setNotificationCounts((prev) => ({ ...prev, approvals: totalPending }));

      // Fetch unread messages count
      const msgResponse = await fetch(`${API_URL}/api/messages/unread-count`, {
        headers,
      });
      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        setNotificationCounts((prev) => ({
          ...prev,
          messages: msgData.count || 0,
        }));
      }
        // Fetch pending TX requests count
      const txReqRes = await fetch(`${API_URL}/api/transaction-requests/pending-count`, { headers });
      if (txReqRes.ok) {
        const txReqData = await txReqRes.json();
        setNotificationCounts(prev => ({ ...prev, txRequests: txReqData.count || 0 }));
      }
    } catch (error) {
      console.error("Error fetching notification counts:", error);
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
    navigate("/login");
  };

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    navigate("/settings");
  };

  const isExchanger = user?.role === "vendor";

  // Exchanger-specific navigation
  const vendorNavItems = [
    { to: "/vendor-portal", icon: Store, label: "My Portal" },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  // Permission-based navigation for all non-vendor users
  const allNavItems = [
    {
      to: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      module: "dashboard",
    },
    { to: "/clients", icon: Users, label: "Clients", module: "clients" },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions Summary', module: 'transactions' },
      { to: '/transaction-requests', icon: FileInput, label: 'TX Requests', module: 'transaction_requests' },
    { to: "/treasury", icon: Landmark, label: "Treasury", module: "treasury" },
    {
      to: "/lp-accounts",
      icon: TrendingUp,
      label: "LP Management",
      module: "lp_management",
    },
    {
      to: "/income-expenses",
      icon: Wallet,
      label: "Income & Expenses",
      module: "income_expenses",
    },
    { to: "/loans", icon: Banknote, label: "Loans", module: "loans" },
    { to: "/debts", icon: Receipt, label: "O/S Accounts", module: "debts" },
    { to: "/psp", icon: CreditCard, label: "PSP", module: "psp" },
    { to: "/vendors", icon: Store, label: "Exchangers", module: "exchangers" },
    {
      to: "/reconciliation",
      icon: ArrowUpDown,
      label: "Reconciliation",
      module: "reconciliation",
    },
    {
      to: "/messages",
      icon: MessageSquare,
      label: "Messages",
      module: "messages",
    },
    { to: "/audit", icon: ShieldCheck, label: "Audit", module: "audit" },
    { to: "/logs", icon: ScrollText, label: "Logs", module: "logs" },
    { to: "/reports", icon: BarChart3, label: "Reports", module: "reports" },
    {
      to: "/accountant",
      icon: ClipboardCheck,
      label: "Approvals",
      module: "approvals",
    },
    {
      to: "/roles",
      icon: Shield,
      label: "Roles & Permissions",
      module: "roles",
    },
    { to: "/reinstate", icon: RotateCcw, label: "Reinstate Center", module: "reinstate", adminOnly: true },
    { to: "/settings", icon: Settings, label: "Settings", module: null },
  ];

  // Filter navigation items based on permissions (show all while loading)
  const filteredNavItems = allNavItems.filter((item) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    return !item.module || permissionsLoading || canView(item.module);
  });

  // Select nav items based on role
  const navItems = isExchanger ? vendorNavItems : filteredNavItems;

  // Get badge count for a nav item
  const getBadgeCount = (label) => {
    if (label === "Approvals") return notificationCounts.approvals;
    if (label === "Messages") return notificationCounts.messages;
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
          `flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
            isActive
              ? isDark
                ? "bg-[#1FA21B]/10 text-[#1FA21B] border-l-2 border-[#1FA21B]"
                : "bg-blue-50 text-blue-600 border-l-2 border-blue-600"
              : isDark
                ? "text-[#C5C6C7] hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-l-2 border-transparent"
          }`
        }
        data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1">{label}</span>
        {badgeCount > 0 && (
          <Badge
            variant="destructive"
            className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs font-bold px-1.5 rounded-full"
            data-testid={`badge-${label.toLowerCase().replace(/ /g, "-")}`}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </Badge>
        )}
      </NavLink>
    );
  };

  return (
    <div
      className={`min-h-screen flex theme-transition ${isDark ? "bg-[#0B0C10]" : "bg-[#F8FAFC]"}`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shadow-sm transform transition-transform duration-200 theme-transition ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isDark ? "bg-[#141414] border-r border-[#262626]" : "bg-white border-r border-slate-200"}`}
      >
        <div className="flex flex-col h-full">
          <div
            className={`flex items-center justify-between h-16 px-4 border-b ${isDark ? "border-[#262626]" : "border-slate-200"}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "bg-[#1FA21B]" : "bg-blue-600"}`}
              >
                <TrendingUp
                  className={`w-5 h-5 ${isDark ? "text-[#0B0C10]" : "text-white"}`}
                />
              </div>
              <span
                className={`text-xl font-bold uppercase tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}
                style={{ fontFamily: "Barlow Condensed" }}
              >
                Carlton Fx
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden ${isDark ? "text-[#C5C6C7] hover:text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Theme Toggle */}
          <div
            className={`px-4 py-3 border-t ${isDark ? "border-[#262626]" : "border-slate-200"}`}
          >
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${
                isDark
                  ? "bg-[#0B0C10] hover:bg-[#fafafa1a] text-[#C5C6C7]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
              data-testid="theme-toggle-btn"
            >
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isDark ? "Dark Mode" : "Light Mode"}
                </span>
              </div>
              <div
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${isDark ? "bg-[#1FA21B]" : "bg-slate-300"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${isDark ? "translate-x-5" : "translate-x-0"}`}
                />
              </div>
            </button>
          </div>

          <div
            className={`p-4 border-t ${isDark ? "border-[#262626]" : "border-slate-200"}`}
          >
            <div className="flex items-center gap-3">
              <Avatar
                className={`w-10 h-10 border ${isDark ? "border-[#1FA21B]/30" : "border-blue-200"}`}
              >
                <AvatarImage src={user?.picture} />
                <AvatarFallback
                  className={
                    isDark
                      ? "bg-[#1FA21B]/20 text-[#1FA21B]"
                      : "bg-blue-100 text-blue-600"
                  }
                >
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  {user?.name}
                </p>
                <p
                  className={`text-xs truncate capitalize ${isDark ? "text-[#C5C6C7]" : "text-slate-500"}`}
                >
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Impersonation Banner */}
        {impersonating && (
          <div
            className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 bg-red-600 text-white shadow-lg"
            data-testid="impersonation-banner"
          >
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <AlertTriangle className="w-4 h-4" />
              <span>
                You are impersonating <strong>{user?.name}</strong> (
                {user?.role})
              </span>
              <span className="hidden sm:inline text-red-200 ml-1">
                — Logged in by {adminName}
              </span>
            </div>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-colors"
              data-testid="stop-impersonation-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Admin
            </button>
          </div>
        )}

        <header
          className={`sticky ${impersonating ? "top-[42px]" : "top-0"} z-30 h-16 backdrop-blur-md border-b theme-transition ${
            isDark
              ? "bg-[#141414]/80 border-[#262626]"
              : "bg-white/80 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between h-full px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-1.5 rounded-[6px] transition-colors ${isDark ? "text-[#C5C6C7] hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Theme Toggle - Mobile/Header */}
            <button
              onClick={toggleTheme}
              className={`mr-3 p-2 rounded-xl transition-colors ${
                isDark
                  ? "text-[#1FA21B] hover:bg-white/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              data-testid="theme-toggle-header"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 ${
                    isDark
                      ? "text-[#C5C6C7] hover:text-white hover:bg-white/10"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  data-testid="user-menu-btn"
                >
                  <Avatar
                    className={`w-8 h-8 border ${isDark ? "border-[#1FA21B]/30" : "border-blue-200"}`}
                  >
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback
                      className={`text-xs ${isDark ? "bg-[#1FA21B]/20 text-[#1FA21B]" : "bg-blue-100 text-blue-600"}`}
                    >
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`hidden md:inline text-sm ${isDark ? "text-[#C5C6C7]" : ""}`}
                  >
                    {user?.name}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-56 ${isDark ? "bg-[#141414] border-[#262626] text-white" : "bg-white border-slate-200 text-slate-800"}`}
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p
                    className={`text-xs ${isDark ? "text-[#C5C6C7]" : "text-slate-500"}`}
                  >
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator
                  className={isDark ? "bg-[#262626]" : "bg-slate-200"}
                />
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className={`cursor-pointer ${isDark ? "hover:bg-white/10 focus:bg-white/10" : "hover:bg-slate-100 focus:bg-slate-100"}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator
                  className={isDark ? "bg-[#262626]" : "bg-slate-200"}
                />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className={`cursor-pointer text-red-500 ${isDark ? "hover:bg-white/10 focus:bg-white/10" : "hover:bg-slate-100 focus:bg-slate-100"}`}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 bg-background p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
