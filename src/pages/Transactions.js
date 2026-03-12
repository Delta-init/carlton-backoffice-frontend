import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import PaginationControls from "../components/PaginationControls";

import { Badge } from "../components/ui/badge";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Image as ImageIcon,
  CreditCard,
  Store,
  Building2,
  Wallet,
  Check,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  Edit,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const transactionTypes = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "transfer", label: "Transfer" },
  { value: "commission", label: "Commission" },
  { value: "rebate", label: "Rebate" },
  { value: "adjustment", label: "Adjustment" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function ClientServerSearch({
  clients: preloadedClients,
  value,
  onChange,
  open,
  onOpenChange,
  authHeaders,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const inputRef = useRef(null);

  const selected =
    selectedClient || preloadedClients.find((c) => c.client_id === value);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults(preloadedClients.slice(0, 50));
      return;
    }
    const hdrs = authHeaders();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/api/clients?search=${encodeURIComponent(searchTerm)}&page_size=50`,
          { headers: hdrs, signal: controller.signal },
        );
        if (res.ok) {
          const d = await res.json();
          setSearchResults(d.items || []);
        }
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      setSearchResults(preloadedClients.slice(0, 50));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-800"
          data-testid="select-client"
        >
          {selected
            ? `${selected.first_name} ${selected.last_name}`
            : "Search & select client..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-white border-slate-200"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-slate-800"
            data-testid="client-search-input"
          />
          {searching && (
            <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {searchResults.length === 0 ? (
            <div className="text-slate-500 text-sm py-4 text-center">
              {searching
                ? "Searching..."
                : searchTerm.length >= 2
                  ? "No client found."
                  : "Type to search..."}
            </div>
          ) : (
            searchResults.map((client) => (
              <div
                key={client.client_id}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
                onClick={() => {
                  onChange(client.client_id, client);
                  setSelectedClient(client);
                }}
                data-testid={`client-option-${client.client_id}`}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${value === client.client_id ? "opacity-100 text-blue-600" : "opacity-0"}`}
                />
                <div>
                  <span className="font-medium">
                    {client.first_name} {client.last_name}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    {client.email}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [vendors, setExchangers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [clientBankAccounts, setClientBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState("new");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [destEditTx, setDestEditTx] = useState(null);
  const [destForm, setDestForm] = useState({
    destination_type: "",
    vendor_id: "",
    destination_account_id: "",
    description: "",
    crm_reference: "",
  });
  const [destSaving, setDestSaving] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [formData, setFormData] = useState({
    client_id: "",
    transaction_type: "deposit",
    amount: "",
    currency: "USD",
    base_currency: "USD",
    base_amount: "",
    exchange_rate: "",
    destination_type: "treasury",
    destination_account_id: "",
    psp_id: "",
    vendor_id: "",
    commission_paid_by: "client",
    description: "",
    reference: "",
    transaction_mode: "bank",
    collecting_person_name: "",
    collecting_person_number: "",
    // Client bank details (for withdrawal to bank)
    client_bank_name: "",
    client_bank_account_name: "",
    client_bank_account_number: "",
    client_bank_swift_iban: "",
    client_bank_currency: "USD",
    // Client USDT details (for withdrawal to USDT)
    client_usdt_address: "",
    client_usdt_network: "",
  });

  const currencies = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "USDT"];

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchTransactions = async (page = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (typeFilter && typeFilter !== "all")
        params.append("transaction_type", typeFilter);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await fetch(
        `${API_URL}/api/transactions?${params.toString()}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Handle both paginated and array responses
        if (Array.isArray(data)) {
          setTransactions(data);
          setTotalItems(data.length);
          setTotalPages(1);
        } else {
          setTransactions(data.items || []);
          setTotalItems(data.total || 0);
          setTotalPages(data.total_pages || 1);
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
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

  const fetchPsps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psp`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setPsps(await response.json());
      }
    } catch (error) {
      console.error("Error fetching PSPs:", error);
    }
  };

  const fetchExchangers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors?page_size=200`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format
        setExchangers(data.items || (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  // Unified form data fetch — only requires Transaction permission
  const fetchFormDropdowns = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/form-data`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setTreasuryAccounts(data.treasury_accounts || []);
        setPsps(data.psps || []);
        setExchangers(data.vendors || []);
        return;
      }
    } catch (error) {
      console.error("Error fetching form dropdowns:", error);
    }
    // Fallback to individual calls if unified endpoint fails
    fetchClients();
    fetchTreasuryAccounts();
    fetchPsps();
    fetchExchangers();
  };

  const fetchClientBankAccounts = async (clientId) => {
    if (!clientId) {
      setClientBankAccounts([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/api/clients/${clientId}/bank-accounts`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      if (response.ok) {
        setClientBankAccounts(await response.json());
      }
    } catch (error) {
      console.error("Error fetching client bank accounts:", error);
      setClientBankAccounts([]);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchTreasuryAccounts();
    fetchPsps();
    fetchExchangers();
  }, [typeFilter, statusFilter]);

  // Auto-refresh: when user returns to tab or every 30s
  useAutoRefresh(fetchTransactions, 30000);

  // Fetch client bank accounts when client changes and destination is bank or vendor
  useEffect(() => {
    if (
      formData.client_id &&
      (formData.destination_type === "bank" ||
        formData.destination_type === "vendor")
    ) {
      fetchClientBankAccounts(formData.client_id);
    }
  }, [formData.client_id, formData.destination_type]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("client_id", formData.client_id);
      formDataToSend.append("transaction_type", formData.transaction_type);
      formDataToSend.append("amount", formData.amount);
      formDataToSend.append("currency", "USD");
      formDataToSend.append("base_currency", formData.base_currency);
      formDataToSend.append("destination_type", formData.destination_type);
      if (formData.base_currency !== "USD" && formData.base_amount) {
        formDataToSend.append("base_amount", formData.base_amount);
        if (formData.exchange_rate) {
          formDataToSend.append("exchange_rate", formData.exchange_rate);
        }
      }
      if (
        (formData.destination_type === "treasury" ||
          formData.destination_type === "usdt") &&
        formData.destination_account_id
      ) {
        formDataToSend.append(
          "destination_account_id",
          formData.destination_account_id,
        );
      }
      if (formData.destination_type === "psp" && formData.psp_id) {
        formDataToSend.append("psp_id", formData.psp_id);
        formDataToSend.append(
          "commission_paid_by",
          formData.commission_paid_by,
        );
      }
      if (formData.destination_type === "vendor" && formData.vendor_id) {
        formDataToSend.append("vendor_id", formData.vendor_id);
        // Also include client bank details for vendor withdrawals
        if (formData.transaction_type === "withdrawal") {
          formDataToSend.append("client_bank_name", formData.client_bank_name);
          formDataToSend.append(
            "client_bank_account_name",
            formData.client_bank_account_name,
          );
          formDataToSend.append(
            "client_bank_account_number",
            formData.client_bank_account_number,
          );
          formDataToSend.append(
            "client_bank_swift_iban",
            formData.client_bank_swift_iban,
          );
          formDataToSend.append(
            "client_bank_currency",
            formData.client_bank_currency,
          );
        }
      }
      // Client bank details (for withdrawal to bank)
      if (formData.destination_type === "bank") {
        formDataToSend.append("client_bank_name", formData.client_bank_name);
        formDataToSend.append(
          "client_bank_account_name",
          formData.client_bank_account_name,
        );
        formDataToSend.append(
          "client_bank_account_number",
          formData.client_bank_account_number,
        );
        formDataToSend.append(
          "client_bank_swift_iban",
          formData.client_bank_swift_iban,
        );
        formDataToSend.append(
          "client_bank_currency",
          formData.client_bank_currency,
        );
        // Flag to save bank details to client profile
        if (selectedBankAccount === "new") {
          formDataToSend.append("save_bank_to_client", "true");
        }
      }
      // Client USDT details (for withdrawal to USDT)
      if (
        formData.destination_type === "usdt" &&
        formData.transaction_type === "withdrawal"
      ) {
        formDataToSend.append(
          "client_usdt_address",
          formData.client_usdt_address,
        );
        formDataToSend.append(
          "client_usdt_network",
          formData.client_usdt_network,
        );
      }
      if (formData.description) {
        formDataToSend.append("description", formData.description);
      }
      if (formData.reference) {
        formDataToSend.append("reference", formData.reference);
      }
      if (formData.crm_reference) {
        formDataToSend.append("crm_reference", formData.crm_reference);
      }
      // Transaction mode and collecting person
      formDataToSend.append(
        "transaction_mode",
        formData.transaction_mode || "bank",
      );
      if (formData.transaction_mode === "cash") {
        if (formData.collecting_person_name)
          formDataToSend.append(
            "collecting_person_name",
            formData.collecting_person_name,
          );
        if (formData.collecting_person_number)
          formDataToSend.append(
            "collecting_person_number",
            formData.collecting_person_number,
          );
      }
      if (proofImage) {
        formDataToSend.append("proof_image", proofImage);
      }

      const response = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success("Transaction created");
        setIsDialogOpen(false);
        resetForm();
        fetchTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Operation failed");
      }
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      transaction_type: "deposit",
      amount: "",
      currency: "USD",
      base_currency: "USD",
      base_amount: "",
      exchange_rate: "",
      destination_type: "treasury",
      destination_account_id: "",
      psp_id: "",
      vendor_id: "",
      commission_paid_by: "client",
      description: "",
      reference: "",
      client_bank_name: "",
      client_bank_account_name: "",
      client_bank_account_number: "",
      client_bank_swift_iban: "",
      client_bank_currency: "USD",
      client_usdt_address: "",
      client_usdt_network: "",
    });
    setProofImage(null);
    setProofPreview(null);
    setSelectedBankAccount("new");
    setClientBankAccounts([]);
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "status-approved",
      completed: "status-approved",
      pending: "status-pending",
      rejected: "status-rejected",
      cancelled: "status-rejected",
      failed: "status-rejected",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
    );
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

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.client_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : clientId;
  };

  const openDestEdit = (tx) => {
    setDestForm({
      destination_type: tx.destination_type || "",
      vendor_id: tx.vendor_id || "",
      destination_account_id: tx.destination_account_id || "",
      description: tx.description || "",
      crm_reference: tx.crm_reference || "",
    });
    setDestEditTx(tx);
  };

  const handleSaveDest = async () => {
    if (!destEditTx) return;
    setDestSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${destEditTx.transaction_id}/assign`,
        {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(destForm),
        },
      );
      if (response.ok) {
        toast.success("Destination updated");
        setDestEditTx(null);
        fetchTransactions();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setDestSaving(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const clientName = (
      tx.client_name || getClientName(tx.client_id)
    ).toLowerCase();
    const ref = (tx.reference || "").toLowerCase();
    const crmRef = (tx.crm_reference || "").toLowerCase();
    const matchesType =
      typeFilter === "all" || tx.transaction_type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesSearch =
      clientName.includes(searchTerm.toLowerCase()) ||
      ref.includes(searchTerm.toLowerCase()) ||
      crmRef.includes(searchTerm.toLowerCase());
    const matchesDestination =
      destinationFilter === "all" || tx.destination_type === destinationFilter;

    // Date filters
    let matchesDate = true;
    if (dateFrom) {
      const txDate = new Date(tx.created_at).toISOString().split("T")[0];
      matchesDate = matchesDate && txDate >= dateFrom;
    }
    if (dateTo) {
      const txDate = new Date(tx.created_at).toISOString().split("T")[0];
      matchesDate = matchesDate && txDate <= dateTo;
    }

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesDestination &&
      matchesDate
    );
  });

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

  // Download functions
  const downloadCSV = () => {
    const headers = [
      "Date",
      "Client",
      "Type",
      "Amount",
      "Currency",
      "USD Equivalent",
      "Status",
      "Destination",
      "Reference",
      "Description",
    ];
    const rows = filteredTransactions.map((tx) => [
      formatDate(tx.created_at),
      tx.client_name || getClientName(tx.client_id),
      tx.transaction_type,
      tx.amount,
      tx.currency,
      tx.amount_usd || tx.amount,
      tx.status,
      tx.destination_type === "treasury"
        ? tx.treasury_account_name
        : tx.destination_type === "psp"
          ? tx.psp_name
          : tx.destination_type === "vendor"
            ? tx.vendor_name
            : tx.destination_type,
      tx.reference || "",
      tx.description || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV report downloaded");
  };

  const downloadExcel = () => {
    // Create a simple Excel-compatible HTML table
    const headers = [
      "Date",
      "Client",
      "Type",
      "Amount",
      "Currency",
      "USD Equivalent",
      "Status",
      "Destination",
      "Reference",
      "Description",
    ];
    const rows = filteredTransactions.map((tx) => [
      formatDate(tx.created_at),
      tx.client_name || getClientName(tx.client_id),
      tx.transaction_type,
      tx.amount,
      tx.currency,
      tx.amount_usd || tx.amount,
      tx.status,
      tx.destination_type === "treasury"
        ? tx.treasury_account_name
        : tx.destination_type === "psp"
          ? tx.psp_name
          : tx.destination_type === "vendor"
            ? tx.vendor_name
            : tx.destination_type,
      tx.reference || "",
      tx.description || "",
    ]);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead><tr>${headers.map((h) => `<th style="background:#141414;color:#fff;font-weight:bold;">${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Excel report downloaded");
  };

  const downloadPDF = () => {
    // Generate a printable HTML page
    const headers = [
      "Date",
      "Client",
      "Type",
      "Amount",
      "Currency",
      "Status",
      "Destination",
    ];
    const rows = filteredTransactions.map((tx) => [
      formatDate(tx.created_at),
      tx.client_name || getClientName(tx.client_id),
      tx.transaction_type,
      `${tx.amount} ${tx.currency}`,
      tx.amount_usd ? `$${tx.amount_usd}` : "-",
      tx.status,
      tx.destination_type === "treasury"
        ? tx.treasury_account_name
        : tx.destination_type === "psp"
          ? tx.psp_name
          : tx.destination_type === "vendor"
            ? tx.vendor_name
            : tx.destination_type,
    ]);

    // Calculate summary
    const totalDeposits = filteredTransactions
      .filter((t) => t.transaction_type === "deposit")
      .reduce((sum, t) => sum + (t.amount_usd || t.amount), 0);
    const totalWithdrawals = filteredTransactions
      .filter((t) => t.transaction_type === "withdrawal")
      .reduce((sum, t) => sum + (t.amount_usd || t.amount), 0);

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>Transactions Report - Carlton Fx</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #141414; border-bottom: 2px solid #1FA21B; padding-bottom: 10px; }
          .summary { display: flex; gap: 30px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .summary-item { }
          .summary-item label { font-size: 12px; color: #666; display: block; }
          .summary-item span { font-size: 18px; font-weight: bold; }
          .deposits { color: #22c55e; }
          .withdrawals { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #141414; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
          tr:hover { background: #f5f5f5; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Transactions Report</h1>
        <p>Generated: ${new Date().toLocaleString()} | Total Records: ${filteredTransactions.length}</p>
        <div class="summary">
          <div class="summary-item">
            <label>Total Deposits (USD)</label>
            <span class="deposits">$${totalDeposits.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <label>Total Withdrawals (USD)</label>
            <span class="withdrawals">$${totalWithdrawals.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <label>Net Flow (USD)</label>
            <span style="color: ${totalDeposits - totalWithdrawals >= 0 ? "#22c55e" : "#ef4444"}">$${(totalDeposits - totalWithdrawals).toLocaleString()}</span>
          </div>
        </div>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
        <div class="footer">Carlton Fx - Back Office System</div>
        <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#141414;color:white;border:none;cursor:pointer;border-radius:4px;">Print / Save as PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("PDF report opened in new window");
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="transactions-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Transactions Summary
          </h1>
          <p className="text-slate-500">
            Transaction ledger and financial operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download Reports Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-200 text-slate-600 hover:bg-slate-100"
                data-testid="download-report-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white border-slate-200"
            >
              <DropdownMenuItem
                onClick={downloadCSV}
                className="cursor-pointer hover:bg-slate-100"
              >
                <FileText className="w-4 h-4 mr-2 text-green-600" />
                <span>Download CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={downloadExcel}
                className="cursor-pointer hover:bg-slate-100"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                <span>Download Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={downloadPDF}
                className="cursor-pointer hover:bg-slate-100"
              >
                <FileText className="w-4 h-4 mr-2 text-red-500" />
                <span>Print / PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
                data-testid="add-transaction-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle
                  className="text-2xl font-bold uppercase tracking-tight"
                  style={{ fontFamily: "Barlow Condensed" }}
                >
                  Create Transaction
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Client *
                  </Label>
                  <ClientServerSearch
                    clients={clients}
                    value={formData.client_id}
                    onChange={(id, client) => {
                      setFormData({ ...formData, client_id: id });
                      setClientSearchOpen(false);
                    }}
                    open={clientSearchOpen}
                    onOpenChange={setClientSearchOpen}
                    authHeaders={getAuthHeaders}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Type *
                    </Label>
                    <Select
                      value={formData.transaction_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, transaction_type: value })
                      }
                    >
                      <SelectTrigger
                        className="bg-slate-50 border-slate-200 text-slate-800"
                        data-testid="select-tx-type"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {transactionTypes.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Payment Currency
                    </Label>
                    <Select
                      value={formData.base_currency}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          base_currency: value,
                          exchange_rate: "",
                          amount: "",
                        });
                      }}
                    >
                      <SelectTrigger
                        className="bg-slate-50 border-slate-200 text-slate-800"
                        data-testid="select-base-currency"
                      >
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
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Amount in {formData.base_currency} *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.base_amount}
                          onChange={(e) => {
                            const baseAmt = e.target.value;
                            const rate =
                              parseFloat(formData.exchange_rate) || 0;
                            const usdAmount =
                              baseAmt && rate
                                ? (parseFloat(baseAmt) * rate).toFixed(2)
                                : "";
                            setFormData({
                              ...formData,
                              base_amount: baseAmt,
                              amount: usdAmount,
                            });
                          }}
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                          placeholder={`0.00 ${formData.base_currency}`}
                          data-testid="tx-base-amount"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Exchange Rate (1 {formData.base_currency} = ? USD) *
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={formData.exchange_rate}
                          onChange={(e) => {
                            const rate = e.target.value;
                            const baseAmt =
                              parseFloat(formData.base_amount) || 0;
                            const usdAmount =
                              rate && baseAmt
                                ? (baseAmt * parseFloat(rate)).toFixed(2)
                                : "";
                            setFormData({
                              ...formData,
                              exchange_rate: rate,
                              amount: usdAmount,
                            });
                          }}
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                          placeholder="0.0000"
                          data-testid="tx-exchange-rate"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    {formData.base_currency !== "USD"
                      ? "Amount in USD (Auto-calculated)"
                      : "Amount in USD *"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="0.00 USD"
                    data-testid="tx-amount"
                    readOnly={formData.base_currency !== "USD"}
                    required
                  />
                  {formData.base_currency !== "USD" &&
                    formData.base_amount &&
                    formData.exchange_rate && (
                      <p className="text-xs text-blue-600">
                        {formData.base_amount} {formData.base_currency} ×{" "}
                        {formData.exchange_rate} = {formData.amount} USD
                      </p>
                    )}
                </div>

                {/* Destination Type Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Destination Type *
                  </Label>
                  <Select
                    value={formData.destination_type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        destination_type: value,
                        destination_account_id: "",
                        psp_id: "",
                        vendor_id: "",
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="select-dest-type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem
                        value="treasury"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Treasury / Bank Account
                      </SelectItem>
                      <SelectItem
                        value="bank"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Client Bank (Withdrawal)
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
                        Payment Service Provider (PSP)
                      </SelectItem>
                      <SelectItem
                        value="vendor"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Exchanger
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Treasury Destination (for deposits or non-bank transactions) */}
                {formData.destination_type === "treasury" && (
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Destination (Bank/Treasury) *
                    </Label>
                    <Select
                      value={formData.destination_account_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          destination_account_id: value,
                        })
                      }
                    >
                      <SelectTrigger
                        className="bg-slate-50 border-slate-200 text-slate-800"
                        data-testid="select-destination"
                      >
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {treasuryAccounts
                          .filter((a) => a.account_type !== "usdt")
                          .map((account) => (
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
                )}

                {/* Client Bank Details (for withdrawal to bank - not for cash) */}
                {formData.destination_type === "bank" &&
                  formData.transaction_mode !== "cash" && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-bold">
                          Client Bank Details
                        </span>
                      </div>

                      {/* Saved Bank Accounts Dropdown */}
                      {clientBankAccounts.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Saved Bank Accounts
                          </Label>
                          <Select
                            value={selectedBankAccount}
                            onValueChange={(value) => {
                              setSelectedBankAccount(value);
                              if (value !== "new") {
                                const bank = clientBankAccounts.find(
                                  (b) => b.bank_account_id === value,
                                );
                                if (bank) {
                                  setFormData({
                                    ...formData,
                                    client_bank_name: bank.bank_name,
                                    client_bank_account_name: bank.account_name,
                                    client_bank_account_number:
                                      bank.account_number,
                                    client_bank_swift_iban:
                                      bank.swift_iban || "",
                                    client_bank_currency:
                                      bank.currency || "USD",
                                  });
                                }
                              } else {
                                setFormData({
                                  ...formData,
                                  client_bank_name: "",
                                  client_bank_account_name: "",
                                  client_bank_account_number: "",
                                  client_bank_swift_iban: "",
                                  client_bank_currency: "USD",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                              <SelectValue placeholder="Select saved bank or add new" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem
                                value="new"
                                className="text-blue-600 hover:bg-slate-100"
                              >
                                + Add New Bank Account
                              </SelectItem>
                              {clientBankAccounts.map((bank) => (
                                <SelectItem
                                  key={bank.bank_account_id}
                                  value={bank.bank_account_id}
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  {bank.bank_name} - {bank.account_number} (
                                  {bank.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Bank Name *
                          </Label>
                          <Input
                            value={formData.client_bank_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                client_bank_name: e.target.value,
                              })
                            }
                            className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                            placeholder="e.g., Chase Bank"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Account Name *
                          </Label>
                          <Input
                            value={formData.client_bank_account_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                client_bank_account_name: e.target.value,
                              })
                            }
                            className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                            placeholder="Account holder name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Account Number *
                          </Label>
                          <Input
                            value={formData.client_bank_account_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                client_bank_account_number: e.target.value,
                              })
                            }
                            className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                            placeholder="Account number"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            SWIFT / IBAN
                          </Label>
                          <Input
                            value={formData.client_bank_swift_iban}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                client_bank_swift_iban: e.target.value,
                              })
                            }
                            className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                            placeholder="SWIFT or IBAN code"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Currency *
                        </Label>
                        <Select
                          value={formData.client_bank_currency}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              client_bank_currency: value,
                            })
                          }
                        >
                          <SelectTrigger className="bg-white border-slate-200 text-slate-800">
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
                      {selectedBankAccount === "new" && (
                        <p className="text-xs text-blue-600">
                          This bank account will be saved to the client's
                          profile for future use.
                        </p>
                      )}
                    </div>
                  )}

                {/* USDT Destination */}
                {formData.destination_type === "usdt" && (
                  <div className="space-y-4">
                    {/* For deposits - select USDT treasury account */}
                    {formData.transaction_type === "deposit" && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          USDT Treasury Account *
                        </Label>
                        <Select
                          value={formData.destination_account_id}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              destination_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger
                            className="bg-slate-50 border-slate-200 text-slate-800"
                            data-testid="select-usdt-treasury"
                          >
                            <SelectValue placeholder="Select USDT wallet" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            {treasuryAccounts
                              .filter((a) => a.account_type === "usdt")
                              .map((account) => (
                                <SelectItem
                                  key={account.account_id}
                                  value={account.account_id}
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  {account.account_name} (
                                  {account.usdt_network || "USDT"})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* For withdrawals - enter client USDT address */}
                    {formData.transaction_type === "withdrawal" && (
                      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wider font-bold">
                            Client USDT Details
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            USDT Address *
                          </Label>
                          <Input
                            value={formData.client_usdt_address}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                client_usdt_address: e.target.value,
                              })
                            }
                            className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                            placeholder="Enter USDT wallet address"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Network *
                          </Label>
                          <Select
                            value={formData.client_usdt_network}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                client_usdt_network: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem
                                value="TRC20"
                                className="text-slate-800 hover:bg-slate-100"
                              >
                                TRC20 (Tron)
                              </SelectItem>
                              <SelectItem
                                value="ERC20"
                                className="text-slate-800 hover:bg-slate-100"
                              >
                                ERC20 (Ethereum)
                              </SelectItem>
                              <SelectItem
                                value="BEP20"
                                className="text-slate-800 hover:bg-slate-100"
                              >
                                BEP20 (BSC)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Exchanger Destination */}
                {formData.destination_type === "vendor" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Select Exchanger *
                      </Label>
                      <Select
                        value={formData.vendor_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, vendor_id: value })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="select-vendor"
                        >
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {vendors
                            .filter((v) => v.status === "active")
                            .map((vendor) => (
                              <SelectItem
                                key={vendor.vendor_id}
                                value={vendor.vendor_id}
                                className="text-slate-800 hover:bg-slate-100"
                              >
                                {vendor.vendor_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transaction Mode - Bank or Cash */}
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
                          data-testid="select-tx-mode"
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
                      <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
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
                            data-testid="collecting-person-name"
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
                            data-testid="collecting-person-number"
                          />
                        </div>
                      </div>
                    )}

                    {/* For withdrawals via vendor - enter client bank details (only for bank mode) */}
                    {formData.transaction_type === "withdrawal" &&
                      formData.transaction_mode !== "cash" && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                          <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <Building2 className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wider font-bold">
                              Client Bank Details (Destination)
                            </span>
                          </div>

                          {/* Select from saved client banks */}
                          {clientBankAccounts.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                                Select Saved Bank Account
                              </Label>
                              <Select
                                onValueChange={(value) => {
                                  if (value === "new") {
                                    setFormData({
                                      ...formData,
                                      client_bank_name: "",
                                      client_bank_account_name: "",
                                      client_bank_account_number: "",
                                      client_bank_swift_iban: "",
                                      client_bank_currency: "USD",
                                    });
                                  } else {
                                    const bank = clientBankAccounts.find(
                                      (b) => b.bank_account_id === value,
                                    );
                                    if (bank) {
                                      setFormData({
                                        ...formData,
                                        client_bank_name: bank.bank_name,
                                        client_bank_account_name:
                                          bank.account_name,
                                        client_bank_account_number:
                                          bank.account_number,
                                        client_bank_swift_iban:
                                          bank.swift_iban || "",
                                        client_bank_currency:
                                          bank.currency || "USD",
                                      });
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                                  <SelectValue placeholder="Select saved bank or enter new" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                  <SelectItem
                                    value="new"
                                    className="text-slate-800 hover:bg-slate-100"
                                  >
                                    + Enter New Bank Details
                                  </SelectItem>
                                  {clientBankAccounts.map((bank) => (
                                    <SelectItem
                                      key={bank.bank_account_id}
                                      value={bank.bank_account_id}
                                      className="text-slate-800 hover:bg-slate-100"
                                    >
                                      {bank.bank_name} - {bank.account_number} (
                                      {bank.currency})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                                Bank Name *
                              </Label>
                              <Input
                                value={formData.client_bank_name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_bank_name: e.target.value,
                                  })
                                }
                                className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                                placeholder="Bank name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                                Account Name *
                              </Label>
                              <Input
                                value={formData.client_bank_account_name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_bank_account_name: e.target.value,
                                  })
                                }
                                className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                                placeholder="Account holder name"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                                Account Number *
                              </Label>
                              <Input
                                value={formData.client_bank_account_number}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_bank_account_number: e.target.value,
                                  })
                                }
                                className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                                placeholder="Account number / IBAN"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                                SWIFT/BIC Code
                              </Label>
                              <Input
                                value={formData.client_bank_swift_iban}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_bank_swift_iban: e.target.value,
                                  })
                                }
                                className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                                placeholder="SWIFT code (optional)"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-500 text-xs uppercase tracking-wider">
                              Currency *
                            </Label>
                            <Select
                              value={formData.client_bank_currency}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  client_bank_currency: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem
                                  value="USD"
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  USD - US Dollar
                                </SelectItem>
                                <SelectItem
                                  value="EUR"
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  EUR - Euro
                                </SelectItem>
                                <SelectItem
                                  value="GBP"
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  GBP - British Pound
                                </SelectItem>
                                <SelectItem
                                  value="AED"
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  AED - UAE Dirham
                                </SelectItem>
                                <SelectItem
                                  value="INR"
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  INR - Indian Rupee
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* PSP Destination */}
                {formData.destination_type === "psp" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Select PSP *
                      </Label>
                      <Select
                        value={formData.psp_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, psp_id: value })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="select-psp"
                        >
                          <SelectValue placeholder="Select PSP" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {psps
                            .filter((p) => p.status === "active")
                            .map((psp) => (
                              <SelectItem
                                key={psp.psp_id}
                                value={psp.psp_id}
                                className="text-slate-800 hover:bg-slate-100"
                              >
                                {psp.psp_name} ({psp.commission_rate}%
                                commission, T+{psp.settlement_days})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Commission Paid By *
                      </Label>
                      <Select
                        value={formData.commission_paid_by}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            commission_paid_by: value,
                          })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="select-commission-paid-by"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem
                            value="client"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            Client (deducted from deposit)
                          </SelectItem>
                          <SelectItem
                            value="broker"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            Broker (absorbs commission)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Commission Preview */}
                    {formData.psp_id && formData.amount && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        {(() => {
                          const selectedPsp = psps.find(
                            (p) => p.psp_id === formData.psp_id,
                          );
                          if (!selectedPsp) return null;
                          const grossAmount = parseFloat(formData.amount) || 0;
                          const commissionRate =
                            selectedPsp.commission_rate / 100;
                          const commissionAmount = (
                            grossAmount * commissionRate
                          ).toFixed(2);
                          const netAmount =
                            formData.commission_paid_by === "client"
                              ? (
                                  grossAmount - parseFloat(commissionAmount)
                                ).toFixed(2)
                              : grossAmount.toFixed(2);
                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Gross Amount
                                </span>
                                <span className="text-slate-800 font-mono">
                                  ${grossAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  PSP Commission ({selectedPsp.commission_rate}
                                  %)
                                </span>
                                <span className="text-red-400 font-mono">
                                  -${commissionAmount}
                                </span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-slate-200">
                                <span className="text-slate-500">
                                  {formData.commission_paid_by === "client"
                                    ? "Client Receives"
                                    : "Client Receives (Broker pays commission)"}
                                </span>
                                <span className="text-green-400 font-mono">
                                  ${netAmount}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Expected Settlement
                                </span>
                                <span className="text-blue-600">
                                  T+{selectedPsp.settlement_days} days
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Reference (Optional)
                  </Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="Auto-generated if empty"
                    data-testid="tx-reference"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    CRM Reference (Optional, Unique)
                  </Label>
                  <Input
                    value={formData.crm_reference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        crm_reference: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                    placeholder="Enter CRM reference number"
                    data-testid="tx-crm-reference"
                  />
                </div>

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
                    data-testid="tx-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Proof of Payment (Screenshot)
                  </Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#1FA21B]/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="proof-upload"
                      data-testid="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      {proofPreview ? (
                        <div className="space-y-2">
                          <img
                            src={proofPreview}
                            alt="Proof preview"
                            className="max-h-32 mx-auto rounded"
                          />
                          <p className="text-xs text-blue-600">
                            Click to change
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-slate-500" />
                          <p className="text-sm text-slate-500">
                            Click to upload proof of payment
                          </p>
                          <p className="text-xs text-slate-500/60">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
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
                    disabled={submitting}
                    className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                    data-testid="save-tx-btn"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by client or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-800/30 focus:border-[#1FA21B]"
            data-testid="search-transactions"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger
            className="w-full sm:w-40 bg-white border-slate-200 text-slate-800"
            data-testid="filter-tx-type"
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem
              value="all"
              className="text-slate-800 hover:bg-slate-100"
            >
              All Types
            </SelectItem>
            {transactionTypes.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                className="text-slate-800 hover:bg-slate-100"
              >
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-full sm:w-40 bg-white border-slate-200 text-slate-800"
            data-testid="filter-tx-status"
          >
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem
              value="all"
              className="text-slate-800 hover:bg-slate-100"
            >
              All Status
            </SelectItem>
            {statusOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-slate-800 hover:bg-slate-100"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={destinationFilter} onValueChange={setDestinationFilter}>
          <SelectTrigger
            className="w-full sm:w-44 bg-white border-slate-200 text-slate-800"
            data-testid="filter-tx-destination"
          >
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
            <SelectItem
              value="bank"
              className="text-slate-800 hover:bg-slate-100"
            >
              Bank
            </SelectItem>
            <SelectItem
              value="usdt"
              className="text-slate-800 hover:bg-slate-100"
            >
              USDT
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] bg-white border-slate-200 text-slate-800"
              data-testid="filter-date-from"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] bg-white border-slate-200 text-slate-800"
              data-testid="filter-date-to"
            />
          </div>
          {(dateFrom || dateTo || destinationFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setDestinationFilter("all");
              }}
              className="text-slate-500 hover:text-red-500"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Reference
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    CRM Ref
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Client
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Email
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Type
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Amount (USD)
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Payment Currency
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Destination
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-slate-500"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
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
                            <span title="Client Proof">
                              <ImageIcon className="w-4 h-4 text-slate-500" />
                            </span>
                          )}
                          {tx.accountant_proof_image && (
                            <span
                              title="Accountant Approval Proof"
                              className="flex items-center"
                            >
                              <ImageIcon className="w-4 h-4 text-blue-600" />
                            </span>
                          )}
                          {tx.vendor_proof_image && (
                            <span
                              title="Exchanger Proof"
                              className="flex items-center"
                            >
                              <ImageIcon className="w-4 h-4 text-orange-400" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-purple-600">
                        {tx.crm_reference || "-"}
                      </TableCell>
                      <TableCell className="text-slate-800">
                        {tx.client_name || getClientName(tx.client_id)}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {tx.client_email || "-"}
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell
                        className={`font-mono font-medium ${["deposit", "rebate"].includes(tx.transaction_type) ? "text-green-400" : "text-red-400"}`}
                      >
                        {["deposit", "rebate"].includes(tx.transaction_type)
                          ? "+"
                          : "-"}
                        ${tx.amount?.toLocaleString()} {tx.currency}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {tx.base_currency &&
                        tx.base_currency !== "USD" &&
                        tx.base_amount ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-medium">
                              {tx.base_amount?.toLocaleString()}{" "}
                              {tx.base_currency}
                            </span>
                            <span className="text-xs text-slate-400">
                              @ {tx.exchange_rate || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">USD</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {tx.destination_type === "vendor" && tx.vendor_name ? (
                          <span className="text-orange-500">
                            {tx.vendor_name}
                            <br />
                            <span className="text-xs text-orange-400">
                              Exchanger
                            </span>
                          </span>
                        ) : tx.destination_type === "psp" && tx.psp_name ? (
                          <span className="text-purple-500">
                            {tx.psp_name}
                            <br />
                            <span className="text-xs text-purple-400">PSP</span>
                          </span>
                        ) : tx.destination_bank_name ? (
                          <span>
                            {tx.destination_account_name}
                            <br />
                            <span className="text-xs">
                              {tx.destination_bank_name}
                            </span>
                          </span>
                        ) : tx.destination_account_name ? (
                          <span>{tx.destination_account_name}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewTransaction(tx)}
                            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 h-7 w-7 p-0"
                            data-testid={`tx-view-${tx.transaction_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {tx.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDestEdit(tx)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-7 w-7 p-0"
                              title="Edit Destination"
                              data-testid={`tx-dest-edit-${tx.transaction_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={(p) => {
          setCurrentPage(p);
          fetchTransactions(p);
        }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
          fetchTransactions(1);
        }}
      />

      <div className="text-center text-sm text-slate-500">
        Showing {transactions.length} of {totalItems} transactions
      </div>

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
                  {getTypeBadge(viewTransaction.transaction_type)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Amount
                  </p>
                  <p
                    className={`font-mono text-xl ${["deposit", "rebate"].includes(viewTransaction.transaction_type) ? "text-green-400" : "text-red-400"}`}
                  >
                    {["deposit", "rebate"].includes(
                      viewTransaction.transaction_type,
                    )
                      ? "+"
                      : "-"}
                    ${viewTransaction.amount?.toLocaleString()}{" "}
                    {viewTransaction.currency}
                  </p>
                  {viewTransaction.base_currency &&
                    viewTransaction.base_currency !== "USD" &&
                    viewTransaction.base_amount && (
                      <p className="text-sm text-slate-500 font-mono mt-1">
                        {viewTransaction.base_amount?.toLocaleString()}{" "}
                        {viewTransaction.base_currency}
                      </p>
                    )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Created
                  </p>
                  <p className="text-slate-800 text-sm">
                    {formatDate(viewTransaction.created_at)}
                  </p>
                </div>
              </div>
              {viewTransaction.destination_account_name && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Destination
                  </p>
                  <p className="text-slate-800">
                    {viewTransaction.destination_account_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {viewTransaction.destination_bank_name}
                  </p>
                </div>
              )}
              {/* Client Bank Details */}
              {viewTransaction.client_bank_name && (
                <div
                  className="pt-4 border-t border-slate-200"
                  data-testid="tx-bank-details"
                >
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Client Bank Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-sm border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">Bank Name</p>
                      <p className="text-slate-800 text-sm font-medium">
                        {viewTransaction.client_bank_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Account Holder</p>
                      <p className="text-slate-800 text-sm font-medium">
                        {viewTransaction.client_bank_account_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Account Number</p>
                      <p className="text-slate-800 text-sm font-mono">
                        {viewTransaction.client_bank_account_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">SWIFT / IBAN</p>
                      <p className="text-slate-800 text-sm font-mono">
                        {viewTransaction.client_bank_swift_iban || "-"}
                      </p>
                    </div>
                    {viewTransaction.client_bank_currency && (
                      <div>
                        <p className="text-xs text-slate-500">Currency</p>
                        <p className="text-slate-800 text-sm font-medium">
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
                  data-testid="tx-usdt-details"
                >
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    USDT Details
                  </p>
                  <div className="grid grid-cols-1 gap-3 p-3 bg-slate-50 rounded-sm border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">Wallet Address</p>
                      <p className="text-slate-800 text-sm font-mono break-all">
                        {viewTransaction.client_usdt_address}
                      </p>
                    </div>
                    {viewTransaction.client_usdt_network && (
                      <div>
                        <p className="text-xs text-slate-500">Network</p>
                        <p className="text-slate-800 text-sm font-medium">
                          {viewTransaction.client_usdt_network}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Broker Commission */}
              {viewTransaction.broker_commission_amount > 0 && (
                <div
                  className="pt-4 border-t border-slate-200"
                  data-testid="broker-commission-detail"
                >
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Broker Commission
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">Rate</p>
                      <p className="text-slate-800 font-mono">
                        {viewTransaction.broker_commission_rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Amount (USD)</p>
                      <p className="text-yellow-400 font-mono">
                        $
                        {viewTransaction.broker_commission_amount?.toLocaleString()}
                      </p>
                    </div>
                    {viewTransaction.broker_commission_base_currency !==
                      "USD" && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500">
                          Amount (
                          {viewTransaction.broker_commission_base_currency})
                        </p>
                        <p className="text-yellow-400 font-mono">
                          {viewTransaction.broker_commission_base_amount?.toLocaleString()}{" "}
                          {viewTransaction.broker_commission_base_currency}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              {viewTransaction.proof_image && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Client Proof of Payment
                  </p>
                  <img
                    src={`data:image/png;base64,${viewTransaction.proof_image}`}
                    alt="Client proof of payment"
                    className="max-w-full rounded border border-slate-200"
                  />
                </div>
              )}
              {/* Accountant Approval Proof - Thumbnail Preview */}
              {viewTransaction.accountant_proof_image && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Accountant Approval Proof
                  </p>
                  <div className="relative group">
                    <img
                      src={`data:image/png;base64,${viewTransaction.accountant_proof_image}`}
                      alt="Accountant approval proof"
                      className="w-full max-h-48 object-contain rounded border border-[#1FA21B]/30 bg-slate-50 cursor-pointer hover:border-[#1FA21B]"
                      onClick={() =>
                        window.open(
                          `data:image/png;base64,${viewTransaction.accountant_proof_image}`,
                          "_blank",
                        )
                      }
                      data-testid="accountant-proof-thumbnail"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <span className="text-slate-800 text-sm">
                        Click to view full size
                      </span>
                    </div>
                  </div>
                  {viewTransaction.proof_uploaded_at && (
                    <p className="text-xs text-slate-500 mt-2">
                      Uploaded: {formatDate(viewTransaction.proof_uploaded_at)}{" "}
                      by {viewTransaction.proof_uploaded_by_name}
                    </p>
                  )}
                </div>
              )}
              {/* Exchanger Proof - For Withdrawals */}
              {viewTransaction.vendor_proof_image && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Exchanger Payment Proof
                  </p>
                  <div className="relative group">
                    <img
                      src={`data:image/png;base64,${viewTransaction.vendor_proof_image}`}
                      alt="Exchanger payment proof"
                      className="w-full max-h-48 object-contain rounded border border-orange-400/30 bg-slate-50 cursor-pointer hover:border-orange-400"
                      onClick={() =>
                        window.open(
                          `data:image/png;base64,${viewTransaction.vendor_proof_image}`,
                          "_blank",
                        )
                      }
                      data-testid="vendor-proof-thumbnail"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <span className="text-slate-800 text-sm">
                        Click to view full size
                      </span>
                    </div>
                  </div>
                  {viewTransaction.vendor_proof_uploaded_at && (
                    <p className="text-xs text-slate-500 mt-2">
                      Uploaded:{" "}
                      {formatDate(viewTransaction.vendor_proof_uploaded_at)} by{" "}
                      {viewTransaction.vendor_proof_uploaded_by_name}
                    </p>
                  )}
                </div>
              )}
              {viewTransaction.rejection_reason && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-slate-800">
                    {viewTransaction.rejection_reason}
                  </p>
                </div>
              )}
              {viewTransaction.processed_at && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Processed
                  </p>
                  <p className="text-slate-800 text-sm">
                    {formatDate(viewTransaction.processed_at)} by{" "}
                    {viewTransaction.processed_by_name}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Destination Dialog */}
      <Dialog open={!!destEditTx} onOpenChange={() => setDestEditTx(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Edit Destination
            </DialogTitle>
          </DialogHeader>
          {destEditTx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded border space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono">{destEditTx.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <Badge
                    className={
                      destEditTx.transaction_type === "deposit"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {destEditTx.transaction_type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span>{destEditTx.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-mono font-bold">
                    ${destEditTx.amount?.toLocaleString()}
                  </span>
                </div>
                {destEditTx.base_amount &&
                  destEditTx.base_currency !== "USD" && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Amount</span>
                      <span className="font-mono">
                        {destEditTx.base_amount?.toLocaleString()}{" "}
                        {destEditTx.base_currency}
                      </span>
                    </div>
                  )}
              </div>

              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Destination Type
                </Label>
                <Select
                  value={destForm.destination_type}
                  onValueChange={(v) =>
                    setDestForm({
                      ...destForm,
                      destination_type: v,
                      vendor_id: v !== "vendor" ? "" : destForm.vendor_id,
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50"
                    data-testid="dest-edit-type"
                  >
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Exchanger</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="treasury">Treasury</SelectItem>
                    <SelectItem value="psp">PSP</SelectItem>
                    <SelectItem value="usdt">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {destForm.destination_type === "vendor" && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Select Exchanger *
                  </Label>
                  <Select
                    value={destForm.vendor_id}
                    onValueChange={(v) =>
                      setDestForm({ ...destForm, vendor_id: v })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50"
                      data-testid="dest-edit-vendor"
                    >
                      <SelectValue placeholder="Select exchanger" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors
                        .filter((v) => v.status === "active")
                        .map((v) => (
                          <SelectItem key={v.vendor_id} value={v.vendor_id}>
                            {v.vendor_name} (
                            {destEditTx.transaction_type === "withdrawal"
                              ? "WD"
                              : "DP"}
                            :{" "}
                            {destEditTx.transaction_type === "withdrawal"
                              ? v.withdrawal_commission || 0
                              : v.deposit_commission || 0}
                            %)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {destForm.destination_type === "treasury" && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Treasury Account
                  </Label>
                  <Select
                    value={destForm.destination_account_id}
                    onValueChange={(v) =>
                      setDestForm({ ...destForm, destination_account_id: v })
                    }
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuryAccounts.map((a) => (
                        <SelectItem key={a.account_id} value={a.account_id}>
                          {a.account_name} ({a.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  CRM Reference
                </Label>
                <Input
                  value={destForm.crm_reference}
                  onChange={(e) =>
                    setDestForm({ ...destForm, crm_reference: e.target.value })
                  }
                  className="bg-slate-50 font-mono"
                  placeholder="CRM reference"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Description
                </Label>
                <Textarea
                  value={destForm.description}
                  onChange={(e) =>
                    setDestForm({ ...destForm, description: e.target.value })
                  }
                  className="bg-slate-50"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSaveDest}
                disabled={destSaving}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                data-testid="dest-edit-save"
              >
                {destSaving ? "Saving..." : "Save Destination"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
