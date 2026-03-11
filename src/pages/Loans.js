import { useEffect, useState, useCallback } from "react";
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
import PaginationControls from "../components/PaginationControls";

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Banknote,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  CreditCard,
  TrendingUp,
  PiggyBank,
  Receipt,
  X,
  Download,
  ArrowRightLeft,
  Users,
  BarChart3,
  History,
  Search,
  FileX,
  Filter,
  RotateCcw,
  FileText,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const currencies = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "USDT"];

const loanTypes = [
  { value: "short_term", label: "Short Term (< 1 year)" },
  { value: "long_term", label: "Long Term (> 1 year)" },
  { value: "credit_line", label: "Credit Line (Revolving)" },
];

const repaymentModes = [
  { value: "lump_sum", label: "Lump Sum (Single Payment)" },
  { value: "emi", label: "EMI (Monthly Installments)" },
  { value: "custom", label: "Custom Schedule" },
];

const installmentFrequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export default function Loans() {
  const { user } = useAuth();
  const [totalPages, setTotalPages] = useState(1);
  const [loans, setLoans] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [vendors, setExchangers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loanTransactions, setLoanTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [mainTab, setMainTab] = useState("dashboard");
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isBorrowerDialogOpen, setIsBorrowerDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [summary, setSummary] = useState(null);
  const [vendorSearch, setExchangerSearch] = useState("");

  // Filters for All Loans tab
  const [statusFilter, setStatusFilter] = useState("");
  const [borrowerFilter, setBorrowerFilter] = useState("");
  const [principalMinFilter, setPrincipalMinFilter] = useState("");
  const [principalMaxFilter, setPrincipalMaxFilter] = useState("");
  const [outstandingMinFilter, setOutstandingMinFilter] = useState("");
  const [outstandingMaxFilter, setOutstandingMaxFilter] = useState("");

  // Borrower form (for creating new vendor/borrower)
  const [borrowerForm, setBorrowerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
  });

  // Loan form
  const [loanForm, setLoanForm] = useState({
    vendor_id: "",
    borrower_name: "",
    amount: "",
    currency: "USD",
    interest_rate: "0",
    loan_type: "short_term",
    loan_date: new Date().toISOString().split("T")[0],
    due_date: "",
    repayment_mode: "lump_sum",
    installment_amount: "",
    installment_frequency: "monthly",
    num_installments: "",
    treasury_account_id: "",
    disburse_from_vendor_id: "",
    bank_details: "",
    collateral: "",
    notes: "",
  });

  // Repayment form
  const [repaymentForm, setRepaymentForm] = useState({
    amount: "",
    currency: "USD",
    treasury_account_id: "",
    credit_to_vendor_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
    exchange_rate: "",
    amount_in_loan_currency: "",
  });

  // Swap form
  const [swapForm, setSwapForm] = useState({
    target_vendor_id: "",
    target_borrower_name: "",
    reason: "",
    adjust_terms: false,
    new_interest_rate: "",
    new_due_date: "",
  });

  const isAdmin = user?.role === "admin";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchLoans = useCallback(async () => {
    try {
      let url = `${API_URL}/api/loans?page=${currentPage}&page_size=${pageSize}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setLoans(Array.isArray(data) ? data : data.items || []);
        if (data?.total_pages) setTotalPages(data?.total_pages);
        if (data?.total) setTotalItems(data?.total);
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Failed to load loans");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, pageSize]);

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const accounts = await response.json();
        setTreasuryAccounts(accounts.filter((a) => a.status === "active"));
      }
    } catch (error) {
      console.error("Error fetching treasury accounts:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/reports/summary`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setSummary(await response.json());
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/dashboard`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setDashboard(await response.json());
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    }
  };

  const fetchExchangers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/vendors`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setExchangers(await response.json());
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchLoanTransactions = async (loanId = null) => {
    try {
      let url = `${API_URL}/api/loans/transactions?limit=100`;
      if (loanId) url += `&loan_id=${loanId}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setLoanTransactions(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchLoanDetail = async (loanId) => {
    try {
      const response = await fetch(`${API_URL}/api/loans/${loanId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setSelectedLoan(await response.json());
        setIsDetailDialogOpen(true);
      }
    } catch (error) {
      toast.error("Failed to load loan details");
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchTreasuryAccounts();
    fetchSummary();
    fetchDashboard();
    fetchExchangers();
    fetchLoanTransactions();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleCreateLoan = async (e) => {
    e.preventDefault();

    if (!loanForm.borrower_name) {
      toast.error("Please enter borrower name");
      return;
    }
    if (!loanForm.amount || parseFloat(loanForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!loanForm.treasury_account_id && !loanForm.disburse_from_vendor_id) {
      toast.error("Please select source (Treasury or Exchanger)");
      return;
    }
    if (!loanForm.due_date) {
      toast.error("Please enter due date");
      return;
    }

    setSubmittingLoan(true);
    try {
      const payload = {
        ...loanForm,
        amount: parseFloat(loanForm.amount),
        interest_rate: parseFloat(loanForm.interest_rate) || 0,
        installment_amount: loanForm.installment_amount
          ? parseFloat(loanForm.installment_amount)
          : null,
        num_installments: loanForm.num_installments
          ? parseInt(loanForm.num_installments)
          : null,
        vendor_id: loanForm.vendor_id || null,
        disburse_from_vendor_id: loanForm.disburse_from_vendor_id || null,
      };

      const response = await fetch(`${API_URL}/api/loans`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Loan created successfully");
        setIsLoanDialogOpen(false);
        resetLoanForm();
        fetchLoans();
        fetchSummary();
        fetchDashboard();
        fetchTreasuryAccounts();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create loan");
      }
    } catch (error) {
      toast.error("Failed to create loan");
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleSwapLoan = async () => {
    if (!swapForm.target_borrower_name) {
      toast.error("Please enter new borrower name");
      return;
    }

    try {
      const payload = {
        target_vendor_id: swapForm.target_vendor_id || null,
        target_borrower_name: swapForm.target_borrower_name,
        reason: swapForm.reason,
        adjust_terms: swapForm.adjust_terms,
        new_interest_rate:
          swapForm.adjust_terms && swapForm.new_interest_rate
            ? parseFloat(swapForm.new_interest_rate)
            : null,
        new_due_date: swapForm.adjust_terms ? swapForm.new_due_date : null,
      };

      const response = await fetch(
        `${API_URL}/api/loans/${selectedLoan.loan_id}/swap`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        toast.success("Loan swapped successfully");
        setIsSwapDialogOpen(false);
        setSwapForm({
          target_vendor_id: "",
          target_borrower_name: "",
          reason: "",
          adjust_terms: false,
          new_interest_rate: "",
          new_due_date: "",
        });
        fetchLoans();
        fetchDashboard();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to swap loan");
      }
    } catch (error) {
      toast.error("Failed to swap loan");
    }
  };

  const handleWriteOff = async (loanId) => {
    if (
      !window.confirm(
        "Are you sure you want to write off this loan as bad debt? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/loans/${loanId}/write-off?reason=Bad%20debt`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Loan written off successfully");
        fetchLoans();
        fetchDashboard();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to write off loan");
      }
    } catch (error) {
      toast.error("Failed to write off loan");
    }
  };

  const handleCreateBorrower = async (e) => {
    e.preventDefault();

    if (!borrowerForm.name) {
      toast.error("Please enter borrower/company name");
      return;
    }

    try {
      // Create vendor with minimal required fields
      const payload = {
        vendor_name: borrowerForm.name,
        email:
          borrowerForm.email ||
          `${borrowerForm.name.toLowerCase().replace(/\s+/g, "_")}@borrower.local`,
        password: "borrower123", // Default password for borrower accounts
        phone: borrowerForm.phone || "",
        address: borrowerForm.address || "",
        contact_person: borrowerForm.contact_person || "",
        deposit_commission_rate: 0,
        withdrawal_commission_rate: 0,
        deposit_method: "bank_transfer",
      };

      const response = await fetch(`${API_URL}/api/vendors`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Borrower company created successfully");
        setIsBorrowerDialogOpen(false);
        setBorrowerForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          contact_person: "",
        });
        fetchExchangers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create borrower");
      }
    } catch (error) {
      toast.error("Failed to create borrower");
    }
  };

  const handleRecordRepayment = async (e) => {
    e.preventDefault();

    if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (
      !repaymentForm.treasury_account_id &&
      !repaymentForm.credit_to_vendor_id
    ) {
      toast.error("Please select destination (Treasury or Exchanger)");
      return;
    }

    setSubmittingRepayment(true);
    try {
      const payload = {
        ...repaymentForm,
        amount: parseFloat(repaymentForm.amount),
        exchange_rate: repaymentForm.exchange_rate
          ? parseFloat(repaymentForm.exchange_rate)
          : null,
        amount_in_loan_currency: repaymentForm.amount_in_loan_currency
          ? parseFloat(repaymentForm.amount_in_loan_currency)
          : null,
        credit_to_vendor_id: repaymentForm.credit_to_vendor_id || null,
      };

      const response = await fetch(
        `${API_URL}/api/loans/${selectedLoan.loan_id}/repayment`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Repayment recorded. Outstanding: ${result.new_outstanding.toLocaleString()} ${selectedLoan.currency}`,
        );
        setIsRepaymentDialogOpen(false);
        resetRepaymentForm();
        fetchLoans();
        fetchSummary();
        fetchTreasuryAccounts();
        if (selectedLoan) fetchLoanDetail(selectedLoan.loan_id);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to record repayment");
      }
    } catch (error) {
      toast.error("Failed to record repayment");
    } finally {
      setSubmittingRepayment(false);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this loan? This will reverse the treasury disbursement.",
      )
    )
      return;

    try {
      const response = await fetch(`${API_URL}/api/loans/${loanId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Loan deleted");
        fetchLoans();
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Delete failed");
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const resetLoanForm = () => {
    setLoanForm({
      vendor_id: "",
      borrower_name: "",
      amount: "",
      currency: "USD",
      interest_rate: "0",
      loan_type: "short_term",
      loan_date: new Date().toISOString().split("T")[0],
      due_date: "",
      repayment_mode: "lump_sum",
      installment_amount: "",
      installment_frequency: "monthly",
      num_installments: "",
      treasury_account_id: "",
      disburse_from_vendor_id: "",
      bank_details: "",
      collateral: "",
      notes: "",
    });
    setExchangerSearch("");
  };

  const resetRepaymentForm = () => {
    setRepaymentForm({
      amount: "",
      currency: "USD",
      treasury_account_id: "",
      credit_to_vendor_id: "",
      payment_date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
      exchange_rate: "",
      amount_in_loan_currency: "",
    });
  };

  const openRepaymentDialog = (loan) => {
    setSelectedLoan(loan);
    setRepaymentForm({
      ...repaymentForm,
      currency: loan.currency,
      exchange_rate: "",
      amount_in_loan_currency: "",
    });
    setIsRepaymentDialogOpen(true);
  };

  // Auto-calculate loan currency equivalent when amount or rate changes
  const updateRepaymentCalc = (field, value) => {
    setRepaymentForm((prev) => {
      const updated = { ...prev, [field]: value };
      const amount = parseFloat(field === "amount" ? value : prev.amount) || 0;
      const rate =
        parseFloat(field === "exchange_rate" ? value : prev.exchange_rate) || 0;
      if (amount > 0 && rate > 0) {
        updated.amount_in_loan_currency = (amount * rate).toFixed(2);
      } else {
        updated.amount_in_loan_currency = "";
      }
      return updated;
    });
  };

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

    if (isOverdue) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          Overdue
        </Badge>
      );
    }

    switch (loan.status) {
      case "active":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Active
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Partially Paid
          </Badge>
        );
      case "fully_paid":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Fully Paid
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            {loan.status}
          </Badge>
        );
    }
  };

  // Apply all filters to loans
  const filteredLoans = loans.filter((loan) => {
    // Status filter (from tabs)
    if (activeTab !== "all" && loan.status !== activeTab) return false;

    // Borrower filter
    if (
      borrowerFilter &&
      !loan.borrower_name?.toLowerCase().includes(borrowerFilter.toLowerCase())
    )
      return false;

    // Principal range filter
    const principal = loan.amount || 0;
    if (principalMinFilter && principal < parseFloat(principalMinFilter))
      return false;
    if (principalMaxFilter && principal > parseFloat(principalMaxFilter))
      return false;

    // Outstanding range filter
    const outstanding = loan.outstanding_balance || 0;
    if (outstandingMinFilter && outstanding < parseFloat(outstandingMinFilter))
      return false;
    if (outstandingMaxFilter && outstanding > parseFloat(outstandingMaxFilter))
      return false;

    return true;
  });

  const clearAllFilters = () => {
    setBorrowerFilter("");
    setPrincipalMinFilter("");
    setPrincipalMaxFilter("");
    setOutstandingMinFilter("");
    setOutstandingMaxFilter("");
    setActiveTab("all");
  };

  const hasActiveFilters =
    borrowerFilter ||
    principalMinFilter ||
    principalMaxFilter ||
    outstandingMinFilter ||
    outstandingMaxFilter ||
    activeTab !== "all";

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/loans/export/excel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `loans_export_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Loans exported to Excel");
      } else {
        toast.error("Excel export failed");
      }
    } catch {
      toast.error("Excel export failed");
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/loans/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `loans_export_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Loans exported to PDF");
      } else {
        toast.error("PDF export failed");
      }
    } catch {
      toast.error("PDF export failed");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="loans-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Loan Management
          </h1>
          <p className="text-slate-500">Track loans given to other companies</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsLoanDialogOpen(true)}
            className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl glow-cyan"
            data-testid="add-loan-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 mb-4">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="borrowers"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <Users className="w-4 h-4 mr-2" /> Borrowers
          </TabsTrigger>
          <TabsTrigger
            value="loans"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <Banknote className="w-4 h-4 mr-2" /> All Loans
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <History className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {dashboard ? (
            <div className="space-y-6">
              {/* Portfolio Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Total Disbursed
                        </p>
                        <p className="text-xl font-bold font-mono text-slate-800">
                          $
                          {dashboard.portfolio_overview.total_disbursed_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Banknote className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Outstanding
                        </p>
                        <p className="text-xl font-bold font-mono text-blue-600">
                          $
                          {dashboard.portfolio_overview.total_outstanding_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-xl">
                        <PiggyBank className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Total Repaid
                        </p>
                        <p className="text-xl font-bold font-mono text-green-400">
                          $
                          {dashboard.portfolio_overview.total_repaid_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-xl">
                        <DollarSign className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Collected This Month
                        </p>
                        <p className="text-xl font-bold font-mono text-yellow-400">
                          ${dashboard.collection_this_month?.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aging Analysis */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" /> Aging Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">
                          Current (Not Due)
                        </span>
                        <span className="text-green-400 font-mono">
                          ${dashboard.aging_analysis.current?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">
                          1-30 Days Overdue
                        </span>
                        <span className="text-yellow-400 font-mono">
                          $
                          {dashboard.aging_analysis.days_1_30?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">
                          31-60 Days Overdue
                        </span>
                        <span className="text-orange-400 font-mono">
                          $
                          {dashboard.aging_analysis.days_31_60?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">
                          61-90 Days Overdue
                        </span>
                        <span className="text-red-400 font-mono">
                          $
                          {dashboard.aging_analysis.days_61_90?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">
                          90+ Days Overdue
                        </span>
                        <span className="text-red-600 font-mono font-bold">
                          $
                          {dashboard.aging_analysis.days_90_plus?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Borrowers */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" /> Top
                      Borrowers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.top_borrowers?.map((b, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <span className="text-slate-800 text-sm">
                              {b.name}
                            </span>
                            <span className="text-slate-400 text-xs ml-2">
                              ({b.loan_count} loans)
                            </span>
                          </div>
                          <span className="text-blue-600 font-mono">
                            ${b.outstanding?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {(!dashboard.top_borrowers ||
                        dashboard.top_borrowers.length === 0) && (
                        <p className="text-slate-400 text-sm text-center py-4">
                          No borrowers yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Dues */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />{" "}
                    Upcoming Dues (Next 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.upcoming_dues?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-transparent">
                          <TableHead className="text-slate-500 text-xs">
                            Borrower
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs text-right">
                            Outstanding
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs">
                            Due Date
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs text-right">
                            Days Left
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.upcoming_dues.map((d, i) => (
                          <TableRow
                            key={i}
                            className="border-slate-200 hover:bg-slate-100"
                          >
                            <TableCell className="text-slate-800 text-sm">
                              {d.borrower}
                            </TableCell>
                            <TableCell className="text-blue-600 font-mono text-sm text-right">
                              ${d.outstanding?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-slate-800 text-sm">
                              {formatDate(d.due_date)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                className={
                                  d.days_until_due <= 7
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                }
                              >
                                {d.days_until_due} days
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-6">
                      No upcoming dues in the next 30 days
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-white border-slate-200">
              <CardContent className="p-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Borrowers Tab */}
        <TabsContent value="borrowers">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Borrower Companies
                (Exchangers)
              </CardTitle>
              <Button
                onClick={() => setIsBorrowerDialogOpen(true)}
                className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl text-xs"
                data-testid="add-borrower-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Borrower
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 text-xs">
                        Company
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">
                        Total Loans
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">
                        Disbursed
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">
                        Outstanding
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs text-center">
                        Active
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((v) => (
                      <TableRow
                        key={v.vendor_id}
                        className="border-slate-200 hover:bg-slate-100"
                      >
                        <TableCell>
                          <div className="text-slate-800 font-medium">
                            {v.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {v.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-800 font-mono text-right">
                          {v.loan_stats.total_loans}
                        </TableCell>
                        <TableCell className="text-slate-800 font-mono text-right">
                          ${v.loan_stats.total_disbursed_usd?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-blue-600 font-mono text-right font-semibold">
                          $
                          {v.loan_stats.total_outstanding_usd?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              v.loan_stats.active_loans > 0
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-gray-500/20 text-gray-400"
                            }
                          >
                            {v.loan_stats.active_loans}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              v.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vendors.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-slate-400 py-8"
                        >
                          No exchangers found. Add exchangers in the Exchangers
                          module.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Loans Tab */}
        <TabsContent value="loans">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        Total Disbursed
                      </p>
                      <p className="text-xl font-bold font-mono text-slate-800">
                        ${summary.total_disbursed_usd?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Banknote className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        Outstanding
                      </p>
                      <p className="text-xl font-bold font-mono text-blue-600">
                        ${summary.total_outstanding_usd?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-cyan-500/10 rounded-xl">
                      <PiggyBank className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        Total Repaid
                      </p>
                      <p className="text-xl font-bold font-mono text-green-400">
                        ${summary.total_repaid_usd?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-xl">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        Interest Earned
                      </p>
                      <p className="text-xl font-bold font-mono text-yellow-400">
                        ${summary.total_interest_earned_usd?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-yellow-500/10 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status Summary */}
          {summary && (
            <div className="flex gap-4 flex-wrap mb-4">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                Active: {summary.status_breakdown?.active || 0}
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
                Partially Paid: {summary.status_breakdown?.partially_paid || 0}
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                Fully Paid: {summary.status_breakdown?.fully_paid || 0}
              </Badge>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
                Overdue: {summary.status_breakdown?.overdue || 0}
              </Badge>
            </div>
          )}

          {/* Loans Table Filter Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
              >
                All Loans ({loans.length})
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
              >
                Active
              </TabsTrigger>
              <TabsTrigger
                value="partially_paid"
                className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400"
              >
                Partially Paid
              </TabsTrigger>
              <TabsTrigger
                value="fully_paid"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                Fully Paid
              </TabsTrigger>
            </TabsList>

            {/* Filters Section */}
            <Card className="bg-white border-slate-200 mt-4 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600 uppercase tracking-wider">
                    Filters
                  </span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-slate-500 hover:text-slate-700 h-7 px-2"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      className="border-green-200 text-green-600 hover:bg-green-50 h-7 px-3"
                      data-testid="export-loans-excel"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPDF}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-7 px-3"
                      data-testid="export-loans-pdf"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Borrower Filter */}
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Borrower
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search borrower..."
                        value={borrowerFilter}
                        onChange={(e) => setBorrowerFilter(e.target.value)}
                        className="pl-8 h-9 border-slate-200 text-sm"
                        data-testid="borrower-filter"
                      />
                    </div>
                  </div>

                  {/* Principal Range Filter */}
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Principal Range
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={principalMinFilter}
                        onChange={(e) => setPrincipalMinFilter(e.target.value)}
                        className="h-9 border-slate-200 text-sm"
                        data-testid="principal-min-filter"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={principalMaxFilter}
                        onChange={(e) => setPrincipalMaxFilter(e.target.value)}
                        className="h-9 border-slate-200 text-sm"
                        data-testid="principal-max-filter"
                      />
                    </div>
                  </div>

                  {/* Outstanding Range Filter */}
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Outstanding Range
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={outstandingMinFilter}
                        onChange={(e) =>
                          setOutstandingMinFilter(e.target.value)
                        }
                        className="h-9 border-slate-200 text-sm"
                        data-testid="outstanding-min-filter"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={outstandingMaxFilter}
                        onChange={(e) =>
                          setOutstandingMaxFilter(e.target.value)
                        }
                        className="h-9 border-slate-200 text-sm"
                        data-testid="outstanding-max-filter"
                      />
                    </div>
                  </div>

                  {/* Status Filter (Select) */}
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Status
                    </Label>
                    <Select value={activeTab} onValueChange={setActiveTab}>
                      <SelectTrigger
                        className="h-9 border-slate-200"
                        data-testid="status-filter"
                      >
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="partially_paid">
                          Partially Paid
                        </SelectItem>
                        <SelectItem value="fully_paid">Fully Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-700">
                        {filteredLoans.length}
                      </span>{" "}
                      of {loans.length} loans
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loans Table */}
            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-12 flex justify-center">
                    <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                  </CardContent>
                </Card>
              ) : filteredLoans.length === 0 ? (
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-12 text-center">
                    <Banknote className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-500">No loans found</p>
                    <p className="text-sm text-slate-500/60 mt-2">
                      Click "New Loan" to create one
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Borrower
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                              Principal
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                              Outstanding
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                              Due
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
                          {filteredLoans.map((loan) => (
                            <TableRow
                              key={loan.loan_id}
                              className="border-slate-200 hover:bg-slate-100"
                            >
                              <TableCell>
                                <div className="text-slate-800 font-medium">
                                  {loan.borrower_name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {loan.source_treasury_name || "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="text-slate-800 font-mono text-sm">
                                  {loan.currency === "USD" ? "$" : ""}
                                  {loan.amount?.toLocaleString()}
                                  {loan.currency !== "USD"
                                    ? ` ${loan.currency}`
                                    : ""}
                                </div>
                                {loan.interest_rate > 0 && (
                                  <div className="text-[10px] text-yellow-400/80">
                                    @ {loan.interest_rate}% interest
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-blue-600 font-mono text-sm font-semibold">
                                  {loan.currency === "USD" ? "$" : ""}
                                  {loan.outstanding_balance?.toLocaleString()}
                                  {loan.currency !== "USD"
                                    ? ` ${loan.currency}`
                                    : ""}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-800 text-sm">
                                {formatDate(loan.due_date)}
                              </TableCell>
                              <TableCell>{getStatusBadge(loan)}</TableCell>
                              <TableCell>
                                <div className="flex gap-0.5 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      fetchLoanDetail(loan.loan_id)
                                    }
                                    className="text-blue-600 hover:text-blue-600 hover:bg-blue-100 h-7 w-7 p-0"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  {loan.status !== "fully_paid" &&
                                    loan.status !== "written_off" && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            openRepaymentDialog(loan)
                                          }
                                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7 w-7 p-0"
                                          title="Record Repayment"
                                        >
                                          <CreditCard className="w-3.5 h-3.5" />
                                        </Button>
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedLoan(loan);
                                              setIsSwapDialogOpen(true);
                                            }}
                                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 w-7 p-0"
                                            title="Swap/Transfer Loan"
                                          >
                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  {isAdmin &&
                                    loan.status !== "fully_paid" &&
                                    loan.status !== "written_off" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleWriteOff(loan.loan_id)
                                        }
                                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-7 w-7 p-0"
                                        title="Write Off"
                                      >
                                        <FileX className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteLoan(loan.loan_id)
                                      }
                                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                                      title="Delete Loan"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Loan Transactions
                Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 text-xs">
                        Date
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Type
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Description
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Source / Destination
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Payment Currency
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">
                        Amount (USD)
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-500 text-xs">
                        By
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanTransactions.map((tx) => (
                      <TableRow
                        key={tx.transaction_id}
                        className="border-slate-200 hover:bg-slate-100"
                      >
                        <TableCell className="text-slate-800 text-sm">
                          {formatDate(tx.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tx.transaction_type === "disbursement"
                                ? "bg-blue-500/20 text-blue-400"
                                : tx.transaction_type === "repayment"
                                  ? "bg-green-500/20 text-green-400"
                                  : tx.transaction_type === "swap_out" ||
                                      tx.transaction_type === "swap_in"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : tx.transaction_type === "write_off"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-gray-500/20 text-gray-400"
                            }
                          >
                            {tx.transaction_type?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.transaction_type === "disbursement" && (
                            <div className="flex flex-col">
                              <span className="text-red-500 text-xs font-medium">
                                Disburse From:
                              </span>
                              <span className="text-slate-700">
                                {tx.treasury_account_name ||
                                  tx.source_vendor_name ||
                                  "-"}
                              </span>
                            </div>
                          )}
                          {tx.transaction_type === "repayment" && (
                            <div className="flex flex-col">
                              <span className="text-green-500 text-xs font-medium">
                                Credit To:
                              </span>
                              <span className="text-slate-700">
                                {tx.treasury_account_name ||
                                  tx.credit_vendor_name ||
                                  "-"}
                              </span>
                            </div>
                          )}
                          {tx.transaction_type !== "disbursement" &&
                            tx.transaction_type !== "repayment" &&
                            "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge className="bg-blue-100 text-blue-700 text-xs w-fit">
                              {tx.currency || "USD"}
                            </Badge>
                            <span className="font-mono text-xs text-slate-600 mt-0.5">
                              {tx.amount?.toLocaleString()}{" "}
                              {tx.currency || "USD"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-800 font-mono text-sm text-right">
                          $
                          {tx.amount_usd?.toLocaleString() ||
                            tx.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tx.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : tx.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : tx.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                            }
                          >
                            {tx.status || "Completed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {tx.created_by_name}
                        </TableCell>
                      </TableRow>
                    ))}
                    {loanTransactions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-slate-400 py-8"
                        >
                          No transactions yet
                        </TableCell>
                      </TableRow>
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
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
      />
      {/* Create Loan Dialog */}
      <Dialog
        open={isLoanDialogOpen}
        onOpenChange={(open) => {
          setIsLoanDialogOpen(open);
          if (!open) resetLoanForm();
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Banknote className="w-6 h-6 text-blue-600" />
              New Loan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLoan} className="space-y-4">
            {/* Exchanger/Borrower Selection */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Borrower Company *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={vendorSearch}
                  onChange={(e) => setExchangerSearch(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] pl-9"
                  placeholder="Search exchanger or enter new name..."
                  data-testid="loan-borrower-search"
                />
              </div>
              {vendorSearch && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  <div
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-blue-600 flex items-center gap-2 border-b border-slate-200 text-sm"
                    onClick={() => {
                      setLoanForm({
                        ...loanForm,
                        borrower_name: vendorSearch,
                        vendor_id: "",
                      });
                    }}
                  >
                    <Plus className="w-3 h-3" /> Use "{vendorSearch}" as new
                    borrower
                  </div>
                  {vendors
                    .filter((v) =>
                      v.name.toLowerCase().includes(vendorSearch.toLowerCase()),
                    )
                    .map((v) => (
                      <div
                        key={v.vendor_id}
                        className={`px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-800 text-sm ${loanForm.vendor_id === v.vendor_id ? "bg-blue-100" : ""}`}
                        onClick={() => {
                          setLoanForm({
                            ...loanForm,
                            borrower_name: v.name,
                            vendor_id: v.vendor_id,
                          });
                          setExchangerSearch(v.name);
                        }}
                      >
                        {v.name}
                        {v.loan_stats.active_loans > 0 && (
                          <span className="text-slate-400 text-xs ml-2">
                            ({v.loan_stats.active_loans} active loans)
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
              {loanForm.borrower_name && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Selected: {loanForm.borrower_name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLoanForm({
                        ...loanForm,
                        borrower_name: "",
                        vendor_id: "",
                      });
                      setExchangerSearch("");
                    }}
                    className="h-5 px-1 text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Loan Type */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Loan Type
              </Label>
              <Select
                value={loanForm.loan_type}
                onValueChange={(value) =>
                  setLoanForm({ ...loanForm, loan_type: value })
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {loanTypes.map((lt) => (
                    <SelectItem
                      key={lt.value}
                      value={lt.value}
                      className="text-slate-800 hover:bg-slate-100"
                    >
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Amount *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={loanForm.amount}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, amount: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="loan-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Currency
                </Label>
                <Select
                  value={loanForm.currency}
                  onValueChange={(value) =>
                    setLoanForm({ ...loanForm, currency: value })
                  }
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {currencies.map((cur) => (
                      <SelectItem
                        key={cur}
                        value={cur}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Annual Interest Rate (%) - Simple Interest
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={loanForm.interest_rate}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, interest_rate: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                placeholder="0"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Loan Date *
                </Label>
                <Input
                  type="date"
                  value={loanForm.loan_date}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, loan_date: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Due Date *
                </Label>
                <Input
                  type="date"
                  value={loanForm.due_date}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, due_date: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                />
              </div>
            </div>

            {/* Repayment Mode */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Repayment Mode
              </Label>
              <Select
                value={loanForm.repayment_mode}
                onValueChange={(value) =>
                  setLoanForm({ ...loanForm, repayment_mode: value })
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {repaymentModes.map((mode) => (
                    <SelectItem
                      key={mode.value}
                      value={mode.value}
                      className="text-slate-800 hover:bg-slate-100"
                    >
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Installment Details */}
            {loanForm.repayment_mode === "emi" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    EMI Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={loanForm.installment_amount}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
                        installment_amount: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    # of EMIs
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={loanForm.num_installments}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
                        num_installments: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                    placeholder="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Frequency
                  </Label>
                  <Select
                    value={loanForm.installment_frequency}
                    onValueChange={(value) =>
                      setLoanForm({ ...loanForm, installment_frequency: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {installmentFrequencies.map((freq) => (
                        <SelectItem
                          key={freq.value}
                          value={freq.value}
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Disburse From - Treasury or Exchanger */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Disburse From *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={loanForm.treasury_account_id}
                  onValueChange={(value) =>
                    setLoanForm({
                      ...loanForm,
                      treasury_account_id: value,
                      disburse_from_vendor_id: "",
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="loan-treasury"
                  >
                    <SelectValue placeholder="Treasury Account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((acc) => (
                      <SelectItem
                        key={acc.account_id}
                        value={acc.account_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {acc.account_name} ({acc.balance?.toLocaleString()}{" "}
                        {acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={loanForm.disburse_from_vendor_id}
                  onValueChange={(value) =>
                    setLoanForm({
                      ...loanForm,
                      disburse_from_vendor_id: value,
                      treasury_account_id: "",
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="loan-vendor"
                  >
                    <SelectValue placeholder="Or Exchanger" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {vendors.map((v) => (
                      <SelectItem
                        key={v.vendor_id}
                        value={v.vendor_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(loanForm.treasury_account_id ||
                loanForm.disburse_from_vendor_id) && (
                <p className="text-xs text-blue-600">
                  Selected:{" "}
                  {loanForm.treasury_account_id
                    ? treasuryAccounts.find(
                        (a) => a.account_id === loanForm.treasury_account_id,
                      )?.account_name
                    : vendors.find(
                        (v) => v.vendor_id === loanForm.disburse_from_vendor_id,
                      )?.name}
                </p>
              )}
            </div>

            {/* Collateral */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Collateral / Security (Optional)
              </Label>
              <Input
                value={loanForm.collateral}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, collateral: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                placeholder="e.g., Property deed, Bank guarantee..."
              />
            </div>

            {/* Bank Account Details - shown when disbursing from Exchanger */}
            {loanForm.disburse_from_vendor_id && (
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Bank Account Details *
                </Label>
                <Textarea
                  value={loanForm.bank_details}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, bank_details: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  rows={3}
                  placeholder="Enter bank account details for the exchanger (Account Name, Account Number, Bank Name, IFSC/SWIFT, etc.)"
                  data-testid="loan-bank-details"
                />
                <p className="text-xs text-amber-600">
                  These details will be visible to the Exchanger for approval
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Notes
              </Label>
              <Textarea
                value={loanForm.notes}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, notes: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLoanDialogOpen(false);
                  resetLoanForm();
                }}
                className="border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingLoan}
                className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                data-testid="create-loan-btn"
              >
                {submittingLoan ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Loan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog
        open={isRepaymentDialogOpen}
        onOpenChange={(open) => {
          setIsRepaymentDialogOpen(open);
          if (!open) resetRepaymentForm();
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <CreditCard className="w-6 h-6 text-green-400" />
              Record Repayment
            </DialogTitle>
          </DialogHeader>

          {selectedLoan && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                Loan Details
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <span className="text-slate-800">
                    {selectedLoan.borrower_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Currency:</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {selectedLoan.currency}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className="text-blue-600 font-mono">
                    {selectedLoan.outstanding_balance?.toLocaleString()}{" "}
                    {selectedLoan.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleRecordRepayment} className="space-y-4">
            {/* Amount & Payment Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Payment Amount *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={repaymentForm.amount}
                  onChange={(e) =>
                    updateRepaymentCalc("amount", e.target.value)
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="repayment-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Payment Currency
                </Label>
                <Select
                  value={repaymentForm.currency}
                  onValueChange={(value) => {
                    setRepaymentForm((prev) => ({
                      ...prev,
                      currency: value,
                      exchange_rate: "",
                      amount_in_loan_currency: "",
                    }));
                  }}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {currencies.map((cur) => (
                      <SelectItem
                        key={cur}
                        value={cur}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exchange Rate Section - only shown when currencies differ */}
            {selectedLoan &&
              repaymentForm.currency !== selectedLoan.currency && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">
                    Currency Conversion
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-amber-700 text-[10px] uppercase">
                        Rate (1 {repaymentForm.currency} = ?{" "}
                        {selectedLoan.currency})
                      </Label>
                      <Input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={repaymentForm.exchange_rate}
                        onChange={(e) =>
                          updateRepaymentCalc("exchange_rate", e.target.value)
                        }
                        className="bg-white border-amber-200 text-slate-800 focus:border-amber-400 font-mono"
                        placeholder="e.g. 22.5"
                        data-testid="repayment-exchange-rate"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-amber-700 text-[10px] uppercase">
                        Equivalent in {selectedLoan.currency}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={repaymentForm.amount_in_loan_currency}
                        readOnly
                        className="bg-slate-100 border-amber-200 text-blue-700 font-mono font-bold"
                        placeholder="Auto-calculated"
                        data-testid="repayment-loan-equivalent"
                      />
                    </div>
                  </div>
                  {repaymentForm.amount &&
                    repaymentForm.exchange_rate &&
                    repaymentForm.amount_in_loan_currency && (
                      <p className="text-xs text-amber-700 text-center">
                        {parseFloat(repaymentForm.amount).toLocaleString()}{" "}
                        {repaymentForm.currency} × {repaymentForm.exchange_rate}{" "}
                        ={" "}
                        <strong>
                          {parseFloat(
                            repaymentForm.amount_in_loan_currency,
                          ).toLocaleString()}{" "}
                          {selectedLoan.currency}
                        </strong>{" "}
                        will be deducted from loan
                      </p>
                    )}
                </div>
              )}

            {/* Credit To - Treasury or Exchanger */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Credit To *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={repaymentForm.treasury_account_id}
                  onValueChange={(value) =>
                    setRepaymentForm({
                      ...repaymentForm,
                      treasury_account_id: value,
                      credit_to_vendor_id: "",
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="repayment-treasury"
                  >
                    <SelectValue placeholder="Treasury Account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((acc) => (
                      <SelectItem
                        key={acc.account_id}
                        value={acc.account_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {acc.account_name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={repaymentForm.credit_to_vendor_id}
                  onValueChange={(value) =>
                    setRepaymentForm({
                      ...repaymentForm,
                      credit_to_vendor_id: value,
                      treasury_account_id: "",
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="repayment-vendor"
                  >
                    <SelectValue placeholder="Or Exchanger" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {vendors.map((v) => (
                      <SelectItem
                        key={v.vendor_id}
                        value={v.vendor_id}
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(repaymentForm.treasury_account_id ||
                repaymentForm.credit_to_vendor_id) && (
                <p className="text-xs text-green-600">
                  Credit to:{" "}
                  {repaymentForm.treasury_account_id
                    ? treasuryAccounts.find(
                        (a) =>
                          a.account_id === repaymentForm.treasury_account_id,
                      )?.account_name
                    : vendors.find(
                        (v) =>
                          v.vendor_id === repaymentForm.credit_to_vendor_id,
                      )?.name}
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Payment Date
              </Label>
              <Input
                type="date"
                value={repaymentForm.payment_date}
                onChange={(e) =>
                  setRepaymentForm({
                    ...repaymentForm,
                    payment_date: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Reference
              </Label>
              <Input
                value={repaymentForm.reference}
                onChange={(e) =>
                  setRepaymentForm({
                    ...repaymentForm,
                    reference: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                placeholder="Payment reference..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRepaymentDialogOpen(false);
                  resetRepaymentForm();
                }}
                className="border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingRepayment}
                className="bg-green-500 hover:bg-green-600 text-slate-800 font-bold uppercase tracking-wider disabled:opacity-50"
                data-testid="record-repayment-btn"
              >
                {submittingRepayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mr-2" />
                    Recording...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Loan Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Loan Details
            </DialogTitle>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-6">
              {/* Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Borrower
                  </p>
                  <p className="text-slate-800 font-medium">
                    {selectedLoan.borrower_name}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  {getStatusBadge(selectedLoan)}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Loan Amount
                  </p>
                  <p className="text-slate-800 font-mono">
                    {selectedLoan.amount?.toLocaleString()}{" "}
                    {selectedLoan.currency}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Interest Rate
                  </p>
                  <p className="text-slate-800 font-mono">
                    {selectedLoan.interest_rate}%
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Total Interest
                  </p>
                  <p className="text-yellow-400 font-mono">
                    {selectedLoan.total_interest?.toLocaleString()}{" "}
                    {selectedLoan.currency}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Outstanding
                  </p>
                  <p className="text-blue-600 font-mono">
                    {selectedLoan.outstanding_balance?.toLocaleString()}{" "}
                    {selectedLoan.currency}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Loan Date
                  </p>
                  <p className="text-slate-800">
                    {formatDate(selectedLoan.loan_date)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Due Date
                  </p>
                  <p className="text-slate-800">
                    {formatDate(selectedLoan.due_date)}
                  </p>
                </div>
              </div>

              {/* Repayment History */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Repayment History ({selectedLoan.repayments?.length || 0})
                </h3>
                {selectedLoan.repayments?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Date
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                          Amount
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Treasury
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Reference
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLoan.repayments.map((rep) => (
                        <TableRow
                          key={rep.repayment_id}
                          className="border-slate-200 hover:bg-slate-100"
                        >
                          <TableCell className="text-slate-800 text-sm">
                            {formatDate(rep.payment_date)}
                          </TableCell>
                          <TableCell className="text-green-400 font-mono text-right">
                            +{rep.amount?.toLocaleString()} {rep.currency}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {rep.treasury_account_name}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {rep.reference || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-500 text-sm">
                    No repayments recorded yet
                  </p>
                )}
              </div>

              {/* Action Button */}
              {selectedLoan.status !== "fully_paid" && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      openRepaymentDialog(selectedLoan);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-slate-800 font-bold uppercase tracking-wider"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Record Repayment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap Loan Dialog */}
      <Dialog
        open={isSwapDialogOpen}
        onOpenChange={(open) => {
          setIsSwapDialogOpen(open);
          if (!open)
            setSwapForm({
              target_vendor_id: "",
              target_borrower_name: "",
              reason: "",
              adjust_terms: false,
              new_interest_rate: "",
              new_due_date: "",
            });
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <ArrowRightLeft className="w-6 h-6 text-purple-400" />
              Swap / Transfer Loan
            </DialogTitle>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Current Loan
                </p>
                <p className="text-slate-800 font-medium">
                  {selectedLoan.borrower_name}
                </p>
                <p className="text-blue-600 font-mono">
                  Outstanding: {selectedLoan.currency === "USD" ? "$" : ""}
                  {selectedLoan.outstanding_balance?.toLocaleString()}
                  {selectedLoan.currency !== "USD"
                    ? ` ${selectedLoan.currency}`
                    : ""}
                </p>
              </div>

              {/* New Borrower */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Transfer To (New Borrower) *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={swapForm.target_borrower_name}
                    onChange={(e) =>
                      setSwapForm({
                        ...swapForm,
                        target_borrower_name: e.target.value,
                        target_vendor_id: "",
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] pl-9"
                    placeholder="New borrower name..."
                  />
                </div>
                {swapForm.target_borrower_name &&
                  vendors.filter((v) =>
                    v.name
                      .toLowerCase()
                      .includes(swapForm.target_borrower_name.toLowerCase()),
                  ).length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto">
                      {vendors
                        .filter((v) =>
                          v.name
                            .toLowerCase()
                            .includes(
                              swapForm.target_borrower_name.toLowerCase(),
                            ),
                        )
                        .map((v) => (
                          <div
                            key={v.vendor_id}
                            className="px-3 py-1.5 cursor-pointer hover:bg-slate-100 text-slate-800 text-sm"
                            onClick={() =>
                              setSwapForm({
                                ...swapForm,
                                target_borrower_name: v.name,
                                target_vendor_id: v.vendor_id,
                              })
                            }
                          >
                            {v.name}
                          </div>
                        ))}
                    </div>
                  )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Reason for Transfer
                </Label>
                <Textarea
                  value={swapForm.reason}
                  onChange={(e) =>
                    setSwapForm({ ...swapForm, reason: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  rows={2}
                  placeholder="Business restructuring, ownership change, etc."
                />
              </div>

              {/* Adjust Terms */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adjustTerms"
                  checked={swapForm.adjust_terms}
                  onChange={(e) =>
                    setSwapForm({ ...swapForm, adjust_terms: e.target.checked })
                  }
                  className="rounded border-slate-200 bg-slate-50"
                />
                <Label
                  htmlFor="adjustTerms"
                  className="text-slate-500 text-sm cursor-pointer"
                >
                  Adjust loan terms
                </Label>
              </div>

              {swapForm.adjust_terms && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      New Interest Rate (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={swapForm.new_interest_rate}
                      onChange={(e) =>
                        setSwapForm({
                          ...swapForm,
                          new_interest_rate: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder={selectedLoan.interest_rate?.toString()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      New Due Date
                    </Label>
                    <Input
                      type="date"
                      value={swapForm.new_due_date}
                      onChange={(e) =>
                        setSwapForm({
                          ...swapForm,
                          new_due_date: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsSwapDialogOpen(false)}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSwapLoan}
                  className="bg-purple-500 hover:bg-purple-600 text-slate-800 font-bold uppercase tracking-wider"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer Loan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Borrower Dialog */}
      <Dialog
        open={isBorrowerDialogOpen}
        onOpenChange={(open) => {
          setIsBorrowerDialogOpen(open);
          if (!open)
            setBorrowerForm({
              name: "",
              email: "",
              phone: "",
              address: "",
              contact_person: "",
            });
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <Building2 className="w-6 h-6 text-blue-600" />
              Add Borrower Company
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBorrower} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Company Name *
              </Label>
              <Input
                value={borrowerForm.name}
                onChange={(e) =>
                  setBorrowerForm({ ...borrowerForm, name: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                placeholder="ABC Company Ltd"
                data-testid="borrower-name"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Contact Person
              </Label>
              <Input
                value={borrowerForm.contact_person}
                onChange={(e) =>
                  setBorrowerForm({
                    ...borrowerForm,
                    contact_person: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                placeholder="John Doe"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  type="email"
                  value={borrowerForm.email}
                  onChange={(e) =>
                    setBorrowerForm({ ...borrowerForm, email: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Phone
                </Label>
                <Input
                  value={borrowerForm.phone}
                  onChange={(e) =>
                    setBorrowerForm({ ...borrowerForm, phone: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  placeholder="+971 50 123 4567"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Address
              </Label>
              <Textarea
                value={borrowerForm.address}
                onChange={(e) =>
                  setBorrowerForm({ ...borrowerForm, address: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                rows={2}
                placeholder="Business address..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBorrowerDialogOpen(false)}
                className="border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Borrower
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
