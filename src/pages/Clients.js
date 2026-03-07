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
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Calendar,
  TrendingDown,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Transaction filter states
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "",
    mt5_number: "",
    crm_customer_id: "",
    notes: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchClients = async () => {
    try {
      let url = `${API_URL}/api/clients`;
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setClients(await response.json());
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setViewClient(data);
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Failed to load client details");
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter]);

  // Filter clients based on transaction filters
  const filteredClients = clients.filter((client) => {
    // Balance filter
    if (minBalance && client.net_balance < parseFloat(minBalance)) return false;
    if (maxBalance && client.net_balance > parseFloat(maxBalance)) return false;

    // Transaction type filter
    if (txTypeFilter === "deposits_only" && (client.deposit_count || 0) === 0)
      return false;
    if (
      txTypeFilter === "withdrawals_only" &&
      (client.withdrawal_count || 0) === 0
    )
      return false;
    if (
      txTypeFilter === "no_transactions" &&
      (client.transaction_count || 0) > 0
    )
      return false;

    return true;
  });

  // Download functions
  const downloadCSV = () => {
    const headers = [
      "Client ID",
      "Name",
      "Email",
      "Phone",
      "Country",
      "KYC Status",
      "Total Deposits",
      "Deposit Count",
      "Total Withdrawals",
      "Withdrawal Count",
      "Net Balance",
    ];
    const rows = filteredClients.map((c) => [
      c.client_id,
      `${c.first_name} ${c.last_name}`,
      c.email,
      c.phone || "",
      c.country || "",
      c.kyc_status,
      c.total_deposits || 0,
      c.deposit_count || 0,
      c.total_withdrawals || 0,
      c.withdrawal_count || 0,
      c.net_balance || 0,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Clients exported to CSV");
  };

  const downloadTransactionsCSV = async () => {
    try {
      toast.loading("Preparing transactions export...");
      const response = await fetch(`${API_URL}/api/transactions`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const transactions = await response.json();
        const headers = [
          "Transaction ID",
          "Reference",
          "Client",
          "Type",
          "Amount (USD)",
          "Base Amount",
          "Base Currency",
          "Status",
          "Exchanger",
          "Created At",
        ];
        const rows = transactions.map((tx) => [
          tx.transaction_id,
          tx.reference,
          tx.client_name,
          tx.transaction_type,
          tx.amount || 0,
          tx.base_amount || tx.amount || 0,
          tx.base_currency || "USD",
          tx.status,
          tx.vendor_name || "",
          tx.created_at,
        ]);

        const csvContent = [headers, ...rows]
          .map((row) => row.map((cell) => `"${cell}"`).join(","))
          .join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success("Transactions exported to CSV");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export transactions");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedClient
        ? `${API_URL}/api/clients/${selectedClient.client_id}`
        : `${API_URL}/api/clients`;
      const method = selectedClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedClient ? "Client updated" : "Client created");
        setIsDialogOpen(false);
        resetForm();
        fetchClients();
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

  const handleDelete = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Client deleted");
        fetchClients();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || "",
      country: client.country || "",
      mt5_number: client.mt5_number || "",
      crm_customer_id: client.crm_customer_id || "",
      notes: client.notes || "",
      kyc_status: client.kyc_status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      country: "",
      mt5_number: "",
      crm_customer_id: "",
      notes: "",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "status-approved",
      pending: "status-pending",
      rejected: "status-rejected",
      suspended: "status-suspended",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Clients
          </h1>
          <p className="text-slate-500">
            Manage client accounts and KYC status
          </p>
        </div>
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
              data-testid="add-client-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle
                className="text-2xl font-bold uppercase tracking-tight"
                style={{ fontFamily: "Barlow Condensed" }}
              >
                {selectedClient ? "Edit Client" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    First Name
                  </Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    data-testid="client-first-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Last Name
                  </Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    data-testid="client-last-name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                  data-testid="client-email"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Phone
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    data-testid="client-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Country
                  </Label>
                  <Input
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    data-testid="client-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    MT5 Number
                  </Label>
                  <Input
                    value={formData.mt5_number}
                    onChange={(e) =>
                      setFormData({ ...formData, mt5_number: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="e.g., 12345678"
                    data-testid="client-mt5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    CRM Customer ID
                  </Label>
                  <Input
                    value={formData.crm_customer_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        crm_customer_id: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="e.g., CRM-001"
                    data-testid="client-crm-id"
                  />
                </div>
              </div>
              {selectedClient && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    KYC Status
                  </Label>
                  <Select
                    value={formData.kyc_status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, kyc_status: value })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="client-status-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
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
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Notes
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                  rows={3}
                  data-testid="client-notes"
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
                  disabled={submitting}
                  className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                  data-testid="save-client-btn"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : selectedClient ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-800/30 focus:border-[#1FA21B]"
                data-testid="search-clients"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-40 bg-slate-50 border-slate-200 text-slate-800"
                data-testid="filter-status"
              >
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="KYC Status" />
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
            <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
              <SelectTrigger
                className="w-44 bg-slate-50 border-slate-200 text-slate-800"
                data-testid="filter-tx-type"
              >
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem
                  value="all"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  All Transactions
                </SelectItem>
                <SelectItem
                  value="deposits_only"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Deposits Only
                </SelectItem>
                <SelectItem
                  value="withdrawals_only"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  Withdrawals Only
                </SelectItem>
                <SelectItem
                  value="no_transactions"
                  className="text-slate-800 hover:bg-slate-100"
                >
                  No Transactions
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-[#1FA21B]/30 text-blue-600 hover:bg-blue-100 font-bold uppercase tracking-wider rounded-xl"
                    data-testid="download-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white border-slate-200"
                >
                  <DropdownMenuItem
                    onClick={downloadCSV}
                    className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Clients (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={downloadTransactionsCSV}
                    className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export All Transactions (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Balance Filter Row */}
          <div className="flex flex-wrap items-end gap-4 mt-3 pt-3 border-t border-slate-200">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 uppercase">
                Min Balance
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                className="w-32 bg-slate-50 border-slate-200 text-slate-800 font-mono"
                data-testid="min-balance"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 uppercase">
                Max Balance
              </Label>
              <Input
                type="number"
                placeholder="Any"
                value={maxBalance}
                onChange={(e) => setMaxBalance(e.target.value)}
                className="w-32 bg-slate-50 border-slate-200 text-slate-800 font-mono"
                data-testid="max-balance"
              />
            </div>
            {(minBalance || maxBalance || txTypeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinBalance("");
                  setMaxBalance("");
                  setTxTypeFilter("all");
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                Clear Filters
              </Button>
            )}
            <div className="flex-1 text-right text-sm text-slate-500">
              Showing {filteredClients.length} of {clients.length} clients
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Client
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Contact
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Country
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Transactions
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    Net Balance
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                    KYC Status
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.client_id}
                      className="border-slate-200 hover:bg-slate-100"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">
                              {client.first_name?.charAt(0)}
                              {client.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-800 font-medium">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {client.client_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-800 font-mono text-sm">
                          {client.email}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {client.phone || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-800">
                        {client.country || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-green-400">
                            <ArrowDownRight className="w-3 h-3" />
                            <span className="font-mono">
                              ${(client.total_deposits || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-500">
                              ({client.deposit_count || 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-red-400">
                            <ArrowUpRight className="w-3 h-3" />
                            <span className="font-mono">
                              $
                              {(client.total_withdrawals || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-500">
                              ({client.withdrawal_count || 0})
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono font-bold ${(client.net_balance || 0) >= 0 ? "text-blue-600" : "text-red-400"}`}
                        >
                          ${(client.net_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.kyc_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              data-testid={`client-actions-${client.client_id}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-white border-slate-200"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                fetchClientDetails(client.client_id)
                              }
                              className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(client)}
                              className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
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

      {/* View Client Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Client Details
            </DialogTitle>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {viewClient.first_name?.charAt(0)}
                    {viewClient.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl text-slate-800 font-medium">
                    {viewClient.first_name} {viewClient.last_name}
                  </h3>
                  <p className="text-slate-500 font-mono text-sm">
                    {viewClient.client_id}
                  </p>
                </div>
              </div>

              {/* Transaction Summary Cards */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                <div className="bg-slate-50 p-3 rounded-xl border-l-2 border-l-green-500">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownRight className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-slate-500 uppercase">
                      Deposits
                    </span>
                  </div>
                  <p className="text-lg font-mono text-green-400">
                    ${(viewClient.total_deposits || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {viewClient.deposit_count || 0} transactions
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border-l-2 border-l-red-500">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-slate-500 uppercase">
                      Withdrawals
                    </span>
                  </div>
                  <p className="text-lg font-mono text-red-400">
                    ${(viewClient.total_withdrawals || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {viewClient.withdrawal_count || 0} transactions
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border-l-2 border-l-[#1FA21B]">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-slate-500 uppercase">
                      Net Balance
                    </span>
                  </div>
                  <p
                    className={`text-lg font-mono ${(viewClient.net_balance || 0) >= 0 ? "text-blue-600" : "text-red-400"}`}
                  >
                    ${(viewClient.net_balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {viewClient.transaction_count || 0} total
                  </p>
                </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-slate-800 font-mono">{viewClient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-slate-800 font-mono">
                    {viewClient.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Country
                  </p>
                  <p className="text-slate-800">{viewClient.country || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    KYC Status
                  </p>
                  {getStatusBadge(viewClient.kyc_status)}
                </div>
              </div>

              {/* Recent Transactions */}
              {viewClient.recent_transactions &&
                viewClient.recent_transactions.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-3">
                      Recent Transactions
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {viewClient.recent_transactions.map((tx) => (
                        <div
                          key={tx.transaction_id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {tx.transaction_type === "deposit" ? (
                              <ArrowDownRight className="w-4 h-4 text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            )}
                            <div>
                              <p className="text-slate-800 text-sm font-mono">
                                {tx.reference}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {tx.transaction_type}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-mono ${tx.transaction_type === "deposit" ? "text-green-400" : "text-red-400"}`}
                            >
                              {tx.transaction_type === "deposit" ? "+" : "-"}$
                              {tx.amount?.toLocaleString()}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {tx.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {viewClient.notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-slate-800">{viewClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
