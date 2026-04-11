import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>;

  switch (loan.status) {
    case "pending_approval":
      return <Badge className="bg-amber-500/20 text-amber-400">Pending Approval</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400">Active</Badge>;
    case "partially_paid":
      return <Badge className="bg-yellow-500/20 text-yellow-400">Partially Paid</Badge>;
    case "fully_paid":
      return <Badge className="bg-green-500/20 text-green-400">Fully Paid</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-400">{loan.status}</Badge>;
  }
};

export default function BorrowerDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vendorRes, loansRes] = await Promise.all([
          fetch(`${API_URL}/api/vendors/${vendorId}`, { headers: getAuthHeaders(), credentials: "include" }),
          fetch(`${API_URL}/api/loans?vendor_id=${vendorId}&page_size=200`, { headers: getAuthHeaders(), credentials: "include" }),
        ]);

        if (vendorRes.ok) setVendor(await vendorRes.json());
        if (loansRes.ok) {
          const data = await loansRes.json();
          setLoans(Array.isArray(data) ? data : data.items || []);
        }
      } catch {
        toast.error("Failed to load borrower details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vendorId]);

  const stats = {
    total: loans.length,
    totalDisbursed: loans.reduce((s, l) => s + (l.amount_usd || l.amount || 0), 0),
    outstanding: loans.reduce((s, l) => s + (l.outstanding_balance || 0), 0),
    totalRepaid: loans.reduce((s, l) => s + (l.total_repaid || 0), 0),
    active: loans.filter((l) => l.status === "active").length,
    overdue: loans.filter((l) => l.is_overdue || (l.status === "active" && l.due_date && new Date(l.due_date) < new Date())).length,
    fullyPaid: loans.filter((l) => l.status === "fully_paid").length,
    pending: loans.filter((l) => l.status === "pending_approval").length,
  };

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/api/loans/export/${type}?vendor_id=${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${vendor?.vendor_name || vendorId}_loans_${new Date().toISOString().split("T")[0]}.${type === "excel" ? "xlsx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported to ${type.toUpperCase()}`);
      } else {
        toast.error(`Export failed`);
      }
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#1FA21B", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">Borrower not found</p>
        <Button variant="outline" onClick={() => navigate("/loans?tab=borrowers")}>
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
              <p className="text-slate-500 text-xs mt-1 max-w-xl">{vendor.description}</p>
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
          { label: "Total Loans", value: stats.total, icon: <Receipt className="w-5 h-5 text-slate-500" /> },
          {
            label: "Total Disbursed",
            value: `$${stats.totalDisbursed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <Banknote className="w-5 h-5 text-blue-500" />,
            mono: true,
          },
          {
            label: "Outstanding",
            value: `$${stats.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <PiggyBank className="w-5 h-5 text-[#1FA21B]" />,
            mono: true,
            highlight: true,
          },
          {
            label: "Total Repaid",
            value: `$${stats.totalRepaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
            mono: true,
          },
          { label: "Active", value: stats.active, icon: <TrendingUp className="w-5 h-5 text-blue-400" /> },
          {
            label: "Overdue",
            value: stats.overdue,
            icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
            danger: stats.overdue > 0,
          },
          { label: "Fully Paid", value: stats.fullyPaid, icon: <CheckCircle2 className="w-5 h-5 text-green-400" /> },
          { label: "Pending Approval", value: stats.pending, icon: <Clock className="w-5 h-5 text-amber-400" /> },
        ].map((item, i) => (
          <Card key={i} className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {item.icon}
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</span>
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loans Table */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800 text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#1FA21B]" /> Loan Transactions
            <Badge className="bg-slate-100 text-slate-500 ml-1">{loans.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Loan ID</TableHead>
                  <TableHead className="text-slate-400 text-xs">Borrower</TableHead>
                  <TableHead className="text-slate-400 text-xs">Type</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Amount</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Outstanding</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Repaid</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Interest</TableHead>
                  <TableHead className="text-slate-400 text-xs">Loan Date</TableHead>
                  <TableHead className="text-slate-400 text-xs">Due Date</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow
                    key={loan.loan_id}
                    className={`border-slate-100 hover:bg-slate-50 cursor-pointer ${
                      selectedLoan?.loan_id === loan.loan_id ? "bg-green-50" : ""
                    }`}
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
                        const outstanding = Math.max(0, (loan.amount || 0) + (loan.total_interest || 0) - (loan.total_repaid || 0));
                        return (
                          <div>
                            <div>{loan.currency} {outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            {loan.currency !== "USD" && (
                              <div className="text-[10px] text-slate-400 font-normal">${(loan.outstanding_balance_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-green-600 text-sm font-mono text-right">
                      ${(loan.total_repaid || 0).toLocaleString()}
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
                        onClick={() => navigate(`/loans/${loan.loan_id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-slate-400 py-12 text-sm">
                      No loans found for this borrower company.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
