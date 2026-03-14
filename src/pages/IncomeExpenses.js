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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import { toast } from "sonner";
import PaginationControls from "../components/PaginationControls";
import { useAuth } from "../context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  Trash2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  X,
  Store,
  Clock,
  Search,
  Building2,
  Users,
  FolderTree,
  Pencil,
  User,
  Upload,
  FileSpreadsheet,
  Download,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const currencies = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "USDT"];

export default function IncomeExpenses() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [exchangers, setExchangers] = useState([]);
  const [vendorSuppliers, setVendorSuppliers] = useState([]);
  const [ieCategories, setIeCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Vendor Suppliers state
  const [vendorSupplierDialog, setVendorSupplierDialog] = useState({
    open: false,
    mode: "create",
    data: null,
  });
  const [vendorSupplierForm, setVendorSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
    notes: "",
  });

  // IE Categories state
  const [categoryDialog, setCategoryDialog] = useState({
    open: false,
    mode: "create",
    data: null,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    category_type: "both",
    description: "",
  });

  // Import/Upload state
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importTreasuryId, setImportTreasuryId] = useState("");
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState({
    open: false,
    entry: null,
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [viewInvoiceDialog, setViewInvoiceDialog] = useState({
    open: false,
    file: null,
  });

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    treasuryAccountId: "",
    status: "",
    vendorId: "",
    entryType: "",
  });

  const [formData, setFormData] = useState({
    entry_type: "income",
    category: "",
    custom_category: "",
    amount: "",
    currency: "USD",
    base_currency: "USD",
    base_amount: "",
    exchange_rate: "",
    treasury_account_id: "",
    vendor_id: "",
    vendor_supplier_id: "",
    client_id: "",
    ie_category_id: "",
    vendor_bank_account_name: "",
    vendor_bank_account_number: "",
    vendor_bank_ifsc: "",
    vendor_bank_branch: "",
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
    transaction_mode: "bank",
    collecting_person_name: "",
    collecting_person_number: "",
  });

  // Search states for dropdowns
  const [exchangerSearch, setExchangerSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const isAdmin = user?.role === "admin";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchEntries = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        let url = `${API_URL}/api/income-expenses?page=${page}&page_size=${pageSize}`;
        if (
          activeTab !== "all" &&
          activeTab !== "reports" &&
          activeTab !== "vendors" &&
          activeTab !== "categories"
        )
          url += `&entry_type=${activeTab}`;
        if (filters.startDate) url += `&start_date=${filters.startDate}`;
        if (filters.endDate) url += `&end_date=${filters.endDate}`;
        if (filters.category) url += `&category=${filters.category}`;
        if (filters.treasuryAccountId)
          url += `&treasury_account_id=${filters.treasuryAccountId}`;
        if (filters.vendorId) url += `&vendor_id=${filters.vendorId}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (response.ok) {
          const data = await response.json();
          // Handle paginated response format
          if (data.items) {
            setEntries(data.items);
            setTotalPages(data.total_pages || 1);
            setTotalItems(data.total || 0);
            setCurrentPage(data.page || 1);
          } else {
            // Fallback for non-paginated response
            setEntries(Array.isArray(data) ? data : []);
            setTotalPages(1);
            setTotalItems(Array.isArray(data) ? data.length : 0);
          }
        }
      } catch {
        toast.error("Failed to load entries");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, filters],
  );

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const accounts = data.items || data;
        setTreasuryAccounts(accounts.filter((a) => a.status === "active"));
      }
    } catch {}
  };

  const fetchExchangers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors?page_size=200`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format
        setExchangers(data.items || (Array.isArray(data) ? data : []));
      }
    } catch {}
  };

  const fetchVendorSuppliers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendor-suppliers`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) setVendorSuppliers(await response.json());
    } catch {}
  };

  const fetchIeCategories = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/ie-categories?active_only=false`,
        { headers: getAuthHeaders() },
      );
      if (response.ok) setIeCategories(await response.json());
    } catch {}
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clients?page_size=200`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data.items || data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchBorrowers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/borrowers`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setBorrowers(data.borrowers || []);
      }
    } catch {}
  };

  const fetchSummary = async () => {
    try {
      let url = `${API_URL}/api/income-expenses/reports/summary`;
      const params = [];
      if (filters.startDate) params.push(`start_date=${filters.startDate}`);
      if (filters.endDate) params.push(`end_date=${filters.endDate}`);
      if (params.length) url += `?${params.join("&")}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) setSummary(await response.json());
    } catch {}
  };

  const fetchMonthlyData = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(
        `${API_URL}/api/income-expenses/reports/monthly?year=${year}`,
        { headers: getAuthHeaders() },
      );
      if (response.ok) setMonthlyData(await response.json());
    } catch {}
  };

  useEffect(() => {
    fetchEntries(1);
    fetchTreasuryAccounts();
    fetchExchangers();
    fetchVendorSuppliers();
    fetchIeCategories();
    fetchClients();
    fetchBorrowers();
    fetchSummary();
    fetchMonthlyData();
  }, []);

  useEffect(() => {
    fetchEntries(currentPage);
    fetchSummary();
  }, [fetchEntries, currentPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category && !formData.ie_category_id) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!formData.treasury_account_id && !formData.vendor_id) {
      toast.error("Please select an account or exchanger");
      return;
    }
    if (
      formData.base_currency !== "USD" &&
      (!formData.base_amount || !formData.exchange_rate)
    ) {
      toast.error(
        "Please enter base amount and exchange rate for non-USD currency",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) };
      if (formData.base_currency !== "USD") {
        payload.base_amount = parseFloat(formData.base_amount);
        payload.exchange_rate = parseFloat(formData.exchange_rate);
      }
      // Clean up empty fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "" || payload[key] === null) delete payload[key];
      });

      if (!payload.vendor_id) {
        delete payload.vendor_id;
        delete payload.vendor_bank_account_name;
        delete payload.vendor_bank_account_number;
        delete payload.vendor_bank_ifsc;
        delete payload.vendor_bank_branch;
      } else {
        delete payload.treasury_account_id;
      }

      const response = await fetch(`${API_URL}/api/income-expenses`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const msg = formData.vendor_id
          ? `${formData.entry_type === "income" ? "Income" : "Expense"} sent to exchanger for approval`
          : `${formData.entry_type === "income" ? "Income" : "Expense"} recorded successfully`;
        toast.success(msg);
        setIsDialogOpen(false);
        resetForm();
        fetchEntries(currentPage);
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to save entry");
      }
    } catch {
      toast.error("Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (
      !window.confirm(
        "Delete this entry? This will reverse the treasury balance change.",
      )
    )
      return;
    try {
      const response = await fetch(
        `${API_URL}/api/income-expenses/${entryId}`,
        { method: "DELETE", headers: getAuthHeaders() },
      );
      if (response.ok) {
        toast.success("Entry deleted");
        fetchEntries(currentPage);
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // Vendor Supplier CRUD
  const handleVendorSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!vendorSupplierForm.name) {
      toast.error("Name is required");
      return;
    }

    try {
      const method = vendorSupplierDialog.mode === "edit" ? "PUT" : "POST";
      const url =
        vendorSupplierDialog.mode === "edit"
          ? `${API_URL}/api/vendor-suppliers/${vendorSupplierDialog.data.supplier_id}`
          : `${API_URL}/api/vendor-suppliers`;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(vendorSupplierForm),
      });

      if (response.ok) {
        toast.success(
          vendorSupplierDialog.mode === "edit"
            ? "Vendor updated"
            : "Vendor created",
        );
        setVendorSupplierDialog({ open: false, mode: "create", data: null });
        resetVendorSupplierForm();
        fetchVendorSuppliers();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to save vendor");
      }
    } catch {
      toast.error("Failed to save vendor");
    }
  };

  const handleDeleteVendorSupplier = async (supplierId) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      const response = await fetch(
        `${API_URL}/api/vendor-suppliers/${supplierId}`,
        { method: "DELETE", headers: getAuthHeaders() },
      );
      if (response.ok) {
        toast.success("Vendor deleted");
        fetchVendorSuppliers();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // IE Category CRUD
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error("Name is required");
      return;
    }

    try {
      const method = categoryDialog.mode === "edit" ? "PUT" : "POST";
      const url =
        categoryDialog.mode === "edit"
          ? `${API_URL}/api/ie-categories/${categoryDialog.data.category_id}`
          : `${API_URL}/api/ie-categories`;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        toast.success(
          categoryDialog.mode === "edit"
            ? "Category updated"
            : "Category created",
        );
        setCategoryDialog({ open: false, mode: "create", data: null });
        resetCategoryForm();
        fetchIeCategories();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to save category");
      }
    } catch {
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      const response = await fetch(
        `${API_URL}/api/ie-categories/${categoryId}`,
        { method: "DELETE", headers: getAuthHeaders() },
      );
      if (response.ok) {
        toast.success("Category deleted");
        fetchIeCategories();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // Bulk Import Handler
  const handleBulkImport = async () => {
    if (!importFile) {
      toast.error("Please select an Excel file");
      return;
    }
    if (!importTreasuryId) {
      toast.error("Please select a treasury account");
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("treasury_account_id", importTreasuryId);

      const response = await fetch(
        `${API_URL}/api/income-expenses/bulk-import`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`Imported ${result.imported} entries successfully`);
        if (result.errors?.length > 0) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        setImportDialog(false);
        setImportFile(null);
        setImportTreasuryId("");
        fetchEntries(currentPage);
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Download Template
  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/income-expenses/export-template`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        },
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "income_expenses_template.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      toast.error("Failed to download template");
    }
  };

  // Invoice Upload Handler
  const handleInvoiceUpload = async () => {
    if (!invoiceFile || !invoiceDialog.entry) {
      toast.error("Please select a file");
      return;
    }

    setUploadingInvoice(true);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("invoice_file", invoiceFile);

      const response = await fetch(
        `${API_URL}/api/income-expenses/${invoiceDialog.entry.entry_id}/upload-invoice`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        },
      );

      if (response.ok) {
        toast.success("Invoice uploaded successfully");
        setInvoiceDialog({ open: false, entry: null });
        setInvoiceFile(null);
        fetchEntries(currentPage);
      } else {
        const err = await response.json();
        toast.error(err.detail || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingInvoice(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_type: "income",
      category: "",
      custom_category: "",
      amount: "",
      currency: "USD",
      base_currency: "USD",
      base_amount: "",
      exchange_rate: "",
      treasury_account_id: "",
      vendor_id: "",
      vendor_supplier_id: "",
      client_id: "",
      ie_category_id: "",
      vendor_bank_account_name: "",
      vendor_bank_account_number: "",
      vendor_bank_ifsc: "",
      vendor_bank_branch: "",
      description: "",
      reference: "",
      date: new Date().toISOString().split("T")[0],
      transaction_mode: "bank",
      collecting_person_name: "",
      collecting_person_number: "",
    });
    setExchangerSearch("");
    setVendorSearch("");
    setClientSearch("");
    setCategorySearch("");
  };

  const resetVendorSupplierForm = () => {
    setVendorSupplierForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      bank_name: "",
      bank_account_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      bank_branch: "",
      notes: "",
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", category_type: "both", description: "" });
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      category: "",
      treasuryAccountId: "",
      status: "",
      vendorId: "",
      entryType: "",
    });
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryLabel = (entry) => {
    if (entry.ie_category_name) return entry.ie_category_name;
    if (entry.custom_category) return entry.custom_category;
    return (
      entry.category
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) || "-"
    );
  };

  // Default categories (used if no custom categories exist)
  const defaultIncomeCategories = [
    { value: "commission", label: "Commission Income" },
    { value: "service_fee", label: "Service Fees" },
    { value: "interest", label: "Interest Income" },
    { value: "other", label: "Other Income" },
  ];

  const defaultExpenseCategories = [
    { value: "bank_fee", label: "Bank Fees" },
    { value: "transfer_charge", label: "Transfer Charges" },
    { value: "vendor_payment", label: "Exchanger Payments" },
    { value: "operational", label: "Operational Costs" },
    { value: "marketing", label: "Marketing" },
    { value: "software", label: "Software/Subscriptions" },
    { value: "other", label: "Other Expenses" },
  ];

  // Get categories based on entry type
  const getAvailableCategories = () => {
    const customCats = ieCategories.filter(
      (c) =>
        c.is_active &&
        (c.category_type === formData.entry_type || c.category_type === "both"),
    );
    if (customCats.length > 0) return customCats;
    return formData.entry_type === "income"
      ? defaultIncomeCategories
      : defaultExpenseCategories;
  };

  // Export functions
  const exportCSV = (data) => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Account/Linked",
      "Status",
      "Amount",
      "Currency",
    ];
    const rows = data.map((e) => [
      formatDate(e.date),
      e.entry_type,
      getCategoryLabel(e),
      e.description || "",
      e.vendor_name || e.treasury_account_name || "",
      e.status || "",
      e.entry_type === "income" ? e.amount : -e.amount,
      e.currency,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "income_expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportExcel = async (data) => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    const XLSX = await import("xlsx");
    const ws_data = [
      [
        "Date",
        "Type",
        "Category",
        "Description",
        "Account/Linked",
        "Status",
        "Amount",
        "Currency",
      ],
      ...data.map((e) => [
        formatDate(e.date),
        e.entry_type,
        getCategoryLabel(e),
        e.description || "",
        e.vendor_name || e.treasury_account_name || "",
        e.status || "",
        e.entry_type === "income" ? e.amount : -e.amount,
        e.currency,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income & Expenses");
    XLSX.writeFile(wb, "income_expenses.xlsx");
    toast.success("Excel exported");
  };

  const exportPDF = async (data) => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Income & Expenses Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    const tableData = data.map((e) => [
      formatDate(e.date),
      e.entry_type,
      getCategoryLabel(e),
      (e.description || "").substring(0, 30),
      e.vendor_name || e.treasury_account_name || "",
      e.status || "",
      `${e.entry_type === "income" ? "+" : "-"}${e.amount?.toLocaleString()} ${e.currency}`,
    ]);
    autoTable(doc, {
      head: [
        [
          "Date",
          "Type",
          "Category",
          "Description",
          "Account",
          "Status",
          "Amount",
        ],
      ],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 61, 145] },
    });
    doc.save("income_expenses.pdf");
    toast.success("PDF exported");
  };

  return (
    <div
      className="space-y-6 animate-fade-in"
      data-testid="income-expenses-page"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Income & Expenses
          </h1>
          <p className="text-slate-500">
            Track and manage your business income and expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialog(true)}
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
            data-testid="import-btn"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl glow-cyan"
            data-testid="add-entry-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Total Income
                  </p>
                  <p className="text-3xl font-bold font-mono text-green-400">
                    ${summary.total_income_usd?.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Total Expenses
                  </p>
                  <p className="text-3xl font-bold font-mono text-red-400">
                    ${summary.total_expense_usd?.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Net Profit/Loss
                  </p>
                  <p
                    className={`text-3xl font-bold font-mono ${summary.net_profit_usd >= 0 ? "text-blue-600" : "text-red-400"}`}
                  >
                    ${summary.net_profit_usd?.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${summary.net_profit_usd >= 0 ? "bg-blue-100" : "bg-red-500/10"}`}
                >
                  <DollarSign
                    className={`w-6 h-6 ${summary.net_profit_usd >= 0 ? "text-blue-600" : "text-red-400"}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            All Entries
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-600"
          >
            Income
          </TabsTrigger>
          <TabsTrigger
            value="expense"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-600"
          >
            Expenses
          </TabsTrigger>
          <TabsTrigger
            value="vendors"
            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600"
          >
            <Users className="w-4 h-4 mr-1" /> Vendors
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600"
          >
            <FolderTree className="w-4 h-4 mr-1" /> Categories
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Filters for entry tabs */}
        {["all", "income", "expense"].includes(activeTab) && (
          <Card className="bg-white border-slate-200 mt-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[130px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters({ ...filters, startDate: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                  />
                </div>
                <div className="flex-1 min-w-[130px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters({ ...filters, endDate: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                  />
                </div>
                {activeTab === "all" && (
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Type
                    </Label>
                    <Select
                      value={filters.entryType || "all"}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          entryType: value === "all" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="all" className="text-slate-800">
                          All Types
                        </SelectItem>
                        <SelectItem value="income" className="text-green-600">
                          Income
                        </SelectItem>
                        <SelectItem value="expense" className="text-red-600">
                          Expense
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex-1 min-w-[120px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Category
                  </Label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        category: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800">
                        All Categories
                      </SelectItem>
                      {ieCategories
                        .filter((c) => c.is_active)
                        .map((c) => (
                          <SelectItem
                            key={c.category_id}
                            value={c.name.toLowerCase()}
                            className="text-slate-800"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      {[
                        ...defaultIncomeCategories,
                        ...defaultExpenseCategories,
                      ].map((c) => (
                        <SelectItem
                          key={c.value}
                          value={c.value}
                          className="text-slate-800"
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Account / Linked
                  </Label>
                  <Select
                    value={
                      filters.vendorId
                        ? `vendor_${filters.vendorId}`
                        : filters.treasuryAccountId || "all"
                    }
                    onValueChange={(value) => {
                      if (value === "all")
                        setFilters({
                          ...filters,
                          treasuryAccountId: "",
                          vendorId: "",
                        });
                      else if (value.startsWith("vendor_"))
                        setFilters({
                          ...filters,
                          vendorId: value.replace("vendor_", ""),
                          treasuryAccountId: "",
                        });
                      else
                        setFilters({
                          ...filters,
                          treasuryAccountId: value,
                          vendorId: "",
                        });
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800">
                        All Accounts
                      </SelectItem>
                      <div className="px-2 py-1 text-xs text-blue-600 font-semibold uppercase">
                        Treasury
                      </div>
                      {treasuryAccounts.map((acc) => (
                        <SelectItem
                          key={acc.account_id}
                          value={acc.account_id}
                          className="text-slate-800"
                        >
                          {acc.account_name}
                        </SelectItem>
                      ))}
                      {exchangers.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-amber-500 font-semibold uppercase mt-1 border-t border-slate-200 pt-1">
                            Exchangers
                          </div>
                          {exchangers.map((v) => (
                            <SelectItem
                              key={v.vendor_id}
                              value={`vendor_${v.vendor_id}`}
                              className="text-slate-800"
                            >
                              {v.vendor_name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[120px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Status
                  </Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        status: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800">
                        All Statuses
                      </SelectItem>
                      <SelectItem value="active" className="text-blue-600">
                        Active
                      </SelectItem>
                      <SelectItem value="completed" className="text-green-600">
                        Completed
                      </SelectItem>
                      <SelectItem
                        value="pending_vendor"
                        className="text-amber-600"
                      >
                        Pending
                      </SelectItem>
                      <SelectItem value="rejected" className="text-red-600">
                        Rejected
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entry Tabs Content */}
        {["all", "income", "expense"].map((tabVal) => {
          // Apply client-side filters for status, vendor, entryType
          const filteredEntries = entries.filter((e) => {
            if (filters.status && e.status !== filters.status) return false;
            if (filters.vendorId && e.vendor_id !== filters.vendorId)
              return false;
            if (filters.entryType && e.entry_type !== filters.entryType)
              return false;
            return true;
          });
          return (
            <TabsContent key={tabVal} value={tabVal} className="mt-4">
              {/* Export Buttons */}
              <div className="flex justify-end gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(filteredEntries)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  data-testid="export-csv-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportExcel(filteredEntries)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  data-testid="export-xlsx-btn"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPDF(filteredEntries)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  data-testid="export-pdf-btn"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
                </Button>
              </div>
              <EntriesTable
                entries={filteredEntries}
                loading={loading}
                onDelete={handleDelete}
                isAdmin={isAdmin}
                formatDate={formatDate}
                getCategoryLabel={getCategoryLabel}
                onUploadInvoice={(entry) =>
                  setInvoiceDialog({ open: true, entry })
                }
                onViewInvoice={(file) =>
                  setViewInvoiceDialog({ open: true, file })
                }
              />

              {/* Pagination */}
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
            </TabsContent>
          );
        })}

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" /> Service Vendors
                (Suppliers)
              </CardTitle>
              <Button
                onClick={() => {
                  resetVendorSupplierForm();
                  setVendorSupplierDialog({
                    open: true,
                    mode: "create",
                    data: null,
                  });
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white"
                data-testid="add-vendor-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Vendor
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">
                Manage vendors for services like rent, utilities, office
                supplies, etc. These are different from Exchangers (money
                partners).
              </p>
              {vendorSuppliers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No vendors yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Click "Add Vendor" to create your first service vendor
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Name
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Contact
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Bank Details
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-24">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorSuppliers.map((v) => (
                      <TableRow
                        key={v.supplier_id}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {v.name}
                          </div>
                          {v.notes && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {v.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.contact_person && (
                            <p className="text-sm text-slate-800">
                              {v.contact_person}
                            </p>
                          )}
                          {v.email && (
                            <p className="text-xs text-slate-500">{v.email}</p>
                          )}
                          {v.phone && (
                            <p className="text-xs text-slate-500">{v.phone}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.bank_name && (
                            <p className="text-sm text-slate-800">
                              {v.bank_name}
                            </p>
                          )}
                          {v.bank_account_number && (
                            <p className="text-xs text-slate-500">
                              A/C: {v.bank_account_number}
                            </p>
                          )}
                          {v.bank_ifsc && (
                            <p className="text-xs text-slate-500">
                              IFSC: {v.bank_ifsc}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              v.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVendorSupplierForm({
                                  name: v.name || "",
                                  contact_person: v.contact_person || "",
                                  email: v.email || "",
                                  phone: v.phone || "",
                                  address: v.address || "",
                                  bank_name: v.bank_name || "",
                                  bank_account_name: v.bank_account_name || "",
                                  bank_account_number:
                                    v.bank_account_number || "",
                                  bank_ifsc: v.bank_ifsc || "",
                                  bank_branch: v.bank_branch || "",
                                  notes: v.notes || "",
                                });
                                setVendorSupplierDialog({
                                  open: true,
                                  mode: "edit",
                                  data: v,
                                });
                              }}
                              className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-amber-500" /> Account
                Categories
              </CardTitle>
              <Button
                onClick={() => {
                  resetCategoryForm();
                  setCategoryDialog({ open: true, mode: "create", data: null });
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                data-testid="add-category-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">
                Create custom categories to better organize your income and
                expenses.
              </p>
              {ieCategories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No custom categories yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Click "Add Category" to create your first category
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Name
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Type
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Description
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-24">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ieCategories.map((c) => (
                      <TableRow
                        key={c.category_id}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <TableCell className="font-medium text-slate-800">
                          {c.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              c.category_type === "income"
                                ? "bg-green-100 text-green-700"
                                : c.category_type === "expense"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                            }
                          >
                            {c.category_type === "both"
                              ? "Income & Expense"
                              : c.category_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {c.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              c.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }
                          >
                            {c.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCategoryForm({
                                  name: c.name || "",
                                  category_type: c.category_type || "both",
                                  description: c.description || "",
                                });
                                setCategoryDialog({
                                  open: true,
                                  mode: "edit",
                                  data: c,
                                });
                              }}
                              className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Income by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.income_by_category || {}).map(
                      ([cat, amount]) => (
                        <div
                          key={cat}
                          className="flex items-center justify-between"
                        >
                          <span className="text-slate-500 capitalize">
                            {cat.replace("_", " ")}
                          </span>
                          <span className="text-green-400 font-mono">
                            ${amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                    {Object.keys(summary.income_by_category || {}).length ===
                      0 && (
                      <p className="text-slate-500 text-sm">
                        No income recorded
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.expense_by_category || {}).map(
                      ([cat, amount]) => (
                        <div
                          key={cat}
                          className="flex items-center justify-between"
                        >
                          <span className="text-slate-500 capitalize">
                            {cat.replace("_", " ")}
                          </span>
                          <span className="text-red-400 font-mono">
                            ${amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                    {Object.keys(summary.expense_by_category || {}).length ===
                      0 && (
                      <p className="text-slate-500 text-sm">
                        No expenses recorded
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Monthly P&L ({new Date().getFullYear()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                        Month
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                        Income
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                        Expenses
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                        Net
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((row) => (
                      <TableRow
                        key={row.month}
                        className="border-slate-200 hover:bg-slate-100"
                      >
                        <TableCell className="text-slate-800">
                          {row.month}
                        </TableCell>
                        <TableCell className="text-green-400 font-mono text-right">
                          ${row.income.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-red-400 font-mono text-right">
                          ${row.expense.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`font-mono text-right ${row.net >= 0 ? "text-blue-600" : "text-red-400"}`}
                        >
                          ${row.net.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Add {formData.entry_type === "income" ? "Income" : "Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  formData.entry_type === "income" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({
                    ...formData,
                    entry_type: "income",
                    category: "",
                    ie_category_id: "",
                  })
                }
                className={
                  formData.entry_type === "income"
                    ? "bg-green-500 hover:bg-green-600 text-white flex-1"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100 flex-1"
                }
                data-testid="toggle-income"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Income
              </Button>
              <Button
                type="button"
                variant={
                  formData.entry_type === "expense" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({
                    ...formData,
                    entry_type: "expense",
                    category: "",
                    ie_category_id: "",
                  })
                }
                className={
                  formData.entry_type === "expense"
                    ? "bg-red-500 hover:bg-red-600 text-white flex-1"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100 flex-1"
                }
                data-testid="toggle-expense"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Expense
              </Button>
            </div>

            {/* Category Selection - Searchable */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Category *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] pl-9"
                  placeholder="Search category..."
                  data-testid="entry-category-search"
                />
              </div>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50">
                {/* Add New Category Option */}
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-amber-50 text-amber-600 flex items-center gap-2 border-b border-slate-200"
                  onClick={() => {
                    setCategoryDialog({
                      open: true,
                      mode: "create",
                      data: null,
                    });
                  }}
                >
                  <Plus className="w-4 h-4" /> Add new category
                </div>
                {/* Custom Categories */}
                {ieCategories
                  .filter(
                    (c) =>
                      c.is_active &&
                      (c.category_type === formData.entry_type ||
                        c.category_type === "both"),
                  )
                  .filter((c) =>
                    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
                  )
                  .map((c) => (
                    <div
                      key={c.category_id}
                      className={`px-3 py-2 cursor-pointer hover:bg-slate-100 ${formData.ie_category_id === c.category_id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          ie_category_id: c.category_id,
                          category: "",
                        });
                        setCategorySearch(c.name);
                      }}
                    >
                      <FolderTree className="w-3 h-3 inline mr-2 text-amber-500" />
                      {c.name}
                    </div>
                  ))}
                {/* Default Categories */}
                {(formData.entry_type === "income"
                  ? defaultIncomeCategories
                  : defaultExpenseCategories
                )
                  .filter((c) =>
                    c.label
                      .toLowerCase()
                      .includes(categorySearch.toLowerCase()),
                  )
                  .map((c) => (
                    <div
                      key={c.value}
                      className={`px-3 py-2 cursor-pointer hover:bg-slate-100 ${formData.category === c.value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          category: c.value,
                          ie_category_id: "",
                        });
                        setCategorySearch(c.label);
                      }}
                    >
                      {c.label}
                    </div>
                  ))}
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  {formData.base_currency !== "USD"
                    ? "Amount in USD (Auto-calculated)"
                    : "Amount in USD *"}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, amount: value });
                    }
                  }}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                  placeholder="0.00 USD"
                  data-testid="entry-amount"
                  readOnly={formData.base_currency !== "USD"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Payment Currency
                </Label>
                <Select
                  value={formData.base_currency}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      base_currency: value,
                      currency: "USD",
                      base_amount: "",
                      exchange_rate: "",
                      amount: "",
                    })
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

            {formData.base_currency !== "USD" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Amount in {formData.base_currency} *
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={formData.base_amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        const rate = parseFloat(formData.exchange_rate) || 0;
                        const usdAmount =
                          value && rate
                            ? (parseFloat(value) * rate).toFixed(2)
                            : "";
                        setFormData({
                          ...formData,
                          base_amount: value,
                          amount: usdAmount,
                        });
                      }
                    }}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder={`0.00 ${formData.base_currency}`}
                    data-testid="entry-base-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Exchange Rate (1 {formData.base_currency} = ? USD) *
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={formData.exchange_rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        const baseAmt = parseFloat(formData.base_amount) || 0;
                        const usdAmount =
                          value && baseAmt
                            ? (baseAmt * parseFloat(value)).toFixed(2)
                            : "";
                        setFormData({
                          ...formData,
                          exchange_rate: value,
                          amount: usdAmount,
                        });
                      }
                    }}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="0.0000"
                    data-testid="entry-exchange-rate"
                  />
                </div>
              </div>
            )}

            {formData.base_currency !== "USD" &&
              formData.base_amount &&
              formData.exchange_rate && (
                <p className="text-xs text-blue-600">
                  {formData.base_amount} {formData.base_currency} ×{" "}
                  {formData.exchange_rate} = {formData.amount} USD
                </p>
              )}

            {/* Account / Exchanger Selection */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                {formData.entry_type === "income"
                  ? "Credit to Account / Exchanger *"
                  : "Deduct from Account / Exchanger *"}
              </Label>
              <Select
                value={
                  formData.vendor_id
                    ? `vendor_${formData.vendor_id}`
                    : formData.treasury_account_id
                }
                onValueChange={(value) => {
                  if (value.startsWith("vendor_")) {
                    setFormData({
                      ...formData,
                      vendor_id: value.replace("vendor_", ""),
                      treasury_account_id: "",
                    });
                  } else {
                    setFormData({
                      ...formData,
                      treasury_account_id: value,
                      vendor_id: "",
                      vendor_bank_account_name: "",
                      vendor_bank_account_number: "",
                      vendor_bank_ifsc: "",
                      vendor_bank_branch: "",
                    });
                  }
                }}
              >
                <SelectTrigger
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  data-testid="entry-account"
                >
                  <SelectValue placeholder="Select account or exchanger" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <div className="px-2 py-1 text-xs text-blue-600 font-semibold uppercase tracking-wider">
                    Treasury Accounts
                  </div>
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
                  {exchangers.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-amber-500 font-semibold uppercase tracking-wider mt-2 border-t border-slate-200 pt-2">
                        Exchangers (Requires Approval)
                      </div>
                      {exchangers.map((v) => (
                        <SelectItem
                          key={v.vendor_id}
                          value={`vendor_${v.vendor_id}`}
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          <span className="flex items-center gap-2">
                            <Store className="w-3 h-3 text-amber-500" />
                            {v.vendor_name}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Exchanger Bank Account (when vendor selected) */}
            {formData.vendor_id && (
              <>
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-600">
                  <Clock className="w-3 h-3 inline mr-1" /> This entry will be
                  sent to exchanger for approval before treasury is updated
                </div>

                {/* Transaction Mode for Exchanger */}
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Transaction Mode *
                  </Label>
                  <Select
                    value={formData.transaction_mode}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        transaction_mode: value,
                        collecting_person_name: "",
                        collecting_person_number: "",
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="ie-tx-mode"
                    >
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="bank" className="text-slate-800">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cash" className="text-slate-800">
                        Cash
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash collecting person details */}
                {formData.transaction_mode === "cash" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="space-y-1">
                      <Label className="text-amber-700 text-xs uppercase">
                        Collecting Person Name
                      </Label>
                      <Input
                        value={formData.collecting_person_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            collecting_person_name: e.target.value,
                          })
                        }
                        className="bg-white border-amber-200 text-slate-800"
                        placeholder="Full name"
                        data-testid="ie-collecting-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-amber-700 text-xs uppercase">
                        Collecting Person Number
                      </Label>
                      <Input
                        value={formData.collecting_person_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            collecting_person_number: e.target.value,
                          })
                        }
                        className="bg-white border-amber-200 text-slate-800"
                        placeholder="Phone number"
                        data-testid="ie-collecting-number"
                      />
                    </div>
                  </div>
                )}

                {formData.transaction_mode !== "cash" && (
                  <div className="space-y-3 p-3 bg-slate-50/50 border border-slate-200 rounded">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Exchanger Bank Details
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] uppercase">
                          Account Holder Name
                        </Label>
                        <Input
                          value={formData.vendor_bank_account_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vendor_bank_account_name: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] h-8 text-sm"
                          placeholder="Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] uppercase">
                          Account Number
                        </Label>
                        <Input
                          value={formData.vendor_bank_account_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vendor_bank_account_number: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] h-8 text-sm"
                          placeholder="Account number"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] uppercase">
                          IFSC Code
                        </Label>
                        <Input
                          value={formData.vendor_bank_ifsc}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vendor_bank_ifsc: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] h-8 text-sm"
                          placeholder="IFSC code"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] uppercase">
                          Branch
                        </Label>
                        <Input
                          value={formData.vendor_bank_branch}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vendor_bank_branch: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] h-8 text-sm"
                          placeholder="Branch name"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Linked Entities (Client, Vendor Supplier) - Optional */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Link to (Optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Client */}
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Client
                  </Label>
                  <Select
                    value={formData.client_id || "none"}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        client_id: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-48">
                      <SelectItem value="none" className="text-slate-400">
                        None
                      </SelectItem>
                      {clients.map((c) => (
                        <SelectItem
                          key={c.client_id}
                          value={c.client_id}
                          className="text-slate-800"
                        >
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Vendor Supplier */}
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Vendor (Supplier)
                  </Label>
                  <Select
                    value={formData.vendor_supplier_id || "none"}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        vendor_supplier_id: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-48">
                      <SelectItem value="none" className="text-slate-400">
                        None
                      </SelectItem>
                      <div
                        className="px-2 py-1.5 text-xs text-purple-600 cursor-pointer hover:bg-purple-50 flex items-center gap-1"
                        onClick={() =>
                          setVendorSupplierDialog({
                            open: true,
                            mode: "create",
                            data: null,
                          })
                        }
                      >
                        <Plus className="w-3 h-3" /> Add new vendor
                      </div>
                      {vendorSuppliers
                        .filter((v) => v.status === "active")
                        .map((v) => (
                          <SelectItem
                            key={v.supplier_id}
                            value={v.supplier_id}
                            className="text-slate-800"
                          >
                            {v.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Date
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
              />
            </div>

            {/* Description */}
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
                placeholder="Enter description..."
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Reference / Invoice #
              </Label>
              <Input
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                placeholder="INV-001, REF-123, etc."
              />
            </div>

            {/* Buttons */}
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
                disabled={submitting}
                className={`${formData.entry_type === "income" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white font-bold uppercase tracking-wider disabled:opacity-50`}
                data-testid="save-entry-btn"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : formData.vendor_id ? (
                  "Send for Approval"
                ) : (
                  `Save ${formData.entry_type === "income" ? "Income" : "Expense"}`
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Vendor Supplier Dialog */}
      <Dialog
        open={vendorSupplierDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setVendorSupplierDialog({
              open: false,
              mode: "create",
              data: null,
            });
            resetVendorSupplierForm();
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />{" "}
              {vendorSupplierDialog.mode === "edit" ? "Edit" : "Add"} Vendor
              (Supplier)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVendorSupplierSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Name *
              </Label>
              <Input
                value={vendorSupplierForm.name}
                onChange={(e) =>
                  setVendorSupplierForm({
                    ...vendorSupplierForm,
                    name: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800"
                placeholder="e.g., Office Rent - Building A"
                data-testid="vendor-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Contact Person
                </Label>
                <Input
                  value={vendorSupplierForm.contact_person}
                  onChange={(e) =>
                    setVendorSupplierForm({
                      ...vendorSupplierForm,
                      contact_person: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Phone
                </Label>
                <Input
                  value={vendorSupplierForm.phone}
                  onChange={(e) =>
                    setVendorSupplierForm({
                      ...vendorSupplierForm,
                      phone: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                type="email"
                value={vendorSupplierForm.email}
                onChange={(e) =>
                  setVendorSupplierForm({
                    ...vendorSupplierForm,
                    email: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800"
                placeholder="vendor@example.com"
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                Bank Details
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-[10px] uppercase">
                      Bank Name
                    </Label>
                    <Input
                      value={vendorSupplierForm.bank_name}
                      onChange={(e) =>
                        setVendorSupplierForm({
                          ...vendorSupplierForm,
                          bank_name: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                      placeholder="HSBC"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-[10px] uppercase">
                      Account Holder
                    </Label>
                    <Input
                      value={vendorSupplierForm.bank_account_name}
                      onChange={(e) =>
                        setVendorSupplierForm({
                          ...vendorSupplierForm,
                          bank_account_name: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                      placeholder="Account holder name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-[10px] uppercase">
                      Account Number
                    </Label>
                    <Input
                      value={vendorSupplierForm.bank_account_number}
                      onChange={(e) =>
                        setVendorSupplierForm({
                          ...vendorSupplierForm,
                          bank_account_number: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-[10px] uppercase">
                      IFSC Code
                    </Label>
                    <Input
                      value={vendorSupplierForm.bank_ifsc}
                      onChange={(e) =>
                        setVendorSupplierForm({
                          ...vendorSupplierForm,
                          bank_ifsc: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                      placeholder="HSBC001"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase">
                    Branch
                  </Label>
                  <Input
                    value={vendorSupplierForm.bank_branch}
                    onChange={(e) =>
                      setVendorSupplierForm({
                        ...vendorSupplierForm,
                        bank_branch: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                    placeholder="Main Branch"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Notes
              </Label>
              <Textarea
                value={vendorSupplierForm.notes}
                onChange={(e) =>
                  setVendorSupplierForm({
                    ...vendorSupplierForm,
                    notes: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setVendorSupplierDialog({
                    open: false,
                    mode: "create",
                    data: null,
                  });
                  resetVendorSupplierForm();
                }}
                className="border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold"
                data-testid="save-vendor-btn"
              >
                {vendorSupplierDialog.mode === "edit" ? "Update" : "Create"}{" "}
                Vendor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog
        open={categoryDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryDialog({ open: false, mode: "create", data: null });
            resetCategoryForm();
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-amber-500" />{" "}
              {categoryDialog.mode === "edit" ? "Edit" : "Add"} Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Name *
              </Label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="bg-slate-50 border-slate-200 text-slate-800"
                placeholder="e.g., Office Supplies"
                data-testid="category-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Type
              </Label>
              <Select
                value={categoryForm.category_type}
                onValueChange={(v) =>
                  setCategoryForm({ ...categoryForm, category_type: v })
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="both" className="text-slate-800">
                    Both (Income & Expense)
                  </SelectItem>
                  <SelectItem value="income" className="text-slate-800">
                    Income Only
                  </SelectItem>
                  <SelectItem value="expense" className="text-slate-800">
                    Expense Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Description
              </Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                className="bg-slate-50 border-slate-200 text-slate-800"
                rows={2}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCategoryDialog({
                    open: false,
                    mode: "create",
                    data: null,
                  });
                  resetCategoryForm();
                }}
                className="border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                data-testid="save-category-btn"
              >
                {categoryDialog.mode === "edit" ? "Update" : "Create"} Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog
        open={importDialog}
        onOpenChange={(open) => {
          if (!open) {
            setImportDialog(false);
            setImportFile(null);
            setImportTreasuryId("");
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-500" /> Import from
              Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm text-blue-700">
              <p className="font-medium mb-1">Excel Format:</p>
              <p className="text-xs">
                Columns: Entry Type, Category, Amount, Currency, Date,
                Description, Reference
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={downloadTemplate}
                className="text-blue-600 p-0 h-auto mt-1"
              >
                <Download className="w-3 h-3 mr-1" /> Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Treasury Account *
              </Label>
              <Select
                value={importTreasuryId}
                onValueChange={setImportTreasuryId}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                  <SelectValue placeholder="Select treasury account" />
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
              {treasuryAccounts.length === 0 && (
                <p className="text-xs text-amber-600">
                  No treasury accounts found. Please create one in Treasury
                  first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                Excel File *
              </Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#1FA21B] transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  {importFile ? (
                    <p className="text-sm text-slate-800 font-medium">
                      {importFile.name}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Click to select Excel file
                    </p>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialog(false);
                  setImportFile(null);
                  setImportTreasuryId("");
                }}
                className="border-slate-200 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={importing || !importFile || !importTreasuryId}
                className="bg-green-500 hover:bg-green-600 text-white font-bold"
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Invoice Dialog */}
      <Dialog
        open={invoiceDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceDialog({ open: false, entry: null });
            setInvoiceFile(null);
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" /> Upload Invoice /
              Document
            </DialogTitle>
          </DialogHeader>
          {invoiceDialog.entry && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-400 uppercase">Entry</p>
                <p className="font-medium text-slate-800">
                  {invoiceDialog.entry.description || "No description"}
                </p>
                <p className="text-sm text-slate-500">
                  {invoiceDialog.entry.amount?.toLocaleString()}{" "}
                  {invoiceDialog.entry.currency}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Select File
                </Label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setInvoiceFile(e.target.files[0])}
                    className="hidden"
                    id="invoice-file"
                  />
                  <label htmlFor="invoice-file" className="cursor-pointer">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {invoiceFile ? (
                      <p className="text-sm text-slate-800 font-medium">
                        {invoiceFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">
                          Click to select file
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PDF, Images, or Documents
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInvoiceDialog({ open: false, entry: null });
                    setInvoiceFile(null);
                  }}
                  className="border-slate-200 text-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvoiceUpload}
                  disabled={uploadingInvoice || !invoiceFile}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
                >
                  {uploadingInvoice ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        open={viewInvoiceDialog.open}
        onOpenChange={(open) => {
          if (!open) setViewInvoiceDialog({ open: false, file: null });
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Invoice Preview
            </DialogTitle>
          </DialogHeader>
          {viewInvoiceDialog.file && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Filename: {viewInvoiceDialog.file.filename}
              </p>
              {viewInvoiceDialog.file.url ? (
                viewInvoiceDialog.file.content_type?.startsWith("image/") ? (
                  <img
                    src={viewInvoiceDialog.file.url}
                    alt="Invoice"
                    className="max-w-full max-h-[60vh] object-contain mx-auto rounded"
                  />
                ) : viewInvoiceDialog.file.content_type ===
                  "application/pdf" ? (
                  <iframe
                    src={viewInvoiceDialog.file.url}
                    className="w-full h-[60vh] rounded"
                    title="Invoice PDF"
                  />
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <a
                      href={viewInvoiceDialog.file.url}
                      download={viewInvoiceDialog.file.filename}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Download File
                    </a>
                  </div>
                )
              ) : viewInvoiceDialog.file.content_type?.startsWith("image/") ? (
                <img
                  src={`data:${viewInvoiceDialog.file.content_type};base64,${viewInvoiceDialog.file.data}`}
                  alt="Invoice"
                  className="max-w-full max-h-[60vh] object-contain mx-auto rounded"
                />
              ) : viewInvoiceDialog.file.content_type === "application/pdf" ? (
                <iframe
                  src={`data:application/pdf;base64,${viewInvoiceDialog.file.data}`}
                  className="w-full h-[60vh] rounded"
                  title="Invoice PDF"
                />
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">
                    Preview not available for this file type
                  </p>
                  <a
                    href={`data:${viewInvoiceDialog.file.content_type};base64,${viewInvoiceDialog.file.data}`}
                    download={viewInvoiceDialog.file.filename}
                    className="text-blue-600 text-sm hover:underline mt-2 inline-block"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Entries Table Component with visual distinction & convert-to-loan
function EntriesTable({
  entries,
  loading,
  onDelete,
  isAdmin,
  formatDate,
  getCategoryLabel,
  onUploadInvoice,
  onViewInvoice,
}) {
  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (entries.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-500">No entries found</p>
          <p className="text-sm text-slate-500/60 mt-2">
            Click "Add Entry" to record income or expenses
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (entry) => {
    if (entry.converted_to_loan)
      return (
        <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-[10px]">
          Loan
        </Badge>
      );
    if (entry.status === "pending_vendor")
      return (
        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
          <Clock className="w-2.5 h-2.5 mr-1" />
          Pending
        </Badge>
      );
    if (entry.status === "rejected")
      return (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px]">
          Rejected
        </Badge>
      );
    if (entry.status === "completed")
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">
          Completed
        </Badge>
      );
    if (entry.status === "active")
      return (
        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-[10px]">
          Active
        </Badge>
      );
    return (
      <Badge className="bg-slate-200 text-slate-600 text-[10px]">
        {entry.status || "-"}
      </Badge>
    );
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Date
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Type
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Category
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Description
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Account / Linked
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Status
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Payment Currency
                </TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                  Amount (USD)
                </TableHead>
                {isAdmin && (
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-24">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isIncome = entry.entry_type === "income";
                const borderColor = isIncome
                  ? "border-l-green-500"
                  : "border-l-red-500";
                const isConverted = entry.converted_to_loan;
                const paymentCurrency =
                  entry.base_currency || entry.currency || "USD";
                const paymentAmount = entry.base_amount || entry.amount;
                return (
                  <TableRow
                    key={entry.entry_id}
                    className={`border-slate-200 hover:bg-slate-100 border-l-4 ${borderColor} ${isConverted ? "opacity-50" : ""}`}
                    data-testid={`entry-row-${entry.entry_id}`}
                  >
                    <TableCell className="text-slate-800 text-sm">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isIncome
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : "bg-red-500/20 text-red-600 border-red-500/30"
                        }
                      >
                        {isIncome ? (
                          <>
                            <ArrowDownRight className="w-3 h-3 mr-1" /> Income
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 mr-1" /> Expense
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {getCategoryLabel(entry)}
                    </TableCell>
                    <TableCell className="text-slate-800 text-sm max-w-[200px] truncate">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.vendor_name ? (
                        <div>
                          <span className="flex items-center gap-1 text-amber-500">
                            <Store className="w-3 h-3" />
                            {entry.vendor_name}
                          </span>
                          {entry.vendor_bank_account_number && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              A/C: {entry.vendor_bank_account_number}
                            </p>
                          )}
                        </div>
                      ) : entry.treasury_account_name ? (
                        <span className="text-blue-600">
                          {entry.treasury_account_name}
                        </span>
                      ) : (
                        "-"
                      )}
                      {/* Show linked entities */}
                      {entry.client_name && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Client: {entry.client_name}
                        </p>
                      )}
                      {entry.vendor_supplier_name && (
                        <p className="text-[10px] text-purple-500 mt-0.5">
                          Vendor: {entry.vendor_supplier_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge className="bg-blue-100 text-blue-700 text-xs w-fit">
                          {paymentCurrency}
                        </Badge>
                        <span
                          className={`font-mono text-xs mt-0.5 ${isIncome ? "text-green-600" : "text-red-600"}`}
                        >
                          {isIncome ? "+" : "-"}
                          {paymentAmount?.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`font-mono text-right ${isIncome ? "text-green-600" : "text-red-600"}`}
                    >
                      {isIncome ? "+" : "-"}
                      {entry.amount?.toLocaleString()} USD
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Invoice upload/view */}
                          {entry.invoice_file ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewInvoice(entry.invoice_file)}
                              className="text-green-600 hover:bg-green-50 h-7 px-2"
                              title="View Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUploadInvoice(entry)}
                              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-7 px-2"
                              title="Upload Invoice"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {!isConverted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(entry.entry_id)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-50 h-7 px-2"
                              title="Delete Entry"
                              data-testid={`delete-entry-${entry.entry_id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
