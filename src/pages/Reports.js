import { useEffect, useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Download,
  FileSpreadsheet,
  Calendar,
  Store,
  Landmark,
  CreditCard,
  Wallet,
  PieChart,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Percent,
  RefreshCw,
  Filter,
  Banknote,
  Receipt,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  ChevronDown,
  Calculator,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-foreground/10/95 backdrop-blur-md border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm font-mono"
            style={{ color: entry.color }}
          >
            {entry.name}:{" "}
            {typeof entry.value === "number"
              ? `$${entry.value.toLocaleString()}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Report data states
  const [transactionReport, setTransactionReport] = useState(null);
  const [vendorReport, setExchangerReport] = useState(null);
  const [commissionReport, setCommissionReport] = useState(null);
  const [clientReport, setClientReport] = useState(null);
  const [treasuryReport, setTreasuryReport] = useState(null);
  const [pspReport, setPspReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [outstandingReport, setOutstandingReport] = useState(null);
  const [debtsData, setDebtsData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loansReport, setLoansReport] = useState(null);
  const [loansData, setLoansData] = useState([]);
  const [dealingPnLReport, setDealingPnLReport] = useState([]);
  const [dealingPnLSummary, setDealingPnLSummary] = useState(null);

  // Detailed data for full reports
  const [allTransactions, setAllTransactions] = useState([]);
  const [allIncomeExpenses, setAllIncomeExpenses] = useState([]);
  const [allTreasuryTransactions, setAllTreasuryTransactions] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Export to Excel function
  const exportToExcel = (data, filename, columns) => {
    const exportData = data.map((row) => {
      const obj = {};
      columns.forEach((col) => {
        obj[col.label] = row[col.key] ?? "";
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(
      wb,
      `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Excel file downloaded");
  };

  // Export to PDF function
  const exportToPDF = (title, data, columns, summaryData = null) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(11, 12, 16);
    doc.text("MILES CAPITALS", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(title, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);
    if (dateFrom || dateTo) {
      doc.text(
        `Period: ${dateFrom || "Start"} to ${dateTo || "Present"}`,
        14,
        41,
      );
    }

    let yPos = 50;

    // Summary section if provided
    if (summaryData) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Summary", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      summaryData.forEach((item) => {
        doc.text(`${item.label}: ${item.value}`, 14, yPos);
        yPos += 6;
      });
      yPos += 10;
    }

    // Data table
    if (data && data.length > 0) {
      const tableData = data.map((row) =>
        columns.map((col) => {
          const val = row[col.key];
          if (typeof val === "number") return val.toLocaleString();
          return val ?? "";
        }),
      );

      autoTable(doc, {
        head: [columns.map((c) => c.label)],
        body: tableData,
        startY: yPos,
        theme: "striped",
        headStyles: { fillColor: [11, 12, 16], textColor: [102, 252, 241] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(
      `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    toast.success("PDF file downloaded");
  };

  // Export dropdown component
  const ExportDropdown = ({ data, filename, columns, title, summaryData }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          <Download className="w-4 h-4 mr-2" /> Export{" "}
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border-slate-200">
        <DropdownMenuItem
          onClick={() => downloadCSV(data, filename, columns)}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToExcel(data, filename, columns)}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> Excel
          (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToPDF(title, data, columns, summaryData)}
          className="cursor-pointer"
        >
          <FileText className="w-4 h-4 mr-2 text-red-600" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("start_date", dateFrom);
    if (dateTo) params.append("end_date", dateTo);
    return params.toString();
  };

  const fetchReports = async () => {
    setLoading(true);
    const queryStr = buildQueryParams();

    try {
      const endpoints = {
        transactions: `${API_URL}/api/reports/transactions-detailed${queryStr ? `?${queryStr}` : ""}`,
        vendors: `${API_URL}/api/reports/vendor-summary${queryStr ? `?${queryStr}` : ""}`,
        commissions: `${API_URL}/api/reports/vendor-commissions${queryStr ? `?${queryStr}` : ""}`,
        clients: `${API_URL}/api/reports/client-balances`,
        treasury: `${API_URL}/api/reports/treasury-summary${queryStr ? `?${queryStr}` : ""}`,
        psp: `${API_URL}/api/reports/psp-summary${queryStr ? `?${queryStr}` : ""}`,
        financial: `${API_URL}/api/reports/financial-summary${queryStr ? `?${queryStr}` : ""}`,
        outstanding: `${API_URL}/api/debts/summary/overview`,
        debts: `${API_URL}/api/debts`,
        chart: `${API_URL}/api/reports/transactions-summary?days=30`,
        loans: `${API_URL}/api/loans/reports/summary`,
        loansData: `${API_URL}/api/loans`,
        dealingPnL: `${API_URL}/api/dealing-pnl?limit=30`,
        dealingPnLSummary: `${API_URL}/api/dealing-pnl/summary?days=30`,
        // Detailed data endpoints
        allTransactions: `${API_URL}/api/transactions?page_size=500${queryStr ? `&${queryStr}` : ""}`,
        allIE: `${API_URL}/api/income-expenses?limit=500`,
      };

      const [
        txRes,
        vendorRes,
        commRes,
        clientRes,
        treasuryRes,
        pspRes,
        financialRes,
        outstandingRes,
        debtsRes,
        chartRes,
        loansRes,
        loansDataRes,
        dealingRes,
        dealingSummaryRes,
        allTxRes,
        allIERes,
      ] = await Promise.all([
        fetch(endpoints.transactions, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.vendors, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.commissions, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.clients, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.treasury, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.psp, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.financial, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.outstanding, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.debts, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.chart, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.loans, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.loansData, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.dealingPnL, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.dealingPnLSummary, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.allTransactions, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(endpoints.allIE, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
      ]);

      if (txRes.ok) setTransactionReport(await txRes.json());
      if (vendorRes.ok) setExchangerReport(await vendorRes.json());
      if (commRes.ok) setCommissionReport(await commRes.json());
      if (clientRes.ok) setClientReport(await clientRes.json());
      if (treasuryRes.ok) setTreasuryReport(await treasuryRes.json());
      if (pspRes.ok) setPspReport(await pspRes.json());
      if (financialRes.ok) setFinancialReport(await financialRes.json());
      if (outstandingRes.ok) setOutstandingReport(await outstandingRes.json());
      if (debtsRes.ok) setDebtsData(await debtsRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (loansRes.ok) setLoansReport(await loansRes.json());
      if (loansDataRes.ok) {
        const ld = await loansDataRes.json();
        setLoansData(Array.isArray(ld) ? ld : ld.items || []);
      }
      if (dealingRes.ok) setDealingPnLReport(await dealingRes.json());
      if (dealingSummaryRes.ok)
        setDealingPnLSummary(await dealingSummaryRes.json());
      // Detailed data
      if (allTxRes.ok) {
        const txData = await allTxRes.json();
        setAllTransactions(Array.isArray(txData) ? txData : txData.items || []);
      }
      if (allIERes.ok) {
        const ieData = await allIERes.json();
        setAllIncomeExpenses(
          Array.isArray(ieData) ? ieData : ieData.items || [],
        );
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const downloadCSV = (data, filename, headers) => {
    const rows = data.map((row) =>
      headers.map((h) => `"${row[h.key] ?? ""}"`).join(","),
    );
    const csvContent = [headers.map((h) => h.label).join(","), ...rows].join(
      "\n",
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} exported to CSV`);
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = "blue",
    trend,
  }) => (
    <Card className="bg-foreground/10 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-xs font-mono">
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div
            className={`p-2 rounded-lg ${
              color === "blue"
                ? "bg-blue-500/10"
                : color === "green"
                  ? "bg-emerald-500/10"
                  : color === "yellow"
                    ? "bg-amber-500/10"
                    : color === "red"
                      ? "bg-red-500/10"
                      : color === "purple"
                        ? "bg-purple-500/10"
                        : "bg-cyan-500/10"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                color === "blue"
                  ? "text-blue-400"
                  : color === "green"
                    ? "text-emerald-400"
                    : color === "yellow"
                      ? "text-amber-400"
                      : color === "red"
                        ? "text-red-400"
                        : color === "purple"
                          ? "text-purple-400"
                          : "text-cyan-400"
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Reports & Analytics
          </h1>
          <p className="text-[#94A3B8]">
            Comprehensive financial reports with base currency breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReports}
            variant="outline"
            className="border-slate-200 text-[#94A3B8] hover:text-slate-800 hover:bg-slate-100"
            data-testid="refresh-reports-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card className="bg-foreground/10 border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-[#94A3B8] uppercase">
                From Date
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 bg-[#0F172A] border-slate-200 text-slate-800"
                data-testid="date-from"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#94A3B8] uppercase">
                To Date
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 bg-[#0F172A] border-slate-200 text-slate-800"
                data-testid="date-to"
              />
            </div>
            <Button
              onClick={fetchReports}
              className="bg-blue-600 hover:bg-blue-700 text-slate-800"
              data-testid="apply-filters-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            {(dateFrom || dateTo) && (
              <Button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                variant="ghost"
                className="text-[#94A3B8] hover:text-slate-800"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-foreground/10 border border-slate-200 flex-wrap h-auto p-1">
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger
            value="exchangers"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Store className="w-4 h-4 mr-2" />
            Exchangers
          </TabsTrigger>
          <TabsTrigger
            value="commissions"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Percent className="w-4 h-4 mr-2" />
            Commissions
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Users className="w-4 h-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger
            value="treasury"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Landmark className="w-4 h-4 mr-2" />
            Treasury
          </TabsTrigger>
          <TabsTrigger
            value="psp"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            PSP
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger
            value="outstanding"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Receipt className="w-4 h-4 mr-2" />
            O/S Accounts
          </TabsTrigger>
          <TabsTrigger
            value="loans"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Loans
          </TabsTrigger>
          <TabsTrigger
            value="dealing"
            className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Dealing P&L
          </TabsTrigger>
        </TabsList>

        {/* ========== TRANSACTIONS REPORT ========== */}
        <TabsContent value="transactions" className="space-y-4">
          {transactionReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Deposits"
                  value={`$${(transactionReport.summary?.total_deposits_usd || 0).toLocaleString()}`}
                  subtitle={`${transactionReport.summary?.deposit_count || 0} transactions`}
                  icon={ArrowDownRight}
                  color="green"
                />
                <StatCard
                  title="Total Withdrawals"
                  value={`$${(transactionReport.summary?.total_withdrawals_usd || 0).toLocaleString()}`}
                  subtitle={`${transactionReport.summary?.withdrawal_count || 0} transactions`}
                  icon={ArrowUpRight}
                  color="red"
                />
                <StatCard
                  title="Net Flow"
                  value={`$${Math.abs(transactionReport.summary?.net_flow_usd || 0).toLocaleString()}`}
                  subtitle={
                    transactionReport.summary?.net_flow_usd >= 0
                      ? "Positive"
                      : "Negative"
                  }
                  icon={DollarSign}
                  color={
                    transactionReport.summary?.net_flow_usd >= 0
                      ? "green"
                      : "red"
                  }
                />
                <StatCard
                  title="Total Transactions"
                  value={transactionReport.summary?.total_count || 0}
                  icon={BarChart3}
                  color="blue"
                />
              </div>

              {/* Chart */}
              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Transaction Volume (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="depositGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10B981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10B981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="withdrawalGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#EF4444"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#EF4444"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          stroke="#94A3B8"
                          tick={{ fill: "#94A3B8", fontSize: 10 }}
                          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          tick={{ fill: "#94A3B8", fontSize: 10 }}
                          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                          tickLine={false}
                          tickFormatter={(v) => `$${v / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="deposits"
                          name="Deposits"
                          stroke="#10B981"
                          fillOpacity={1}
                          fill="url(#depositGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="withdrawals"
                          name="Withdrawals"
                          stroke="#EF4444"
                          fillOpacity={1}
                          fill="url(#withdrawalGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown by Currency */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                      Deposits by Currency
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#94A3B8] hover:text-slate-800"
                      onClick={() =>
                        downloadCSV(
                          transactionReport.deposits_by_currency || [],
                          "deposits_by_currency",
                          [
                            { key: "currency", label: "Currency" },
                            { key: "amount", label: "Amount (Base)" },
                            { key: "usd_equivalent", label: "USD Equivalent" },
                            { key: "count", label: "Count" },
                          ],
                        )
                      }
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-[#94A3B8] text-xs">
                              Currency
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Amount
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              USD
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Count
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(transactionReport.deposits_by_currency || []).map(
                            (item, i) => (
                              <TableRow key={i} className="border-slate-200">
                                <TableCell className="text-slate-800 font-mono">
                                  {item.currency}
                                </TableCell>
                                <TableCell className="text-emerald-400 font-mono text-right">
                                  {item.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-slate-800 font-mono text-right">
                                  ${item.usd_equivalent?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-[#94A3B8] text-right">
                                  {item.count}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                          {/* Total Row */}
                          {transactionReport.deposits_by_currency?.length >
                            0 && (
                            <TableRow className="border-t-2 border-emerald-500 bg-emerald-500/10">
                              <TableCell className="text-emerald-400 font-bold">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-emerald-400 font-mono text-right font-bold">
                                -
                              </TableCell>
                              <TableCell className="text-emerald-400 font-mono text-right font-bold">
                                $
                                {transactionReport.deposits_by_currency
                                  .reduce(
                                    (sum, item) =>
                                      sum + (item.usd_equivalent || 0),
                                    0,
                                  )
                                  .toLocaleString()}
                              </TableCell>
                              <TableCell className="text-emerald-400 text-right font-bold">
                                {transactionReport.deposits_by_currency.reduce(
                                  (sum, item) => sum + (item.count || 0),
                                  0,
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                          {(!transactionReport.deposits_by_currency ||
                            transactionReport.deposits_by_currency.length ===
                              0) && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-[#94A3B8]"
                              >
                                No data
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                      Withdrawals by Currency
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#94A3B8] hover:text-slate-800"
                      onClick={() =>
                        downloadCSV(
                          transactionReport.withdrawals_by_currency || [],
                          "withdrawals_by_currency",
                          [
                            { key: "currency", label: "Currency" },
                            { key: "amount", label: "Amount (Base)" },
                            { key: "usd_equivalent", label: "USD Equivalent" },
                            { key: "count", label: "Count" },
                          ],
                        )
                      }
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-[#94A3B8] text-xs">
                              Currency
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Amount
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              USD
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Count
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(
                            transactionReport.withdrawals_by_currency || []
                          ).map((item, i) => (
                            <TableRow key={i} className="border-slate-200">
                              <TableCell className="text-slate-800 font-mono">
                                {item.currency}
                              </TableCell>
                              <TableCell className="text-red-400 font-mono text-right">
                                {item.amount?.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-slate-800 font-mono text-right">
                                ${item.usd_equivalent?.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-[#94A3B8] text-right">
                                {item.count}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Total Row */}
                          {transactionReport.withdrawals_by_currency?.length >
                            0 && (
                            <TableRow className="border-t-2 border-red-500 bg-red-500/10">
                              <TableCell className="text-red-400 font-bold">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-red-400 font-mono text-right font-bold">
                                -
                              </TableCell>
                              <TableCell className="text-red-400 font-mono text-right font-bold">
                                $
                                {transactionReport.withdrawals_by_currency
                                  .reduce(
                                    (sum, item) =>
                                      sum + (item.usd_equivalent || 0),
                                    0,
                                  )
                                  .toLocaleString()}
                              </TableCell>
                              <TableCell className="text-red-400 text-right font-bold">
                                {transactionReport.withdrawals_by_currency.reduce(
                                  (sum, item) => sum + (item.count || 0),
                                  0,
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                          {(!transactionReport.withdrawals_by_currency ||
                            transactionReport.withdrawals_by_currency.length ===
                              0) && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-[#94A3B8]"
                              >
                                No data
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Transactions Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                    All Transactions (Detailed)
                  </CardTitle>
                  <ExportDropdown
                    data={allTransactions}
                    filename="all_transactions"
                    title="All Transactions Report"
                    columns={[
                      { key: "reference", label: "Reference" },
                      { key: "client_name", label: "Client" },
                      { key: "transaction_type", label: "Type" },
                      { key: "amount", label: "Amount" },
                      { key: "currency", label: "Currency" },
                      { key: "base_amount", label: "Payment Amount" },
                      { key: "base_currency", label: "Payment Currency" },
                      { key: "status", label: "Status" },
                      { key: "created_at", label: "Date" },
                    ]}
                    summaryData={[
                      {
                        label: "Total Deposits",
                        value: `$${(transactionReport.summary?.total_deposits_usd || 0).toLocaleString()}`,
                      },
                      {
                        label: "Total Withdrawals",
                        value: `$${(transactionReport.summary?.total_withdrawals_usd || 0).toLocaleString()}`,
                      },
                      {
                        label: "Net Flow",
                        value: `$${(transactionReport.summary?.net_flow_usd || 0).toLocaleString()}`,
                      },
                    ]}
                  />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-500 text-xs">
                            Reference
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Client
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Type
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs text-right">
                            Amount (USD)
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs text-right">
                            Payment
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Status
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Date
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.map((tx, i) => (
                          <TableRow
                            key={tx.transaction_id || i}
                            className="border-slate-200"
                          >
                            <TableCell className="font-mono text-xs text-slate-800">
                              {tx.reference}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {tx.client_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  tx.transaction_type === "deposit"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }
                              >
                                {tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`font-mono text-right ${tx.transaction_type === "deposit" ? "text-green-500" : "text-red-500"}`}
                            >
                              {tx.transaction_type === "deposit" ? "+" : "-"}$
                              {tx.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-right text-slate-500">
                              {tx.base_amount?.toLocaleString()}{" "}
                              {tx.base_currency}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  tx.status === "completed"
                                    ? "text-green-600 border-green-600"
                                    : tx.status === "pending"
                                      ? "text-yellow-600 border-yellow-600"
                                      : "text-slate-600 border-slate-600"
                                }
                              >
                                {tx.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {tx.created_at?.split("T")[0]}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        {allTransactions.length > 0 && (
                          <TableRow className="border-t-2 border-blue-500 bg-blue-500/10 font-bold">
                            <TableCell className="text-blue-600" colSpan={3}>
                              TOTALS
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-green-500">
                                +$
                                {allTransactions
                                  .filter(
                                    (t) => t.transaction_type === "deposit",
                                  )
                                  .reduce((sum, t) => sum + (t.amount || 0), 0)
                                  .toLocaleString()}
                              </div>
                              <div className="text-red-500">
                                -$
                                {allTransactions
                                  .filter(
                                    (t) => t.transaction_type === "withdrawal",
                                  )
                                  .reduce((sum, t) => sum + (t.amount || 0), 0)
                                  .toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-blue-600">
                              Net: $
                              {(
                                allTransactions
                                  .filter(
                                    (t) => t.transaction_type === "deposit",
                                  )
                                  .reduce(
                                    (sum, t) => sum + (t.amount || 0),
                                    0,
                                  ) -
                                allTransactions
                                  .filter(
                                    (t) => t.transaction_type === "withdrawal",
                                  )
                                  .reduce((sum, t) => sum + (t.amount || 0), 0)
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell
                              colSpan={2}
                              className="text-blue-600 text-right"
                            >
                              {allTransactions.length} transactions
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== EXCHANGERS REPORT ========== */}
        <TabsContent value="exchangers" className="space-y-4">
          {vendorReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Exchangers"
                  value={vendorReport.grand_totals?.total_exchangers || 0}
                  icon={Store}
                  color="purple"
                />
                <StatCard
                  title="Total Deposits"
                  value={`$${(vendorReport.grand_totals?.total_deposits_usd || 0).toLocaleString()}`}
                  icon={ArrowDownRight}
                  color="green"
                />
                <StatCard
                  title="Total Withdrawals"
                  value={`$${(vendorReport.grand_totals?.total_withdrawals_usd || 0).toLocaleString()}`}
                  icon={ArrowUpRight}
                  color="red"
                />
                <StatCard
                  title="Net Settlement"
                  value={`$${(vendorReport.grand_totals?.total_net_settlement_usd || 0).toLocaleString()}`}
                  subtitle="After commission"
                  icon={DollarSign}
                  color={
                    vendorReport.grand_totals?.total_net_settlement_usd >= 0
                      ? "green"
                      : "red"
                  }
                />
              </div>

              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Exchanger Settlement Summary
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#94A3B8] hover:text-slate-800"
                    onClick={() =>
                      downloadCSV(
                        (vendorReport.vendors || []).map((v) => ({
                          vendor_name: v.vendor_name,
                          deposits_usd: v.totals?.deposits_usd,
                          withdrawals_usd: v.totals?.withdrawals_usd,
                          commission_usd: v.totals?.commission_usd,
                          other_in_usd: v.totals?.other_in_usd,
                          other_out_usd: v.totals?.other_out_usd,
                          other_commission_usd: v.totals?.other_commission_usd,
                          net_settlement_usd: v.totals?.net_settlement_usd,
                        })),
                        "vendor_settlements",
                        [
                          { key: "vendor_name", label: "Exchanger" },
                          { key: "deposits_usd", label: "Deposits (USD)" },
                          {
                            key: "withdrawals_usd",
                            label: "Withdrawals (USD)",
                          },
                          {
                            key: "commission_usd",
                            label: "Tx Commission (USD)",
                          },
                          { key: "other_in_usd", label: "Other In (USD)" },
                          { key: "other_out_usd", label: "Other Out (USD)" },
                          {
                            key: "other_commission_usd",
                            label: "Other Commission (USD)",
                          },
                          {
                            key: "net_settlement_usd",
                            label: "Net Settlement (USD)",
                          },
                        ],
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#94A3B8] text-xs">
                            Exchanger
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Deposits
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Withdrawals
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Tx Comm.
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Other In
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Other Out
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Other Comm.
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Net Settlement
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs">
                            Currencies
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(vendorReport.vendors || []).map((vendor, i) => (
                          <TableRow key={i} className="border-slate-200">
                            <TableCell>
                              <div>
                                <p className="text-slate-800 font-medium">
                                  {vendor.vendor_name}
                                </p>
                                <p className="text-xs text-[#94A3B8]">
                                  In: {vendor.deposit_commission_rate}% / Out:{" "}
                                  {vendor.withdrawal_commission_rate}%
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-emerald-400 font-mono text-right">
                              $
                              {(
                                vendor.totals?.deposits_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-400 font-mono text-right">
                              $
                              {(
                                vendor.totals?.withdrawals_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-amber-400 font-mono text-right">
                              $
                              {(
                                vendor.totals?.commission_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-emerald-300 font-mono text-right">
                              $
                              {(
                                vendor.totals?.other_in_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-300 font-mono text-right">
                              $
                              {(
                                vendor.totals?.other_out_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-amber-300 font-mono text-right">
                              $
                              {(
                                vendor.totals?.other_commission_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell
                              className={`font-mono text-right font-bold ${(vendor.totals?.net_settlement_usd || 0) >= 0 ? "text-blue-400" : "text-red-400"}`}
                            >
                              $
                              {(
                                vendor.totals?.net_settlement_usd || 0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(vendor.currencies || {}).map(
                                  (curr) => (
                                    <Badge
                                      key={curr}
                                      variant="outline"
                                      className="text-xs border-white/20 text-[#94A3B8]"
                                    >
                                      {curr}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        {vendorReport.vendors?.length > 0 && (
                          <TableRow className="border-t-2 border-purple-500 bg-purple-500/10 font-bold">
                            <TableCell className="text-purple-400 font-bold">
                              GRAND TOTAL ({vendorReport.vendors.length}{" "}
                              Exchangers)
                            </TableCell>
                            <TableCell className="text-emerald-400 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.deposits_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-400 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.withdrawals_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-amber-400 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.commission_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-emerald-300 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.other_in_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-300 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.other_out_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-amber-300 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.other_commission_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-blue-400 font-mono text-right font-bold">
                              $
                              {vendorReport.vendors
                                .reduce(
                                  (sum, v) =>
                                    sum + (v.totals?.net_settlement_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                        {(!vendorReport.vendors ||
                          vendorReport.vendors.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="text-center text-[#94A3B8] py-8"
                            >
                              No vendor data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== COMMISSIONS REPORT ========== */}
        <TabsContent value="commissions" className="space-y-4">
          {commissionReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Commission Paid"
                  value={`$${(commissionReport.total_commission_usd || 0).toLocaleString()}`}
                  icon={Percent}
                  color="yellow"
                />
                <StatCard
                  title="Exchangers with Commission"
                  value={(commissionReport.vendors || []).length}
                  icon={Store}
                  color="purple"
                />
                <StatCard
                  title="Commission Transactions"
                  value={(commissionReport.transactions || []).length}
                  icon={BarChart3}
                  color="blue"
                />
              </div>

              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Commission by Exchanger
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#94A3B8] hover:text-slate-800"
                    onClick={() =>
                      downloadCSV(
                        commissionReport.vendors || [],
                        "vendor_commissions",
                        [
                          { key: "vendor_name", label: "Exchanger" },
                          {
                            key: "total_commission_usd",
                            label: "Total Commission (USD)",
                          },
                          {
                            key: "deposit_commissions",
                            label: "Money In Commissions",
                          },
                          {
                            key: "withdrawal_commissions",
                            label: "Money Out Commissions",
                          },
                          { key: "transaction_count", label: "Transactions" },
                        ],
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#94A3B8] text-xs">
                            Exchanger
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Total Commission
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            From Deposits
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            From Withdrawals
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Transactions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(commissionReport.vendors || []).map((v, i) => (
                          <TableRow key={i} className="border-slate-200">
                            <TableCell className="text-slate-800 font-medium">
                              {v.vendor_name}
                            </TableCell>
                            <TableCell className="text-amber-400 font-mono text-right font-bold">
                              ${(v.total_commission_usd || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-emerald-400 font-mono text-right">
                              ${(v.deposit_commissions || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-400 font-mono text-right">
                              $
                              {(v.withdrawal_commissions || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-[#94A3B8] text-right">
                              {v.transaction_count}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!commissionReport.vendors ||
                          commissionReport.vendors.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-[#94A3B8] py-8"
                            >
                              No commission data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Commission by Currency */}
              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Commission by Currency (All Exchangers)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(commissionReport.vendors || [])
                      .flatMap((v) =>
                        Object.entries(v.commission_by_currency || {}).map(
                          ([curr, data]) => ({
                            currency: curr,
                            base: data.base,
                            usd: data.usd,
                          }),
                        ),
                      )
                      .reduce((acc, item) => {
                        const existing = acc.find(
                          (x) => x.currency === item.currency,
                        );
                        if (existing) {
                          existing.base += item.base;
                          existing.usd += item.usd;
                        } else {
                          acc.push({ ...item });
                        }
                        return acc;
                      }, [])
                      .map((item, i) => (
                        <div
                          key={i}
                          className="p-3 bg-[#0F172A] rounded-lg border border-slate-200"
                        >
                          <p className="text-xs text-[#94A3B8] uppercase mb-1">
                            {item.currency}
                          </p>
                          <p className="text-lg font-mono text-amber-400">
                            {item.base?.toLocaleString()}
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            ≈ ${item.usd?.toLocaleString()} USD
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== CLIENTS REPORT ========== */}
        <TabsContent value="clients" className="space-y-4">
          {clientReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Clients"
                  value={clientReport.summary?.total_clients || 0}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Active Clients"
                  value={clientReport.summary?.active_clients || 0}
                  subtitle="With transactions"
                  icon={Users}
                  color="green"
                />
                <StatCard
                  title="Total Deposits"
                  value={`$${(clientReport.summary?.total_deposits_usd || 0).toLocaleString()}`}
                  icon={ArrowDownRight}
                  color="green"
                />
                <StatCard
                  title="Net Client Balance"
                  value={`$${(clientReport.summary?.total_net_balance || 0).toLocaleString()}`}
                  icon={Wallet}
                  color={
                    clientReport.summary?.total_net_balance >= 0
                      ? "green"
                      : "red"
                  }
                />
              </div>

              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Client Balance Report
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#94A3B8] hover:text-slate-800"
                    onClick={() =>
                      downloadCSV(
                        clientReport.clients || [],
                        "client_balances",
                        [
                          { key: "client_id", label: "Client ID" },
                          { key: "name", label: "Name" },
                          { key: "email", label: "Email" },
                          { key: "country", label: "Country" },
                          {
                            key: "total_deposits_usd",
                            label: "Deposits (USD)",
                          },
                          {
                            key: "total_withdrawals_usd",
                            label: "Withdrawals (USD)",
                          },
                          { key: "net_balance", label: "Net Balance (USD)" },
                          { key: "transaction_count", label: "Transactions" },
                        ],
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#94A3B8] text-xs">
                            Client
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs">
                            Country
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Deposits
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Withdrawals
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Net Balance
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Txns
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(clientReport.clients || [])
                          .slice(0, 100)
                          .map((client, i) => (
                            <TableRow key={i} className="border-slate-200">
                              <TableCell>
                                <div>
                                  <p className="text-slate-800 font-medium">
                                    {client.name || "Unknown"}
                                  </p>
                                  <p className="text-xs text-[#94A3B8] font-mono">
                                    {client.email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-[#94A3B8]">
                                {client.country || "-"}
                              </TableCell>
                              <TableCell className="text-emerald-400 font-mono text-right">
                                $
                                {(
                                  client.total_deposits_usd || 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-red-400 font-mono text-right">
                                $
                                {(
                                  client.total_withdrawals_usd || 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`font-mono text-right font-bold ${(client.net_balance || 0) >= 0 ? "text-blue-400" : "text-red-400"}`}
                              >
                                ${(client.net_balance || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-[#94A3B8] text-right">
                                {client.transaction_count || 0}
                              </TableCell>
                            </TableRow>
                          ))}
                        {(!clientReport.clients ||
                          clientReport.clients.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-[#94A3B8] py-8"
                            >
                              No client data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== TREASURY REPORT ========== */}
        <TabsContent value="treasury" className="space-y-4">
          {treasuryReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Balance (USD)"
                  value={`$${(treasuryReport.total_balance_usd || 0).toLocaleString()}`}
                  icon={Landmark}
                  color="blue"
                />
                <StatCard
                  title="Treasury Accounts"
                  value={(treasuryReport.accounts || []).length}
                  icon={CreditCard}
                  color="purple"
                />
                <StatCard
                  title="Recent Transfers"
                  value={(treasuryReport.recent_transfers || []).length}
                  icon={ArrowLeftRight}
                  color="cyan"
                />
              </div>

              {/* Balance by Currency */}
              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Balance by Currency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(treasuryReport.balance_by_currency || []).map(
                      (item, i) => (
                        <div
                          key={i}
                          className="p-3 bg-[#0F172A] rounded-lg border border-slate-200"
                        >
                          <p className="text-xs text-[#94A3B8] uppercase mb-1">
                            {item.currency}
                          </p>
                          <p className="text-lg font-mono text-slate-800">
                            {item.total?.toLocaleString()}
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            {item.account_count} accounts
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Treasury Accounts
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#94A3B8] hover:text-slate-800"
                    onClick={() =>
                      downloadCSV(
                        treasuryReport.accounts || [],
                        "treasury_accounts",
                        [
                          { key: "account_name", label: "Account Name" },
                          { key: "account_type", label: "Type" },
                          { key: "bank_name", label: "Bank" },
                          { key: "currency", label: "Currency" },
                          { key: "balance", label: "Balance" },
                          { key: "balance_usd", label: "Balance (USD)" },
                          { key: "status", label: "Status" },
                        ],
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#94A3B8] text-xs">
                            Account
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs">
                            Type
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs">
                            Currency
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Balance
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            USD Equiv.
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(treasuryReport.accounts || []).map((acc, i) => (
                          <TableRow key={i} className="border-slate-200">
                            <TableCell>
                              <div>
                                <p className="text-slate-800 font-medium">
                                  {acc.account_name}
                                </p>
                                <p className="text-xs text-[#94A3B8]">
                                  {acc.bank_name || "-"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-[#94A3B8] capitalize">
                              {acc.account_type?.replace("_", " ")}
                            </TableCell>
                            <TableCell className="text-slate-800 font-mono">
                              {acc.currency}
                            </TableCell>
                            <TableCell className="text-slate-800 font-mono text-right">
                              {acc.balance?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-blue-400 font-mono text-right">
                              ${acc.balance_usd?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  acc.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }
                              >
                                {acc.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        {treasuryReport.accounts?.length > 0 && (
                          <TableRow className="border-t-2 border-blue-500 bg-blue-500/10 font-bold">
                            <TableCell className="text-blue-600 font-bold">
                              TOTAL ({treasuryReport.accounts.length} accounts)
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-slate-800 font-mono text-right font-bold">
                              -
                            </TableCell>
                            <TableCell className="text-blue-400 font-mono text-right font-bold">
                              $
                              {treasuryReport.accounts
                                .reduce(
                                  (sum, acc) => sum + (acc.balance_usd || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== PSP REPORT ========== */}
        <TabsContent value="psp" className="space-y-4">
          {pspReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Volume"
                  value={`$${(pspReport.grand_totals?.total_volume || 0).toLocaleString()}`}
                  icon={BarChart3}
                  color="blue"
                />
                <StatCard
                  title="Total Commission"
                  value={`$${(pspReport.grand_totals?.total_commission || 0).toLocaleString()}`}
                  icon={Percent}
                  color="yellow"
                />
                <StatCard
                  title="Net Amount"
                  value={`$${(pspReport.grand_totals?.total_net || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color="green"
                />
                <StatCard
                  title="Total Transactions"
                  value={pspReport.grand_totals?.total_transactions || 0}
                  icon={CreditCard}
                  color="purple"
                />
              </div>

              <Card className="bg-foreground/10 border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    PSP Summary
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#94A3B8] hover:text-slate-800"
                    onClick={() =>
                      downloadCSV(pspReport.psps || [], "psp_summary", [
                        { key: "psp_name", label: "PSP Name" },
                        {
                          key: "commission_rate",
                          label: "Commission Rate (%)",
                        },
                        { key: "total_volume", label: "Total Volume" },
                        { key: "total_commission", label: "Commission" },
                        { key: "total_net", label: "Net Amount" },
                        { key: "settled_count", label: "Settled" },
                        { key: "pending_count", label: "Pending" },
                      ])
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#94A3B8] text-xs">
                            PSP
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Rate
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Volume
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Commission
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Net
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Settled
                          </TableHead>
                          <TableHead className="text-[#94A3B8] text-xs text-right">
                            Pending
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pspReport.psps || []).map((psp, i) => (
                          <TableRow key={i} className="border-slate-200">
                            <TableCell className="text-slate-800 font-medium">
                              {psp.psp_name}
                            </TableCell>
                            <TableCell className="text-[#94A3B8] text-right">
                              {psp.commission_rate}%
                            </TableCell>
                            <TableCell className="text-slate-800 font-mono text-right">
                              ${(psp.total_volume || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-amber-400 font-mono text-right">
                              ${(psp.total_commission || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-emerald-400 font-mono text-right">
                              ${(psp.total_net || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-[#94A3B8] text-right">
                              {psp.settled_count || 0}
                            </TableCell>
                            <TableCell className="text-amber-400 text-right">
                              {psp.pending_count || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!pspReport.psps || pspReport.psps.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-[#94A3B8] py-8"
                            >
                              No PSP data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== FINANCIAL REPORT ========== */}
        <TabsContent value="financial" className="space-y-4">
          {financialReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Income"
                  value={`$${(financialReport.income?.total || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Total Expenses"
                  value={`$${(financialReport.expenses?.total || 0).toLocaleString()}`}
                  icon={TrendingDown}
                  color="red"
                />
                <StatCard
                  title="Net P&L"
                  value={`$${Math.abs(financialReport.net_profit_loss || 0).toLocaleString()}`}
                  subtitle={
                    financialReport.net_profit_loss >= 0 ? "Profit" : "Loss"
                  }
                  icon={DollarSign}
                  color={financialReport.net_profit_loss >= 0 ? "green" : "red"}
                />
                <StatCard
                  title="Treasury Balance"
                  value={`$${(financialReport.treasury?.total_balance_usd || 0).toLocaleString()}`}
                  subtitle={`${financialReport.treasury?.account_count || 0} accounts`}
                  icon={Landmark}
                  color="blue"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Income by Category */}
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Income by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {(financialReport.income?.by_category || []).length >
                      0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={financialReport.income?.by_category || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="amount"
                              nameKey="category"
                              label={({ category, amount }) =>
                                `${category}: $${amount.toLocaleString()}`
                              }
                              labelLine={{ stroke: "#94A3B8" }}
                            >
                              {(financialReport.income?.by_category || []).map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ),
                              )}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "#1E293B",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                              itemStyle={{ color: "#fff" }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#94A3B8]">
                          No income data
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses by Category */}
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                      Expenses by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {(financialReport.expenses?.by_category || []).length >
                      0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={financialReport.expenses?.by_category || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="amount"
                              nameKey="category"
                              label={({ category, amount }) =>
                                `${category}: $${amount.toLocaleString()}`
                              }
                              labelLine={{ stroke: "#94A3B8" }}
                            >
                              {(
                                financialReport.expenses?.by_category || []
                              ).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[(index + 3) % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "#1E293B",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                              itemStyle={{ color: "#fff" }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#94A3B8]">
                          No expense data
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Loans & Exchanger Commission Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-purple-400" />
                      Loan Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Disbursed</span>
                        <span className="text-slate-800 font-mono">
                          $
                          {(
                            financialReport.loans?.total_disbursed || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">
                          Outstanding Balance
                        </span>
                        <span className="text-amber-400 font-mono">
                          $
                          {(
                            financialReport.loans?.total_outstanding || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Repaid</span>
                        <span className="text-emerald-400 font-mono">
                          $
                          {(
                            financialReport.loans?.total_repaid || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Active Loans</span>
                        <span className="text-slate-800 font-mono">
                          {financialReport.loans?.active_loans || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Percent className="w-5 h-5 text-amber-400" />
                      Exchanger Commission Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">
                          Total Commission Paid
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          $
                          {(
                            financialReport.vendor_commissions?.total_paid || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 bg-[#0F172A] rounded-lg">
                        <p className="text-xs text-[#94A3B8] mb-2">
                          This represents the total vendor commission deducted
                          from settlements.
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          Formula: Net Settlement = Deposits - Withdrawals -
                          Commission
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Income & Expenses Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-500" />
                    All Income & Expenses (Detailed)
                  </CardTitle>
                  <ExportDropdown
                    data={allIncomeExpenses}
                    filename="income_expenses_detailed"
                    title="Income & Expenses Report"
                    columns={[
                      { key: "entry_type", label: "Type" },
                      { key: "category", label: "Category" },
                      { key: "amount", label: "Amount" },
                      { key: "currency", label: "Currency" },
                      { key: "amount_usd", label: "Amount (USD)" },
                      { key: "treasury_account_name", label: "Account" },
                      { key: "description", label: "Description" },
                      { key: "date", label: "Date" },
                      { key: "status", label: "Status" },
                    ]}
                    summaryData={[
                      {
                        label: "Total Income",
                        value: `$${(financialReport.income?.total || 0).toLocaleString()}`,
                      },
                      {
                        label: "Total Expenses",
                        value: `$${(financialReport.expenses?.total || 0).toLocaleString()}`,
                      },
                      {
                        label: "Net P&L",
                        value: `$${(financialReport.net_profit_loss || 0).toLocaleString()}`,
                      },
                    ]}
                  />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-500 text-xs">
                            Type
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Category
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs text-right">
                            Amount
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Account
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Description
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Date
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allIncomeExpenses.map((entry, i) => (
                          <TableRow
                            key={entry.entry_id || i}
                            className="border-slate-200"
                          >
                            <TableCell>
                              <Badge
                                className={
                                  entry.entry_type === "income"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }
                              >
                                {entry.entry_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 capitalize">
                              {entry.category?.replace(/_/g, " ") ||
                                entry.ie_category_name ||
                                "-"}
                            </TableCell>
                            <TableCell
                              className={`font-mono text-right ${entry.entry_type === "income" ? "text-green-500" : "text-red-500"}`}
                            >
                              {entry.entry_type === "income" ? "+" : "-"}$
                              {entry.amount_usd?.toLocaleString() ||
                                entry.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {entry.treasury_account_name || "-"}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs max-w-[200px] truncate">
                              {entry.description || "-"}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {entry.date?.split("T")[0]}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  entry.status === "completed"
                                    ? "text-green-600 border-green-600"
                                    : entry.status === "pending"
                                      ? "text-yellow-600 border-yellow-600"
                                      : "text-slate-600 border-slate-600"
                                }
                              >
                                {entry.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        {allIncomeExpenses.length > 0 && (
                          <TableRow className="border-t-2 border-purple-500 bg-purple-500/10 font-bold">
                            <TableCell className="text-purple-600" colSpan={2}>
                              TOTALS
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-green-500">
                                +$
                                {allIncomeExpenses
                                  .filter((e) => e.entry_type === "income")
                                  .reduce(
                                    (sum, e) =>
                                      sum + (e.amount_usd || e.amount || 0),
                                    0,
                                  )
                                  .toLocaleString()}
                              </div>
                              <div className="text-red-500">
                                -$
                                {allIncomeExpenses
                                  .filter((e) => e.entry_type === "expense")
                                  .reduce(
                                    (sum, e) =>
                                      sum + (e.amount_usd || e.amount || 0),
                                    0,
                                  )
                                  .toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-purple-600 font-bold">
                              Net: $
                              {(
                                allIncomeExpenses
                                  .filter((e) => e.entry_type === "income")
                                  .reduce(
                                    (sum, e) =>
                                      sum + (e.amount_usd || e.amount || 0),
                                    0,
                                  ) -
                                allIncomeExpenses
                                  .filter((e) => e.entry_type === "expense")
                                  .reduce(
                                    (sum, e) =>
                                      sum + (e.amount_usd || e.amount || 0),
                                    0,
                                  )
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell
                              colSpan={3}
                              className="text-purple-600 text-right"
                            >
                              {allIncomeExpenses.length} entries
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="outstanding" className="space-y-4">
          {outstandingReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Receivables"
                  value={`$${(outstandingReport.receivables?.outstanding || 0).toLocaleString()}`}
                  subtitle={`${outstandingReport.receivables?.count || 0} records`}
                  icon={ArrowDownRight}
                  color="green"
                />
                <StatCard
                  title="Total Payables"
                  value={`$${(outstandingReport.payables?.outstanding || 0).toLocaleString()}`}
                  subtitle={`${outstandingReport.payables?.count || 0} records`}
                  icon={ArrowUpRight}
                  color="red"
                />
                <StatCard
                  title="Net Position"
                  value={`$${Math.abs(outstandingReport.net_position || 0).toLocaleString()}`}
                  subtitle={
                    outstandingReport.net_position >= 0
                      ? "Net Receivable"
                      : "Net Payable"
                  }
                  icon={DollarSign}
                  color={outstandingReport.net_position >= 0 ? "green" : "red"}
                />
                <StatCard
                  title="Total Overdue"
                  value={`$${((outstandingReport.receivables?.overdue_amount || 0) + (outstandingReport.payables?.overdue_amount || 0)).toLocaleString()}`}
                  subtitle={`${(outstandingReport.receivables?.overdue_count || 0) + (outstandingReport.payables?.overdue_count || 0)} overdue items`}
                  icon={AlertTriangle}
                  color="yellow"
                />
              </div>

              {/* Aging Summary */}
              {outstandingReport.aging && (
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Aging Summary (Outstanding Amounts)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="p-4 bg-[#0F172A] rounded-lg text-center">
                        <p className="text-xs text-[#94A3B8] mb-2">Current</p>
                        <p className="text-2xl font-mono text-emerald-400 font-bold">
                          $
                          {(
                            outstandingReport.aging.current || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-[#0F172A] rounded-lg text-center">
                        <p className="text-xs text-[#94A3B8] mb-2">1-30 Days</p>
                        <p className="text-2xl font-mono text-amber-400 font-bold">
                          $
                          {(
                            outstandingReport.aging.days_1_30 || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-[#0F172A] rounded-lg text-center">
                        <p className="text-xs text-[#94A3B8] mb-2">
                          31-60 Days
                        </p>
                        <p className="text-2xl font-mono text-orange-400 font-bold">
                          $
                          {(
                            outstandingReport.aging.days_31_60 || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-[#0F172A] rounded-lg text-center">
                        <p className="text-xs text-[#94A3B8] mb-2">
                          61-90 Days
                        </p>
                        <p className="text-2xl font-mono text-red-400 font-bold">
                          $
                          {(
                            outstandingReport.aging.days_61_90 || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-[#0F172A] rounded-lg text-center">
                        <p className="text-xs text-[#94A3B8] mb-2">90+ Days</p>
                        <p className="text-2xl font-mono text-red-500 font-bold">
                          $
                          {(
                            outstandingReport.aging.days_over_90 || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Receivables & Payables Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Receivables Details */}
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                      Receivables (Debtors)
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#94A3B8] hover:text-slate-800"
                      onClick={() =>
                        downloadCSV(
                          debtsData
                            .filter((d) => d.debt_type === "receivable")
                            .map((d) => ({
                              party_name: d.party_name,
                              party_type: d.party_type,
                              amount: d.amount,
                              currency: d.currency,
                              total_paid: d.total_paid || 0,
                              outstanding:
                                d.outstanding_balance ||
                                d.amount - (d.total_paid || 0),
                              due_date: d.due_date?.split("T")[0],
                              status: d.calculated_status || d.status,
                            })),
                          "receivables_report",
                          [
                            { key: "party_name", label: "Party" },
                            { key: "party_type", label: "Type" },
                            { key: "amount", label: "Amount" },
                            { key: "currency", label: "Currency" },
                            { key: "total_paid", label: "Paid" },
                            { key: "outstanding", label: "Outstanding" },
                            { key: "due_date", label: "Due Date" },
                            { key: "status", label: "Status" },
                          ],
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Amount</span>
                        <span className="text-slate-800 font-mono">
                          $
                          {(
                            outstandingReport.receivables?.total_amount || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Collected</span>
                        <span className="text-emerald-400 font-mono">
                          $
                          {(
                            outstandingReport.receivables?.total_paid || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Outstanding</span>
                        <span className="text-slate-800 font-mono font-bold">
                          $
                          {(
                            outstandingReport.receivables?.outstanding || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg">
                        <span className="text-amber-400">Overdue</span>
                        <span className="text-amber-400 font-mono">
                          $
                          {(
                            outstandingReport.receivables?.overdue_amount || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                        <span className="text-purple-400">
                          Accrued Interest
                        </span>
                        <span className="text-purple-400 font-mono">
                          $
                          {(
                            outstandingReport.receivables?.accrued_interest || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-[#94A3B8] text-xs">
                              Party
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Outstanding
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debtsData
                            .filter((d) => d.debt_type === "receivable")
                            .slice(0, 10)
                            .map((debt, i) => (
                              <TableRow key={i} className="border-slate-200">
                                <TableCell className="text-slate-800 text-sm">
                                  {debt.party_name}
                                </TableCell>
                                <TableCell className="text-emerald-400 font-mono text-right text-sm">
                                  $
                                  {(
                                    debt.outstanding_balance ||
                                    debt.amount - (debt.total_paid || 0)
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      debt.calculated_status === "overdue"
                                        ? "bg-red-500/20 text-red-400"
                                        : debt.calculated_status ===
                                            "fully_paid"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : debt.calculated_status ===
                                              "partially_paid"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {debt.calculated_status?.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          {debtsData.filter((d) => d.debt_type === "receivable")
                            .length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-[#94A3B8]"
                              >
                                No receivables
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Payables Details */}
                <Card className="bg-foreground/10 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                      Payables (Creditors)
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#94A3B8] hover:text-slate-800"
                      onClick={() =>
                        downloadCSV(
                          debtsData
                            .filter((d) => d.debt_type === "payable")
                            .map((d) => ({
                              party_name: d.party_name,
                              party_type: d.party_type,
                              amount: d.amount,
                              currency: d.currency,
                              total_paid: d.total_paid || 0,
                              outstanding:
                                d.outstanding_balance ||
                                d.amount - (d.total_paid || 0),
                              due_date: d.due_date?.split("T")[0],
                              status: d.calculated_status || d.status,
                            })),
                          "payables_report",
                          [
                            { key: "party_name", label: "Party" },
                            { key: "party_type", label: "Type" },
                            { key: "amount", label: "Amount" },
                            { key: "currency", label: "Currency" },
                            { key: "total_paid", label: "Paid" },
                            { key: "outstanding", label: "Outstanding" },
                            { key: "due_date", label: "Due Date" },
                            { key: "status", label: "Status" },
                          ],
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Amount</span>
                        <span className="text-slate-800 font-mono">
                          $
                          {(
                            outstandingReport.payables?.total_amount || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Total Paid</span>
                        <span className="text-emerald-400 font-mono">
                          $
                          {(
                            outstandingReport.payables?.total_paid || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg">
                        <span className="text-[#94A3B8]">Outstanding</span>
                        <span className="text-slate-800 font-mono font-bold">
                          $
                          {(
                            outstandingReport.payables?.outstanding || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg">
                        <span className="text-amber-400">Overdue</span>
                        <span className="text-amber-400 font-mono">
                          $
                          {(
                            outstandingReport.payables?.overdue_amount || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                        <span className="text-purple-400">
                          Accrued Interest
                        </span>
                        <span className="text-purple-400 font-mono">
                          $
                          {(
                            outstandingReport.payables?.accrued_interest || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-[#94A3B8] text-xs">
                              Party
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs text-right">
                              Outstanding
                            </TableHead>
                            <TableHead className="text-[#94A3B8] text-xs">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debtsData
                            .filter((d) => d.debt_type === "payable")
                            .slice(0, 10)
                            .map((debt, i) => (
                              <TableRow key={i} className="border-slate-200">
                                <TableCell className="text-slate-800 text-sm">
                                  {debt.party_name}
                                </TableCell>
                                <TableCell className="text-red-400 font-mono text-right text-sm">
                                  $
                                  {(
                                    debt.outstanding_balance ||
                                    debt.amount - (debt.total_paid || 0)
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      debt.calculated_status === "overdue"
                                        ? "bg-red-500/20 text-red-400"
                                        : debt.calculated_status ===
                                            "fully_paid"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : debt.calculated_status ===
                                              "partially_paid"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {debt.calculated_status?.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          {debtsData.filter((d) => d.debt_type === "payable")
                            .length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-[#94A3B8]"
                              >
                                No payables
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ========== LOANS REPORT ========== */}
        <TabsContent value="loans" className="space-y-4">
          {loansReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Total Disbursed
                        </p>
                        <p className="text-2xl font-bold text-slate-800">
                          ${loansReport.total_disbursed_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {loansReport.total_loans} total loans
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Outstanding
                        </p>
                        <p className="text-2xl font-bold text-red-500">
                          ${loansReport.total_outstanding_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {loansReport.status_breakdown?.active || 0} active loans
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Total Repaid
                        </p>
                        <p className="text-2xl font-bold text-green-500">
                          ${loansReport.total_repaid_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {loansReport.status_breakdown?.fully_paid || 0} fully paid
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Overdue
                        </p>
                        <p className="text-2xl font-bold text-orange-500">
                          {loansReport.status_breakdown?.overdue || 0}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Need attention
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Loans by Borrower */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      Loans by Borrower
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-slate-500">
                              Borrower
                            </TableHead>
                            <TableHead className="text-slate-500 text-right">
                              Disbursed
                            </TableHead>
                            <TableHead className="text-slate-500 text-right">
                              Outstanding
                            </TableHead>
                            <TableHead className="text-slate-500 text-right">
                              Count
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loansReport.by_borrower &&
                            Object.entries(loansReport.by_borrower).map(
                              ([borrower, data]) => (
                                <TableRow
                                  key={borrower}
                                  className="border-slate-200"
                                >
                                  <TableCell className="font-medium text-slate-800">
                                    {borrower}
                                  </TableCell>
                                  <TableCell className="text-right text-slate-600">
                                    ${data.disbursed?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right text-red-500">
                                    ${data.outstanding?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right text-slate-500">
                                    {data.count}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Loan Status Pie Chart */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-500" />
                      Loan Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            {
                              name: "Active",
                              value: loansReport.status_breakdown?.active || 0,
                            },
                            {
                              name: "Partially Paid",
                              value:
                                loansReport.status_breakdown?.partially_paid ||
                                0,
                            },
                            {
                              name: "Fully Paid",
                              value:
                                loansReport.status_breakdown?.fully_paid || 0,
                            },
                            {
                              name: "Overdue",
                              value: loansReport.status_breakdown?.overdue || 0,
                            },
                          ].filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            {
                              name: "Active",
                              value: loansReport.status_breakdown?.active || 0,
                            },
                            {
                              name: "Partially Paid",
                              value:
                                loansReport.status_breakdown?.partially_paid ||
                                0,
                            },
                            {
                              name: "Fully Paid",
                              value:
                                loansReport.status_breakdown?.fully_paid || 0,
                            },
                            {
                              name: "Overdue",
                              value: loansReport.status_breakdown?.overdue || 0,
                            },
                          ]
                            .filter((d) => d.value > 0)
                            .map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* All Loans Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-500" />
                      All Loans
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadCSV(loansData, "loans_report", [
                          { key: "loan_id", label: "Loan ID" },
                          { key: "borrower_name", label: "Borrower" },
                          { key: "amount", label: "Amount" },
                          { key: "currency", label: "Currency" },
                          { key: "interest_rate", label: "Interest Rate" },
                          { key: "total_repaid", label: "Repaid" },
                          { key: "status", label: "Status" },
                          { key: "loan_date", label: "Loan Date" },
                          { key: "due_date", label: "Due Date" },
                        ])
                      }
                      className="border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-500">
                            Loan ID
                          </TableHead>
                          <TableHead className="text-slate-500">
                            Borrower
                          </TableHead>
                          <TableHead className="text-slate-500 text-right">
                            Amount
                          </TableHead>
                          <TableHead className="text-slate-500 text-right">
                            Interest
                          </TableHead>
                          <TableHead className="text-slate-500 text-right">
                            Repaid
                          </TableHead>
                          <TableHead className="text-slate-500 text-right">
                            Outstanding
                          </TableHead>
                          <TableHead className="text-slate-500">
                            Status
                          </TableHead>
                          <TableHead className="text-slate-500">
                            Due Date
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loansData.map((loan) => {
                          const totalDue =
                            loan.amount + (loan.total_interest || 0);
                          const outstanding =
                            totalDue - (loan.total_repaid || 0);
                          return (
                            <TableRow
                              key={loan.loan_id}
                              className="border-slate-200"
                            >
                              <TableCell className="font-mono text-xs text-slate-600">
                                {loan.loan_id?.slice(0, 12)}
                              </TableCell>
                              <TableCell className="font-medium text-slate-800">
                                {loan.borrower_name}
                              </TableCell>
                              <TableCell className="text-right text-slate-600">
                                {loan.amount?.toLocaleString()} {loan.currency}
                              </TableCell>
                              <TableCell className="text-right text-slate-500">
                                {loan.interest_rate}%
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {loan.total_repaid?.toLocaleString() || 0}{" "}
                                {loan.currency}
                              </TableCell>
                              <TableCell className="text-right text-red-500">
                                {Math.max(0, outstanding)?.toLocaleString()}{" "}
                                {loan.currency}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    loan.status === "active"
                                      ? "bg-blue-500"
                                      : loan.status === "fully_paid"
                                        ? "bg-green-500"
                                        : loan.status === "partially_paid"
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                  }
                                >
                                  {loan.status?.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {loan.due_date?.split("T")[0] || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== DEALING P&L REPORT ========== */}
        <TabsContent value="dealing" className="space-y-4">
          {dealingPnLSummary && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Dealing P&L (30d)"
                  value={`${dealingPnLSummary.total_dealing_pnl >= 0 ? "+" : ""}$${dealingPnLSummary.total_dealing_pnl?.toLocaleString()}`}
                  icon={Calculator}
                  color={
                    dealingPnLSummary.total_dealing_pnl >= 0 ? "green" : "red"
                  }
                />
                <StatCard
                  title="Profitable Days"
                  value={dealingPnLSummary.profitable_days}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Loss Days"
                  value={dealingPnLSummary.loss_days}
                  icon={TrendingDown}
                  color="red"
                />
                <StatCard
                  title="Total Records"
                  value={dealingPnLSummary.record_count}
                  icon={BarChart3}
                  color="blue"
                />
              </div>

              {/* Best/Worst Days */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealingPnLSummary.best_day && (
                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Best Day
                          </p>
                          <p className="text-2xl font-bold font-mono text-green-500">
                            +${dealingPnLSummary.best_day.pnl?.toLocaleString()}{" "}
                            USD
                          </p>
                          <p className="text-sm text-slate-400">
                            {dealingPnLSummary.best_day.date}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {dealingPnLSummary.worst_day && (
                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Worst Day
                          </p>
                          <p className="text-2xl font-bold font-mono text-red-500">
                            ${dealingPnLSummary.worst_day.pnl?.toLocaleString()}{" "}
                            USD
                          </p>
                          <p className="text-sm text-slate-400">
                            {dealingPnLSummary.worst_day.date}
                          </p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    exportToExcel(
                      dealingPnLReport.map((r) => ({
                        Date: r.date,
                        "MT5 Booked": r.mt5_booked_pnl,
                        "MT5 Floating": r.mt5_floating_pnl,
                        "MT5 Floating Change": r.mt5_floating_change,
                        "Broker MT5 P&L": r.broker_mt5_pnl,
                        "LP Booked Total": r.total_lp_booked,
                        "LP Floating Total": r.total_lp_floating,
                        "Broker LP P&L": r.broker_lp_pnl,
                        "Total Dealing P&L": r.total_dealing_pnl,
                      })),
                      "dealing_pnl_report",
                      [
                        "Date",
                        "MT5 Booked",
                        "MT5 Floating",
                        "MT5 Floating Change",
                        "Broker MT5 P&L",
                        "LP Booked Total",
                        "LP Floating Total",
                        "Broker LP P&L",
                        "Total Dealing P&L",
                      ],
                    )
                  }
                  className="bg-green-500 text-white hover:bg-green-600"
                  data-testid="export-dealing-pnl-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>

              {/* Dealing P&L Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2 border-b border-slate-200">
                  <CardTitle className="text-lg font-bold text-slate-800">
                    Dealing P&L Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-500 font-bold text-xs uppercase">
                            Date
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            MT5 Booked
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            MT5 Floating
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            MT5 P&L
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            LP Booked
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            LP Floating
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            LP P&L
                          </TableHead>
                          <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">
                            Total P&L
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dealingPnLReport.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-slate-500"
                            >
                              No dealing P&L records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          dealingPnLReport.map((record) => (
                            <TableRow
                              key={record.date}
                              className="border-slate-200 hover:bg-slate-50"
                            >
                              <TableCell className="font-medium text-slate-800">
                                {record.date}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono ${record.mt5_booked_pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {record.mt5_booked_pnl >= 0 ? "+" : ""}
                                {record.mt5_booked_pnl?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono ${record.mt5_floating_pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {record.mt5_floating_pnl?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono font-bold ${record.broker_mt5_pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {record.broker_mt5_pnl >= 0 ? "+" : ""}
                                {record.broker_mt5_pnl?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono ${(record.total_lp_booked || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {(record.total_lp_booked || 0) >= 0 ? "+" : ""}
                                {(
                                  record.total_lp_booked || 0
                                )?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono ${(record.total_lp_floating || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {(
                                  record.total_lp_floating || 0
                                )?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono font-bold ${record.broker_lp_pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {record.broker_lp_pnl >= 0 ? "+" : ""}
                                {record.broker_lp_pnl?.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono font-bold text-lg ${record.total_dealing_pnl >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}
                              >
                                {record.total_dealing_pnl >= 0 ? "+" : ""}
                                {record.total_dealing_pnl?.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
