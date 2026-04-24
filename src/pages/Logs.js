import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import PaginationControls from "../components/PaginationControls";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { getApiError } from "../lib/utils";
import {
  Activity,
  Shield,
  FileText,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Trash2,
  User,
  Clock,
  Globe,
  Monitor,
  LogIn,
  LogOut,
  XCircle,
  CheckCircle,
  Edit,
  Plus,
  Eye,
  Filter,
  BarChart3,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Logs() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    log_type: "",
    action: "",
    module: "",
    date_from: "",
    date_to: "",
    search: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchLogs = async (type = "", pg) => {
    setLoading(true);
    try {
      const p = pg || currentPage;
      const params = new URLSearchParams();
      if (type) params.append("log_type", type);
      if (filters.action) params.append("action", filters.action);
      if (filters.module) params.append("module", filters.module);
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      if (filters.search) params.append("search", filters.search);
      params.append("page", p);
      params.append("page_size", pageSize);

      const response = await fetch(`${API_URL}/api/logs?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.items || data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/logs/stats`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchLogs(activeTab === "all" ? "" : activeTab);
    fetchStats();
  }, [activeTab, currentPage, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchLogs(activeTab === "all" ? "" : activeTab);
  };

  const clearOldLogs = async (days) => {
    if (
      !window.confirm(
        `Are you sure you want to delete logs older than ${days} days?`,
      )
    )
      return;

    try {
      const response = await fetch(
        `${API_URL}/api/logs/clear?days_to_keep=${days}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchLogs(activeTab === "all" ? "" : activeTab);
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const exportLogs = () => {
    const csvContent = [
      [
        "Timestamp",
        "Type",
        "Action",
        "Module",
        "User",
        "Description",
        "IP Address",
        "Status",
      ].join(","),
      ...logs.map((log) =>
        [
          log.timestamp,
          log.log_type,
          log.action,
          log.module,
          log.user_name || log.user_email || "-",
          `"${(log.description || "").replace(/"/g, '""')}"`,
          log.ip_address || "-",
          log.status || "-",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Logs exported to CSV");
  };

  const getLogTypeIcon = (type) => {
    switch (type) {
      case "activity":
        return <Activity className="w-4 h-4 text-blue-500" />;
      case "auth":
        return <Shield className="w-4 h-4 text-purple-500" />;
      case "audit":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "login":
        return <LogIn className="w-3 h-3 text-green-500" />;
      case "logout":
        return <LogOut className="w-3 h-3 text-slate-500" />;
      case "login_failed":
        return <XCircle className="w-3 h-3 text-red-500" />;
      case "create":
        return <Plus className="w-3 h-3 text-green-500" />;
      case "update":
        return <Edit className="w-3 h-3 text-blue-500" />;
      case "delete":
        return <Trash2 className="w-3 h-3 text-red-500" />;
      case "approve":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "reject":
        return <XCircle className="w-3 h-3 text-red-500" />;
      case "read":
        return <Eye className="w-3 h-3 text-slate-500" />;
      default:
        return <Activity className="w-3 h-3 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === "success")
      return (
        <Badge className="bg-green-500/20 text-green-400 text-xs">
          Success
        </Badge>
      );
    if (status === "failed")
      return (
        <Badge className="bg-red-500/20 text-red-400 text-xs">Failed</Badge>
      );
    return (
      <Badge className="bg-slate-500/20 text-slate-400 text-xs">
        {status || "-"}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="logs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-white"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Logs Management
          </h1>
          <p className="text-[#94A3B8]">
            System activity, authentication, and audit logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportLogs}
            className="border-[#1F2833] text-[#94A3B8] hover:bg-[#1F2833]"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchLogs(activeTab === "all" ? "" : activeTab);
              fetchStats();
            }}
            className="border-[#1F2833] text-[#94A3B8] hover:bg-[#1F2833]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.total_logs?.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Total Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.today_logs?.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.by_type?.auth || 0}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Auth Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.by_type?.audit || 0}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Audit Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.failed_logins_7d || 0}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Failed Logins (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.by_type?.activity || 0}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Activity Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[#1F2833] border-[#1F2833]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[#94A3B8] text-xs uppercase">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-[#0F172A] border-[#1F2833] text-white placeholder:text-[#94A3B8]"
                />
              </div>
            </div>
            <div className="w-[150px]">
              <Label className="text-[#94A3B8] text-xs uppercase">Module</Label>
              <Select
                value={filters.module || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, module: v === "all" ? "" : v })
                }
              >
                <SelectTrigger className="bg-[#0F172A] border-[#1F2833] text-white">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-[#1F2833]">
                  <SelectItem value="all">All modules</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="treasury">Treasury</SelectItem>
                  <SelectItem value="income_expenses">
                    Income & Expenses
                  </SelectItem>
                  <SelectItem value="loans">Loans</SelectItem>
                  <SelectItem value="vendors">Exchangers</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-[#94A3B8] text-xs uppercase">From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters({ ...filters, date_from: e.target.value })
                }
                className="bg-[#0F172A] border-[#1F2833] text-white"
              />
            </div>
            <div className="w-[140px]">
              <Label className="text-[#94A3B8] text-xs uppercase">To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters({ ...filters, date_to: e.target.value })
                }
                className="bg-[#0F172A] border-[#1F2833] text-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E]"
            >
              <Filter className="w-4 h-4 mr-2" /> Apply
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  log_type: "",
                  action: "",
                  module: "",
                  date_from: "",
                  date_to: "",
                  search: "",
                })
              }
              className="border-[#1F2833] text-[#94A3B8] hover:bg-[#1F2833]"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-[#0F172A] border border-[#1F2833]">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> All Logs
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            <Activity className="w-4 h-4 mr-2" /> Activity
          </TabsTrigger>
          <TabsTrigger
            value="auth"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            <Shield className="w-4 h-4 mr-2" /> Auth
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            <FileText className="w-4 h-4 mr-2" /> Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                {activeTab === "all" && (
                  <>
                    <BarChart3 className="w-5 h-5 text-blue-500" /> All System
                    Logs
                  </>
                )}
                {activeTab === "activity" && (
                  <>
                    <Activity className="w-5 h-5 text-blue-500" /> Activity Logs
                  </>
                )}
                {activeTab === "auth" && (
                  <>
                    <Shield className="w-5 h-5 text-purple-500" />{" "}
                    Authentication Logs
                  </>
                )}
                {activeTab === "audit" && (
                  <>
                    <FileText className="w-5 h-5 text-amber-500" /> Audit Trail
                  </>
                )}
                <Badge variant="outline" className="ml-2 text-[#94A3B8] border-[#1F2833]">
                  {total} records
                </Badge>
              </CardTitle>
              <Select onValueChange={(v) => clearOldLogs(parseInt(v))}>
                <SelectTrigger className="w-[180px] bg-[#0F172A] border-[#1F2833] text-white">
                  <SelectValue placeholder="Clear old logs..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-[#1F2833]">
                  <SelectItem value="30">Clear older than 30 days</SelectItem>
                  <SelectItem value="60">Clear older than 60 days</SelectItem>
                  <SelectItem value="90">Clear older than 90 days</SelectItem>
                  <SelectItem value="180">Clear older than 180 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1F2833]">
                      <TableHead className="text-[#94A3B8] text-xs w-[180px]">
                        Timestamp
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs w-[80px]">
                        Type
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs w-[100px]">
                        Action
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs w-[120px]">
                        Module
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs">
                        User
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs">
                        Description
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs w-[120px]">
                        IP Address
                      </TableHead>
                      <TableHead className="text-[#94A3B8] text-xs w-[80px]">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-slate-500"
                        >
                          No logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log, i) => (
                        <TableRow
                          key={log.log_id || i}
                          className="border-[#1F2833] hover:bg-[#1F2833]/50"
                        >
                          <TableCell className="text-[#94A3B8] text-xs font-mono">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getLogTypeIcon(log.log_type)}
                              <span className="text-xs text-[#94A3B8] capitalize">
                                {log.log_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getActionIcon(log.action)}
                              <span className="text-xs text-[#94A3B8] capitalize">
                                {log.action?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#94A3B8] text-xs capitalize">
                            {log.module?.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <div>
                                <p className="text-xs text-white font-medium">
                                  {log.user_name || "-"}
                                </p>
                                <p className="text-xs text-[#94A3B8]">
                                  {log.user_email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-[#94A3B8] text-xs max-w-[300px] truncate"
                            title={log.description}
                          >
                            {log.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-[#94A3B8] font-mono">
                                {log.ip_address || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={(p) => { setCurrentPage(p); fetchLogs(activeTab === "all" ? "" : activeTab, p); }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
      />
      {/* Most Active Users & Common Actions */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-blue-500" />
                Most Active Users (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.active_users?.map((user, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-[#0F172A] rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-white font-medium">
                        {user.user || "Unknown"}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-blue-600 border-blue-600"
                    >
                      {user.count} actions
                    </Badge>
                  </div>
                ))}
                {(!stats.active_users || stats.active_users.length === 0) && (
                  <p className="text-[#94A3B8] text-sm text-center py-4">
                    No user activity data
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-purple-500" />
                Most Common Actions (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.common_actions?.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-[#0F172A] rounded"
                  >
                    <div className="flex items-center gap-2">
                      {getActionIcon(action.action)}
                      <span className="text-white font-medium capitalize">
                        {action.action?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-purple-600 border-purple-600"
                    >
                      {action.count}
                    </Badge>
                  </div>
                ))}
                {(!stats.common_actions ||
                  stats.common_actions.length === 0) && (
                  <p className="text-[#94A3B8] text-sm text-center py-4">
                    No action data
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
