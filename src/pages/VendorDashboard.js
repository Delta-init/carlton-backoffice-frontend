import { useEffect, useState, useRef } from "react";
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
import { Textarea } from "../components/ui/textarea";
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
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useAuth } from "../context/AuthContext";
import PaginationControls from "../components/PaginationControls";
import {
  Store,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Upload,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
  Building2,
  FileText,
  Printer,
  Receipt,
  Download,
  Filter,
  Calendar,
  Search,
  Wallet,
  CheckCircle,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ExchangerDashboard() {
  const { user } = useAuth();
  const [vendorInfo, setExchangerInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [proofImages, setProofImages] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [statementData, setStatementData] = useState(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [ieEntries, setIeEntries] = useState([]);
  const [activeExchangerTab, setActiveExchangerTab] = useState("transactions");
  const [ieActionDialog, setIeActionDialog] = useState({
    open: false,
    entry: null,
    type: "",
  });
  const [ieCaptcha, setIeCaptcha] = useState({ num1: 0, num2: 0 });
  const [ieCaptchaAnswer, setIeCaptchaAnswer] = useState("");
  const [ieProofImage, setIeProofImage] = useState(null);
  const [ieProofPreview, setIeProofPreview] = useState(null);
  const [ieRejectionReason, setIeRejectionReason] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Loan Transactions state
  const [loanTransactions, setLoanTransactions] = useState([]);
  const [loanTxActionDialog, setLoanTxActionDialog] = useState({
    open: false,
    tx: null,
    type: "",
  });
  const [loanTxProofImage, setLoanTxProofImage] = useState(null);
  const [loanTxProofPreview, setLoanTxProofPreview] = useState(null);
  const [loanTxCaptcha, setLoanTxCaptcha] = useState({ num1: 0, num2: 0 });
  const [loanTxCaptchaAnswer, setLoanTxCaptchaAnswer] = useState("");
  const [loanTxRejectionReason, setLoanTxRejectionReason] = useState("");

  // Pagination state
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txPageSize, setTxPageSize] = useState(20);
  const [iePage, setIePage] = useState(1);
  const [ieTotalPages, setIeTotalPages] = useState(1);
  const [ieTotal, setIeTotal] = useState(0);
  const [iePageSize, setIePageSize] = useState(20);
  const [loanTxPage, setLoanTxPage] = useState(1);
  const [loanTxTotalPages, setLoanTxTotalPages] = useState(1);
  const [loanTxTotal, setLoanTxTotal] = useState(0);
  const [loanTxPageSize, setLoanTxPageSize] = useState(20);
  const [stPage, setStPage] = useState(1);
  const [stTotalPages, setStTotalPages] = useState(1);
  const [stTotal, setStTotal] = useState(0);
  const [stPageSize, setStPageSize] = useState(20);

  // Other Transactions filter state
  const [otSearchQuery, setOtSearchQuery] = useState("");
  const [otStatusFilter, setOtStatusFilter] = useState("all");
  const [otSourceFilter, setOtSourceFilter] = useState("all");
  const [otDateFrom, setOtDateFrom] = useState("");
  const [otDateTo, setOtDateTo] = useState("");

  // Settlement History filter state
  const [stSearchQuery, setStSearchQuery] = useState("");
  const [stStatusFilter, setStStatusFilter] = useState("all");
  const [stDateFrom, setStDateFrom] = useState("");
  const [stDateTo, setStDateTo] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ num1, num2 });
    setCaptchaAnswer("");
  };

  const fetchExchangerInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendor/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setExchangerInfo(data);
        setTransactions(data.pending_transactions || []);
      }
    } catch (error) {
      console.error("Error fetching vendor info:", error);
      toast.error("Failed to load exchanger info");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (pg, size) => {
    try {
      const p = pg || txPage;
      const params = new URLSearchParams();
      if (txStatusFilter && txStatusFilter !== "all")
        params.append("status", txStatusFilter);
      if (txTypeFilter && txTypeFilter !== "all")
        params.append("transaction_type", txTypeFilter);
      if (txDateFrom) params.append("date_from", txDateFrom);
      if (txDateTo) params.append("date_to", txDateTo);
      params.append("page", p);
      params.append("page_size", size ?? txPageSize);
      const qs = `?${params.toString()}`;
      const response = await fetch(`${API_URL}/api/vendor/transactions${qs}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.items || data);
        setTxTotalPages(data.total_pages || 1);
        setTxTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchSettlements = async (pg, size) => {
    if (!vendorInfo) return;
    try {
      const p = pg || stPage;
      const response = await fetch(
        `${API_URL}/api/vendor/settlements?page=${p}&page_size=${size ?? stPageSize}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSettlements(data.items || data);
        setStTotalPages(data.total_pages || 1);
        setStTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching settlements:", error);
    }
  };

  const fetchIeEntries = async (pg, size) => {
    try {
      const p = pg || iePage;
      const response = await fetch(
        `${API_URL}/api/vendor/income-expenses?page=${p}&page_size=${size ?? iePageSize}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setIeEntries(data.items || data);
        setIeTotalPages(data.total_pages || 1);
        setIeTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching IE entries:", error);
    }
  };

  const fetchLoanTransactions = async (pg) => {
    try {
      const p = pg || loanTxPage;
      const response = await fetch(
        `${API_URL}/api/vendor/loan-transactions?page=${p}&page_size=${loanTxPageSize}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setLoanTransactions(data.items || data);
        setLoanTxTotalPages(data.total_pages || 1);
        setLoanTxTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching loan transactions:", error);
    }
  };

  const openStatement = async (settlementId) => {
    setStatementLoading(true);
    setStatementOpen(true);
    try {
      const response = await fetch(
        `${API_URL}/api/settlements/${settlementId}/statement`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        setStatementData(await response.json());
      } else {
        toast.error("Failed to load statement");
      }
    } catch (error) {
      toast.error("Error loading statement");
    } finally {
      setStatementLoading(false);
    }
  };

  const printStatement = () => {
    const el = document.getElementById("vendor-settlement-statement");
    if (!el) return;
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Settlement Statement</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; padding: 40px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { background: #0B3D91; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; text-align: left; }
      td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e5e5e5; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .mono { font-family: 'Courier New', monospace; }
    </style></head><body>`);
    win.document.write(el.innerHTML);
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  };

  const fmtCurrency = (amount, currency) => {
    if (!currency || currency === "USD")
      return `$${(amount || 0).toLocaleString()}`;
    return `${currency} ${(amount || 0).toLocaleString()}`;
  };

  useEffect(() => {
    fetchExchangerInfo();
  }, []);

  useEffect(() => {
    if (vendorInfo) {
      fetchTransactions();
      fetchSettlements();
      fetchIeEntries();
      fetchLoanTransactions();
    }
  }, [vendorInfo]);

  // Re-fetch when filters change
  useEffect(() => {
    if (vendorInfo) {
      fetchTransactions();
    }
  }, [txStatusFilter, txTypeFilter, txDateFrom, txDateTo]);

  // Auto-refresh: when user returns to tab or every 15s
  useAutoRefresh(() => {
    if (vendorInfo) {
      fetchTransactions();
      fetchSettlements();
      fetchIeEntries();
      fetchExchangerInfo();
      fetchLoanTransactions();
    }
  }, 15000);

  const handleAction = (tx, action) => {
    setSelectedTransaction(tx);
    setActionType(action);
    generateCaptcha();
    setProofImages([]);
    setProofPreviews([]);
    setRejectionReason("");
    setActionDialogOpen(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      setProofImages((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          setProofPreviews((prev) => [...prev, reader.result]);
        reader.readAsDataURL(file);
      });
    }
  };
  const removeProofImage = (idx) => {
    setProofImages((prev) => prev.filter((_, i) => i !== idx));
    setProofPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const executeAction = async () => {
    // Verify captcha
    const expectedAnswer = captchaQuestion.num1 + captchaQuestion.num2;
    if (parseInt(captchaAnswer) !== expectedAnswer) {
      toast.error("Incorrect captcha answer");
      generateCaptcha();
      return;
    }

    try {
      let response;
      const isWithdrawal =
        selectedTransaction.transaction_type === "withdrawal";

      if (actionType === "approve") {
        // Only withdrawals require proof upload when approving
        // Deposits can be approved without proof
        if (isWithdrawal && !proofImages.length) {
          toast.error(
            "Please upload proof screenshot before approving withdrawal",
          );
          return;
        }

        // Upload proof only if provided (required for withdrawals, optional for deposits)
        if (proofImages.length) {
          const formData = new FormData();
          proofImages.forEach((img) => formData.append("proof_images", img));

          const token = localStorage.getItem("auth_token");
          const uploadResponse = await fetch(
            `${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/upload-proof`,
            {
              method: "POST",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: "include",
              body: formData,
            },
          );

          if (!uploadResponse.ok) {
            let errorMessage = "Failed to upload proof";
            try {
              const error = await uploadResponse.json();
              errorMessage = error.detail || errorMessage;
            } catch (e) {
              errorMessage = `Upload failed with status ${uploadResponse.status}`;
            }
            toast.error(errorMessage);
            return;
          }
        }

        response = await fetch(
          `${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/approve`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
          },
        );
      } else if (actionType === "reject") {
        response = await fetch(
          `${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/reject?reason=${encodeURIComponent(rejectionReason)}`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
          },
        );
      } else if (actionType === "complete") {
        // For withdrawals - must upload proof
        if (!proofImages.length) {
          toast.error("Please upload proof of payment screenshot");
          return;
        }

        const formData = new FormData();
        proofImages.forEach((img) => formData.append("proof_images", img));

        response = await fetch(
          `${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/complete`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
            },
            credentials: "include",
            body: formData,
          },
        );
      }

      if (response && response.ok) {
        toast.success(
          `Transaction ${actionType === "complete" ? "completed" : actionType + "d"} successfully`,
        );
        setActionDialogOpen(false);
        fetchTransactions();
        fetchExchangerInfo();
      } else if (response) {
        let errorMessage = "Action failed";
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          errorMessage = `Failed with status ${response.status}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Action error:", error);
      toast.error(error.message || "Action failed - please try again");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "status-pending",
      approved: "status-approved",
      completed: "status-approved",
      rejected: "status-rejected",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
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

  const pendingCount = transactions.filter(
    (t) => t.status === "pending",
  ).length;
  const pendingIeCount = ieEntries.filter(
    (e) => e.status === "pending_vendor",
  ).length;
  const pendingLoanTxCount = loanTransactions.filter(
    (t) => t.status === "pending_vendor",
  ).length;
  const pendingDeposits = transactions.filter(
    (t) => t.status === "pending" && t.transaction_type === "deposit",
  );
  const pendingWithdrawals = transactions.filter(
    (t) => t.status === "pending" && t.transaction_type === "withdrawal",
  );
  const approvedWithdrawals = transactions.filter(
    (t) => t.status === "approved" && t.transaction_type === "withdrawal",
  );

  // Loan Transaction Actions
  const handleLoanTxAction = (tx, action) => {
    setLoanTxActionDialog({ open: true, tx, type: action });
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setLoanTxCaptcha({ num1, num2 });
    setLoanTxCaptchaAnswer("");
    setLoanTxProofImage(null);
    setLoanTxProofPreview(null);
    setLoanTxRejectionReason("");
  };

  const handleLoanTxImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoanTxProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setLoanTxProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const executeLoanTxApprove = async () => {
    const expectedAnswer = loanTxCaptcha.num1 + loanTxCaptcha.num2;
    if (parseInt(loanTxCaptchaAnswer) !== expectedAnswer) {
      toast.error("Incorrect captcha answer");
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setLoanTxCaptcha({ num1, num2 });
      setLoanTxCaptchaAnswer("");
      return;
    }
    if (!loanTxProofImage) {
      toast.error("Please upload proof screenshot");
      return;
    }
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("proof_image", loanTxProofImage);
      const response = await fetch(
        `${API_URL}/api/vendor/loan-transactions/${loanTxActionDialog.tx.transaction_id}/approve`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          body: formData,
        },
      );
      if (response.ok) {
        toast.success("Loan transaction approved!");
        fetchLoanTransactions();
        setLoanTxActionDialog({ open: false, tx: null, type: "" });
      } else {
        const err = await response.json();
        toast.error(err.detail || "Approval failed");
      }
    } catch {
      toast.error("Approval failed");
    }
  };

  const executeLoanTxReject = async () => {
    const expectedAnswer = loanTxCaptcha.num1 + loanTxCaptcha.num2;
    if (parseInt(loanTxCaptchaAnswer) !== expectedAnswer) {
      toast.error("Incorrect captcha answer");
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/api/vendor/loan-transactions/${loanTxActionDialog.tx.transaction_id}/reject?reason=${encodeURIComponent(loanTxRejectionReason)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        toast.success("Loan transaction rejected");
        fetchLoanTransactions();
        setLoanTxActionDialog({ open: false, tx: null, type: "" });
      } else {
        const err = await response.json();
        toast.error(err.detail || "Rejection failed");
      }
    } catch {
      toast.error("Rejection failed");
    }
  };

  const handleIeApprove = async (entryId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/income-expenses/${entryId}/vendor-approve`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Entry approved! Commission: ${data.vendor_commission_rate?.toFixed(2)}% = ${data.vendor_commission_base_amount?.toFixed(2)}`,
        );
        fetchIeEntries();
        setIeActionDialog({ open: false, entry: null, type: "" });
        resetIeActionState();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Approval failed");
      }
    } catch {
      toast.error("Approval failed");
    }
  };

  const handleIeReject = async (entryId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/income-expenses/${entryId}/vendor-reject?reason=${encodeURIComponent(ieRejectionReason)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        toast.success("Entry rejected");
        fetchIeEntries();
        setIeActionDialog({ open: false, entry: null, type: "" });
        resetIeActionState();
      } else {
        toast.error("Rejection failed");
      }
    } catch {
      toast.error("Rejection failed");
    }
  };

  const handleIeUploadProof = async (entryId, file) => {
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("proof_image", file);
      const response = await fetch(
        `${API_URL}/api/income-expenses/${entryId}/vendor-upload-proof`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          body: formData,
        },
      );
      if (response.ok) {
        toast.success("Proof uploaded");
        fetchIeEntries();
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const openIeAction = (entry, type) => {
    setIeActionDialog({ open: true, entry, type });
    setIeCaptcha({
      num1: Math.floor(Math.random() * 20) + 1,
      num2: Math.floor(Math.random() * 20) + 1,
    });
    setIeCaptchaAnswer("");
    setIeProofImage(null);
    setIeProofPreview(null);
    setIeRejectionReason("");
  };

  const resetIeActionState = () => {
    setIeCaptchaAnswer("");
    setIeProofImage(null);
    setIeProofPreview(null);
    setIeRejectionReason("");
  };

  const executeIeAction = async () => {
    if (parseInt(ieCaptchaAnswer) !== ieCaptcha.num1 + ieCaptcha.num2) {
      toast.error("Incorrect captcha answer");
      return;
    }
    if (ieActionDialog.type === "approve") {
      // Upload proof first
      if (!ieProofImage) {
        toast.error("Please upload proof screenshot before approving");
        return;
      }
      await handleIeUploadProof(ieActionDialog.entry.entry_id, ieProofImage);
      // Then approve
      await handleIeApprove(ieActionDialog.entry.entry_id);
    } else {
      await handleIeReject(ieActionDialog.entry.entry_id);
    }
  };

  // Client-side search filter
  const filteredTransactions = transactions.filter((tx) => {
    if (!txSearchQuery) return true;
    const q = txSearchQuery.toLowerCase();
    return (
      (tx.reference || "").toLowerCase().includes(q) ||
      (tx.client_name || "").toLowerCase().includes(q) ||
      (tx.base_currency || tx.currency || "").toLowerCase().includes(q)
    );
  });

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (txStatusFilter && txStatusFilter !== "all")
        params.append("status", txStatusFilter);
      if (txTypeFilter && txTypeFilter !== "all")
        params.append("transaction_type", txTypeFilter);
      if (txDateFrom) params.append("date_from", txDateFrom);
      if (txDateTo) params.append("date_to", txDateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `${API_URL}/api/vendor/transactions/export/excel${qs}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transactions.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Excel exported successfully");
      } else {
        toast.error("Export failed");
      }
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = new URLSearchParams();
      if (txStatusFilter && txStatusFilter !== "all")
        params.append("status", txStatusFilter);
      if (txTypeFilter && txTypeFilter !== "all")
        params.append("transaction_type", txTypeFilter);
      if (txDateFrom) params.append("date_from", txDateFrom);
      if (txDateTo) params.append("date_to", txDateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `${API_URL}/api/vendor/transactions/export/pdf${qs}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transactions.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("PDF exported successfully");
      } else {
        toast.error("Export failed");
      }
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  const clearFilters = () => {
    setTxStatusFilter("all");
    setTxTypeFilter("all");
    setTxDateFrom("");
    setTxDateTo("");
    setTxSearchQuery("");
  };

  // Other Transactions filtered data
  const filteredOtherTransactions = [
    ...ieEntries,
    ...loanTransactions.map((tx) => ({ ...tx, _isLoan: true })),
  ].filter((item) => {
    const q = otSearchQuery.toLowerCase();
    if (otStatusFilter !== "all") {
      const status = item.status === "pending_vendor" ? "pending" : item.status;
      if (status !== otStatusFilter) return false;
    }
    if (otSourceFilter === "ie" && item._isLoan) return false;
    if (otSourceFilter === "loan" && !item._isLoan) return false;
    if (otDateFrom) {
      const itemDate = (item.date || item.created_at || "").slice(0, 10);
      if (itemDate < otDateFrom) return false;
    }
    if (otDateTo) {
      const itemDate = (item.date || item.created_at || "").slice(0, 10);
      if (itemDate > otDateTo) return false;
    }
    if (q) {
      return (
        (item.entry_id || item.transaction_id || "")
          .toLowerCase()
          .includes(q) ||
        (item.category || item.borrower_name || "").toLowerCase().includes(q) ||
        (item.base_currency || item.currency || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Settlement History filtered data
  const filteredSettlements = settlements.filter((s) => {
    if (stStatusFilter !== "all" && s.status !== stStatusFilter) return false;
    if (stDateFrom) {
      const sDate = (s.settled_at || s.created_at || "").slice(0, 10);
      if (sDate < stDateFrom) return false;
    }
    if (stDateTo) {
      const sDate = (s.settled_at || s.created_at || "").slice(0, 10);
      if (sDate > stDateTo) return false;
    }
    if (stSearchQuery) {
      const q = stSearchQuery.toLowerCase();
      return (
        (s.settlement_id || "").toLowerCase().includes(q) ||
        (s.settlement_type || "").toLowerCase().includes(q) ||
        (s.source_currency || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export Other Transactions
  const exportOtherTransactions = (format) => {
    const items = filteredOtherTransactions.map((item) => {
      const isLoan = item._isLoan;
      const isIncome = !isLoan && item.entry_type === "income";
      const isDisbursement = isLoan && item.transaction_type === "disbursement";
      return {
        reference: (item.entry_id || item.transaction_id || "")
          .slice(-12)
          .toUpperCase(),
        source: isLoan ? "Loan" : "I&E",
        type: isLoan
          ? isDisbursement
            ? "OUT"
            : "IN"
          : isIncome
            ? "IN"
            : "OUT",
        category: item.category?.replace("_", " ") || item.borrower_name || "-",
        amount: item.base_amount || item.amount || 0,
        currency: item.base_currency || item.currency || "USD",
        commission: item.vendor_commission_base_amount || 0,
        status: item.status === "pending_vendor" ? "Pending" : item.status,
        date: (item.date || item.created_at || "").slice(0, 10),
      };
    });
    if (format === "csv") {
      const headers =
        "Reference,Source,Type,Category,Amount,Currency,Commission,Status,Date";
      const rows = items.map(
        (r) =>
          `${r.reference},${r.source},${r.type},"${r.category}",${r.amount},${r.currency},${r.commission},${r.status},${r.date}`,
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "other_transactions.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } else {
      // PDF - print-friendly HTML
      const win = window.open("", "_blank");
      win.document.write(`<html><head><title>Other Transactions</title><style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0B3D91; color: #fff; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f8f8f8; }
      </style></head><body><h1>Other Transactions - ${vendorInfo?.vendor_name || "Exchanger"}</h1>
      <table><tr><th>Ref</th><th>Source</th><th>Type</th><th>Category</th><th>Amount</th><th>Currency</th><th>Commission</th><th>Status</th><th>Date</th></tr>`);
      items.forEach((r) => {
        win.document.write(
          `<tr><td>${r.reference}</td><td>${r.source}</td><td>${r.type}</td><td>${r.category}</td><td>${r.amount.toLocaleString()}</td><td>${r.currency}</td><td>${r.commission.toLocaleString()}</td><td>${r.status}</td><td>${r.date}</td></tr>`,
        );
      });
      win.document.write("</table></body></html>");
      win.document.close();
      win.print();
    }
  };

  // Export Settlements
  const exportSettlements = (format) => {
    const items = filteredSettlements.map((s) => ({
      id: s.settlement_id,
      type: s.settlement_type || "-",
      gross: s.gross_amount || 0,
      commission: s.commission_amount || 0,
      charges: s.charges_amount || 0,
      net: s.settlement_amount || 0,
      currency: s.source_currency || s.destination_currency || "USD",
      status: s.status,
      date: (s.settled_at || s.created_at || "").slice(0, 10),
    }));
    if (format === "csv") {
      const headers =
        "Settlement ID,Type,Gross,Commission,Charges,Net Settled,Currency,Status,Date";
      const rows = items.map(
        (r) =>
          `${r.id},${r.type},${r.gross},${r.commission},${r.charges},${r.net},${r.currency},${r.status},${r.date}`,
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "settlements.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } else {
      const win = window.open("", "_blank");
      win.document.write(`<html><head><title>Settlement History</title><style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0B3D91; color: #fff; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f8f8f8; }
      </style></head><body><h1>Settlement History - ${vendorInfo?.vendor_name || "Exchanger"}</h1>
      <table><tr><th>ID</th><th>Type</th><th>Gross</th><th>Commission</th><th>Charges</th><th>Net</th><th>Currency</th><th>Status</th><th>Date</th></tr>`);
      items.forEach((r) => {
        win.document.write(
          `<tr><td>${r.id}</td><td>${r.type}</td><td>${r.gross.toLocaleString()}</td><td>${r.commission.toLocaleString()}</td><td>${r.charges.toLocaleString()}</td><td>${r.net.toLocaleString()}</td><td>${r.currency}</td><td>${r.status}</td><td>${r.date}</td></tr>`,
        );
      });
      win.document.write("</table></body></html>");
      win.document.close();
      win.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vendor-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Exchanger Portal
          </h1>
          <p className="text-slate-500">Welcome, {vendorInfo?.vendor_name}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200">
          <Store className="w-5 h-5 text-blue-600" />
          <span className="text-slate-800 font-medium">
            {vendorInfo?.vendor_name}
          </span>
        </div>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Settlement Balance - Highlighted */}
        <Card className="bg-white border-slate-200 border-l-4 border-l-[#66FCF1] lg:col-span-2">
          <CardContent className="p-6">
            <p className="text-xs text-blue-600 uppercase tracking-wider mb-3">
              Settlement Balance (Money In - Money Out - Commission)
            </p>
            {vendorInfo?.settlement_by_currency &&
            vendorInfo.settlement_by_currency.length > 0 ? (
              <div className="space-y-3">
                {vendorInfo.settlement_by_currency.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${
                            item.currency === "USD"
                              ? "bg-green-500/20 text-green-400"
                              : item.currency === "EUR"
                                ? "bg-blue-500/20 text-blue-400"
                                : item.currency === "AED"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : item.currency === "GBP"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : item.currency === "INR"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {item.currency}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-2xl font-bold font-mono ${item.amount >= 0 ? "text-blue-600" : "text-red-400"}`}
                        >
                          {item.amount >= 0 ? "+" : ""}
                          {item.amount?.toLocaleString()}
                        </span>
                        {item.currency !== "USD" && (
                          <span className="text-xs text-slate-500 block">
                            ≈ ${item.usd_equivalent?.toLocaleString()} USD
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 pl-2">
                      <span className="text-green-400">
                        +{item.deposit_amount?.toLocaleString()} deposits (
                        {item.deposit_count})
                      </span>
                      <span className="text-red-400">
                        -{item.withdrawal_amount?.toLocaleString()} withdrawals
                        ({item.withdrawal_count})
                      </span>
                    </div>
                    {(item.commission_earned_base > 0 ||
                      item.commission_earned_usd > 0) && (
                      <div className="text-xs text-yellow-400 pl-2">
                        Commission earned: $
                        {item.commission_earned_usd?.toLocaleString()}
                        {item.currency !== "USD" &&
                          item.commission_earned_base > 0 && (
                            <span className="text-slate-500">
                              {" "}
                              ({item.commission_earned_base?.toLocaleString()}{" "}
                              {item.currency})
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-slate-500 text-sm">
                    Total USD Equivalent:
                  </span>
                  <span
                    className={`text-2xl font-bold font-mono ${vendorInfo.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0) >= 0 ? "text-slate-800" : "text-red-400"}`}
                  >
                    $
                    {vendorInfo.settlement_by_currency
                      .reduce(
                        (sum, item) => sum + (item.usd_equivalent || 0),
                        0,
                      )
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-3xl font-bold font-mono text-slate-500">
                No pending settlement
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Pending Actions
                </p>
                <p className="text-3xl font-bold font-mono text-slate-800">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-white border-slate-200 ${approvedWithdrawals.length > 0 ? "border-l-2 border-l-orange-500" : ""}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Awaiting Proof
                </p>
                <p className="text-3xl font-bold font-mono text-orange-400">
                  {approvedWithdrawals.length}
                </p>
                <p className="text-xs text-orange-400 mt-1">
                  Withdrawals to complete
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Upload className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Pending Deposits
                </p>
                <p className="text-3xl font-bold font-mono text-green-400">
                  {pendingDeposits.length}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ArrowDownRight className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Pending Withdrawals
                </p>
                <p className="text-3xl font-bold font-mono text-red-400">
                  {pendingWithdrawals.length}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Total Volume
                </p>
                <p className="text-2xl font-bold font-mono text-slate-800">
                  ${vendorInfo?.total_volume?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 border-l-2 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">
                  Total Commission Earned
                </p>
                <p className="text-2xl font-bold font-mono text-yellow-400">
                  $
                  {vendorInfo?.settlement_by_currency
                    ?.reduce(
                      (sum, item) => sum + (item.commission_earned_usd || 0),
                      0,
                    )
                    .toLocaleString() || "0"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-blue-400">Bank:</span>{" "}
                  {vendorInfo?.deposit_commission || 0}% In /{" "}
                  {vendorInfo?.withdrawal_commission || 0}% Out
                </p>
                <p className="text-xs text-slate-500">
                  <span className="text-amber-400">Cash:</span>{" "}
                  {vendorInfo?.deposit_commission_cash || 0}% In /{" "}
                  {vendorInfo?.withdrawal_commission_cash || 0}% Out
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content: Transactions, Other Transactions, Settlements */}
      <Tabs value={activeExchangerTab} onValueChange={setActiveExchangerTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            Transactions{" "}
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-yellow-500/30 text-yellow-400 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="other-transactions"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            Other Transactions{" "}
            {pendingIeCount + pendingLoanTxCount > 0 && (
              <Badge className="ml-1 bg-purple-500/30 text-purple-400 text-[10px]">
                {pendingIeCount + pendingLoanTxCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            Settlement History
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ref, client, currency..."
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                  data-testid="tx-search-input"
                />
              </div>
            </div>
            <div className="min-w-[110px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="tx-status-filter"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="min-w-[110px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Type
              </label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="tx-type-filter"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                From
              </label>
              <input
                type="date"
                value={txDateFrom}
                onChange={(e) => setTxDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="tx-date-from"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                To
              </label>
              <input
                type="date"
                value={txDateTo}
                onChange={(e) => setTxDateTo(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="tx-date-to"
              />
            </div>
            {(txStatusFilter !== "all" ||
              txTypeFilter !== "all" ||
              txDateFrom ||
              txDateTo ||
              txSearchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-500 hover:text-red-500 text-xs"
                data-testid="tx-clear-filters"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Transactions Table */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle
                  className="text-xl text-slate-800 uppercase tracking-tight"
                  style={{ fontFamily: "Barlow Condensed" }}
                >
                  Assigned Transactions
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  {filteredTransactions.length} transaction
                  {filteredTransactions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={exportingExcel || filteredTransactions.length === 0}
                  className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                  data-testid="tx-export-excel"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  {exportingExcel ? "Exporting..." : "Excel"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || filteredTransactions.length === 0}
                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  data-testid="tx-export-pdf"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  {exportingPdf ? "Exporting..." : "PDF"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Reference
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Type
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Client
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Amount
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Currency
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Commission
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Mode
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Date
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-8 text-slate-500"
                        >
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => {
                        // Use base currency/amount if available, otherwise use converted values
                        const displayCurrency =
                          tx.base_currency || tx.currency || "USD";
                        const displayAmount = tx.base_amount || tx.amount;

                        return (
                          <TableRow
                            key={tx.transaction_id}
                            className="border-slate-200 hover:bg-slate-100"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-800">
                                  {tx.reference}
                                </span>
                                {tx.proof_image && (
                                  <ImageIcon className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`flex items-center gap-1 ${tx.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                              >
                                {tx.transaction_type === "deposit" ? (
                                  <ArrowDownRight className="w-4 h-4" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                                <span className="capitalize">
                                  {tx.transaction_type}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-800">
                              {tx.client_name}
                            </TableCell>
                            <TableCell
                              className={`font-mono font-medium ${tx.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                            >
                              {tx.transaction_type === "deposit" ? "+" : "-"}
                              {displayAmount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  displayCurrency === "USD"
                                    ? "bg-green-500/20 text-green-400"
                                    : displayCurrency === "EUR"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : displayCurrency === "AED"
                                        ? "bg-purple-500/20 text-purple-400"
                                        : displayCurrency === "GBP"
                                          ? "bg-yellow-500/20 text-yellow-400"
                                          : displayCurrency === "INR"
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {displayCurrency}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tx.vendor_commission_base_amount ? (
                                <div className="font-mono text-yellow-400">
                                  <span>
                                    {tx.vendor_commission_base_amount?.toLocaleString()}{" "}
                                    {tx.vendor_commission_base_currency ||
                                      tx.base_currency ||
                                      "USD"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-xs">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  tx.transaction_mode === "cash"
                                    ? "bg-amber-100 text-amber-700 text-[10px]"
                                    : "bg-blue-100 text-blue-700 text-[10px]"
                                }
                              >
                                {tx.transaction_mode === "cash"
                                  ? "Cash"
                                  : "Bank"}
                              </Badge>
                              {tx.transaction_mode === "cash" &&
                                tx.collecting_person_name && (
                                  <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                                    <p className="font-medium">
                                      {tx.collecting_person_name}
                                    </p>
                                    {tx.collecting_person_number && (
                                      <p className="text-slate-500">
                                        {tx.collecting_person_number}
                                      </p>
                                    )}
                                  </div>
                                )}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {formatDate(tx.transaction_date || tx.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewTransaction(tx)}
                                  className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  data-testid={`view-tx-${tx.transaction_id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>

                                {tx.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleAction(tx, "approve")
                                      }
                                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                      data-testid={`approve-tx-${tx.transaction_id}`}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAction(tx, "reject")}
                                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                      data-testid={`reject-tx-${tx.transaction_id}`}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}

                                {tx.status === "approved" &&
                                  tx.transaction_type === "withdrawal" && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleAction(tx, "complete")
                                      }
                                      className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                      data-testid={`complete-tx-${tx.transaction_id}`}
                                    >
                                      <Upload className="w-4 h-4 mr-1" />{" "}
                                      Complete
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            <PaginationControls
              currentPage={txPage}
              totalPages={txTotalPages}
              totalItems={txTotal}
              pageSize={txPageSize}
              onPageChange={(p) => {
                setTxPage(p);
                fetchTransactions(p);
              }}
              onPageSizeChange={(s) => {
                setTxPageSize(s);
                setTxPage(1);
                fetchTransactions(1, s);
              }}
            />
          </Card>
        </TabsContent>

        {/* Other Transactions Tab - Merged Income/Expenses and Loan Transactions */}
        <TabsContent value="other-transactions" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ref, category, currency..."
                  value={otSearchQuery}
                  onChange={(e) => setOtSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                  data-testid="ot-search-input"
                />
              </div>
            </div>
            <div className="min-w-[110px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={otStatusFilter}
                onChange={(e) => setOtStatusFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="ot-status-filter"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Source
              </label>
              <select
                value={otSourceFilter}
                onChange={(e) => setOtSourceFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="ot-source-filter"
              >
                <option value="all">All</option>
                <option value="ie">I&E</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                From
              </label>
              <input
                type="date"
                value={otDateFrom}
                onChange={(e) => setOtDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="ot-date-from"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                To
              </label>
              <input
                type="date"
                value={otDateTo}
                onChange={(e) => setOtDateTo(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="ot-date-to"
              />
            </div>
            {(otSearchQuery ||
              otStatusFilter !== "all" ||
              otSourceFilter !== "all" ||
              otDateFrom ||
              otDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtSearchQuery("");
                  setOtStatusFilter("all");
                  setOtSourceFilter("all");
                  setOtDateFrom("");
                  setOtDateTo("");
                }}
                className="text-slate-500 hover:text-red-500 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
          <Card
            className="bg-white border-slate-200"
            data-testid="vendor-other-transactions"
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle
                    className="text-xl text-slate-800 uppercase tracking-tight flex items-center gap-2"
                    style={{ fontFamily: "Barlow Condensed" }}
                  >
                    <Wallet className="w-5 h-5 text-purple-600" />
                    Other Transactions
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    {filteredOtherTransactions.length} entries
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${pendingIeCount + pendingLoanTxCount > 0 ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"}`}
                  >
                    {pendingIeCount + pendingLoanTxCount} pending
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportOtherTransactions("csv")}
                    disabled={filteredOtherTransactions.length === 0}
                    className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                    data-testid="ot-export-xlsx"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportOtherTransactions("pdf")}
                    disabled={filteredOtherTransactions.length === 0}
                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    data-testid="ot-export-pdf"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOtherTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No other transactions found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Reference
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Source
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Type
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Category / Borrower
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-green-500">
                          IN Amount
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-red-500">
                          OUT Amount
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Currency
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-yellow-600">
                          Commission
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Bank Details
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Date
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOtherTransactions.map((item) => {
                        const isLoan = item._isLoan;
                        if (isLoan) {
                          const tx = item;
                          const isDisbursement =
                            tx.transaction_type === "disbursement";
                          const isPending = tx.status === "pending_vendor";
                          return (
                            <TableRow
                              key={tx.transaction_id}
                              className={`border-slate-200 hover:bg-slate-100 ${isPending ? "bg-purple-500/10" : ""}`}
                            >
                              <TableCell className="font-mono text-slate-800 text-sm">
                                {tx.transaction_id?.slice(-12).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                  Loan
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`flex items-center gap-1 font-bold ${isDisbursement ? "text-red-500" : "text-green-500"}`}
                                >
                                  {isDisbursement ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                  )}
                                  <span>{isDisbursement ? "OUT" : "IN"}</span>
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-800 text-sm">
                                {tx.borrower_name || "-"}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-green-500">
                                {!isDisbursement
                                  ? tx.amount?.toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-red-500">
                                {isDisbursement
                                  ? tx.amount?.toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-500/20 text-green-400">
                                  {tx.currency}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-yellow-600 text-xs">
                                {tx.vendor_commission_base_amount ? (
                                  <>
                                    {tx.vendor_commission_base_amount?.toLocaleString()}{" "}
                                    {tx.vendor_commission_base_currency ||
                                      tx.currency}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs max-w-[150px] truncate">
                                {tx.bank_details || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    tx.status === "pending_vendor"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : tx.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-slate-100 text-slate-600"
                                  }
                                >
                                  {tx.status === "pending_vendor"
                                    ? "PENDING"
                                    : tx.status?.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs">
                                {formatDate(
                                  tx.transaction_date || tx.created_at,
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                {isPending && (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleLoanTxAction(tx, "approve")
                                      }
                                      className="text-green-600 hover:bg-green-100 h-7 px-2"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleLoanTxAction(tx, "reject")
                                      }
                                      className="text-red-600 hover:bg-red-100 h-7 px-2"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          const entry = item;
                          const isIncome = entry.entry_type === "income";
                          const displayCurrency =
                            entry.base_currency || entry.currency || "USD";
                          const displayAmount =
                            entry.base_amount || entry.amount;
                          const isPending = entry.status === "pending_vendor";
                          return (
                            <TableRow
                              key={entry.entry_id}
                              className={`border-slate-200 hover:bg-slate-100 ${isPending ? "bg-amber-500/10" : ""}`}
                            >
                              <TableCell>
                                <span className="font-mono text-slate-800">
                                  {entry.entry_id?.slice(-10)?.toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                  I&E
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`flex items-center gap-1 font-bold ${isIncome ? "text-green-500" : "text-red-500"}`}
                                >
                                  {isIncome ? (
                                    <ArrowDownRight className="w-4 h-4" />
                                  ) : (
                                    <ArrowUpRight className="w-4 h-4" />
                                  )}
                                  <span>{isIncome ? "IN" : "OUT"}</span>
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-800 text-sm capitalize">
                                {entry.category?.replace("_", " ") || "-"}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-green-500">
                                {isIncome
                                  ? displayAmount?.toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-red-500">
                                {!isIncome
                                  ? displayAmount?.toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-500/20 text-green-400">
                                  {displayCurrency}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-yellow-600 text-xs">
                                {entry.vendor_commission_base_amount ? (
                                  <>
                                    {entry.vendor_commission_base_amount?.toLocaleString()}{" "}
                                    {entry.vendor_commission_base_currency ||
                                      entry.base_currency ||
                                      entry.currency}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-slate-400 text-xs">
                                -
                              </TableCell>
                              <TableCell>
                                {isPending ? (
                                  <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                                    PENDING
                                  </Badge>
                                ) : entry.status === "approved" ||
                                  entry.status === "completed" ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    APPROVED
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                                    {entry.status}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs">
                                {formatDate(entry.date || entry.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending && (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openIeAction(entry, "approve")
                                      }
                                      className="text-green-600 hover:bg-green-100 h-7 px-2"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openIeAction(entry, "reject")
                                      }
                                      className="text-red-600 hover:bg-red-100 h-7 px-2"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          <PaginationControls
            currentPage={iePage}
            totalPages={ieTotalPages}
            totalItems={ieTotal}
            pageSize={iePageSize}
            onPageChange={(p) => {
              setIePage(p);
              fetchIeEntries(p);
            }}
            onPageSizeChange={(s) => {
              setIePageSize(s);
              setIePage(1);
              fetchIeEntries(1, s);
            }}
          />
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID, type, currency..."
                  value={stSearchQuery}
                  onChange={(e) => setStSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                  data-testid="st-search-input"
                />
              </div>
            </div>
            <div className="min-w-[110px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={stStatusFilter}
                onChange={(e) => setStStatusFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="st-status-filter"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                From
              </label>
              <input
                type="date"
                value={stDateFrom}
                onChange={(e) => setStDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="st-date-from"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                To
              </label>
              <input
                type="date"
                value={stDateTo}
                onChange={(e) => setStDateTo(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                data-testid="st-date-to"
              />
            </div>
            {(stSearchQuery ||
              stStatusFilter !== "all" ||
              stDateFrom ||
              stDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStSearchQuery("");
                  setStStatusFilter("all");
                  setStDateFrom("");
                  setStDateTo("");
                }}
                className="text-slate-500 hover:text-red-500 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
          {/* Settlement History */}
          <Card
            className="bg-white border-slate-200"
            data-testid="vendor-settlement-history"
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle
                    className="text-xl text-slate-800 uppercase tracking-tight flex items-center gap-2"
                    style={{ fontFamily: "Barlow Condensed" }}
                  >
                    <Receipt className="w-5 h-5 text-blue-600" />
                    Settlement History
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    {filteredSettlements.length} settlements
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-600 border-[#66FCF1]/20">
                    {settlements.length} total
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSettlements("csv")}
                    disabled={filteredSettlements.length === 0}
                    className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                    data-testid="st-export-xlsx"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSettlements("pdf")}
                    disabled={filteredSettlements.length === 0}
                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    data-testid="st-export-pdf"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSettlements.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No settlements found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          ID
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Type
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Gross
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Deductions
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Net Settled
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Date
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                          Statement
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSettlements.map((s) => (
                        <TableRow
                          key={s.settlement_id}
                          className="border-slate-200 hover:bg-slate-100"
                        >
                          <TableCell className="font-mono text-slate-800 text-xs">
                            {s.settlement_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                s.settlement_type === "bank"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-purple-500/20 text-purple-400"
                              }
                            >
                              {s.settlement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-slate-800">
                            {s.source_currency && s.source_currency !== "USD"
                              ? `${s.source_currency} ${s.gross_amount?.toLocaleString()}`
                              : `$${s.gross_amount?.toLocaleString()}`}
                          </TableCell>
                          <TableCell className="font-mono text-red-400">
                            <div className="text-xs">
                              <div>
                                Comm: -
                                {s.source_currency &&
                                s.source_currency !== "USD"
                                  ? `${s.source_currency} `
                                  : "$"}
                                {s.commission_amount?.toLocaleString()}
                              </div>
                              {s.charges_amount > 0 && (
                                <div>
                                  Charges: -
                                  {s.source_currency &&
                                  s.source_currency !== "USD"
                                    ? `${s.source_currency} `
                                    : "$"}
                                  {s.charges_amount?.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-green-400 font-bold">
                            {s.destination_currency &&
                            s.destination_currency !== "USD"
                              ? `${s.destination_currency} ${s.settlement_amount?.toLocaleString()}`
                              : `$${s.settlement_amount?.toLocaleString()}`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                s.status === "approved"
                                  ? "bg-green-500/20 text-green-400"
                                  : s.status === "rejected"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                              }
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {formatDate(s.settled_at || s.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openStatement(s.settlement_id)}
                              className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                              data-testid={`vendor-statement-${s.settlement_id}`}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs">View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          <PaginationControls
            currentPage={stPage}
            totalPages={stTotalPages}
            totalItems={stTotal}
            pageSize={stPageSize}
            onPageChange={(p) => {
              setStPage(p);
              fetchSettlements(p);
            }}
            onPageSizeChange={(s) => {
              setStPageSize(s);
              setStPage(1);
              fetchSettlements(1, s);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* View Transaction Dialog */}
      <Dialog
        open={!!viewTransaction}
        onOpenChange={() => setViewTransaction(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
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
              {(() => {
                const displayCurrency =
                  viewTransaction.base_currency ||
                  viewTransaction.currency ||
                  "USD";
                const displayAmount =
                  viewTransaction.base_amount || viewTransaction.amount;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Reference
                        </p>
                        <p className="text-slate-800 font-mono text-lg">
                          {viewTransaction.reference}
                        </p>
                      </div>
                      {getStatusBadge(viewTransaction.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Client
                        </p>
                        <p className="text-slate-800">
                          {viewTransaction.client_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Type
                        </p>
                        <span
                          className={`flex items-center gap-1 ${viewTransaction.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                        >
                          {viewTransaction.transaction_type === "deposit" ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                          <span className="capitalize">
                            {viewTransaction.transaction_type}
                          </span>
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Amount
                        </p>
                        <p
                          className={`font-mono text-xl ${viewTransaction.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                        >
                          {viewTransaction.transaction_type === "deposit"
                            ? "+"
                            : "-"}
                          {displayAmount?.toLocaleString()} {displayCurrency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Currency
                        </p>
                        <Badge
                          className={`${
                            displayCurrency === "USD"
                              ? "bg-green-500/20 text-green-400"
                              : displayCurrency === "EUR"
                                ? "bg-blue-500/20 text-blue-400"
                                : displayCurrency === "AED"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : displayCurrency === "GBP"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : displayCurrency === "INR"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {displayCurrency}
                        </Badge>
                      </div>
                      {viewTransaction.base_currency &&
                        viewTransaction.base_currency !==
                          viewTransaction.currency && (
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              USD Equivalent
                            </p>
                            <p className="text-slate-800 font-mono">
                              ${viewTransaction.amount?.toLocaleString()} USD
                            </p>
                          </div>
                        )}
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Created
                        </p>
                        <p className="text-slate-800 text-sm">
                          {formatDate(viewTransaction.created_at)}
                        </p>
                      </div>
                    </div>
                    {viewTransaction.description && (
                      <div className="pt-4 border-t border-slate-200">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          Description
                        </p>
                        <p className="text-slate-800">
                          {viewTransaction.description}
                        </p>
                      </div>
                    )}
                    {/* Client Bank Details for Withdrawals */}
                    {viewTransaction.transaction_type === "withdrawal" &&
                      viewTransaction.client_bank_name && (
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">
                              Client Bank Details (Send To)
                            </p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-sm">
                                Bank Name:
                              </span>
                              <span className="text-slate-800 font-medium">
                                {viewTransaction.client_bank_name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-sm">
                                Account Name:
                              </span>
                              <span className="text-slate-800 font-medium">
                                {viewTransaction.client_bank_account_name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-sm">
                                Account Number:
                              </span>
                              <span className="text-slate-800 font-mono">
                                {viewTransaction.client_bank_account_number}
                              </span>
                            </div>
                            {viewTransaction.client_bank_swift_iban && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">
                                  SWIFT/BIC:
                                </span>
                                <span className="text-slate-800 font-mono">
                                  {viewTransaction.client_bank_swift_iban}
                                </span>
                              </div>
                            )}
                            {viewTransaction.client_bank_currency && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">
                                  Currency:
                                </span>
                                <Badge
                                  className={`${
                                    viewTransaction.client_bank_currency ===
                                    "USD"
                                      ? "bg-green-500/20 text-green-400"
                                      : viewTransaction.client_bank_currency ===
                                          "EUR"
                                        ? "bg-blue-500/20 text-blue-400"
                                        : viewTransaction.client_bank_currency ===
                                            "AED"
                                          ? "bg-purple-500/20 text-purple-400"
                                          : viewTransaction.client_bank_currency ===
                                              "GBP"
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : viewTransaction.client_bank_currency ===
                                                "INR"
                                              ? "bg-orange-500/20 text-orange-400"
                                              : "bg-gray-500/20 text-gray-400"
                                  }`}
                                >
                                  {viewTransaction.client_bank_currency}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    {(() => {
                      const imgs = viewTransaction.proof_images?.length
                        ? viewTransaction.proof_images
                        : viewTransaction.proof_image
                          ? [viewTransaction.proof_image]
                          : [];
                      if (!imgs.length) return null;
                      return (
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Proof of Payment ({imgs.length})
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {imgs.map((url, i) => {
                              const src = url?.startsWith("http")
                                ? url
                                : `data:image/png;base64,${url}`;
                              return (
                                <img
                                  key={i}
                                  src={src}
                                  alt={`Proof ${i + 1}`}
                                  className="w-full rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(src, "_blank")}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const imgs = viewTransaction.vendor_proof_images?.length
                        ? viewTransaction.vendor_proof_images
                        : viewTransaction.vendor_proof_image
                          ? [viewTransaction.vendor_proof_image]
                          : [];
                      if (!imgs.length) return null;
                      return (
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Exchanger Proof ({imgs.length})
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {imgs.map((url, i) => {
                              const src = url?.startsWith("http")
                                ? url
                                : `data:image/png;base64,${url}`;
                              return (
                                <img
                                  key={i}
                                  src={src}
                                  alt={`Proof ${i + 1}`}
                                  className="w-full rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(src, "_blank")}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject/Complete) */}
      <Dialog
        open={actionDialogOpen}
        onOpenChange={() => {
          setActionDialogOpen(false);
          setSelectedTransaction(null);
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              {actionType === "approve" && "Approve Transaction"}
              {actionType === "reject" && "Reject Transaction"}
              {actionType === "complete" && "Complete Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {(() => {
                const displayCurrency =
                  selectedTransaction.base_currency ||
                  selectedTransaction.currency ||
                  "USD";
                const displayAmount =
                  selectedTransaction.base_amount || selectedTransaction.amount;
                return (
                  <>
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
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
                        <span className="text-slate-500">Type</span>
                        <span
                          className={
                            selectedTransaction.transaction_type === "deposit"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {selectedTransaction.transaction_type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount</span>
                        <span className="text-slate-800 font-mono">
                          {displayAmount?.toLocaleString()} {displayCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Currency</span>
                        <Badge
                          className={`${
                            displayCurrency === "USD"
                              ? "bg-green-500/20 text-green-400"
                              : displayCurrency === "EUR"
                                ? "bg-blue-500/20 text-blue-400"
                                : displayCurrency === "AED"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : displayCurrency === "GBP"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : displayCurrency === "INR"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {displayCurrency}
                        </Badge>
                      </div>
                      {selectedTransaction.base_currency &&
                        selectedTransaction.base_currency !==
                          selectedTransaction.currency && (
                          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                            <span className="text-slate-500">
                              USD Equivalent
                            </span>
                            <span className="text-blue-600 font-mono">
                              ${selectedTransaction.amount?.toLocaleString()}
                            </span>
                          </div>
                        )}
                    </div>

                    {actionType === "reject" && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Rejection Reason
                        </Label>
                        <Input
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                          placeholder="Enter reason for rejection"
                          data-testid="rejection-reason"
                        />
                      </div>
                    )}

                    {/* Screenshot upload for withdrawal approval or complete */}
                    {(actionType === "complete" ||
                      (actionType === "approve" &&
                        selectedTransaction.transaction_type ===
                          "withdrawal")) && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Upload Proof of Payment{" "}
                          {actionType === "approve"
                            ? "(Required for Withdrawal)"
                            : ""}{" "}
                          *
                        </Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#66FCF1]/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                            id="vendor-proof-upload"
                            data-testid="vendor-proof-upload"
                          />
                          <label
                            htmlFor="vendor-proof-upload"
                            className="cursor-pointer block"
                          >
                            {proofPreviews.length > 0 ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  {proofPreviews.map((src, i) => (
                                    <div key={i} className="relative group">
                                      <img
                                        src={src}
                                        alt={`Proof ${i + 1}`}
                                        className="w-full h-20 object-cover rounded border border-slate-200 cursor-pointer"
                                        onClick={() => {
                                          if (src.startsWith("data:")) {
                                            fetch(src)
                                              .then((r) => r.blob())
                                              .then((blob) => {
                                                const url =
                                                  URL.createObjectURL(blob);
                                                window.open(url, "_blank");
                                              });
                                          } else {
                                            window.open(src, "_blank");
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          removeProofImage(i);
                                        }}
                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-blue-600 text-center">
                                  {proofPreviews.length} image(s) — click to add
                                  more
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-8 h-8 mx-auto text-slate-500" />
                                <p className="text-sm text-slate-500">
                                  Click to upload proof screenshot
                                </p>
                                <p className="text-xs text-slate-500/60">
                                  PNG, JPG up to 5MB · multiple allowed
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Captcha */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider mb-2 block">
                        Security Verification
                      </Label>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-mono text-blue-600">
                          {captchaQuestion.num1} + {captchaQuestion.num2} = ?
                        </span>
                        <Input
                          type="number"
                          value={captchaAnswer}
                          onChange={(e) => setCaptchaAnswer(e.target.value)}
                          className="w-24 bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono text-center"
                          placeholder="?"
                          data-testid="captcha-answer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setActionDialogOpen(false);
                          setSelectedTransaction(null);
                        }}
                        className="border-slate-200 text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={executeAction}
                        className={`font-bold uppercase tracking-wider ${
                          actionType === "approve"
                            ? "bg-green-500 hover:bg-green-600"
                            : actionType === "reject"
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-orange-500 hover:bg-orange-600"
                        } text-slate-800`}
                        data-testid="confirm-action-btn"
                      >
                        {actionType === "approve" && (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                          </>
                        )}
                        {actionType === "reject" && (
                          <>
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </>
                        )}
                        {actionType === "complete" && (
                          <>
                            <Upload className="w-4 h-4 mr-2" /> Complete
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Statement Dialog */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-3xl bg-white text-[#1a1a1a] border-0 p-0 max-h-[90vh] overflow-hidden">
          {statementLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statementData ? (
            (() => {
              const s = statementData.settlement;
              const txs = statementData.transactions;
              const v = statementData.vendor;
              const cur = s.source_currency || "USD";
              const dCur = s.destination_currency || cur;
              const deposits = txs.filter(
                (t) => t.transaction_type === "deposit",
              );
              const withdrawals = txs.filter(
                (t) => t.transaction_type === "withdrawal",
              );
              return (
                <>
                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-200">
                    <h2 className="font-bold text-[#0B3D91] text-lg">
                      Settlement Statement
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printStatement}
                      className="text-[#0B3D91] border-[#0B3D91] hover:bg-[#0B3D91]/10"
                      data-testid="vendor-print-statement-btn"
                    >
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[calc(90vh-60px)]">
                    <div id="vendor-settlement-statement" className="px-8 py-6">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          borderBottom: "3px solid #0B3D91",
                          paddingBottom: "16px",
                          marginBottom: "20px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "22px",
                              fontWeight: 800,
                              color: "#0B3D91",
                            }}
                          >
                            MILES CAPITALS
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              marginTop: "2px",
                            }}
                          >
                            Foreign Exchange Brokerage
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: 700,
                              color: "#0B3D91",
                            }}
                          >
                            STATEMENT OF SETTLEMENT
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontFamily: "monospace",
                            }}
                          >
                            {s.settlement_id}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "40px",
                          marginBottom: "20px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h4
                            style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              color: "#888",
                              marginBottom: "6px",
                            }}
                          >
                            Exchanger
                          </h4>
                          <p style={{ fontSize: "13px", fontWeight: 600 }}>
                            {v.vendor_name || s.vendor_name}
                          </p>
                          {v.contact_person && (
                            <p style={{ fontSize: "12px", color: "#555" }}>
                              {v.contact_person}
                            </p>
                          )}
                          {v.email && (
                            <p style={{ fontSize: "12px", color: "#555" }}>
                              {v.email}
                            </p>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4
                            style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              color: "#888",
                              marginBottom: "6px",
                            }}
                          >
                            Settlement Details
                          </h4>
                          <p style={{ fontSize: "12px" }}>
                            <strong>Type:</strong>{" "}
                            {s.settlement_type?.toUpperCase()}
                            <br />
                            <strong>Destination:</strong>{" "}
                            {s.settlement_destination_name}
                            <br />
                            <strong>Status:</strong>{" "}
                            <span
                              style={{
                                display: "inline-block",
                                padding: "1px 8px",
                                borderRadius: "3px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background:
                                  s.status === "approved"
                                    ? "#d1fae5"
                                    : "#fef3c7",
                                color:
                                  s.status === "approved"
                                    ? "#065f46"
                                    : "#92400e",
                              }}
                            >
                              {s.status?.toUpperCase()}
                            </span>
                            <br />
                            <strong>Date:</strong>{" "}
                            {s.settled_at
                              ? new Date(s.settled_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <h4
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          color: "#888",
                          marginBottom: "8px",
                        }}
                      >
                        Included Transactions ({txs.length})
                      </h4>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          margin: "0 0 16px 0",
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                background: "#0B3D91",
                                color: "#fff",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                padding: "8px 12px",
                                textAlign: "left",
                              }}
                            >
                              Reference
                            </th>
                            <th
                              style={{
                                background: "#0B3D91",
                                color: "#fff",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                padding: "8px 12px",
                                textAlign: "left",
                              }}
                            >
                              Type
                            </th>
                            <th
                              style={{
                                background: "#0B3D91",
                                color: "#fff",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                padding: "8px 12px",
                                textAlign: "left",
                              }}
                            >
                              Client
                            </th>
                            <th
                              style={{
                                background: "#0B3D91",
                                color: "#fff",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                padding: "8px 12px",
                                textAlign: "right",
                              }}
                            >
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {txs.map((tx, idx) => (
                            <tr
                              key={tx.transaction_id}
                              style={{
                                background: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                              }}
                            >
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  borderBottom: "1px solid #e5e5e5",
                                  fontFamily: "monospace",
                                }}
                              >
                                {tx.reference || tx.transaction_id}
                              </td>
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  borderBottom: "1px solid #e5e5e5",
                                  textTransform: "capitalize",
                                }}
                              >
                                {tx.transaction_type}
                              </td>
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  borderBottom: "1px solid #e5e5e5",
                                }}
                              >
                                {tx.client_name || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  borderBottom: "1px solid #e5e5e5",
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  color:
                                    tx.transaction_type === "deposit"
                                      ? "#16a34a"
                                      : "#dc2626",
                                }}
                              >
                                {tx.transaction_type === "deposit" ? "+" : "-"}
                                {tx.base_currency && tx.base_currency === cur
                                  ? fmtCurrency(tx.base_amount, cur)
                                  : fmtCurrency(tx.amount, tx.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div
                        style={{
                          background: "#f0f4fa",
                          border: "1px solid #d0d8e8",
                          borderRadius: "4px",
                          padding: "16px",
                          marginTop: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            fontSize: "13px",
                          }}
                        >
                          <span>
                            Gross Amount ({deposits.length} deposits,{" "}
                            {withdrawals.length} withdrawals)
                          </span>
                          <span style={{ fontFamily: "monospace" }}>
                            {fmtCurrency(s.gross_amount, cur)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            fontSize: "13px",
                            color: "#dc2626",
                          }}
                        >
                          <span>Commission</span>
                          <span style={{ fontFamily: "monospace" }}>
                            -{fmtCurrency(s.commission_amount, cur)}
                          </span>
                        </div>
                        {s.charges_amount > 0 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              fontSize: "13px",
                              color: "#dc2626",
                            }}
                          >
                            <span>
                              Additional Charges{" "}
                              {s.charges_description
                                ? `(${s.charges_description})`
                                : ""}
                            </span>
                            <span style={{ fontFamily: "monospace" }}>
                              -{fmtCurrency(s.charges_amount, cur)}
                            </span>
                          </div>
                        )}
                        {cur !== dCur && s.exchange_rate !== 1 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              fontSize: "13px",
                              color: "#555",
                            }}
                          >
                            <span>
                              Exchange Rate ({cur} to {dCur})
                            </span>
                            <span style={{ fontFamily: "monospace" }}>
                              {s.exchange_rate}
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "2px solid #0B3D91",
                            marginTop: "8px",
                            paddingTop: "8px",
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "#0B3D91",
                          }}
                        >
                          <span>Net Settlement</span>
                          <span style={{ fontFamily: "monospace" }}>
                            {fmtCurrency(s.settlement_amount, dCur)}
                          </span>
                        </div>
                      </div>
                      {s.approved_by_name && (
                        <div
                          style={{
                            marginTop: "24px",
                            fontSize: "12px",
                            color: "#555",
                          }}
                        >
                          <strong>Approved by:</strong> {s.approved_by_name} on{" "}
                          {s.approved_at
                            ? new Date(s.approved_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "-"}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: "40px",
                          paddingTop: "16px",
                          borderTop: "1px solid #ddd",
                          fontSize: "10px",
                          color: "#888",
                          textAlign: "center",
                        }}
                      >
                        This is a system-generated statement from Miles Capitals
                        Back Office. Generated on{" "}
                        {new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        .
                      </div>
                    </div>
                  </ScrollArea>
                </>
              );
            })()
          ) : (
            <div className="py-10 text-center text-gray-400">
              No data available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IE Action Dialog (Approve/Reject with Captcha) */}
      <Dialog
        open={ieActionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setIeActionDialog({ open: false, entry: null, type: "" });
            resetIeActionState();
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              {ieActionDialog.type === "approve" ? "Approve" : "Reject"} Entry
            </DialogTitle>
          </DialogHeader>
          {ieActionDialog.entry && (
            <div className="space-y-4">
              {/* Entry Details */}
              <div
                className={`p-3 rounded border ${ieActionDialog.entry.entry_type === "income" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}
              >
                <div className="flex justify-between items-center">
                  <Badge
                    className={
                      ieActionDialog.entry.entry_type === "income"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {ieActionDialog.entry.entry_type === "income"
                      ? "Income"
                      : "Expense"}
                  </Badge>
                  <span
                    className={`font-mono text-lg font-bold ${ieActionDialog.entry.entry_type === "income" ? "text-green-400" : "text-red-400"}`}
                  >
                    {ieActionDialog.entry.amount?.toLocaleString()}{" "}
                    {ieActionDialog.entry.currency}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2 capitalize">
                  {ieActionDialog.entry.category?.replace("_", " ")}
                </p>
                {ieActionDialog.entry.description && (
                  <p className="text-xs text-slate-400 mt-1">
                    {ieActionDialog.entry.description}
                  </p>
                )}
                {ieActionDialog.entry.vendor_bank_account_number && (
                  <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                    {ieActionDialog.entry.vendor_bank_account_name && (
                      <p>
                        Name: {ieActionDialog.entry.vendor_bank_account_name}
                      </p>
                    )}
                    <p>
                      A/C: {ieActionDialog.entry.vendor_bank_account_number}
                    </p>
                    {ieActionDialog.entry.vendor_bank_ifsc && (
                      <p>IFSC: {ieActionDialog.entry.vendor_bank_ifsc}</p>
                    )}
                    {ieActionDialog.entry.vendor_bank_branch && (
                      <p>Branch: {ieActionDialog.entry.vendor_bank_branch}</p>
                    )}
                  </div>
                )}
                {vendorInfo && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-blue-600">
                    Commission:{" "}
                    {ieActionDialog.entry.entry_type === "income"
                      ? `${vendorInfo.deposit_commission || 0}% (Money In rate)`
                      : `${vendorInfo.withdrawal_commission || 0}% (Money Out rate)`}{" "}
                    ={" "}
                    {(
                      ((ieActionDialog.entry.amount || 0) *
                        (ieActionDialog.entry.entry_type === "income"
                          ? vendorInfo.deposit_commission || 0
                          : vendorInfo.withdrawal_commission || 0)) /
                      100
                    ).toFixed(2)}{" "}
                    {ieActionDialog.entry.currency}
                  </div>
                )}
              </div>

              {/* Proof Upload (approve only) */}
              {ieActionDialog.type === "approve" && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Upload Proof Screenshot *
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setIeProofImage(file);
                        setIeProofPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-600 file:text-xs hover:file:bg-blue-100"
                    data-testid="ie-proof-upload"
                  />
                  {ieProofPreview && (
                    <img
                      src={ieProofPreview}
                      alt="Proof"
                      className="w-full max-h-32 object-contain rounded border border-slate-200 mt-1"
                    />
                  )}
                </div>
              )}

              {/* Rejection Reason (reject only) */}
              {ieActionDialog.type === "reject" && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Rejection Reason
                  </Label>
                  <Textarea
                    value={ieRejectionReason}
                    onChange={(e) => setIeRejectionReason(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    rows={2}
                    placeholder="Enter reason..."
                    data-testid="ie-rejection-reason"
                  />
                </div>
              )}

              {/* Math Captcha */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Verification: What is {ieCaptcha.num1} + {ieCaptcha.num2}?
                </Label>
                <Input
                  type="number"
                  value={ieCaptchaAnswer}
                  onChange={(e) => setIeCaptchaAnswer(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono text-center text-lg"
                  placeholder="?"
                  data-testid="ie-captcha-answer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIeActionDialog({ open: false, entry: null, type: "" });
                    resetIeActionState();
                  }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeIeAction}
                  className={
                    ieActionDialog.type === "approve"
                      ? "bg-green-500 hover:bg-green-600 text-slate-800 font-bold"
                      : "bg-red-500 hover:bg-red-600 text-slate-800 font-bold"
                  }
                  data-testid="ie-confirm-action"
                >
                  {ieActionDialog.type === "approve"
                    ? "Confirm Approve"
                    : "Confirm Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loan Transaction Action Dialog */}
      <Dialog
        open={loanTxActionDialog.open}
        onOpenChange={(open) => {
          if (!open) setLoanTxActionDialog({ open: false, tx: null, type: "" });
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {loanTxActionDialog.type === "approve" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" /> Approve
                  Loan Transaction
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" /> Reject Loan
                  Transaction
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {loanTxActionDialog.tx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">Type:</span>{" "}
                    <span
                      className={
                        loanTxActionDialog.tx.transaction_type ===
                        "disbursement"
                          ? "text-red-600 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      {loanTxActionDialog.tx.transaction_type === "disbursement"
                        ? "Disbursement (OUT)"
                        : "Repayment (IN)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Borrower:</span>{" "}
                    <span className="text-slate-800">
                      {loanTxActionDialog.tx.borrower_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Amount:</span>{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {loanTxActionDialog.tx.amount?.toLocaleString()}{" "}
                      {loanTxActionDialog.tx.currency}
                    </span>
                  </div>
                </div>
                {loanTxActionDialog.tx.bank_details && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">
                      Bank Details:
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {loanTxActionDialog.tx.bank_details}
                    </p>
                  </div>
                )}
              </div>

              {/* Proof Upload (approve only) */}
              {loanTxActionDialog.type === "approve" && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Upload Proof Screenshot *
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLoanTxImageChange}
                    className="bg-slate-50 border-slate-200 text-slate-800 file:bg-blue-500 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer"
                    data-testid="loan-tx-proof-upload"
                  />
                  {loanTxProofPreview && (
                    <img
                      src={loanTxProofPreview}
                      alt="Proof"
                      className="w-full max-h-32 object-contain rounded border border-slate-200 mt-1"
                    />
                  )}
                </div>
              )}

              {/* Rejection Reason */}
              {loanTxActionDialog.type === "reject" && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Rejection Reason
                  </Label>
                  <Textarea
                    value={loanTxRejectionReason}
                    onChange={(e) => setLoanTxRejectionReason(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    rows={2}
                    placeholder="Enter reason..."
                    data-testid="loan-tx-rejection-reason"
                  />
                </div>
              )}

              {/* Math Captcha */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Verification: What is {loanTxCaptcha.num1} +{" "}
                  {loanTxCaptcha.num2}?
                </Label>
                <Input
                  type="number"
                  value={loanTxCaptchaAnswer}
                  onChange={(e) => setLoanTxCaptchaAnswer(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono text-center text-lg"
                  placeholder="?"
                  data-testid="loan-tx-captcha-answer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setLoanTxActionDialog({ open: false, tx: null, type: "" })
                  }
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    loanTxActionDialog.type === "approve"
                      ? executeLoanTxApprove
                      : executeLoanTxReject
                  }
                  className={
                    loanTxActionDialog.type === "approve"
                      ? "bg-green-500 hover:bg-green-600 text-slate-800 font-bold"
                      : "bg-red-500 hover:bg-red-600 text-slate-800 font-bold"
                  }
                  data-testid="loan-tx-confirm-action"
                >
                  {loanTxActionDialog.type === "approve"
                    ? "Confirm Approve"
                    : "Confirm Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
