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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
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
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { getApiError } from "../lib/utils";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Eye,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  Percent,
  Receipt,
  Download,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "USDT"];

export default function Debts() {
  const [activeTab, setActiveTab] = useState("receivables");
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [vendors, setExchangers] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [debtDetails, setDebtDetails] = useState(null);

  const [debtForm, setDebtForm] = useState({
    debt_type: "receivable",
    party_type: "other",
    party_id: "",
    party_name: "",
    amount: "",
    currency: "USD",
    due_date: "",
    interest_rate: "0",
    description: "",
    reference: "",
    treasury_account_id: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    currency: "USD",
    payment_date: new Date().toISOString().split("T")[0],
    treasury_account_id: "",
    reference: "",
    notes: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

   const fetchData = async () => {
    setLoading(true);
    try {
      const [debtsRes, summaryRes, clientsRes, vendorsRes, treasuryRes] = await Promise.all([
        fetch(`${API_URL}/api/debts`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/debts/summary/overview`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/clients?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/vendors?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
      ]);

      if (debtsRes.ok) setDebts(await debtsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (clientsRes.ok) { const d = await clientsRes.json(); setClients(d.items || d); }
      if (vendorsRes.ok) {
        const vendorData = await vendorsRes.json();
        setExchangers(vendorData.items || (Array.isArray(vendorData) ? vendorData : []));
      }
      if (treasuryRes.ok) { const d = await treasuryRes.json(); setTreasuryAccounts(d.items || d); }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtDetails = async (debtId) => {
    try {
      const response = await fetch(`${API_URL}/api/debts/${debtId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setDebtDetails(await response.json());
        setIsViewDialogOpen(true);
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/debts`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          ...debtForm,
          amount: parseFloat(debtForm.amount),
          interest_rate: parseFloat(debtForm.interest_rate || 0),
        }),
      });

      if (response.ok) {
        toast.success("Debt created successfully");
        setIsDebtDialogOpen(false);
        resetDebtForm();
        fetchData();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDebt) return;

    try {
      const response = await fetch(
        `${API_URL}/api/debts/${selectedDebt.debt_id}/payments`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            ...paymentForm,
            amount: parseFloat(paymentForm.amount),
          }),
        },
      );

      if (response.ok) {
        toast.success("Payment recorded successfully");
        setIsPaymentDialogOpen(false);
        resetPaymentForm();
        setSelectedDebt(null);
        fetchData();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const resetDebtForm = () => {
    setDebtForm({
      debt_type: activeTab === "receivables" ? "receivable" : "payable",
      party_type: "other",
      party_id: "",
      party_name: "",
      amount: "",
      currency: "USD",
      due_date: "",
      interest_rate: "0",
      description: "",
      reference: "",
      treasury_account_id: "",
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: "",
      currency: "USD",
      payment_date: new Date().toISOString().split("T")[0],
      treasury_account_id: "",
      reference: "",
      notes: "",
    });
  };

  const openPaymentDialog = (debt) => {
    setSelectedDebt(debt);
    setPaymentForm({
      ...paymentForm,
      currency: debt.currency,
      amount: (debt.outstanding_balance || 0).toString(),
    });
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      partially_paid: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      fully_paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      overdue: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return (
      <Badge
        variant="outline"
        className={`${styles[status] || styles.pending} text-xs uppercase`}
      >
        {status?.replace("_", " ")}
      </Badge>
    );
  };

  const filteredDebts = debts.filter((d) =>
    activeTab === "receivables"
      ? d.debt_type === "receivable"
      : d.debt_type === "payable",
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => (
    <Card className="bg-foreground/10 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
            {subtitle && (
              <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`p-2 rounded-xl ${
              color === "blue"
                ? "bg-blue-500/10"
                : color === "green"
                  ? "bg-emerald-500/10"
                  : color === "yellow"
                    ? "bg-amber-500/10"
                    : color === "red"
                      ? "bg-red-500/10"
                      : "bg-purple-500/10"
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
                        : "text-purple-400"
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
    <div className="space-y-6 animate-fade-in" data-testid="debts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-white"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Outstanding Accounts
          </h1>
          <p className="text-[#94A3B8]">
            Track receivables (debtors) and payables (creditors)
          </p>
        </div>
        <Dialog
          open={isDebtDialogOpen}
          onOpenChange={(open) => {
            setIsDebtDialogOpen(open);
            if (!open) resetDebtForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl"
              data-testid="add-debt-btn"
              onClick={() => {
                setDebtForm({
                  ...debtForm,
                  debt_type:
                    activeTab === "receivables" ? "receivable" : "payable",
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {activeTab === "receivables" ? "Receivable" : "Payable"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-foreground/10 border-slate-200 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle
                className="text-2xl font-bold uppercase tracking-tight"
                style={{ fontFamily: "Barlow Condensed" }}
              >
                {debtForm.debt_type === "receivable"
                  ? "Add Receivable (Debtor)"
                  : "Add Payable (Creditor)"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Party Type
                </Label>
                <Select
                  value={debtForm.party_type}
                  onValueChange={(value) =>
                    setDebtForm({
                      ...debtForm,
                      party_type: value,
                      party_id: "",
                      party_name: "",
                    })
                  }
                >
                  <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-foreground/10 border-slate-200">
                    <SelectItem
                      value="other"
                      className="text-white hover:bg-white/5"
                    >
                      Other Party
                    </SelectItem>
                    <SelectItem
                      value="client"
                      className="text-white hover:bg-white/5"
                    >
                      Client
                    </SelectItem>
                    <SelectItem
                      value="vendor"
                      className="text-white hover:bg-white/5"
                    >
                      Exchanger
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {debtForm.party_type === "client" && (
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Select Client
                  </Label>
                  <Select
                    value={debtForm.party_id}
                    onValueChange={(value) => {
                      const client = clients.find((c) => c.client_id === value);
                      setDebtForm({
                        ...debtForm,
                        party_id: value,
                        party_name: client
                          ? `${client.first_name} ${client.last_name}`
                          : "",
                      });
                    }}
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground/10 border-slate-200">
                      {clients.map((client) => (
                        <SelectItem
                          key={client.client_id}
                          value={client.client_id}
                          className="text-white hover:bg-white/5"
                        >
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {debtForm.party_type === "vendor" && (
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Select Exchanger
                  </Label>
                  <Select
                    value={debtForm.party_id}
                    onValueChange={(value) => {
                      const vendor = vendors.find((v) => v.vendor_id === value);
                      setDebtForm({
                        ...debtForm,
                        party_id: value,
                        party_name: vendor ? vendor.vendor_name : "",
                      });
                    }}
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground/10 border-slate-200">
                      {vendors.map((vendor) => (
                        <SelectItem
                          key={vendor.vendor_id}
                          value={vendor.vendor_id}
                          className="text-white hover:bg-white/5"
                        >
                          {vendor.vendor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {debtForm.party_type === "other" && (
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Party Name
                  </Label>
                  <Input
                    value={debtForm.party_name}
                    onChange={(e) =>
                      setDebtForm({ ...debtForm, party_name: e.target.value })
                    }
                    className="bg-[#0F172A] border-slate-200 text-white"
                    placeholder="Enter party name"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={debtForm.amount}
                    onChange={(e) =>
                      setDebtForm({ ...debtForm, amount: e.target.value })
                    }
                    className="bg-[#0F172A] border-slate-200 text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Currency
                  </Label>
                  <Select
                    value={debtForm.currency}
                    onValueChange={(value) =>
                      setDebtForm({ ...debtForm, currency: value })
                    }
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground/10 border-slate-200">
                      {CURRENCIES.map((curr) => (
                        <SelectItem
                          key={curr}
                          value={curr}
                          className="text-white hover:bg-white/5"
                        >
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={debtForm.due_date}
                    onChange={(e) =>
                      setDebtForm({ ...debtForm, due_date: e.target.value })
                    }
                    className="bg-[#0F172A] border-slate-200 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Interest Rate (%/year)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={debtForm.interest_rate}
                    onChange={(e) =>
                      setDebtForm({
                        ...debtForm,
                        interest_rate: e.target.value,
                      })
                    }
                    className="bg-[#0F172A] border-slate-200 text-white font-mono"
                    placeholder="e.g., 12 for 12%"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Reference
                </Label>
                <Input
                  value={debtForm.reference}
                  onChange={(e) =>
                    setDebtForm({ ...debtForm, reference: e.target.value })
                  }
                  className="bg-[#0F172A] border-slate-200 text-white font-mono"
                  placeholder="Invoice #, Contract #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Description
                </Label>
                <Textarea
                  value={debtForm.description}
                  onChange={(e) =>
                    setDebtForm({ ...debtForm, description: e.target.value })
                  }
                  className="bg-[#0F172A] border-slate-200 text-white"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDebtDialogOpen(false)}
                  className="border-slate-200 text-[#94A3B8]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase"
                >
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Section - Compact Layout */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Summary Card */}
          <Card className="bg-foreground/10 border-slate-200 lg:col-span-2">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Receivables
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-400">
                    ${(summary.receivables?.outstanding || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {summary.receivables?.count || 0} records
                  </p>
                </div>
                <div className="text-center p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Payables
                  </p>
                  <p className="text-xl font-bold font-mono text-red-400">
                    ${(summary.payables?.outstanding || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {summary.payables?.count || 0} records
                  </p>
                </div>
                <div className="text-center p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Net Position
                  </p>
                  <p
                    className={`text-xl font-bold font-mono ${summary.net_position >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    ${Math.abs(summary.net_position || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {summary.net_position >= 0
                      ? "Net Receivable"
                      : "Net Payable"}
                  </p>
                </div>
                <div className="text-center p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Overdue
                  </p>
                  <p className="text-xl font-bold font-mono text-amber-400">
                    $
                    {(
                      (summary.receivables?.overdue_amount || 0) +
                      (summary.payables?.overdue_amount || 0)
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {(summary.receivables?.overdue_count || 0) +
                      (summary.payables?.overdue_count || 0)}{" "}
                    overdue
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aging Summary - Compact */}
          {summary?.aging && (
            <Card className="bg-foreground/10 border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-[#94A3B8] uppercase mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Aging Summary
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#94A3B8]">Current</span>
                    <span className="text-sm font-mono text-emerald-400">
                      ${(summary.aging.current || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#94A3B8]">1-30 Days</span>
                    <span className="text-sm font-mono text-amber-400">
                      ${(summary.aging.days_1_30 || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#94A3B8]">31-60 Days</span>
                    <span className="text-sm font-mono text-orange-400">
                      ${(summary.aging.days_31_60 || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#94A3B8]">61-90 Days</span>
                    <span className="text-sm font-mono text-red-400">
                      ${(summary.aging.days_61_90 || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#94A3B8]">90+ Days</span>
                    <span className="text-sm font-mono text-red-500 font-bold">
                      ${(summary.aging.days_over_90 || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-foreground/10 border border-slate-200">
          <TabsTrigger
            value="receivables"
            className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400"
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Receivables (Debtors)
          </TabsTrigger>
          <TabsTrigger
            value="payables"
            className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Payables (Creditors)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="bg-foreground/10 border-slate-200">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Party
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Amount
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Paid
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Outstanding
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Interest
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Due Date
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-xs text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-[#94A3B8]"
                        >
                          No{" "}
                          {activeTab === "receivables"
                            ? "receivables"
                            : "payables"}{" "}
                          found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDebts.map((debt) => (
                        <TableRow
                          key={debt.debt_id}
                          className="border-slate-200 hover:bg-white/5"
                        >
                          <TableCell>
                            <div>
                              <p className="text-white font-medium">
                                {debt.party_name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                                {debt.party_type === "client" && (
                                  <Users className="w-3 h-3" />
                                )}
                                {debt.party_type === "vendor" && (
                                  <Store className="w-3 h-3" />
                                )}
                                <span className="capitalize">
                                  {debt.party_type}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-white font-mono">
                              {debt.amount?.toLocaleString()} {debt.currency}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              ≈ ${debt.amount_usd?.toLocaleString()} USD
                            </p>
                          </TableCell>
                          <TableCell className="text-emerald-400 font-mono">
                            {(debt.total_paid || 0).toLocaleString()}{" "}
                            {debt.currency}
                          </TableCell>
                          <TableCell className="text-white font-mono font-bold">
                            {(debt.outstanding_balance || 0).toLocaleString()}{" "}
                            {debt.currency}
                          </TableCell>
                          <TableCell>
                            {debt.accrued_interest > 0 ? (
                              <div>
                                <p className="text-amber-400 font-mono">
                                  ${debt.accrued_interest?.toLocaleString()}
                                </p>
                                <p className="text-xs text-[#94A3B8]">
                                  {debt.interest_rate}%/yr
                                </p>
                              </div>
                            ) : (
                              <span className="text-[#94A3B8]">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white">
                                {debt.due_date?.split("T")[0]}
                              </p>
                              {debt.days_overdue > 0 && (
                                <p className="text-xs text-red-400">
                                  {debt.days_overdue} days overdue
                                </p>
                              )}
                              {debt.days_until_due > 0 && (
                                <p className="text-xs text-[#94A3B8]">
                                  {debt.days_until_due} days left
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(debt.calculated_status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#94A3B8] hover:text-white"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-foreground/10 border-slate-200"
                              >
                                <DropdownMenuItem
                                  onClick={() => fetchDebtDetails(debt.debt_id)}
                                  className="text-white hover:bg-white/5 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                {debt.calculated_status !== "fully_paid" && (
                                  <DropdownMenuItem
                                    onClick={() => openPaymentDialog(debt)}
                                    className="text-emerald-400 hover:bg-white/5 cursor-pointer"
                                  >
                                    <CreditCard className="w-4 h-4 mr-2" />{" "}
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
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

      {/* Payment Dialog */}
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          setIsPaymentDialogOpen(open);
          if (!open) {
            resetPaymentForm();
            setSelectedDebt(null);
          }
        }}
      >
        <DialogContent className="bg-foreground/10 border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Record Payment
            </DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 bg-[#0F172A] rounded-xl">
                <p className="text-sm text-[#94A3B8]">
                  Party:{" "}
                  <span className="text-white">{selectedDebt.party_name}</span>
                </p>
                <p className="text-sm text-[#94A3B8]">
                  Outstanding:{" "}
                  <span className="text-white font-mono">
                    {selectedDebt.outstanding_balance?.toLocaleString()}{" "}
                    {selectedDebt.currency}
                  </span>
                </p>
                {selectedDebt.accrued_interest > 0 && (
                  <p className="text-sm text-[#94A3B8]">
                    + Interest:{" "}
                    <span className="text-amber-400 font-mono">
                      ${selectedDebt.accrued_interest?.toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="bg-[#0F172A] border-slate-200 text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Currency
                  </Label>
                  <Select
                    value={paymentForm.currency}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, currency: value })
                    }
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground/10 border-slate-200">
                      {CURRENCIES.map((curr) => (
                        <SelectItem
                          key={curr}
                          value={curr}
                          className="text-white hover:bg-white/5"
                        >
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_date: e.target.value,
                    })
                  }
                  className="bg-[#0F172A] border-slate-200 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Treasury Account
                </Label>
                <Select
                  value={paymentForm.treasury_account_id}
                  onValueChange={(value) =>
                    setPaymentForm({
                      ...paymentForm,
                      treasury_account_id: value,
                    })
                  }
                  required
                >
                  <SelectTrigger className="bg-[#0F172A] border-slate-200 text-white">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-foreground/10 border-slate-200">
                    {treasuryAccounts.map((acc) => (
                      <SelectItem
                        key={acc.account_id}
                        value={acc.account_id}
                        className="text-white hover:bg-white/5"
                      >
                        {acc.account_name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Reference
                </Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: e.target.value,
                    })
                  }
                  className="bg-[#0F172A] border-slate-200 text-white font-mono"
                  placeholder="Payment reference"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                  Notes
                </Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  className="bg-[#0F172A] border-slate-200 text-white"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="border-slate-200 text-[#94A3B8]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase"
                >
                  Record Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Debt Details Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setDebtDetails(null);
        }}
      >
        <DialogContent className="bg-foreground/10 border-slate-200 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Debt Details
            </DialogTitle>
          </DialogHeader>
          {debtDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">Party</p>
                  <p className="text-white font-medium">
                    {debtDetails.party_name}
                  </p>
                  <p className="text-xs text-[#94A3B8] capitalize">
                    {debtDetails.party_type}
                  </p>
                </div>
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">Type</p>
                  <p
                    className={`font-medium ${debtDetails.debt_type === "receivable" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {debtDetails.debt_type === "receivable"
                      ? "Receivable (Debtor)"
                      : "Payable (Creditor)"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Original Amount
                  </p>
                  <p className="text-lg font-mono text-white">
                    {debtDetails.amount?.toLocaleString()}{" "}
                    {debtDetails.currency}
                  </p>
                </div>
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Total Paid
                  </p>
                  <p className="text-lg font-mono text-emerald-400">
                    {debtDetails.total_paid?.toLocaleString()}{" "}
                    {debtDetails.currency}
                  </p>
                </div>
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Outstanding
                  </p>
                  <p className="text-lg font-mono text-white font-bold">
                    {debtDetails.outstanding_balance?.toLocaleString()}{" "}
                    {debtDetails.currency}
                  </p>
                </div>
              </div>

              {debtDetails.accrued_interest > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <p className="text-xs text-amber-400 uppercase">
                      Accrued Interest
                    </p>
                  </div>
                  <p className="text-lg font-mono text-amber-400">
                    ${debtDetails.accrued_interest?.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {debtDetails.interest_rate}% annual rate |{" "}
                    {debtDetails.days_overdue} days overdue
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Due Date
                  </p>
                  <p className="text-white">
                    {debtDetails.due_date?.split("T")[0]}
                  </p>
                </div>
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Status
                  </p>
                  {getStatusBadge(debtDetails.calculated_status)}
                </div>
              </div>

              {debtDetails.description && (
                <div className="p-3 bg-[#0F172A] rounded-xl">
                  <p className="text-xs text-[#94A3B8] uppercase mb-1">
                    Description
                  </p>
                  <p className="text-white">{debtDetails.description}</p>
                </div>
              )}

              {/* Payment History */}
              {debtDetails.payments && debtDetails.payments.length > 0 && (
                <div>
                  <p className="text-sm text-[#94A3B8] uppercase mb-2">
                    Payment History
                  </p>
                  <div className="space-y-2">
                    {debtDetails.payments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="flex items-center justify-between p-3 bg-[#0F172A] rounded-xl"
                      >
                        <div>
                          <p className="text-white font-mono">
                            {payment.amount?.toLocaleString()}{" "}
                            {payment.currency}
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            {payment.payment_date?.split("T")[0]} |{" "}
                            {payment.treasury_account_name}
                          </p>
                        </div>
                        {payment.reference && (
                          <p className="text-xs text-[#94A3B8] font-mono">
                            {payment.reference}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
