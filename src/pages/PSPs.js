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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  CreditCard,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Percent,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  Timer,
  Shield,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PSPs() {
  const { user } = useAuth();
  const [psps, setPsps] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPsp, setSelectedPsp] = useState(null);
  const [viewPsp, setViewPsp] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [settlementDestination, setSettlementDestination] = useState("");
  const [reserveFundLedger, setReserveFundLedger] = useState(null);
  const [reserveFundLoading, setReserveFundLoading] = useState(false);
  const [globalReserveSummary, setGlobalReserveSummary] = useState(null);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState([]);
  const [formData, setFormData] = useState({
    psp_name: "",
    commission_rate: "",
    reserve_fund_rate: "0",
    holding_days: "0",
    settlement_days: "1",
    settlement_destination_id: "",
    min_settlement_amount: "0",
    gateway_fee: "0",
    refund_fee: "0",
    monthly_minimum_fee: "0",
    description: "",
    status: "active",
  });

  // State for recording charges on transactions
  const [chargesDialogOpen, setChargesDialogOpen] = useState(false);
  const [chargesForm, setChargesForm] = useState({
    reserve_fund_amount: "0",
    extra_charges: "0",
    charges_description: "",
  });

  // State for recording payment received
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    actual_amount_received: "",
    destination_account_id: "",
  });

  const isAdmin = user?.role === "admin";
  const isAccountantOrAdmin =
    user?.role === "admin" || user?.role === "accountant";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchPsps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psp-summary`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setPsps(await response.json());
      }
    } catch (error) {
      console.error("Error fetching PSPs:", error);
      toast.error("Failed to load PSPs");
    } finally {
      setLoading(false);
    }
  };


  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const d = await response.json();
        setTreasuryAccounts(d.items || d);
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchPendingTransactions = async (pspId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/psp/${pspId}/pending-transactions`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        setPendingTransactions(await response.json());
      }
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
    }
  };

  const fetchSettlements = async (pspId) => {
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}/settlements`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setSettlements(await response.json());
      }
    } catch (error) {
      console.error("Error fetching settlements:", error);
    }
  };

  const fetchReserveFundLedger = async (pspId) => {
    setReserveFundLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/psps/${pspId}/reserve-funds`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        setReserveFundLedger(await response.json());
      }
    } catch (error) {
      console.error("Error fetching reserve fund ledger:", error);
    } finally {
      setReserveFundLoading(false);
    }
  };

  const fetchGlobalReserveSummary = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/psps/reserve-funds/global-summary`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        setGlobalReserveSummary(await response.json());
      }
    } catch (error) {
      console.error("Error fetching global reserve summary:", error);
    }
  };

  const handleReleaseReserveFund = async (txId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/psps/reserve-funds/${txId}/release`,
        { method: "POST", headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Reserve fund $${data.amount} released & credited to treasury`,
        );
        fetchReserveFundLedger(viewPsp.psp_id);
        fetchGlobalReserveSummary();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to release");
      }
    } catch (error) {
      toast.error("Error releasing reserve fund");
    }
  };

  const handleBulkRelease = async () => {
    if (selectedReleaseIds.length === 0) return;
    try {
      const response = await fetch(
        `${API_URL}/api/psps/reserve-funds/bulk-release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ transaction_ids: selectedReleaseIds }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Released ${data.count} reserve funds totaling $${data.total_released}`,
        );
        setSelectedReleaseIds([]);
        fetchReserveFundLedger(viewPsp.psp_id);
        fetchGlobalReserveSummary();
      } else {
        toast.error("Failed to bulk release");
      }
    } catch (error) {
      toast.error("Error in bulk release");
    }
  };

  useEffect(() => {
    fetchPsps();
    fetchTreasuryAccounts();
    fetchGlobalReserveSummary();
  }, []);

  useEffect(() => {
    if (viewPsp) {
      fetchPendingTransactions(viewPsp.psp_id);
      fetchSettlements(viewPsp.psp_id);
      fetchReserveFundLedger(viewPsp.psp_id);
    }
  }, [viewPsp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedPsp
        ? `${API_URL}/api/psp/${selectedPsp.psp_id}`
        : `${API_URL}/api/psp`;
      const method = selectedPsp ? "PUT" : "POST";

      const payload = {
        psp_name: formData.psp_name,
        commission_rate: parseFloat(formData.commission_rate),
        reserve_fund_rate: parseFloat(formData.reserve_fund_rate) || 0,
        holding_days: parseInt(formData.holding_days) || 0,
        settlement_days: parseInt(formData.settlement_days),
        settlement_destination_id: formData.settlement_destination_id,
        min_settlement_amount: parseFloat(formData.min_settlement_amount) || 0,
        gateway_fee: parseFloat(formData.gateway_fee) || 0,
        refund_fee: parseFloat(formData.refund_fee) || 0,
        monthly_minimum_fee: parseFloat(formData.monthly_minimum_fee) || 0,
        description: formData.description || null,
      };

      if (selectedPsp) {
        payload.status = formData.status;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedPsp ? "PSP updated" : "PSP created");
        setIsDialogOpen(false);
        resetForm();
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Operation failed");
      }
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  // Handle recording charges on a transaction
  const handleRecordCharges = async (e) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    try {
      const response = await fetch(
        `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/charges`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            reserve_fund_amount:
              parseFloat(chargesForm.reserve_fund_amount) || 0,
            extra_charges: parseFloat(chargesForm.extra_charges) || 0,
            charges_description: chargesForm.charges_description || null,
          }),
        },
      );

      if (response.ok) {
        toast.success("Charges recorded successfully");
        setChargesDialogOpen(false);
        setChargesForm({
          reserve_fund_amount: "0",
          extra_charges: "0",
          charges_description: "",
        });
        if (viewPsp) fetchPendingTransactions(viewPsp.psp_id);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to record charges");
      }
    } catch (error) {
      toast.error("Failed to record charges");
    }
  };

  const openChargesDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setChargesForm({
      reserve_fund_amount: (
        transaction.psp_reserve_fund_amount ||
        transaction.psp_chargeback_amount ||
        0
      ).toString(),
      extra_charges: (transaction.psp_extra_charges || 0).toString(),
      charges_description: transaction.psp_charges_description || "",
    });
    setChargesDialogOpen(true);
  };

  const handleDelete = async (pspId) => {
    if (!window.confirm("Are you sure you want to delete this PSP?")) return;
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        toast.success("PSP deleted");
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Delete failed");
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (psp) => {
    setSelectedPsp(psp);
    setFormData({
      psp_name: psp.psp_name,
      commission_rate: psp.commission_rate.toString(),
      reserve_fund_rate: (
        psp.reserve_fund_rate ||
        psp.chargeback_rate ||
        0
      ).toString(),
      holding_days: (psp.holding_days || 0).toString(),
      settlement_days: psp.settlement_days.toString(),
      settlement_destination_id: psp.settlement_destination_id,
      min_settlement_amount: (psp.min_settlement_amount || 0).toString(),
      gateway_fee: (psp.gateway_fee || 0).toString(),
      refund_fee: (psp.refund_fee || 0).toString(),
      monthly_minimum_fee: (psp.monthly_minimum_fee || 0).toString(),
      description: psp.description || "",
      status: psp.status,
    });
    setIsDialogOpen(true);
  };

  // Handle recording payment received from PSP
  const handleRecordPayment = async () => {
    if (!selectedTransaction) return;

    try {
      const psp = psps.find((p) => p.psp_id === selectedTransaction.psp_id);
      const destId =
        paymentForm.destination_account_id || psp?.settlement_destination_id;

      let url = `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/record-payment`;
      const params = new URLSearchParams();
      if (destId) params.append("destination_account_id", destId);
      if (paymentForm.actual_amount_received)
        params.append(
          "actual_amount_received",
          paymentForm.actual_amount_received,
        );
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Payment recorded successfully! Treasury updated.");
        setRecordPaymentDialogOpen(false);
        setSelectedTransaction(null);
        setPaymentForm({
          actual_amount_received: "",
          destination_account_id: "",
        });
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
          fetchSettlements(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Recording payment failed");
      }
    } catch (error) {
      toast.error("Recording payment failed");
    }
  };

  // Open record payment dialog
  const openRecordPaymentDialog = (tx) => {
    setSelectedTransaction(tx);
    const netAmount =
      (tx.amount || 0) -
      (tx.psp_commission_amount || 0) -
      (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0) -
      (tx.psp_extra_charges || 0);
    setPaymentForm({
      actual_amount_received: netAmount.toString(),
      destination_account_id: "",
    });
    setRecordPaymentDialogOpen(true);
  };

  const handleSettleTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      const psp = psps.find((p) => p.psp_id === selectedTransaction.psp_id);
      const destId = settlementDestination || psp?.settlement_destination_id;

      const response = await fetch(
        `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/settle${destId ? `?destination_account_id=${destId}` : ""}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Transaction settled successfully");
        setSettleDialogOpen(false);
        setSelectedTransaction(null);
        setSettlementDestination("");
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Settlement failed");
      }
    } catch (error) {
      toast.error("Settlement failed");
    }
  };

  const resetForm = () => {
    setSelectedPsp(null);
    setFormData({
      psp_name: "",
      commission_rate: "",
      reserve_fund_rate: "0",
      holding_days: "0",
      settlement_days: "1",
      settlement_destination_id: "",
      min_settlement_amount: "0",
      description: "",
      status: "active",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "status-approved",
      inactive: "status-rejected",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
    );
  };

  const isOverdue = (expectedDate) => {
    if (!expectedDate) return false;
    const exp = new Date(expectedDate);
    return exp < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalPendingAmount = psps.reduce(
    (sum, psp) => sum + (psp.pending_amount || 0),
    0,
  );
  const totalOverdue = psps.reduce(
    (sum, psp) => sum + (psp.overdue_count || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="psp-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Payment Service Providers
          </h1>
          <p className="text-slate-500">
            Manage PSPs, commissions, and settlements
          </p>
        </div>
        {isAccountantOrAdmin && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl glow-cyan"
                data-testid="add-psp-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add PSP
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
              <DialogHeader>
                <DialogTitle
                  className="text-2xl font-bold uppercase tracking-tight"
                  style={{ fontFamily: "Barlow Condensed" }}
                >
                  {selectedPsp ? "Edit PSP" : "Add Payment Service Provider"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    PSP Name *
                  </Label>
                  <Input
                    value={formData.psp_name}
                    onChange={(e) =>
                      setFormData({ ...formData, psp_name: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    placeholder="e.g., Stripe, PayPal"
                    data-testid="psp-name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Commission Rate (%) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commission_rate: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="2.5"
                      data-testid="psp-commission"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Reserve Fund % *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.reserve_fund_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reserve_fund_rate: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="0"
                      data-testid="psp-reserve-fund"
                    />
                  </div>
                </div>

                {/* New PSP Fee Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Gateway Fee (per tx)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gateway_fee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gateway_fee: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="0.00"
                      data-testid="psp-gateway-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Refund Fee
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.refund_fee}
                      onChange={(e) =>
                        setFormData({ ...formData, refund_fee: e.target.value })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="0.00"
                      data-testid="psp-refund-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Monthly Min Fee
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthly_minimum_fee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthly_minimum_fee: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="0.00"
                      data-testid="psp-monthly-min-fee"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Holding Days
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.holding_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          holding_days: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="0"
                      data-testid="psp-holding-days"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Settlement Days *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.settlement_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settlement_days: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                      placeholder="T+1"
                      data-testid="psp-settlement-days"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Settlement Destination *
                  </Label>
                  <Select
                    value={formData.settlement_destination_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        settlement_destination_id: value,
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="psp-destination"
                    >
                      <SelectValue placeholder="Select treasury account" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {treasuryAccounts.map((account) => (
                        <SelectItem
                          key={account.account_id}
                          value={account.account_id}
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          {account.account_name} - {account.bank_name} (
                          {account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Min Settlement Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_settlement_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_settlement_amount: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="0"
                    data-testid="psp-min-amount"
                  />
                </div>

                {selectedPsp && (
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger
                        className="bg-slate-50 border-slate-200 text-slate-800"
                        data-testid="psp-status"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem
                          value="active"
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          Active
                        </SelectItem>
                        <SelectItem
                          value="inactive"
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Description
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    rows={2}
                    data-testid="psp-description"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    className="border-slate-200 text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                    data-testid="save-psp-btn"
                  >
                    {selectedPsp ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Total PSPs
                </p>
                <p className="text-3xl font-bold font-mono text-slate-800">
                  {psps.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Pending Settlement
                </p>
                <p className="text-3xl font-bold font-mono text-slate-800">
                  ${totalPendingAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white border-slate-200 border-l-2 border-l-orange-500/50"
          data-testid="total-reserve-fund-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Reserve Fund Held
                </p>
                <p className="text-3xl font-bold font-mono text-orange-400">
                  ${(globalReserveSummary?.total_held || 0).toLocaleString()}
                </p>
                {globalReserveSummary?.due_for_release > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ${globalReserveSummary.due_for_release.toLocaleString()} due
                    for release
                  </p>
                )}
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-white border-slate-200 ${totalOverdue > 0 ? "border-red-500/30" : ""}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Overdue Settlements
                </p>
                <p
                  className={`text-3xl font-bold font-mono ${totalOverdue > 0 ? "text-red-400" : "text-slate-800"}`}
                >
                  {totalOverdue}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl ${totalOverdue > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}
              >
                {totalOverdue > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PSPs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : psps.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500">No PSPs found</p>
            {isAccountantOrAdmin && (
              <p className="text-sm text-slate-500/60 mt-2">
                Click "Add PSP" to create one
              </p>
            )}
          </div>
        ) : (
          psps.map((psp) => (
            <Card
              key={psp.psp_id}
              className={`bg-white border-slate-200 card-hover cursor-pointer ${psp.overdue_count > 0 ? "border-l-2 border-l-red-500" : ""}`}
              onClick={() => setViewPsp(psp)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${psp.overdue_count > 0 ? "bg-red-500/10" : "bg-blue-100"}`}
                    >
                      <CreditCard
                        className={`w-5 h-5 ${psp.overdue_count > 0 ? "text-red-500" : "text-blue-600"}`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-800">
                        {psp.psp_name}
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        {psp.description || "No description"}
                      </p>
                    </div>
                  </div>
                  {isAccountantOrAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          data-testid={`psp-actions-${psp.psp_id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white border-slate-200"
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewPsp(psp);
                          }}
                          className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(psp);
                          }}
                          className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(psp.psp_id);
                          }}
                          className="text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Commission
                    </span>
                    <span className="text-slate-800 font-mono">
                      {psp.commission_rate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Reserve Fund
                    </span>
                    <span className="text-slate-800 font-mono">
                      {psp.reserve_fund_rate || psp.chargeback_rate || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Holding
                    </span>
                    <span className="text-slate-800 font-mono">
                      {psp.holding_days || 0} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Settlement
                    </span>
                    <span className="text-slate-800 font-mono">
                      T+{psp.settlement_days}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Pending</span>
                    <span className="text-yellow-400 font-mono">
                      ${(psp.pending_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  {psp.total_reserve_fund_held > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Reserve Held
                      </span>
                      <span className="text-orange-400 font-mono">
                        ${(psp.total_reserve_fund_held || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {psp.overdue_count > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {psp.overdue_count} transactions
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-sm">Status</span>
                    {getStatusBadge(psp.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View PSP Details Dialog */}
      <Dialog
        open={!!viewPsp}
        onOpenChange={() => {
          setViewPsp(null);
          setPendingTransactions([]);
          setSettlements([]);
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <CreditCard className="w-6 h-6 text-blue-600" />
              {viewPsp?.psp_name}
            </DialogTitle>
          </DialogHeader>
          {viewPsp && (
            <div className="space-y-4">
              {/* PSP Info */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Commission Rate
                  </p>
                  <p className="text-xl font-mono text-slate-800">
                    {viewPsp.commission_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Reserve Fund Rate
                  </p>
                  <p className="text-xl font-mono text-slate-800">
                    {viewPsp.reserve_fund_rate || viewPsp.chargeback_rate || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Holding Time
                  </p>
                  <p className="text-xl font-mono text-slate-800">
                    {viewPsp.holding_days || 0} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Settlement Time
                  </p>
                  <p className="text-xl font-mono text-slate-800">
                    T+{viewPsp.settlement_days}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Pending Amount
                  </p>
                  <p className="text-xl font-mono text-yellow-400">
                    ${(viewPsp.pending_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Settlement To
                  </p>
                  <p className="text-sm text-slate-800">
                    {viewPsp.settlement_destination_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {viewPsp.settlement_destination_bank}
                  </p>
                </div>
              </div>
              {/* Fee Details Row */}
              {(viewPsp.gateway_fee > 0 ||
                viewPsp.refund_fee > 0 ||
                viewPsp.monthly_minimum_fee > 0) && (
                <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 mt-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Gateway Fee
                    </p>
                    <p className="text-lg font-mono text-slate-800">
                      ${(viewPsp.gateway_fee || 0).toLocaleString()}
                      <span className="text-xs text-slate-500">/tx</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Refund Fee
                    </p>
                    <p className="text-lg font-mono text-slate-800">
                      ${(viewPsp.refund_fee || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Monthly Min Fee
                    </p>
                    <p className="text-lg font-mono text-slate-800">
                      ${(viewPsp.monthly_minimum_fee || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-slate-50 border border-slate-200">
                  <TabsTrigger
                    value="pending"
                    className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
                  >
                    Pending Settlements ({pendingTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="reserve-fund"
                    className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
                    data-testid="reserve-fund-tab"
                  >
                    Reserve Fund
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
                  >
                    Settlement History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                  <ScrollArea className="h-[350px]">
                    {pendingTransactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No pending settlements
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Reference
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Gross
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Deductions
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Net
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Holding
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Release Date
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Status
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTransactions.map((tx) => {
                            const overdue = isOverdue(
                              tx.psp_expected_settlement_date,
                            );
                            const holdingReleaseOverdue = isOverdue(
                              tx.psp_holding_release_date,
                            );
                            const netAmount =
                              (tx.amount || 0) -
                              (tx.psp_commission_amount || 0) -
                              (tx.psp_reserve_fund_amount ||
                                tx.psp_chargeback_amount ||
                                0) -
                              (tx.psp_extra_charges || 0);
                            const totalDeductions =
                              (tx.psp_commission_amount || 0) +
                              (tx.psp_reserve_fund_amount ||
                                tx.psp_chargeback_amount ||
                                0) +
                              (tx.psp_extra_charges || 0);
                            const holdingDays =
                              tx.psp_holding_days || viewPsp?.holding_days || 0;
                            const isReleased =
                              tx.psp_holding_release_date &&
                              new Date(tx.psp_holding_release_date) <=
                                new Date();
                            return (
                              <TableRow
                                key={tx.transaction_id}
                                className={`border-slate-200 hover:bg-slate-100 ${overdue ? "bg-red-500/5" : ""}`}
                              >
                                <TableCell>
                                  <div>
                                    <span className="font-mono text-slate-800 text-xs">
                                      {tx.reference}
                                    </span>
                                    <p className="text-[10px] text-slate-500">
                                      {tx.client_name}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-800">
                                  ${tx.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Comm:
                                      </span>
                                      <span className="font-mono text-yellow-400">
                                        -$
                                        {(
                                          tx.psp_commission_amount || 0
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    {(tx.psp_reserve_fund_amount ||
                                      tx.psp_chargeback_amount) > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">
                                          Reserve:
                                        </span>
                                        <span className="font-mono text-red-400">
                                          -$
                                          {(
                                            tx.psp_reserve_fund_amount ||
                                            tx.psp_chargeback_amount
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    {tx.psp_extra_charges > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">
                                          Extra:
                                        </span>
                                        <span className="font-mono text-red-400">
                                          -$
                                          {tx.psp_extra_charges.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-blue-600 font-bold">
                                  ${netAmount.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Timer className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-800 font-mono text-xs">
                                      {holdingDays} days
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {tx.psp_holding_release_date ? (
                                    <span
                                      className={`flex items-center gap-1 text-xs ${isReleased ? "text-green-400" : "text-slate-500"}`}
                                    >
                                      {isReleased ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                      ) : (
                                        <Clock className="w-3 h-3" />
                                      )}
                                      {formatDate(tx.psp_holding_release_date)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-xs">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {tx.settlement_status === "awaiting" ? (
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                      Awaiting
                                    </Badge>
                                  ) : isReleased ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                      Ready
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                      Holding
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openChargesDialog(tx)}
                                      className="text-slate-500 hover:text-slate-800 hover:bg-white/10 px-2"
                                      title="Record Charges (Reserve Fund/Extra)"
                                    >
                                      <Receipt className="w-3 h-3" />
                                    </Button>
                                    {isAccountantOrAdmin && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          openRecordPaymentDialog(tx)
                                        }
                                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-2"
                                        data-testid={`record-payment-${tx.transaction_id}`}
                                        title="Record Payment Received"
                                      >
                                        <Wallet className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Reserve Fund Ledger Tab */}
                <TabsContent value="reserve-fund" className="mt-4">
                  {reserveFundLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : reserveFundLedger ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Total Held
                          </p>
                          <p className="text-lg font-mono text-orange-400 font-bold">
                            $
                            {reserveFundLedger.summary.total_held.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Due This Week
                          </p>
                          <p className="text-lg font-mono text-yellow-400 font-bold">
                            $
                            {reserveFundLedger.summary.due_this_week.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Released
                          </p>
                          <p className="text-lg font-mono text-green-400 font-bold">
                            $
                            {reserveFundLedger.summary.total_released.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Holding Period
                          </p>
                          <p className="text-lg font-mono text-slate-800 font-bold">
                            {reserveFundLedger.summary.holding_days} days
                          </p>
                        </div>
                      </div>

                      {/* Bulk Release Button */}
                      {selectedReleaseIds.length > 0 && (
                        <div className="flex items-center gap-3 mb-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                          <span className="text-orange-400 text-sm">
                            {selectedReleaseIds.length} selected
                          </span>
                          <Button
                            size="sm"
                            onClick={handleBulkRelease}
                            className="bg-green-600 hover:bg-green-700 text-slate-800 h-7 text-xs"
                            data-testid="bulk-release-btn"
                          >
                            Release Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReleaseIds([])}
                            className="text-slate-500 h-7 text-xs"
                          >
                            Clear
                          </Button>
                        </div>
                      )}

                      <ScrollArea className="h-[300px]">
                        {reserveFundLedger.ledger.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            No reserve fund entries
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-8">
                                  <input
                                    type="checkbox"
                                    className="rounded border-white/20"
                                    checked={
                                      selectedReleaseIds.length ===
                                        reserveFundLedger.ledger.filter(
                                          (e) => e.status !== "released",
                                        ).length &&
                                      reserveFundLedger.ledger.filter(
                                        (e) => e.status !== "released",
                                      ).length > 0
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedReleaseIds(
                                          reserveFundLedger.ledger
                                            .filter(
                                              (en) => en.status !== "released",
                                            )
                                            .map((en) => en.transaction_id),
                                        );
                                      } else {
                                        setSelectedReleaseIds([]);
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Reference
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Client
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Tx Amount
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Reserve Held
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Hold Date
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Release Date
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Days Left
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                  Status
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                                  Action
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reserveFundLedger.ledger.map((entry) => (
                                <TableRow
                                  key={entry.transaction_id}
                                  className={`border-slate-200 hover:bg-slate-100 ${entry.status === "due" ? "bg-yellow-500/5" : ""}`}
                                >
                                  <TableCell>
                                    {entry.status !== "released" && (
                                      <input
                                        type="checkbox"
                                        className="rounded border-white/20"
                                        checked={selectedReleaseIds.includes(
                                          entry.transaction_id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedReleaseIds((prev) => [
                                              ...prev,
                                              entry.transaction_id,
                                            ]);
                                          } else {
                                            setSelectedReleaseIds((prev) =>
                                              prev.filter(
                                                (id) =>
                                                  id !== entry.transaction_id,
                                              ),
                                            );
                                          }
                                        }}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">
                                    {entry.reference}
                                  </TableCell>
                                  <TableCell className="text-slate-500 text-xs">
                                    {entry.client_name || "-"}
                                  </TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">
                                    ${entry.amount?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-orange-400 font-bold">
                                    $
                                    {entry.reserve_fund_amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-slate-500 text-xs">
                                    {formatDate(entry.hold_date)}
                                  </TableCell>
                                  <TableCell className="text-slate-500 text-xs">
                                    {formatDate(entry.release_date)}
                                  </TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">
                                    {entry.status === "released" ? (
                                      "-"
                                    ) : entry.days_remaining === 0 ? (
                                      <span className="text-yellow-400">
                                        Due now
                                      </span>
                                    ) : (
                                      <span>{entry.days_remaining}d</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        entry.status === "released"
                                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                                          : entry.status === "due"
                                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                            : "bg-red-500/20 text-red-400 border-red-500/30"
                                      }
                                      data-testid={`rf-status-${entry.transaction_id}`}
                                    >
                                      {entry.status === "released"
                                        ? "Released"
                                        : entry.status === "due"
                                          ? "Due"
                                          : "Held"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {entry.status !== "released" ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleReleaseReserveFund(
                                            entry.transaction_id,
                                          )
                                        }
                                        className="text-green-400 hover:bg-green-500/10 h-7 px-2 text-xs"
                                        data-testid={`release-rf-${entry.transaction_id}`}
                                      >
                                        Release
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-slate-500">
                                        {entry.released_by_name}
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No data available
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {settlements.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No settlement history
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Reference
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Gross
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Commission
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Reserve Fund
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Net Received
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Date
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow
                              key={settlement.settlement_id}
                              className="border-slate-200 hover:bg-slate-100"
                              data-testid={`settlement-row-${settlement.settlement_id}`}
                            >
                              <TableCell>
                                <div>
                                  <span className="font-mono text-slate-800 text-xs">
                                    {settlement.reference ||
                                      settlement.settlement_id}
                                  </span>
                                  {settlement.transaction_count > 1 && (
                                    <p className="text-[10px] text-slate-500">
                                      {settlement.transaction_count}{" "}
                                      transactions
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-slate-800">
                                ${settlement.gross_amount?.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-mono text-yellow-400">
                                -$
                                {(
                                  settlement.commission_amount || 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-mono text-red-400">
                                {settlement.chargeback_amount ||
                                settlement.reserve_fund_amount
                                  ? `-$${(settlement.reserve_fund_amount || settlement.chargeback_amount).toLocaleString()}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-mono text-green-500 font-bold">
                                +${settlement.net_amount?.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs">
                                {formatDate(
                                  settlement.settled_at ||
                                    settlement.created_at,
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(settlement.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settle Transaction Dialog */}
      <Dialog
        open={settleDialogOpen}
        onOpenChange={() => {
          setSettleDialogOpen(false);
          setSelectedTransaction(null);
          setSettlementDestination("");
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Confirm Settlement
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="text-slate-800 font-mono">
                    {selectedTransaction.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span className="text-slate-800">
                    {selectedTransaction.client_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Amount</span>
                  <span className="text-slate-800 font-mono">
                    ${selectedTransaction.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Commission (
                    {selectedTransaction.psp_commission_paid_by === "client"
                      ? "Client pays"
                      : "Broker pays"}
                    )
                  </span>
                  <span className="text-red-400 font-mono">
                    -$
                    {selectedTransaction.psp_commission_amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">
                    Net to Settle
                  </span>
                  <span className="text-green-400 font-mono text-lg">
                    ${selectedTransaction.psp_net_amount?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Settlement Destination
                </Label>
                <Select
                  value={
                    settlementDestination ||
                    psps.find((p) => p.psp_id === selectedTransaction.psp_id)
                      ?.settlement_destination_id ||
                    ""
                  }
                  onValueChange={setSettlementDestination}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((account) => (
                      <SelectItem
                        key={account.account_id}
                        value={account.account_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSettleDialogOpen(false);
                    setSelectedTransaction(null);
                    setSettlementDestination("");
                  }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleTransaction}
                  className="bg-green-500 text-slate-800 hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-settle-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Charges Dialog */}
      <Dialog
        open={chargesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setChargesDialogOpen(false);
            setSelectedTransaction(null);
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Record Charges
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <form onSubmit={handleRecordCharges} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">
                  Transaction:{" "}
                  <span className="text-slate-800 font-mono">
                    {selectedTransaction.transaction_id}
                  </span>
                </p>
                <p className="text-sm text-slate-500">
                  Amount:{" "}
                  <span className="text-slate-800 font-mono">
                    ${selectedTransaction.amount?.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-slate-500">
                  Commission:{" "}
                  <span className="text-yellow-400 font-mono">
                    -$
                    {(
                      selectedTransaction.psp_commission_amount || 0
                    ).toLocaleString()}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Reserve Fund Amount (USD)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.reserve_fund_amount}
                  onChange={(e) =>
                    setChargesForm({
                      ...chargesForm,
                      reserve_fund_amount: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Extra Charges (USD)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.extra_charges}
                  onChange={(e) =>
                    setChargesForm({
                      ...chargesForm,
                      extra_charges: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Description
                </Label>
                <Input
                  value={chargesForm.charges_description}
                  onChange={(e) =>
                    setChargesForm({
                      ...chargesForm,
                      charges_description: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  placeholder="Reason for charges..."
                />
              </div>

              {/* Settlement Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase mb-2">
                  Settlement Preview
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Amount</span>
                    <span className="text-slate-800 font-mono">
                      ${(selectedTransaction.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commission</span>
                    <span className="text-red-400 font-mono">
                      -$
                      {(
                        selectedTransaction.psp_commission_amount || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reserve Fund</span>
                    <span className="text-red-400 font-mono">
                      -$
                      {parseFloat(
                        chargesForm.reserve_fund_amount || 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Extra Charges</span>
                    <span className="text-red-400 font-mono">
                      -$
                      {parseFloat(
                        chargesForm.extra_charges || 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-800 font-bold">
                      Net Settlement
                    </span>
                    <span className="text-blue-600 font-mono font-bold">
                      $
                      {(
                        (selectedTransaction.amount || 0) -
                        (selectedTransaction.psp_commission_amount || 0) -
                        parseFloat(chargesForm.reserve_fund_amount || 0) -
                        parseFloat(chargesForm.extra_charges || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChargesDialogOpen(false)}
                  className="border-slate-200 text-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1FA21B] hover:bg-[#1FA21B]/90 text-[#0B0C10] font-bold uppercase"
                >
                  Save Charges
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Received Dialog */}
      <Dialog
        open={recordPaymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRecordPaymentDialogOpen(false);
            setSelectedTransaction(null);
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Wallet className="w-5 h-5 text-green-400" />
              Record Payment Received
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Summary */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reference</span>
                  <span className="text-slate-800 font-mono">
                    {selectedTransaction.reference}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Client</span>
                  <span className="text-slate-800">
                    {selectedTransaction.client_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PSP</span>
                  <span className="text-slate-800">
                    {selectedTransaction.psp_name}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gross Amount</span>
                    <span className="text-slate-800 font-mono">
                      ${(selectedTransaction.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Commission</span>
                    <span className="text-yellow-400 font-mono">
                      -$
                      {(
                        selectedTransaction.psp_commission_amount || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  {(selectedTransaction.psp_reserve_fund_amount ||
                    selectedTransaction.psp_chargeback_amount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Reserve Fund</span>
                      <span className="text-red-400 font-mono">
                        -$
                        {(
                          selectedTransaction.psp_reserve_fund_amount ||
                          selectedTransaction.psp_chargeback_amount
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.psp_extra_charges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Extra Charges</span>
                      <span className="text-red-400 font-mono">
                        -$
                        {selectedTransaction.psp_extra_charges.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-800 font-bold">
                      Expected Net
                    </span>
                    <span className="text-blue-600 font-mono font-bold">
                      $
                      {(
                        (selectedTransaction.amount || 0) -
                        (selectedTransaction.psp_commission_amount || 0) -
                        (selectedTransaction.psp_reserve_fund_amount ||
                          selectedTransaction.psp_chargeback_amount ||
                          0) -
                        (selectedTransaction.psp_extra_charges || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Holding Info */}
              {selectedTransaction.psp_holding_days > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Holding Period: {selectedTransaction.psp_holding_days}{" "}
                      days
                    </span>
                  </div>
                  {selectedTransaction.psp_holding_release_date && (
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      Release Date:{" "}
                      {formatDate(selectedTransaction.psp_holding_release_date)}
                    </p>
                  )}
                </div>
              )}

              {/* Actual Amount Received */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Actual Amount Received (USD)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.actual_amount_received}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      actual_amount_received: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono text-lg"
                  placeholder="Enter actual amount received"
                  data-testid="actual-amount-received"
                />
                <p className="text-xs text-slate-500">
                  Leave as-is if the amount matches the expected net settlement
                </p>
              </div>

              {/* Settlement Destination */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Credit to Treasury Account
                </Label>
                <Select
                  value={
                    paymentForm.destination_account_id ||
                    psps.find((p) => p.psp_id === selectedTransaction.psp_id)
                      ?.settlement_destination_id ||
                    ""
                  }
                  onValueChange={(value) =>
                    setPaymentForm({
                      ...paymentForm,
                      destination_account_id: value,
                    })
                  }
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((account) => (
                      <SelectItem
                        key={account.account_id}
                        value={account.account_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {account.account_name} - {account.bank_name} (
                        {account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variance Warning */}
              {paymentForm.actual_amount_received &&
                parseFloat(paymentForm.actual_amount_received) !==
                  (selectedTransaction.amount || 0) -
                    (selectedTransaction.psp_commission_amount || 0) -
                    (selectedTransaction.psp_reserve_fund_amount ||
                      selectedTransaction.psp_chargeback_amount ||
                      0) -
                    (selectedTransaction.psp_extra_charges || 0) && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        Variance: $
                        {(
                          parseFloat(paymentForm.actual_amount_received) -
                          ((selectedTransaction.amount || 0) -
                            (selectedTransaction.psp_commission_amount || 0) -
                            (selectedTransaction.psp_reserve_fund_amount ||
                              selectedTransaction.psp_chargeback_amount ||
                              0) -
                            (selectedTransaction.psp_extra_charges || 0))
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRecordPaymentDialogOpen(false);
                    setSelectedTransaction(null);
                  }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="bg-green-500 text-slate-800 hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-record-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
