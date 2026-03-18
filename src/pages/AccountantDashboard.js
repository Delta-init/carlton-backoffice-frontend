import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import PaginationControls from "../components/PaginationControls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Image as ImageIcon,
  AlertCircle,
  Calculator,
  Wallet,
  Store,
  Building2,
  Banknote,
  Upload,
  CreditCard,
  Filter,
  AlertTriangle,
  Search,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Math Captcha Component
const MathCaptcha = ({ onVerified, onCancel, actionType }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setAnswer("");
    setError("");
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctAnswer = num1 + num2;
    if (parseInt(answer) === correctAnswer) {
      onVerified();
    } else {
      setError("Incorrect answer. Please try again.");
      generateCaptcha();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#1FA21B]">
        <Calculator className="w-5 h-5" />
        <span className="text-sm uppercase tracking-wider">
          Security Verification
        </span>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-[#C5C6C7] text-sm mb-3">
          Please solve this math problem to{" "}
          {actionType === "approve" ? "approve" : "reject"} the transaction:
        </p>
        <div className="flex items-center justify-center gap-4 text-3xl font-mono text-white">
          <span>{num1}</span>
          <span className="text-[#1FA21B]">+</span>
          <span>{num2}</span>
          <span className="text-[#C5C6C7]">=</span>
          <span className="text-[#1FA21B]">?</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
            Your Answer
          </Label>
          <Input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono text-xl text-center"
            placeholder="Enter the sum"
            autoFocus
            data-testid="captcha-answer"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={`flex-1 ${
              actionType === "approve"
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            data-testid="captcha-submit"
          >
            Verify & {actionType === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [viewSettlement, setViewSettlement] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(null);
  const [showSettlementRejectDialog, setShowSettlementRejectDialog] =
    useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("transactions");
  const [uploadingProof, setUploadingProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [destFilter, setDestFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Withdrawal approval dialog
  const [showApprovalDialog, setShowApprovalDialog] = useState(null);
  const [approvalSourceAccount, setApprovalSourceAccount] = useState("");
  const [approvalProof, setApprovalProof] = useState(null);
  const [approvalProofPreview, setApprovalProofPreview] = useState(null);
  const [bankReceiptDate, setBankReceiptDate] = useState("");
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);

  // Captcha states
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaAction, setCaptchaAction] = useState(null); // { type: 'approve' | 'reject', transactionId: string, isSettlement?: boolean }

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const d = await response.json();
        setTreasuryAccounts(d.items || d);
      }
    } catch (error) {
      console.error("Error fetching treasury accounts:", error);
    }
  };

  const fetchPendingTransactions = async (page = currentPage) => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter && typeFilter !== "all")
        params.append("transaction_type", typeFilter);
      if (destFilter && destFilter !== "all")
        params.append("destination_type", destFilter);
      if (clientFilter) params.append("search", clientFilter);
      if (emailFilter) params.append("client_email", emailFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await fetch(
        `${API_URL}/api/transactions/pending?${params.toString()}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setPendingTransactions(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
      toast.error("Failed to load pending transactions");
    }
  };

  const fetchPendingSettlements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settlements/pending`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setPendingSettlements(await response.json());
      }
    } catch (error) {
      console.error("Error fetching pending settlements:", error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPendingTransactions(1),
        fetchPendingSettlements(),
        fetchTreasuryAccounts(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when select/date/pageSize filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchPendingTransactions(1);
  }, [typeFilter, statusFilter, destFilter, dateFrom, dateTo, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced re-fetch for text inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPendingTransactions(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [clientFilter, emailFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const initiateApprove = (transactionId, isSettlement = false) => {
    // For withdrawals and deposits, show approval dialog with screenshot requirement
    if (!isSettlement) {
      const tx = pendingTransactions.find(
        (t) => t.transaction_id === transactionId,
      );
      if (
        tx &&
        (tx.transaction_type === "withdrawal" ||
          tx.transaction_type === "deposit")
      ) {
        setShowApprovalDialog(tx);
        setBankReceiptDate(
          tx.transaction_date || new Date().toISOString().split("T")[0],
        );
        return;
      }
    }
    setCaptchaAction({ type: "approve", transactionId, isSettlement });
    setShowCaptcha(true);
  };
  const initiateReject = (transactionId, isSettlement = false) => {
    setCaptchaAction({ type: "reject", transactionId, isSettlement });
    if (isSettlement) {
      setShowSettlementRejectDialog(transactionId);
    } else {
      setShowRejectDialog(transactionId);
    }
  };

  const handleApprovalProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setApprovalProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setApprovalProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransactionApproval = () => {
    const isWithdrawal = showApprovalDialog.transaction_type === "withdrawal";

    // For withdrawals, validate source account
    if (isWithdrawal && !approvalSourceAccount) {
      toast.error("Please select a source treasury/USDT account");
      return;
    }

    // For both deposits and withdrawals, require proof (mandatory)
    if (!approvalProof) {
      toast.error("Please upload proof of payment screenshot");
      return;
    }

    // Proceed to captcha
    setCaptchaAction({
      type: "approve",
      transactionId: showApprovalDialog.transaction_id,
      isSettlement: false,
      sourceAccount: isWithdrawal ? approvalSourceAccount : null,
      proofFile: approvalProof,
      bankReceiptDate: bankReceiptDate || null,
    });
    setShowApprovalDialog(null);
    setShowCaptcha(true);
  };

  const handleCaptchaVerified = async () => {
    if (!captchaAction) return;

    setShowCaptcha(false);

    if (captchaAction.type === "approve") {
      if (captchaAction.isSettlement) {
        await executeApproveSettlement(captchaAction.transactionId);
      } else {
        await executeApprove(
          captchaAction.transactionId,
          captchaAction.sourceAccount,
          captchaAction.proofFile,
          captchaAction.bankReceiptDate,
        );
      }
    } else if (captchaAction.type === "reject") {
      if (captchaAction.isSettlement) {
        await executeRejectSettlement(captchaAction.transactionId);
      } else {
        await executeReject(captchaAction.transactionId);
      }
    }

    // Reset approval dialog state
    setApprovalSourceAccount("");
    setApprovalProof(null);
    setApprovalProofPreview(null);
    setCaptchaAction(null);
  };

  const executeApprove = async (
    transactionId,
    sourceAccount = null,
    proofFile = null,
    bankReceiptDate = null,
  ) => {
    setProcessingId(transactionId);
    try {
      // If there's a proof file, upload it first
      if (proofFile) {
        const formData = new FormData();
        formData.append("proof_image", proofFile);

        const uploadResponse = await fetch(
          `${API_URL}/api/transactions/${transactionId}/upload-proof`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
            credentials: "include",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          toast.error(error.detail || "Failed to upload proof");
          return;
        }
      }

      // Approve the transaction (optionally with source account and bank receipt date)
      const params = new URLSearchParams();
      if (sourceAccount) params.append("source_account_id", sourceAccount);
      if (bankReceiptDate) params.append("bank_receipt_date", bankReceiptDate);
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const url = `${API_URL}/api/transactions/${transactionId}/approve${queryStr}`;

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Transaction approved");
        fetchPendingTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Approval failed");
      }
    } catch (error) {
      toast.error("Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithCaptcha = () => {
    // Show captcha for reject
    setShowRejectDialog(null);
    setShowCaptcha(true);
  };

  const handleSettlementRejectWithCaptcha = () => {
    // Show captcha for settlement reject
    setShowSettlementRejectDialog(null);
    setShowCaptcha(true);
  };

  const executeReject = async (transactionId) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${transactionId}/reject?reason=${encodeURIComponent(rejectReason)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Transaction rejected");
        setRejectReason("");
        fetchPendingTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Rejection failed");
      }
    } catch (error) {
      toast.error("Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const executeApproveSettlement = async (settlementId) => {
    setProcessingId(settlementId);
    try {
      const response = await fetch(
        `${API_URL}/api/settlements/${settlementId}/approve`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Settlement approved");
        fetchPendingSettlements();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Settlement approval failed");
      }
    } catch (error) {
      toast.error("Settlement approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const executeRejectSettlement = async (settlementId) => {
    setProcessingId(settlementId);
    try {
      const response = await fetch(
        `${API_URL}/api/settlements/${settlementId}/reject?reason=${encodeURIComponent(rejectReason)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Settlement rejected");
        setRejectReason("");
        fetchPendingSettlements();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Settlement rejection failed");
      }
    } catch (error) {
      toast.error("Settlement rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingProof) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload the file
    setProcessingId(uploadingProof.transaction_id);
    try {
      const formData = new FormData();
      formData.append("proof_image", file);

      const response = await fetch(
        `${API_URL}/api/transactions/${uploadingProof.transaction_id}/upload-proof`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          credentials: "include",
          body: formData,
        },
      );

      if (response.ok) {
        toast.success("Proof of payment uploaded");
        setUploadingProof(null);
        setProofPreview(null);
        fetchPendingTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeBadge = (type) => {
    const isIncoming = ["deposit", "rebate"].includes(type);
    return (
      <div
        className={`flex items-center gap-1 ${isIncoming ? "text-green-400" : "text-red-400"}`}
      >
        {isIncoming ? (
          <ArrowDownRight className="w-4 h-4" />
        ) : (
          <ArrowUpRight className="w-4 h-4" />
        )}
        <span className="capitalize font-medium">{type}</span>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="space-y-6 animate-fade-in"
      data-testid="accountant-dashboard"
    >
      {/* Header */}
      <div>
        <h1
          className="text-4xl font-bold uppercase tracking-tight text-white"
          style={{ fontFamily: "Barlow Condensed" }}
        >
          Pending Approvals
        </h1>
        <p className="text-[#C5C6C7]">
          Review and approve/reject transactions and settlements
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Pending Transactions
                </p>
                <p className="text-4xl font-bold font-mono text-yellow-400">
                  {filteredTransactions.length}
                </p>
                <p className="text-4xl font-bold font-mono text-yellow-400">
                  {totalItems}
                </p>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-xl">
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Pending Settlements
                </p>
                <p className="text-4xl font-bold font-mono text-purple-400">
                  {pendingSettlements.length}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-xl">
                <Wallet className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-[#66FCF1]" />
              <span className="text-slate-600 text-sm uppercase tracking-wider">
                Filters
              </span>
            </div>

            {/* Search by name / reference */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                placeholder="Search client / reference..."
                className="pl-8 w-[200px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#66FCF1] h-9"
              />
            </div>

            {/* Email filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="Filter by email..."
                className="pl-8 w-[190px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#66FCF1] h-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 text-slate-800 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem
                  value="pending"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Pending
                </SelectItem>
                <SelectItem
                  value="approved"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Approved
                </SelectItem>
                <SelectItem
                  value="completed"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Completed
                </SelectItem>
                <SelectItem
                  value="rejected"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Rejected
                </SelectItem>
                <SelectItem
                  value="cancelled"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 text-slate-800 h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem
                  value="all"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  All Types
                </SelectItem>
                <SelectItem
                  value="deposit"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Deposit
                </SelectItem>
                <SelectItem
                  value="withdrawal"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Withdrawal
                </SelectItem>
                <SelectItem
                  value="transfer"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Transfer
                </SelectItem>
                <SelectItem
                  value="commission"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Commission
                </SelectItem>
                <SelectItem
                  value="rebate"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Rebate
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Destination filter */}
            <Select value={destFilter} onValueChange={setDestFilter}>
              <SelectTrigger className="w-[155px] bg-slate-50 border-slate-200 text-slate-800 h-9">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem
                  value="all"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  All Destinations
                </SelectItem>
                <SelectItem
                  value="treasury"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Treasury
                </SelectItem>
                <SelectItem
                  value="bank"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Client Bank
                </SelectItem>
                <SelectItem
                  value="usdt"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  USDT
                </SelectItem>
                <SelectItem
                  value="psp"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  PSP
                </SelectItem>
                <SelectItem
                  value="vendor"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Exchanger
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[135px] bg-slate-50 border-slate-200 text-slate-800 h-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[135px] bg-slate-50 border-slate-200 text-slate-800 h-9"
              />
            </div>

            {/* Clear all */}
            {(typeFilter !== "all" ||
              statusFilter !== "pending" ||
              destFilter !== "all" ||
              clientFilter ||
              emailFilter ||
              dateFrom ||
              dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setStatusFilter("pending");
                  setDestFilter("all");
                  setClientFilter("");
                  setEmailFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Transactions and Settlements */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-50 border border-slate-200 mb-4">
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            Transactions ({totalItems})
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
          >
            Settlements ({pendingSettlements.length})
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingTransactions.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">All caught up!</p>
                  <p className="text-[#C5C6C7] mt-2">
                    No pending transactions to review
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingTransactions.map((tx) => {
                const hasProperDest =
                  tx.destination_account_name ||
                  tx.vendor_name ||
                  tx.psp_name ||
                  (tx.destination_type === "bank" && tx.client_bank_name) ||
                  (tx.destination_type === "usdt" && tx.client_usdt_address);
                return (
                  <Card
                    key={tx.transaction_id}
                    className="bg-white border-slate-200"
                  >
                    <CardContent className="p-4">
                      <div className="grid grid-cols-[140px_80px_120px_90px_120px_150px_140px_auto] items-center gap-3">
                        {/* Reference + CRM Ref */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Reference
                          </p>
                          <p
                            className="text-white font-mono text-xs truncate"
                            title={tx.reference}
                          >
                            {tx.reference}
                          </p>
                          {tx.crm_reference && (
                            <p
                              className="text-purple-400 font-mono text-[10px] truncate"
                              title={tx.crm_reference}
                            >
                              CRM: {tx.crm_reference}
                            </p>
                          )}
                          {tx.proof_image && (
                            <ImageIcon className="w-3 h-3 text-[#66FCF1] mt-0.5" />
                          )}
                        </div>
                        {/* Description */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Desc
                          </p>
                          <p
                            className="text-white text-[11px] truncate"
                            title={tx.description || "-"}
                          >
                            {tx.description || "-"}
                          </p>
                        </div>
                        {/* Client */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Client
                          </p>
                          <p className="text-white text-sm truncate">
                            {tx.client_name}
                          </p>
                        </div>
                        {/* Type */}
                        <div>
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Type
                          </p>
                          {getTypeBadge(tx.transaction_type)}
                        </div>
                        {/* Amount */}
                        <div>
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Amount
                          </p>
                          <p
                            className={`font-mono text-sm font-bold ${["deposit", "rebate"].includes(tx.transaction_type) ? "text-green-400" : "text-red-400"}`}
                          >
                            {["deposit", "rebate"].includes(tx.transaction_type)
                              ? "+"
                              : "-"}
                            ${tx.amount?.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[#C5C6C7] font-mono">
                            {tx.currency || "USD"}
                            {tx.base_currency &&
                            tx.base_currency !== "USD" &&
                            tx.base_amount
                              ? ` (${tx.base_amount?.toLocaleString()} ${tx.base_currency})`
                              : ""}
                          </p>
                        </div>
                        {/* Destination */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Destination
                          </p>
                          {(() => {
                            const hasProperDest =
                              tx.destination_account_name ||
                              tx.vendor_name ||
                              tx.psp_name ||
                              (tx.destination_type === "bank" &&
                                tx.client_bank_name) ||
                              (tx.destination_type === "usdt" &&
                                tx.client_usdt_address);
                            if (
                              tx.destination_type === "bank" &&
                              tx.client_bank_name
                            ) {
                              return (
                                <div>
                                  <p className="text-white text-xs font-medium truncate">
                                    {tx.client_bank_name}
                                  </p>
                                  <p className="text-[10px] text-[#C5C6C7] font-mono truncate">
                                    {tx.client_bank_account_number}
                                  </p>
                                  <p className="text-[10px] text-[#66FCF1]">
                                    {tx.client_bank_currency || "USD"}
                                  </p>
                                </div>
                              );
                            }
                            if (
                              tx.destination_type === "usdt" &&
                              tx.client_usdt_address
                            ) {
                              return (
                                <div>
                                  <p className="text-white text-xs font-mono truncate">
                                    {tx.client_usdt_address?.slice(0, 8)}...
                                    {tx.client_usdt_address?.slice(-4)}
                                  </p>
                                  <Badge className="bg-green-500/20 text-green-400 text-[10px] mt-0.5">
                                    {tx.client_usdt_network || "USDT"}
                                  </Badge>
                                </div>
                              );
                            }
                            if (hasProperDest) {
                              return (
                                <div>
                                  <p className="text-white text-xs truncate">
                                    {tx.destination_account_name ||
                                      tx.vendor_name ||
                                      tx.psp_name}
                                  </p>
                                  <p className="text-[10px] text-[#C5C6C7] truncate">
                                    {tx.destination_bank_name ||
                                      (tx.psp_name
                                        ? "PSP"
                                        : tx.vendor_name
                                          ? "Exchanger"
                                          : "")}
                                  </p>
                                </div>
                              );
                            }
                            return (
                              <div
                                data-testid={`no-dest-warning-${tx.transaction_id}`}
                              >
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  <p className="text-red-400 text-xs font-semibold">
                                    No Destination
                                  </p>
                                </div>
                                <p className="text-[10px] text-red-400/70 mt-0.5">
                                  Assign destination before approval
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Created */}
                        <div>
                          <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">
                            Created
                          </p>
                          <p className="text-white text-xs">
                            {formatDate(tx.created_at)}
                          </p>
                          <p className="text-white text-xs">
                            {formatDate(tx.transaction_date || tx.created_at)}
                          </p>
                          <p className="text-[10px] text-[#C5C6C7]">
                            by {tx.created_by_name || "System"}
                          </p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewTransaction(tx)}
                            className="text-[#C5C6C7] hover:text-white hover:bg-white/5 h-8 w-8 p-0"
                            data-testid={`view-tx-${tx.transaction_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {tx.transaction_type === "withdrawal" &&
                            !tx.accountant_proof_image && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadingProof(tx)}
                                className="text-[#1FA21B] hover:text-white hover:bg-[#1FA21B]/10 h-8 w-8 p-0"
                                data-testid={`upload-proof-${tx.transaction_id}`}
                              >
                                <Upload className="w-4 h-4" />
                              </Button>
                            )}
                          {tx.accountant_proof_image && (
                            <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                              <ImageIcon className="w-3 h-3 mr-0.5" />
                              Proof
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() =>
                              initiateApprove(tx.transaction_id, false)
                            }
                            disabled={
                              processingId === tx.transaction_id ||
                              !hasProperDest
                            }
                            className={`h-8 text-xs px-3 ${!hasProperDest ? "bg-slate-500/20 text-slate-500 border border-slate-500/30 cursor-not-allowed" : "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"}`}
                            data-testid={`approve-tx-${tx.transaction_id}`}
                            title={
                              !hasProperDest
                                ? "Cannot approve: No destination assigned"
                                : "Approve transaction"
                            }
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              initiateReject(tx.transaction_id, false)
                            }
                            disabled={processingId === tx.transaction_id}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 h-8 text-xs px-3"
                            data-testid={`reject-tx-${tx.transaction_id}`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(p) => fetchPendingTransactions(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                  // pageSize in useEffect deps triggers re-fetch with the new value
                }}
              />
            )}
          </div>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingSettlements.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">All caught up!</p>
                  <p className="text-[#C5C6C7] mt-2">
                    No pending settlements to review
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingSettlements.map((settlement) => (
                <Card
                  key={settlement.settlement_id}
                  className="bg-white border-slate-200"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Settlement Info */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Exchanger
                          </p>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-[#1FA21B]" />
                            <p className="text-white">
                              {settlement.vendor_name}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Type
                          </p>
                          <Badge
                            className={
                              settlement.settlement_type === "bank"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400"
                            }
                          >
                            {settlement.settlement_type === "bank" ? (
                              <Building2 className="w-3 h-3 mr-1" />
                            ) : (
                              <Banknote className="w-3 h-3 mr-1" />
                            )}
                            {settlement.settlement_type}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Gross Amount
                          </p>
                          <p className="font-mono text-lg font-bold text-white">
                            {settlement.source_currency !== "USD" ? "" : "$"}
                            {settlement.gross_amount?.toLocaleString()}{" "}
                            {settlement.source_currency || "USD"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Settlement Amount
                          </p>
                          <p className="font-mono text-lg font-bold text-green-400">
                            {settlement.destination_currency !== "USD"
                              ? ""
                              : "$"}
                            {settlement.settlement_amount?.toLocaleString()}{" "}
                            {settlement.destination_currency || "USD"}
                          </p>
                        </div>
                      </div>

                      {/* Destination & Date */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Destination
                          </p>
                          <p className="text-white">
                            {settlement.settlement_destination_name}
                          </p>
                          <p className="text-xs text-[#C5C6C7]">
                            {settlement.transaction_count} transactions
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                            Created
                          </p>
                          <p className="text-white text-sm">
                            {formatDate(settlement.created_at)}
                          </p>
                          <p className="text-xs text-[#C5C6C7]">
                            by {settlement.created_by_name || "System"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewSettlement(settlement)}
                          className="text-[#C5C6C7] hover:text-white hover:bg-white/5"
                          data-testid={`view-settlement-${settlement.settlement_id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() =>
                            initiateApprove(settlement.settlement_id, true)
                          }
                          disabled={processingId === settlement.settlement_id}
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                          data-testid={`approve-settlement-${settlement.settlement_id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() =>
                            initiateReject(settlement.settlement_id, true)
                          }
                          disabled={processingId === settlement.settlement_id}
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                          data-testid={`reject-settlement-${settlement.settlement_id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Transaction Dialog */}
      <Dialog
        open={!!viewTransaction}
        onOpenChange={() => setViewTransaction(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Reference
                  </p>
                  <p className="text-white font-mono text-lg">
                    {viewTransaction.reference}
                  </p>
                  {viewTransaction.crm_reference && (
                    <p className="text-purple-400 font-mono text-sm mt-1">
                      CRM: {viewTransaction.crm_reference}
                    </p>
                  )}
                </div>
                <Badge className="status-pending text-xs uppercase">
                  Pending
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Client
                  </p>
                  <p className="text-white">{viewTransaction.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Type
                  </p>
                  {getTypeBadge(viewTransaction.transaction_type)}
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Amount (USD)
                  </p>
                  <p
                    className={`font-mono text-xl ${["deposit", "rebate"].includes(viewTransaction.transaction_type) ? "text-green-400" : "text-red-400"}`}
                  >
                    {["deposit", "rebate"].includes(
                      viewTransaction.transaction_type,
                    )
                      ? "+"
                      : "-"}
                    ${viewTransaction.amount?.toLocaleString()} USD
                  </p>
                  {viewTransaction.base_currency &&
                    viewTransaction.base_currency !== "USD" &&
                    viewTransaction.base_amount && (
                      <p className="text-sm text-[#C5C6C7]">
                        Original:{" "}
                        {viewTransaction.base_amount?.toLocaleString()}{" "}
                        {viewTransaction.base_currency}
                      </p>
                    )}
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Created
                  </p>
                  <p className="text-white text-sm">
                    {formatDate(
                      viewTransaction.transaction_date ||
                        viewTransaction.created_at,
                    )}
                  </p>
                </div>
              </div>
              {viewTransaction.destination_account_name && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Destination
                  </p>
                  <p className="text-white">
                    {viewTransaction.destination_account_name}
                  </p>
                  <p className="text-sm text-[#C5C6C7]">
                    {viewTransaction.destination_bank_name}
                  </p>
                </div>
              )}

              {/* Client Bank Details */}
              {viewTransaction.client_bank_name && (
                <div
                  className="pt-4 border-t border-slate-200"
                  data-testid="approval-bank-details"
                >
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">
                    Client Bank Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#1F2833] rounded-sm border border-[#66FCF1]/20">
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Bank Name</p>
                      <p className="text-white text-sm font-medium">
                        {viewTransaction.client_bank_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Account Holder</p>
                      <p className="text-white text-sm font-medium">
                        {viewTransaction.client_bank_account_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Account Number</p>
                      <p className="text-white text-sm font-mono">
                        {viewTransaction.client_bank_account_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7]">SWIFT / IBAN</p>
                      <p className="text-white text-sm font-mono">
                        {viewTransaction.client_bank_swift_iban || "-"}
                      </p>
                    </div>
                    {viewTransaction.client_bank_currency && (
                      <div>
                        <p className="text-xs text-[#C5C6C7]">Currency</p>
                        <p className="text-white text-sm font-medium">
                          {viewTransaction.client_bank_currency}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* USDT Details */}
              {viewTransaction.client_usdt_address && (
                <div
                  className="pt-4 border-t border-slate-200"
                  data-testid="approval-usdt-details"
                >
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">
                    USDT Details
                  </p>
                  <div className="grid grid-cols-1 gap-3 p-3 bg-[#1F2833] rounded-sm border border-[#66FCF1]/20">
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Wallet Address</p>
                      <p className="text-white text-sm font-mono break-all">
                        {viewTransaction.client_usdt_address}
                      </p>
                    </div>
                    {viewTransaction.client_usdt_network && (
                      <div>
                        <p className="text-xs text-[#C5C6C7]">Network</p>
                        <p className="text-white text-sm font-medium">
                          {viewTransaction.client_usdt_network}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {viewTransaction.description && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-white">{viewTransaction.description}</p>
                </div>
              )}
              {viewTransaction.proof_image && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">
                    Proof of Payment
                  </p>
                  <img
                    src={
                      viewTransaction.proof_image?.startsWith("http")
                        ? viewTransaction.proof_image
                        : `data:image/png;base64,${viewTransaction.proof_image}`
                    }
                    alt="Proof of payment"
                    className="max-w-full rounded border border-slate-200"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setViewTransaction(null);
                    initiateApprove(viewTransaction.transaction_id);
                  }}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setViewTransaction(null);
                    initiateReject(viewTransaction.transaction_id);
                  }}
                  className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Captcha Dialog */}
      <Dialog
        open={showCaptcha}
        onOpenChange={(open) => {
          if (!open) {
            setShowCaptcha(false);
            setCaptchaAction(null);
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Calculator className="w-6 h-6 text-[#1FA21B]" />
              Verification Required
            </DialogTitle>
          </DialogHeader>
          <MathCaptcha
            actionType={captchaAction?.type}
            onVerified={handleCaptchaVerified}
            onCancel={() => {
              setShowCaptcha(false);
              setCaptchaAction(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog
        open={!!showRejectDialog}
        onOpenChange={() => {
          setShowRejectDialog(null);
          setRejectReason("");
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <AlertCircle className="w-6 h-6 text-red-400" />
              Reject Transaction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">
              Please provide a reason for rejecting this transaction:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B]"
              rows={3}
              data-testid="reject-reason"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(null);
                  setRejectReason("");
                }}
                className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectWithCaptcha}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
                data-testid="continue-reject-btn"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Settlement Dialog */}
      <Dialog
        open={!!viewSettlement}
        onOpenChange={() => setViewSettlement(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Wallet className="w-6 h-6 text-[#1FA21B]" />
              Settlement Details
            </DialogTitle>
          </DialogHeader>
          {viewSettlement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#1FA21B]" />
                  <span className="text-white text-lg">
                    {viewSettlement.vendor_name}
                  </span>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs uppercase">
                  Pending
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Settlement Type
                  </p>
                  <Badge
                    className={
                      viewSettlement.settlement_type === "bank"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }
                  >
                    {viewSettlement.settlement_type === "bank" ? (
                      <Building2 className="w-3 h-3 mr-1 inline" />
                    ) : (
                      <Banknote className="w-3 h-3 mr-1 inline" />
                    )}
                    {viewSettlement.settlement_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Transactions
                  </p>
                  <p className="text-white font-mono">
                    {viewSettlement.transaction_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Gross Amount
                  </p>
                  <p className="text-white font-mono text-xl">
                    {viewSettlement.gross_amount?.toLocaleString()}{" "}
                    {viewSettlement.source_currency || "USD"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Commission
                  </p>
                  <p className="text-red-400 font-mono">
                    -{viewSettlement.commission_amount?.toLocaleString()}{" "}
                    {viewSettlement.source_currency || "USD"}
                  </p>
                </div>
                {viewSettlement.charges_amount > 0 && (
                  <>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                        Charges
                      </p>
                      <p className="text-red-400 font-mono">
                        -{viewSettlement.charges_amount?.toLocaleString()}{" "}
                        {viewSettlement.source_currency || "USD"}
                      </p>
                    </div>
                    {viewSettlement.charges_description && (
                      <div>
                        <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                          Charges Desc.
                        </p>
                        <p className="text-white text-sm">
                          {viewSettlement.charges_description}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Net (Source)
                  </p>
                  <p className="text-white font-mono">
                    {viewSettlement.net_amount_source?.toLocaleString()}{" "}
                    {viewSettlement.source_currency || "USD"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                    Settlement Amount
                  </p>
                  <p className="text-green-400 font-mono text-xl">
                    {viewSettlement.settlement_amount?.toLocaleString()}{" "}
                    {viewSettlement.destination_currency || "USD"}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Destination Account
                </p>
                <p className="text-white">
                  {viewSettlement.settlement_destination_name}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Created By
                </p>
                <p className="text-white">{viewSettlement.created_by_name}</p>
                <p className="text-sm text-[#C5C6C7]">
                  {formatDate(viewSettlement.created_at)}
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setViewSettlement(null);
                    initiateApprove(viewSettlement.settlement_id, true);
                  }}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setViewSettlement(null);
                    initiateReject(viewSettlement.settlement_id, true);
                  }}
                  className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Reject Reason Dialog */}
      <Dialog
        open={!!showSettlementRejectDialog}
        onOpenChange={() => {
          setShowSettlementRejectDialog(null);
          setRejectReason("");
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <AlertCircle className="w-6 h-6 text-red-400" />
              Reject Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">
              Please provide a reason for rejecting this settlement:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B]"
              rows={3}
              data-testid="settlement-reject-reason"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSettlementRejectDialog(null);
                  setRejectReason("");
                }}
                className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSettlementRejectWithCaptcha}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
                data-testid="continue-settlement-reject-btn"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Proof Dialog for Withdrawals */}
      <Dialog
        open={!!uploadingProof}
        onOpenChange={() => {
          setUploadingProof(null);
          setProofPreview(null);
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Upload className="w-6 h-6 text-[#1FA21B]" />
              Upload Proof of Payment
            </DialogTitle>
          </DialogHeader>
          {uploadingProof && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Transaction
                </p>
                <p className="text-white font-mono">
                  {uploadingProof.reference}
                </p>
                <p className="text-sm text-[#C5C6C7] mt-2">
                  Withdrawal of{" "}
                  <span className="text-red-400 font-mono">
                    ${uploadingProof.amount?.toLocaleString()}
                  </span>{" "}
                  to:
                </p>
                {uploadingProof.destination_type === "bank" &&
                  uploadingProof.client_bank_name && (
                    <div className="mt-2 p-2 bg-white rounded-xl">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-white text-sm">
                          {uploadingProof.client_bank_name}
                        </span>
                      </div>
                      <p className="text-xs text-[#C5C6C7] font-mono mt-1">
                        {uploadingProof.client_bank_account_number}
                      </p>
                    </div>
                  )}
                {uploadingProof.destination_type === "usdt" &&
                  uploadingProof.client_usdt_address && (
                    <div className="mt-2 p-2 bg-white rounded-xl">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-green-400" />
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          {uploadingProof.client_usdt_network}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#C5C6C7] font-mono mt-1 break-all">
                        {uploadingProof.client_usdt_address}
                      </p>
                    </div>
                  )}
              </div>

              {proofPreview ? (
                <div className="relative">
                  <img
                    src={proofPreview}
                    alt="Proof preview"
                    className="w-full h-48 object-contain bg-slate-50 rounded-xl"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProofPreview(null)}
                    className="absolute top-2 right-2 bg-red-500/80 text-white hover:bg-red-500"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                  <Upload className="w-8 h-8 text-[#C5C6C7] mx-auto mb-2" />
                  <p className="text-[#C5C6C7] mb-2">
                    Upload screenshot of completed payment
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                    id="proof-upload-input"
                  />
                  <Label
                    htmlFor="proof-upload-input"
                    className="cursor-pointer inline-block px-4 py-2 bg-[#1FA21B] text-[#0B0C10] font-bold uppercase text-sm rounded-xl hover:bg-[#45A29E]"
                  >
                    Choose File
                  </Label>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setUploadingProof(null);
                  setProofPreview(null);
                }}
                className="w-full border-slate-200 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Approval Dialog - For Deposits and Withdrawals with Screenshot */}
      <Dialog
        open={!!showApprovalDialog}
        onOpenChange={() => {
          setShowApprovalDialog(null);
          setApprovalSourceAccount("");
          setApprovalProof(null);
          setApprovalProofPreview(null);
          setBankReceiptDate("");
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <CheckCircle className="w-6 h-6 text-green-400" />
              Approve{" "}
              {showApprovalDialog?.transaction_type === "withdrawal"
                ? "Withdrawal"
                : "Deposit"}
            </DialogTitle>
          </DialogHeader>
          {showApprovalDialog && (
            <div className="space-y-4">
              {/* Transaction Details */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">
                  Transaction
                </p>
                <p className="text-white font-mono">
                  {showApprovalDialog.reference}
                </p>
                {showApprovalDialog.crm_reference && (
                  <p className="text-purple-400 font-mono text-xs mt-1">
                    CRM: {showApprovalDialog.crm_reference}
                  </p>
                )}
                {showApprovalDialog.description && (
                  <p className="text-[#C5C6C7] text-xs mt-1">
                    {showApprovalDialog.description}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[#C5C6C7]">Amount:</span>
                  <span
                    className={`font-mono text-lg font-bold ${showApprovalDialog.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                  >
                    {showApprovalDialog.transaction_type === "deposit"
                      ? "+"
                      : "-"}
                    ${showApprovalDialog.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[#C5C6C7] text-sm">Client: </span>
                  <span className="text-white">
                    {showApprovalDialog.client_name}
                  </span>
                </div>
                <div className="mt-1">
                  <Badge
                    className={
                      showApprovalDialog.transaction_type === "deposit"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }
                  >
                    {showApprovalDialog.transaction_type === "deposit" ? (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    )}
                    {showApprovalDialog.transaction_type}
                  </Badge>
                </div>
              </div>

              {/* Destination Details - Only for Withdrawals */}
              {showApprovalDialog.transaction_type === "withdrawal" && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">
                    Sending To
                  </p>
                  {showApprovalDialog.destination_type === "bank" &&
                    showApprovalDialog.client_bank_name && (
                      <div className="flex items-start gap-2">
                        <Building2 className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-white">
                            {showApprovalDialog.client_bank_name}
                          </p>
                          <p className="text-sm text-[#C5C6C7]">
                            {showApprovalDialog.client_bank_account_name}
                          </p>
                          <p className="text-xs text-[#C5C6C7] font-mono">
                            {showApprovalDialog.client_bank_account_number}
                          </p>
                          {showApprovalDialog.client_bank_swift_iban && (
                            <p className="text-xs text-[#C5C6C7]">
                              SWIFT: {showApprovalDialog.client_bank_swift_iban}
                            </p>
                          )}
                          <Badge className="mt-1 bg-blue-500/20 text-blue-400 text-xs">
                            {showApprovalDialog.client_bank_currency || "USD"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  {showApprovalDialog.destination_type === "usdt" &&
                    showApprovalDialog.client_usdt_address && (
                      <div className="flex items-start gap-2">
                        <Wallet className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            {showApprovalDialog.client_usdt_network}
                          </Badge>
                          <p className="text-xs text-[#C5C6C7] font-mono mt-1 break-all">
                            {showApprovalDialog.client_usdt_address}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Deposit Destination Info */}
              {showApprovalDialog.transaction_type === "deposit" &&
                showApprovalDialog.destination_account_name && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">
                      Depositing To
                    </p>
                    <div className="flex items-start gap-2">
                      <Building2 className="w-5 h-5 text-[#1FA21B] mt-0.5" />
                      <div>
                        <p className="text-white">
                          {showApprovalDialog.destination_account_name}
                        </p>
                        <p className="text-sm text-[#C5C6C7]">
                          {showApprovalDialog.destination_bank_name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Source Treasury/USDT Account Selection - Only for Withdrawals */}
              {showApprovalDialog.transaction_type === "withdrawal" && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                    Source Account (Where funds come from) *
                  </Label>
                  <Select
                    value={approvalSourceAccount}
                    onValueChange={setApprovalSourceAccount}
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200 text-white"
                      data-testid="approval-source-account"
                    >
                      <SelectValue placeholder="Select treasury/USDT account" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-[200px]">
                      {treasuryAccounts.map((account) => (
                        <SelectItem
                          key={account.account_id}
                          value={account.account_id}
                          className="text-white hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            {account.account_type === "usdt" ? (
                              <Wallet className="w-3 h-3" />
                            ) : (
                              <Building2 className="w-3 h-3" />
                            )}
                            <span>{account.account_name}</span>
                            <span className="text-[#C5C6C7] text-xs">
                              ({account.currency})
                            </span>
                            <span className="text-[#1FA21B] font-mono text-xs">
                              ${account.balance?.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bank Receipt Date - Optional */}
              <div className="space-y-2">
                <Label className="text-slate-600 text-xs uppercase tracking-wider">
                  Bank Receipt Date (Actual payment date)
                </Label>
                <Input
                  type="date"
                  value={bankReceiptDate}
                  onChange={(e) => setBankReceiptDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  data-testid="bank-receipt-date"
                />
                <p className="text-slate-400 text-xs">
                  Date the payment was actually received in the bank. Used for
                  reconciliation matching.
                </p>
              </div>

              {/* Proof of Payment Upload - Required for both */}
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                  Proof of{" "}
                  {showApprovalDialog.transaction_type === "deposit"
                    ? "Deposit"
                    : "Payment"}{" "}
                  (Screenshot) *
                </Label>
                {approvalProofPreview ? (
                  <div className="relative">
                    <img
                      src={approvalProofPreview}
                      alt="Proof preview"
                      className="w-full h-40 object-contain bg-slate-50 rounded-xl"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setApprovalProof(null);
                        setApprovalProofPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500/80 text-white hover:bg-red-500"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                    <Upload className="w-6 h-6 text-[#C5C6C7] mx-auto mb-2" />
                    <p className="text-[#C5C6C7] text-sm mb-2">
                      Upload{" "}
                      {showApprovalDialog.transaction_type === "deposit"
                        ? "deposit confirmation"
                        : "payment confirmation"}{" "}
                      screenshot
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleApprovalProofChange}
                      className="hidden"
                      id="approval-proof-input"
                    />
                    <Label
                      htmlFor="approval-proof-input"
                      className="cursor-pointer inline-block px-4 py-2 bg-[#1FA21B] text-[#0B0C10] font-bold uppercase text-sm rounded-xl hover:bg-[#45A29E]"
                    >
                      Choose File
                    </Label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalDialog(null);
                    setApprovalSourceAccount("");
                    setApprovalProof(null);
                    setApprovalProofPreview(null);
                    setBankReceiptDate("");
                  }}
                  className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransactionApproval}
                  disabled={
                    (showApprovalDialog.transaction_type === "withdrawal" &&
                      !approvalSourceAccount) ||
                    !approvalProof
                  }
                  className="flex-1 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="confirm-transaction-approval"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue to Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
