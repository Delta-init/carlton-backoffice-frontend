import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Banknote,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Receipt,
  Download,
  FileText,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusBadge = (loan) => {
  const isOverdue =
    loan.is_overdue ||
    (loan.status === "active" &&
      loan.due_date &&
      new Date(loan.due_date) < new Date());

  if (isOverdue)
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        Overdue
      </Badge>
    );

  switch (loan.status) {
    case "pending_approval":
      return (
        <Badge className="bg-amber-500/20 text-amber-400">
          Pending Approval
        </Badge>
      );
    case "rejected":
      return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400">Active</Badge>;
    case "partially_paid":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
          Partially Paid
        </Badge>
      );
    case "fully_paid":
      return (
        <Badge className="bg-green-500/20 text-green-400">Fully Paid</Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500/20 text-gray-400">{loan.status}</Badge>
      );
  }
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "fully_paid", label: "Fully Paid" },
  { value: "rejected", label: "Rejected" },
];

export default function BorrowerDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  // Vendor info
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  // Summary stats (fetched once with all loans, no filters)
  const [summaryStats, setSummaryStats] = useState(null);

  // Paginated loans state
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [totalLoans, setTotalLoans] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Loan detail modal
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Filters / pagination controls
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load vendor info once
  useEffect(() => {
    const loadVendor = async () => {
      setVendorLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (res.ok) setVendor(await res.json());
      } catch {
        toast.error("Failed to load borrower info");
      } finally {
        setVendorLoading(false);
      }
    };
    loadVendor();
  }, [vendorId]);

  // Load summary stats (fetch all pages up to 200 per page)
  useEffect(() => {
    const loadSummary = async () => {
      try {
        // First page to get total count
        const res = await fetch(
          `${API_URL}/api/loans?vendor_id=${vendorId}&page_size=200&page=1`,
          { headers: getAuthHeaders(), credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        let allLoans = Array.isArray(data) ? data : data.items || [];
        const totalCount = data.total ?? allLoans.length;
        const totalPages = data.total_pages ?? 1;

        // Fetch remaining pages if needed
        if (totalPages > 1) {
          const extraFetches = [];
          for (let p = 2; p <= totalPages; p++) {
            extraFetches.push(
              fetch(`${API_URL}/api/loans?vendor_id=${vendorId}&page_size=200&page=${p}`, {
                headers: getAuthHeaders(), credentials: "include"
              }).then(r => r.ok ? r.json() : null)
            );
          }
          const extras = await Promise.all(extraFetches);
          extras.forEach(d => { if (d) allLoans = allLoans.concat(Array.isArray(d) ? d : d.items || []); });
        }

        // Build per-currency breakdown
        const byCurrency = {};
        allLoans.forEach(l => {
          const cur = l.currency || "USD";
          if (!byCurrency[cur]) byCurrency[cur] = { disbursed: 0, outstanding: 0, repaid: 0 };
          byCurrency[cur].disbursed += l.amount || 0;
          byCurrency[cur].outstanding += Math.max(0, (l.amount || 0) + (l.total_interest || 0) - (l.total_repaid || 0));
          byCurrency[cur].repaid += l.total_repaid || 0;
        });

        setSummaryStats({
          total: totalCount,
          totalDisbursed: allLoans.reduce((s, l) => s + (l.amount_usd || l.amount || 0), 0),
          outstanding: allLoans.reduce((s, l) => s + (l.outstanding_balance_usd || l.outstanding_balance || 0), 0),
          totalRepaid: allLoans.reduce((s, l) => s + (l.total_repaid_usd || l.total_repaid || 0), 0),
          byCurrency,
          active: allLoans.filter((l) => l.status === "active").length,
          overdue: allLoans.filter((l) => l.is_overdue || (l.status === "active" && l.due_date && new Date(l.due_date) < new Date())).length,
          fullyPaid: allLoans.filter((l) => l.status === "fully_paid").length,
          pending: allLoans.filter((l) => l.status === "pending_approval").length,
        });
      } catch {
        // non-critical
      }
    };
    loadSummary();
  }, [vendorId]);

  // Load paginated loans whenever filters/page change
  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const params = new URLSearchParams({
        vendor_id: vendorId,
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`${API_URL}/api/loans?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setLoans(items);
        setTotalLoans(data.total ?? items.length);
        setTotalPages(data.total_pages ?? 1);
      }
    } catch {
      toast.error("Failed to load loans");
    } finally {
      setLoansLoading(false);
    }
  }, [vendorId, page, pageSize, statusFilter, searchQuery]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_URL}/api/loans/export/${type}?vendor_id=${vendorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${vendor?.vendor_name || vendorId}_loans_${
          new Date().toISOString().split("T")[0]
        }.${type === "excel" ? "xlsx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported to ${type.toUpperCase()}`);
      } else {
        toast.error("Export failed");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const stats = summaryStats || {
    total: 0,
    totalDisbursed: 0,
    outstanding: 0,
    totalRepaid: 0,
    active: 0,
    overdue: 0,
    fullyPaid: 0,
    pending: 0,
  };

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#1FA21B", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">Borrower not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/loans?tab=borrowers")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Loans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/loans", { state: { tab: "borrowers" } })}
            className="border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1FA21B]" />
              <h1
                className="text-3xl font-bold uppercase tracking-tight text-slate-800"
                style={{ fontFamily: "Barlow Condensed" }}
              >
                {vendor.vendor_name}
              </h1>
              <Badge
                className={
                  vendor.status === "active"
                    ? "bg-green-500/20 text-green-600"
                    : "bg-red-500/20 text-red-400"
                }
              >
                {vendor.status}
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{vendor.email}</p>
            {vendor.description && (
              <p className="text-slate-500 text-xs mt-1 max-w-xl">
                {vendor.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("excel")}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Loans",
            value: stats.total,
            icon: <Receipt className="w-5 h-5 text-slate-500" />,
          },
          {
            label: "Total Disbursed",
            value: `$${stats.totalDisbursed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <Banknote className="w-5 h-5 text-blue-500" />,
            mono: true,
            currencies: stats.byCurrency ? Object.entries(stats.byCurrency).map(([cur, v]) => ({ cur, amount: v.disbursed })) : [],
          },
          {
            label: "Outstanding",
            value: `$${stats.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <PiggyBank className="w-5 h-5 text-[#1FA21B]" />,
            mono: true,
            highlight: true,
            currencies: stats.byCurrency ? Object.entries(stats.byCurrency).map(([cur, v]) => ({ cur, amount: v.outstanding })) : [],
          },
          {
            label: "Total Repaid",
            value: `$${stats.totalRepaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
            mono: true,
            currencies: stats.byCurrency ? Object.entries(stats.byCurrency).map(([cur, v]) => ({ cur, amount: v.repaid })) : [],
          },
          {
            label: "Active",
            value: stats.active,
            icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
          },
          {
            label: "Overdue",
            value: stats.overdue,
            icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
            danger: stats.overdue > 0,
          },
          {
            label: "Fully Paid",
            value: stats.fullyPaid,
            icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
          },
          {
            label: "Pending Approval",
            value: stats.pending,
            icon: <Clock className="w-5 h-5 text-amber-400" />,
          },
        ].map((item, i) => (
          <Card key={i} className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {item.icon}
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <div
                className={`text-2xl font-bold ${
                  item.highlight
                    ? "text-[#1FA21B]"
                    : item.danger
                    ? "text-red-500"
                    : "text-slate-800"
                } ${item.mono ? "font-mono" : ""}`}
              >
                {item.value}
              </div>
              {item.currencies && item.currencies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.currencies.map(({ cur, amount }) => (
                    <span key={cur} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-mono">
                      {cur} {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loans Table */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-slate-800 text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#1FA21B]" /> Loan Transactions
              <Badge className="bg-slate-100 text-slate-500 ml-1">
                {totalLoans}
              </Badge>
            </CardTitle>
          </div>

          {/* Search + Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by borrower name or loan ID…"
                className="pl-9 pr-9 border-slate-200 focus:border-[#1FA21B] bg-white text-slate-700 placeholder:text-slate-400 text-sm h-9"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 border-slate-200 text-slate-700 bg-white text-sm h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Page size */}
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-28 border-slate-200 text-slate-700 bg-white text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {s} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">
                    Loan ID
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs">
                    Borrower
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs">Type</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">
                    Outstanding
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">
                    Repaid
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">
                    Interest
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs">
                    Loan Date
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs">
                    Due Date
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">
                    View
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <div
                          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{
                            borderColor: "#1FA21B",
                            borderTopColor: "transparent",
                          }}
                        />
                        <span className="text-sm">Loading loans…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : loans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-slate-400 py-12 text-sm"
                    >
                      {searchQuery || statusFilter !== "all"
                        ? "No loans match your filters."
                        : "No loans found for this borrower company."}
                    </TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow
                      key={loan.loan_id}
                      className="border-slate-100 hover:bg-slate-50"
                    >
                      <TableCell className="text-[10px] text-slate-400 font-mono">
                        {loan.loan_id?.slice(-8)}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {loan.borrower_name}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-500 text-[10px]">
                          {loan.loan_type?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-mono text-right">
                        {loan.currency} {loan.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[#1FA21B] text-sm font-mono text-right font-semibold">
                        {(() => {
                          const outstanding = Math.max(
                            0,
                            (loan.amount || 0) +
                              (loan.total_interest || 0) -
                              (loan.total_repaid || 0)
                          );
                          return (
                            <div>
                              <div>
                                {loan.currency}{" "}
                                {outstanding.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              {loan.currency !== "USD" && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  $
                                  {(
                                    loan.outstanding_balance_usd || 0
                                  ).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  USD
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-green-600 text-sm font-mono text-right">
                        {(() => {
                          const repaid = loan.total_repaid || 0;
                          const repaidUsd = loan.total_repaid_usd || repaid;
                          return (
                            <div>
                              <div>{loan.currency} {repaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                              {loan.currency !== "USD" && (
                                <div className="text-[10px] text-slate-400 font-normal">${repaidUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm text-right">
                        {loan.interest_rate}%
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDate(loan.loan_date)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDate(loan.due_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(loan)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 hover:text-[#1FA21B]"
                          onClick={() => setSelectedLoan(loan)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Showing{" "}
                <span className="font-medium text-slate-600">
                  {(page - 1) * pageSize + 1}
                </span>{" "}
                –{" "}
                <span className="font-medium text-slate-600">
                  {Math.min(page * pageSize, totalLoans)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-600">{totalLoans}</span>{" "}
                loans
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 border-slate-200 text-slate-500"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 border-slate-200 text-slate-500"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      (p >= page - 1 && p <= page + 1)
                  )
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="text-slate-400 text-xs px-1"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant={page === item ? "default" : "outline"}
                        size="icon"
                        className={`w-7 h-7 text-xs border-slate-200 ${
                          page === item ? "text-white" : "text-slate-500"
                        }`}
                        style={
                          page === item
                            ? { backgroundColor: "#1FA21B", borderColor: "#1FA21B" }
                            : {}
                        }
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </Button>
                    )
                  )}

                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 border-slate-200 text-slate-500"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 border-slate-200 text-slate-500"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Detail Modal */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="bg-white border-slate-200 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-lg font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1FA21B]" />
              Loan Details
              <span className="text-xs font-mono text-slate-400 ml-1">#{selectedLoan?.loan_id?.slice(0, 8)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLoan && (() => {
            const outstanding = Math.max(0, (selectedLoan.amount || 0) + (selectedLoan.total_interest || 0) - (selectedLoan.total_repaid || 0));
            const rows = [
              { label: "Borrower", value: selectedLoan.borrower_name },
              { label: "Loan Type", value: selectedLoan.loan_type?.replace(/_/g, " ") },
              { label: "Status", value: getStatusBadge(selectedLoan), isNode: true },
              { label: "Source Treasury", value: selectedLoan.source_treasury_name || "—" },
              { label: "Amount", value: `${selectedLoan.currency} ${(selectedLoan.amount || 0).toLocaleString()}` },
              { label: "Interest Rate", value: `${selectedLoan.interest_rate || 0}%` },
              { label: "Total Interest", value: `${selectedLoan.currency} ${(selectedLoan.total_interest || 0).toLocaleString()}` },
              { label: "Outstanding", value: `${selectedLoan.currency} ${outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
              { label: "Total Repaid", value: `${selectedLoan.currency} ${(selectedLoan.total_repaid || 0).toLocaleString()}` },
              { label: "Loan Date", value: formatDate(selectedLoan.loan_date) },
              { label: "Due Date", value: formatDate(selectedLoan.due_date) },
              { label: "Repayment Count", value: selectedLoan.repayment_count || 0 },
              { label: "Description", value: selectedLoan.description || "—" },
            ];
            return (
              <div className="space-y-1 mt-2">
                {rows.map(({ label, value, isNode }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
                    {isNode ? value : (
                      <span className="text-sm font-medium text-slate-800 text-right capitalize">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
