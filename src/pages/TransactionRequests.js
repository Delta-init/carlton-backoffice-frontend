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
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
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
import { ScrollArea } from "../components/ui/scroll-area";
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
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Download,
  FileSpreadsheet,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const currencies = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "USDT"];

function ClientSearchPicker({
  clients: preloadedClients,
  value,
  onChange,
  testId,
  authHeaders,
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const inputRef = useRef(null);

  const selected =
    selectedClient || preloadedClients.find((c) => c.client_id === value);

  // Debounced server-side search
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-50 border-slate-200 text-slate-800 font-normal hover:bg-slate-100 h-9"
          data-testid={testId}
        >
          {selected
            ? `${selected.first_name} ${selected.last_name}`
            : "Search client..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 bg-white border-slate-200"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            placeholder="Search by name or email..."
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid={`${testId}-input`}
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
        </div>
        <div className="max-h-[200px] overflow-auto p-1">
          {searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              {searching
                ? "Searching..."
                : searchTerm.length >= 2
                  ? "No client found."
                  : "Type to search..."}
            </div>
          ) : (
            searchResults.map((c) => (
              <div
                key={c.client_id}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onChange(c.client_id);
                  setSelectedClient(c);
                  setOpen(false);
                }}
                data-testid={`client-option-${c.client_id}`}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${value === c.client_id ? "opacity-100" : "opacity-0"}`}
                />
                <div>
                  <span className="font-medium">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.email && (
                    <span className="text-xs text-slate-400 ml-2">
                      {c.email}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EditableRequestCard({
  req,
  clients,
  treasuryAccounts,
  psps,
  vendors,
  authHeaders,
  onSaved,
  onDelete,
  onProcess,
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPending = req.status === "pending";

  const [form, setForm] = useState({
    transaction_type: req.transaction_type || "withdrawal",
    client_id: req.client_id || "",
    amount: req.amount?.toString() || "",
    currency: req.currency || "USD",
    base_currency: req.base_currency || "USD",
    base_amount: req.base_amount?.toString() || "",
    exchange_rate: req.exchange_rate?.toString() || "",
    destination_type: req.destination_type || "bank",
    destination_account_id: req.destination_account_id || "",
    psp_id: req.psp_id || "",
    vendor_id: req.vendor_id || "",
    reference: req.reference || "",
    crm_reference: req.crm_reference || "",
    description: req.description || "",
    transaction_date:
      req.transaction_date || new Date().toISOString().split("T")[0],
    client_bank_name: req.client_bank_name || "",
    client_bank_account_name: req.client_bank_account_name || "",
    client_bank_account_number: req.client_bank_account_number || "",
    client_bank_swift_iban: req.client_bank_swift_iban || "",
    client_bank_currency: req.client_bank_currency || "",
    client_usdt_address: req.client_usdt_address || "",
    client_usdt_network: req.client_usdt_network || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) payload[k] = v;
      });
      const res = await fetch(
        `${API_URL}/api/transaction-requests/${req.request_id}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        toast.success("Request updated successfully");
        onSaved();
      } else {
        const e = await res.json();
        toast.error(e.detail || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleBaseCurrencyChange = (val) => {
    if (val === "USD") {
      setForm({
        ...form,
        base_currency: val,
        base_amount: "",
        exchange_rate: "",
      });
    } else {
      setForm({ ...form, base_currency: val, amount: "" });
    }
  };

  const handleBaseAmountChange = (val) => {
    const rate = parseFloat(form.exchange_rate) || 0;
    const usd = val && rate ? (parseFloat(val) * rate).toFixed(2) : "";
    setForm({ ...form, base_amount: val, amount: usd });
  };

  const handleExchangeRateChange = (val) => {
    const baseAmt = parseFloat(form.base_amount) || 0;
    const usd = val && baseAmt ? (baseAmt * parseFloat(val)).toFixed(2) : "";
    setForm({ ...form, exchange_rate: val, amount: usd });
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  return (
    <Card
      className={`border transition-all duration-200 ${isPending ? "border-yellow-200 bg-white hover:shadow-md" : "border-green-200 bg-green-50/30"}`}
      data-testid={`request-card-${req.request_id}`}
    >
      {/* Collapsed header - always visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid={`request-toggle-${req.request_id}`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <Badge
            className={
              req.transaction_type === "deposit"
                ? "bg-green-100 text-green-700 text-xs shrink-0"
                : "bg-red-100 text-red-700 text-xs shrink-0"
            }
          >
            {req.transaction_type === "deposit" ? (
              <ArrowDownRight className="w-3 h-3 mr-1" />
            ) : (
              <ArrowUpRight className="w-3 h-3 mr-1" />
            )}
            {req.transaction_type}
          </Badge>
          <span className="text-sm font-medium text-slate-800 truncate">
            {req.client_name}
          </span>
          <span className="font-mono text-sm font-bold text-slate-700">
            ${req.amount?.toLocaleString()}
          </span>
          {req.base_currency &&
            req.base_currency !== "USD" &&
            req.base_amount && (
              <span className="text-xs text-slate-400">
                {req.base_amount?.toLocaleString()} {req.base_currency}
              </span>
            )}
          {req.crm_reference && (
            <span className="font-mono text-xs text-purple-600">
              {req.crm_reference}
            </span>
          )}
          <Badge
            className={
              isPending
                ? "bg-yellow-100 text-yellow-700 text-xs"
                : "bg-green-100 text-green-700 text-xs"
            }
          >
            {req.status}
          </Badge>
          {req.transaction_status && req.transaction_status !== "pending" && (
            <Badge
              className={
                req.transaction_status === "approved"
                  ? "bg-blue-100 text-blue-700 text-xs"
                  : req.transaction_status === "rejected"
                    ? "bg-red-100 text-red-700 text-xs"
                    : req.transaction_status === "completed"
                      ? "bg-emerald-100 text-emerald-700 text-xs"
                      : "bg-slate-100 text-slate-600 text-xs"
              }
            >
              {req.transaction_status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">
            {formatDate(req.created_at)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4  border">
          {isPending ? (
            <div className="space-y-4 mt-4">
              {/* Row 1: Type & Client */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 uppercase font-bold">
                    Type
                  </Label>
                  <Select
                    value={form.transaction_type}
                    onValueChange={(v) =>
                      setForm({ ...form, transaction_type: v })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200"
                      data-testid={`edit-type-${req.request_id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase font-bold">
                    Client
                  </Label>
                  <ClientSearchPicker
                    clients={clients}
                    value={form.client_id}
                    onChange={(v) => setForm({ ...form, client_id: v })}
                    testId="create-client-search"
                    authHeaders={authHeaders}
                  />
                </div>
              </div>

              {/* Row 2: Payment Currency & Type-specific currency fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 uppercase font-bold">
                    Payment Currency
                  </Label>
                  <Select
                    value={form.base_currency}
                    onValueChange={handleBaseCurrencyChange}
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200"
                      data-testid={`edit-base-currency-${req.request_id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.base_currency === "USD" ? (
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      Amount (USD) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      className="bg-slate-50 border-slate-200 font-mono"
                      placeholder="0.00 USD"
                      data-testid={`edit-amount-${req.request_id}`}
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      Amount in {form.base_currency} *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.base_amount}
                      onChange={(e) => handleBaseAmountChange(e.target.value)}
                      className="bg-slate-50 border-slate-200 font-mono"
                      placeholder={`0.00 ${form.base_currency}`}
                      data-testid={`edit-base-amount-${req.request_id}`}
                    />
                  </div>
                )}
              </div>

              {/* Row 2b: Exchange Rate + Auto USD (when non-USD) */}
              {form.base_currency !== "USD" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      Exchange Rate (1 {form.base_currency} = ? USD)
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.exchange_rate}
                      onChange={(e) => handleExchangeRateChange(e.target.value)}
                      className="bg-slate-50 border-slate-200 font-mono"
                      placeholder="0.0000"
                      data-testid={`edit-rate-${req.request_id}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      Amount in USD (Auto)
                    </Label>
                    <Input
                      type="number"
                      value={form.amount}
                      readOnly
                      className="bg-slate-100 border-slate-200 font-mono text-slate-500"
                      placeholder="Auto-calculated"
                    />
                    {form.base_amount && form.exchange_rate && (
                      <p className="text-xs text-blue-600 mt-1">
                        {form.base_amount} {form.base_currency} x{" "}
                        {form.exchange_rate} = {form.amount} USD
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Row 3: Destination Type */}
              <div>
                <Label className="text-xs text-slate-500 uppercase font-bold">
                  Destination Type
                </Label>
                {form.transaction_type === "deposit" ? (
                  <Select
                    value={form.destination_type}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        destination_type: v,
                        vendor_id: "",
                        psp_id: "",
                        destination_account_id: "",
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200"
                      data-testid={`edit-dest-${req.request_id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="psp">PSP</SelectItem>
                      <SelectItem value="vendor">Exchanger</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={form.destination_type}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        destination_type: v,
                        vendor_id: "",
                        psp_id: "",
                        destination_account_id: "",
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-slate-50 border-slate-200"
                      data-testid={`edit-dest-${req.request_id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="usdt">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Conditional: PSP selector (deposit only) */}
              {form.transaction_type === "deposit" &&
                form.destination_type === "psp" && (
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      PSP
                    </Label>
                    <Select
                      value={form.psp_id}
                      onValueChange={(v) => setForm({ ...form, psp_id: v })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select PSP" />
                      </SelectTrigger>
                      <SelectContent>
                        {psps.map((p) => (
                          <SelectItem key={p.psp_id} value={p.psp_id}>
                            {p.psp_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Conditional: Exchanger selector (deposit to vendor) */}
              {form.transaction_type === "deposit" &&
                form.destination_type === "vendor" && (
                  <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold">
                      Exchanger
                    </Label>
                    <Select
                      value={form.vendor_id}
                      onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select exchanger" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.vendor_id} value={v.vendor_id}>
                            {v.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Conditional: Bank details (withdrawal to bank) */}
              {form.destination_type === "bank" && (
                <div className="space-y-2 p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    Bank Details
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Bank Name"
                      value={form.client_bank_name}
                      onChange={(e) =>
                        setForm({ ...form, client_bank_name: e.target.value })
                      }
                      className="bg-white border-slate-200"
                    />
                    <Input
                      placeholder="Account Holder Name"
                      value={form.client_bank_account_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_account_name: e.target.value,
                        })
                      }
                      className="bg-white border-slate-200"
                    />
                    <Input
                      placeholder="Account Number"
                      value={form.client_bank_account_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_account_number: e.target.value,
                        })
                      }
                      className="bg-white border-slate-200 font-mono"
                    />
                    <Input
                      placeholder="SWIFT / IBAN"
                      value={form.client_bank_swift_iban}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_swift_iban: e.target.value,
                        })
                      }
                      className="bg-white border-slate-200 font-mono"
                    />
                    <Input
                      placeholder="Currency (e.g. INR)"
                      value={form.client_bank_currency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_currency: e.target.value,
                        })
                      }
                      className="bg-white border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Conditional: USDT details (withdrawal to usdt) */}
              {form.destination_type === "usdt" && (
                <div className="space-y-2 p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    USDT Details
                  </p>
                  <Input
                    placeholder="Wallet Address"
                    value={form.client_usdt_address}
                    onChange={(e) =>
                      setForm({ ...form, client_usdt_address: e.target.value })
                    }
                    className="bg-white border-slate-200 font-mono"
                  />
                  <Select
                    value={form.client_usdt_network}
                    onValueChange={(v) =>
                      setForm({ ...form, client_usdt_network: v })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue placeholder="Select Network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRC20">TRC20</SelectItem>
                      <SelectItem value="ERC20">ERC20</SelectItem>
                      <SelectItem value="BEP20">BEP20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Row 4: Reference & CRM Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 uppercase font-bold">
                    Reference
                  </Label>
                  <Input
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 font-mono"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase font-bold">
                    CRM Reference
                  </Label>
                  <Input
                    value={form.crm_reference}
                    onChange={(e) =>
                      setForm({ ...form, crm_reference: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 font-mono"
                    placeholder="Unique"
                    data-testid={`edit-crm-ref-${req.request_id}`}
                  />
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <Label className="text-xs text-slate-500 uppercase font-bold">
                  Transaction Date
                </Label>
                <Input
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) =>
                    setForm({ ...form, transaction_date: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              {/* Row 5: Description */}
              <div>
                <Label className="text-xs text-slate-500 uppercase font-bold">
                  Description
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200"
                  rows={2}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
                  data-testid={`save-request-${req.request_id}`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={() => onProcess(req)}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  data-testid={`process-${req.request_id}`}
                >
                  <Send className="w-4 h-4 mr-2" /> Process
                </Button>
                <Button
                  onClick={() => onDelete(req.request_id)}
                  variant="outline"
                  className="border-red-300 text-red-500 hover:bg-red-50 px-3"
                  data-testid={`delete-${req.request_id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Read-only for processed requests */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              {[
                ["Type", req.transaction_type],
                ["Client", req.client_name],
                ["Amount", `$${req.amount?.toLocaleString()}`],
                req.base_amount && req.base_currency !== "USD"
                  ? [
                      "Base",
                      `${req.base_amount?.toLocaleString()} ${req.base_currency}`,
                    ]
                  : null,
                ["Destination", req.destination_type],
                req.crm_reference ? ["CRM Ref", req.crm_reference] : null,
                req.reference ? ["Reference", req.reference] : null,
                req.description ? ["Description", req.description] : null,
                ["Created By", req.created_by_name],
                req.transaction_id
                  ? ["TX ID", req.transaction_id?.slice(-8)]
                  : null,
                req.processed_at
                  ? [
                      "Processed",
                      new Date(req.processed_at).toLocaleDateString(),
                    ]
                  : null,
              ]
                .filter(Boolean)
                .map(([k, v], i) => (
                  <div key={i}>
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {k}
                    </span>
                    <span className="text-slate-700 font-medium">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function TransactionRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const defaultForm = {
    transaction_type: "withdrawal",
    client_id: "",
    amount: "",
    currency: "USD",
    base_currency: "USD",
    base_amount: "",
    exchange_rate: "",
    destination_type: "bank",
    destination_account_id: "",
    psp_id: "",
    vendor_id: "",
    reference: "",
    crm_reference: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
    client_bank_name: "",
    client_bank_account_name: "",
    client_bank_account_number: "",
    client_bank_swift_iban: "",
    client_bank_currency: "",
    client_usdt_address: "",
    client_usdt_network: "",
  };
  const [form, setForm] = useState({ ...defaultForm });
  const [proofImage, setProofImage] = useState(null);

  // Process dialog
  const [processDialog, setProcessDialog] = useState(null);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [processing, setProcessing] = useState(false);

  // Data
  const [clients, setClients] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [vendors, setVendors] = useState([]);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchRequests = useCallback(
    async (pg) => {
      try {
        const p = pg || page;
        const params = new URLSearchParams({ page: p, page_size: pageSize });
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (typeFilter !== "all") params.append("transaction_type", typeFilter);
        if (searchQuery) params.append("search", searchQuery);
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        const res = await fetch(
          `${API_URL}/api/transaction-requests?${params}`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          setRequests(data.items || []);
          setTotalPages(data.total_pages || 1);
          setTotal(data.total || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      statusFilter,
      typeFilter,
      searchQuery,
      dateFrom,
      dateTo,
      authHeaders,
    ],
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, tRes, pRes, vRes] = await Promise.all([
          fetch(`${API_URL}/api/clients?page_size=200`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/api/treasury?page_size=200`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/api/psp`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/vendors?page_size=100`, {
            headers: authHeaders(),
          }),
        ]);
        if (cRes.ok) {
          const d = await cRes.json();
          setClients(Array.isArray(d) ? d : d.items || []);
        }
        if (tRes.ok) {
          const d = await tRes.json();
          setTreasuryAccounts(d.items || d);
        }
        if (pRes.ok) setPsps(await pRes.json());
        if (vRes.ok) {
          const d = await vRes.json();
          setVendors(d.items || d || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [authHeaders]);

  const handlePreCreate = () => {
    if (!form.client_id || !form.amount) {
      toast.error("Client and Amount are required");
      return;
    }
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCreateReqCaptcha({ a, b });
    setCreateReqCaptchaAnswer("");
    setShowCreateReqCaptcha(true);
  };

  const handleCreate = async () => {
    if (
      parseInt(createReqCaptchaAnswer) !==
      createReqCaptcha.a + createReqCaptcha.b
    ) {
      toast.error("Incorrect verification answer");
      return;
    }
    setShowCreateReqCaptcha(false);
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (proofImage) fd.append("proof_image", proofImage);
      const headers = authHeaders();
      delete headers["Content-Type"];
      const res = await fetch(`${API_URL}/api/transaction-requests`, {
        method: "POST",
        headers,
        body: fd,
      });
      if (res.ok) {
        const result = await res.json();
        if (result.status === "processed") {
          toast.success(
            `Deposit auto-processed! Transaction ${result.transaction_id} created`,
          );
        } else {
          toast.success("Request created");
        }
        setCreateOpen(false);
        setForm({ ...defaultForm });
        setProofImage(null);
        fetchRequests();
      } else {
        const e = await res.json();
        toast.error(e.detail || "Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setCreating(false);
    }
  };
  const openProcess = (req) => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b });
    setCaptchaAnswer("");
    setProcessDialog(req);
  };

  const handleProcess = async () => {
    if (parseInt(captchaAnswer) !== captcha.a + captcha.b) {
      toast.error("Wrong captcha");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(
        `${API_URL}/api/transaction-requests/${processDialog.request_id}/process`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            captcha_answer: captcha.a + captcha.b,
            captcha_expected: captcha.a + captcha.b,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        toast.success(`Processed! Transaction ${data.transaction_id} created`);
        setProcessDialog(null);
        fetchRequests();
      } else {
        const e = await res.json();
        toast.error(e.detail || "Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      const res = await fetch(`${API_URL}/api/transaction-requests/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast.success("Deleted");
        fetchRequests();
      } else {
        const e = await res.json();
        toast.error(e.detail || "Failed");
      }
    } catch {
      toast.error("Failed");
    }
  };

  const handleCreateBaseCurrencyChange = (val) => {
    if (val === "USD") {
      setForm({
        ...form,
        base_currency: val,
        base_amount: "",
        exchange_rate: "",
      });
    } else {
      setForm({ ...form, base_currency: val, amount: "" });
    }
  };

  const handleCreateBaseAmountChange = (val) => {
    const rate = parseFloat(form.exchange_rate) || 0;
    const usd = val && rate ? (parseFloat(val) * rate).toFixed(2) : "";
    setForm({ ...form, base_amount: val, amount: usd });
  };

  const handleCreateExchangeRateChange = (val) => {
    const baseAmt = parseFloat(form.base_amount) || 0;
    const usd = val && baseAmt ? (baseAmt * parseFloat(val)).toFixed(2) : "";
    setForm({ ...form, exchange_rate: val, amount: usd });
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  const downloadExcel = () => {
    if (!requests.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Date",
      "Type",
      "Client",
      "Amount (USD)",
      "Base Amount",
      "Base Currency",
      "Rate",
      "Status",
      "Destination",
      "CRM Ref",
      "Reference",
      "Created By",
      "Description",
    ];
    const rows = requests.map((r) => [
      formatDate(r.created_at),
      r.transaction_type,
      r.client_name,
      r.amount,
      r.base_amount || "",
      r.base_currency || "",
      r.exchange_rate || "",
      r.status,
      r.destination_type,
      r.crm_reference || "",
      r.reference || "",
      r.created_by_name || "",
      r.description || "",
    ]);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head><body>
      <table border="1"><thead><tr>${headers.map((h) => `<th style="background:#1F2833;color:#fff;font-weight:bold;">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tx_requests_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Excel report downloaded");
  };

  const downloadPDF = () => {
    if (!requests.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Date",
      "Type",
      "Client",
      "Amount (USD)",
      "Base",
      "Status",
      "Destination",
      "CRM Ref",
      "Created By",
    ];
    const rows = requests.map((r) => [
      formatDate(r.created_at),
      r.transaction_type,
      r.client_name,
      `$${r.amount?.toLocaleString()}`,
      r.base_amount && r.base_currency !== "USD"
        ? `${r.base_amount?.toLocaleString()} ${r.base_currency}`
        : "-",
      r.status,
      r.destination_type,
      r.crm_reference || "-",
      r.created_by_name || "-",
    ]);
    const totalDeposits = requests
      .filter((r) => r.transaction_type === "deposit")
      .reduce((s, r) => s + (r.amount || 0), 0);
    const totalWithdrawals = requests
      .filter((r) => r.transaction_type === "withdrawal")
      .reduce((s, r) => s + (r.amount || 0), 0);
    const pending = requests.filter((r) => r.status === "pending").length;
    const processed = requests.filter((r) => r.status === "processed").length;

    const w = window.open("", "_blank");
    w.document
      .write(`<html><head><title>TX Requests Report - Miles Capitals</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;}
        h1{color:#1F2833;border-bottom:2px solid #66FCF1;padding-bottom:10px;}
        .summary{display:flex;gap:30px;margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px;}
        .summary-item label{font-size:12px;color:#666;display:block;}
        .summary-item span{font-size:18px;font-weight:bold;}
        .deposits{color:#22c55e;} .withdrawals{color:#ef4444;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        th{background:#1F2833;color:white;padding:10px;text-align:left;font-size:12px;}
        td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;}
        tr:hover{background:#f5f5f5;}
        .footer{margin-top:30px;font-size:11px;color:#999;text-align:center;}
        @media print{.no-print{display:none;}}
      </style></head><body>
      <h1>Transaction Requests Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | Total Records: ${requests.length}</p>
      <div class="summary">
        <div class="summary-item"><label>Total Deposits</label><span class="deposits">$${totalDeposits.toLocaleString()}</span></div>
        <div class="summary-item"><label>Total Withdrawals</label><span class="withdrawals">$${totalWithdrawals.toLocaleString()}</span></div>
        <div class="summary-item"><label>Pending</label><span>${pending}</span></div>
        <div class="summary-item"><label>Processed</label><span>${processed}</span></div>
      </div>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <div class="footer">Miles Capitals - Transaction Requests Report</div>
      <script>window.print();</script></body></html>`);
    w.document.close();
    toast.success("PDF report opened for printing");
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="tx-requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Transaction Requests
          </h1>
          <p className="text-slate-500">
            Create and manage transaction requests
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-200 text-slate-600"
                data-testid="export-btn"
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-slate-200">
              <DropdownMenuItem
                onClick={downloadExcel}
                className="cursor-pointer hover:bg-slate-100"
                data-testid="export-excel"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />{" "}
                Download Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={downloadPDF}
                className="cursor-pointer hover:bg-slate-100"
                data-testid="export-pdf"
              >
                <FileText className="w-4 h-4 mr-2 text-red-600" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
            data-testid="create-request-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      {/* Summary */}
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 uppercase">Pending</p>
              <p className="text-3xl font-bold text-yellow-700">
                {requests.filter((r) => r.status === "pending").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 uppercase">Processed</p>
              <p className="text-3xl font-bold text-green-700">
                {requests.filter((r) => r.status === "processed").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase">Total</p>
              <p className="text-3xl font-bold text-blue-700">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
            Search
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Client, reference, CRM ref..."
              className="pl-8 h-8 text-sm border-slate-200"
              data-testid="filter-search"
            />
          </div>
        </div>
        <div className="min-w-[110px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-800 h-8"
            data-testid="filter-status"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="min-w-[110px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
            Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-800 h-8"
            data-testid="filter-type"
          >
            <option value="all">All</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </div>
        <div className="min-w-[130px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
            From
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-8 text-sm border-slate-200"
            data-testid="filter-date-from"
          />
        </div>
        <div className="min-w-[130px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
            To
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-8 text-sm border-slate-200"
            data-testid="filter-date-to"
          />
        </div>
        {(searchQuery ||
          statusFilter !== "all" ||
          typeFilter !== "all" ||
          dateFrom ||
          dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="text-slate-400 hover:text-slate-600 h-8 px-2"
            data-testid="clear-filters"
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Request Cards List */}
      <div className="space-y-3" data-testid="requests-list">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-8 text-center text-slate-400">
              No requests found
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => (
            <EditableRequestCard
              key={req.request_id}
              req={req}
              clients={clients}
              treasuryAccounts={treasuryAccounts}
              psps={psps}
              vendors={vendors}
              authHeaders={authHeaders}
              onSaved={() => fetchRequests()}
              onDelete={handleDelete}
              onProcess={openProcess}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={(p) => {
          setPage(p);
          fetchRequests(p);
        }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
          fetchRequests(1);
        }}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              New Transaction Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Type *
                </Label>
                <Select
                  value={form.transaction_type}
                  onValueChange={(v) =>
                    setForm({ ...form, transaction_type: v })
                  }
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Client *
                </Label>
                <ClientSearchPicker
                  clients={clients}
                  value={form.client_id}
                  onChange={(v) => setForm({ ...form, client_id: v })}
                  testId="create-client-search"
                  authHeaders={authHeaders}
                />
              </div>
            </div>

            {/* Currency Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Payment Currency
                </Label>
                <Select
                  value={form.base_currency}
                  onValueChange={handleCreateBaseCurrencyChange}
                >
                  <SelectTrigger
                    className="bg-slate-50"
                    data-testid="create-base-currency"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.base_currency === "USD" ? (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Amount (USD) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="bg-slate-50 font-mono"
                    placeholder="0.00 USD"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Amount in {form.base_currency} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.base_amount}
                    onChange={(e) =>
                      handleCreateBaseAmountChange(e.target.value)
                    }
                    className="bg-slate-50 font-mono"
                    placeholder={`0.00 ${form.base_currency}`}
                  />
                </div>
              )}
            </div>

            {form.base_currency !== "USD" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Exchange Rate (1 {form.base_currency} = ? USD)
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.exchange_rate}
                    onChange={(e) =>
                      handleCreateExchangeRateChange(e.target.value)
                    }
                    className="bg-slate-50 font-mono"
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Amount in USD (Auto)
                  </Label>
                  <Input
                    type="number"
                    value={form.amount}
                    readOnly
                    className="bg-slate-100 font-mono text-slate-500"
                  />
                  {form.base_amount && form.exchange_rate && (
                    <p className="text-xs text-blue-600 mt-1">
                      {form.base_amount} {form.base_currency} x{" "}
                      {form.exchange_rate} = {form.amount} USD
                    </p>
                  )}
                </div>
              </div>
            )}

            {form.transaction_type === "deposit" && (
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Destination Type
                </Label>
                <Select
                  value={form.destination_type}
                  onValueChange={(v) =>
                    setForm({ ...form, destination_type: v })
                  }
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="psp">PSP</SelectItem>
                    <SelectItem value="vendor">Exchanger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.transaction_type === "deposit" &&
              form.destination_type === "psp" && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    PSP
                  </Label>
                  <Select
                    value={form.psp_id}
                    onValueChange={(v) => setForm({ ...form, psp_id: v })}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Select PSP" />
                    </SelectTrigger>
                    <SelectContent>
                      {psps.map((p) => (
                        <SelectItem key={p.psp_id} value={p.psp_id}>
                          {p.psp_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            {form.transaction_type === "deposit" &&
              form.destination_type === "vendor" && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Exchanger
                  </Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Select exchanger" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.vendor_id} value={v.vendor_id}>
                          {v.vendor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {form.transaction_type === "withdrawal" && (
              <>
                <div>
                  <Label className="text-xs text-slate-500 uppercase">
                    Destination Type
                  </Label>
                  <Select
                    value={form.destination_type}
                    onValueChange={(v) =>
                      setForm({ ...form, destination_type: v })
                    }
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="usdt">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.destination_type === "bank" && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded border">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      Bank Details
                    </p>
                    <Input
                      placeholder="Bank Name"
                      value={form.client_bank_name}
                      onChange={(e) =>
                        setForm({ ...form, client_bank_name: e.target.value })
                      }
                      className="bg-white"
                    />
                    <Input
                      placeholder="Account Holder Name"
                      value={form.client_bank_account_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_account_name: e.target.value,
                        })
                      }
                      className="bg-white"
                    />
                    <Input
                      placeholder="Account Number"
                      value={form.client_bank_account_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_account_number: e.target.value,
                        })
                      }
                      className="bg-white"
                    />
                    <Input
                      placeholder="SWIFT / IBAN"
                      value={form.client_bank_swift_iban}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_swift_iban: e.target.value,
                        })
                      }
                      className="bg-white"
                    />
                    <Input
                      placeholder="Currency (e.g. INR)"
                      value={form.client_bank_currency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_bank_currency: e.target.value,
                        })
                      }
                      className="bg-white"
                    />
                  </div>
                )}
                {form.destination_type === "usdt" && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded border">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      USDT Details
                    </p>
                    <Input
                      placeholder="Wallet Address"
                      value={form.client_usdt_address}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          client_usdt_address: e.target.value,
                        })
                      }
                      className="bg-white"
                    />
                    <Select
                      value={form.client_usdt_network}
                      onValueChange={(v) =>
                        setForm({ ...form, client_usdt_network: v })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select Network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRC20">TRC20</SelectItem>
                        <SelectItem value="ERC20">ERC20</SelectItem>
                        <SelectItem value="BEP20">BEP20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  Reference
                </Label>
                <Input
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  className="bg-slate-50 font-mono"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">
                  CRM Reference
                </Label>
                <Input
                  value={form.crm_reference}
                  onChange={(e) =>
                    setForm({ ...form, crm_reference: e.target.value })
                  }
                  className="bg-slate-50 font-mono"
                  placeholder="Unique"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">
                Transaction Date
              </Label>
              <Input
                type="date"
                value={form.transaction_date}
                onChange={(e) =>
                  setForm({ ...form, transaction_date: e.target.value })
                }
                className="bg-slate-50"
                data-testid="txreq-transaction-date"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase">
                Description
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="bg-slate-50"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">
                Proof of Payment
              </Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofImage(e.target.files[0])}
                className="bg-slate-50"
              />
            </div>
            <Button
              onClick={handlePreCreate}
              disabled={creating}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}{" "}
              Create Request
            </Button>
            {showCreateReqCaptcha && (
              <div
                className="p-3 bg-amber-50 border border-amber-200 rounded-sm space-y-2 mt-2"
                data-testid="create-req-captcha"
              >
                <p className="text-sm text-amber-800 font-medium">
                  Verify to confirm: What is {createReqCaptcha.a} +{" "}
                  {createReqCaptcha.b}?
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={createReqCaptchaAnswer}
                    onChange={(e) => setCreateReqCaptchaAnswer(e.target.value)}
                    className="bg-white border-amber-300 w-24 text-center font-mono"
                    placeholder="?"
                    autoFocus
                    data-testid="create-req-captcha-input"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating || !createReqCaptchaAnswer}
                    className="bg-green-600 text-white hover:bg-green-700 font-bold"
                    data-testid="create-req-captcha-confirm"
                  >
                    {creating ? "Creating..." : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Dialog (with Captcha) */}
      <Dialog
        open={!!processDialog}
        onOpenChange={() => setProcessDialog(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold uppercase"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Process Request
            </DialogTitle>
          </DialogHeader>
          {processDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <Badge
                    className={
                      processDialog.transaction_type === "deposit"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {processDialog.transaction_type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span>{processDialog.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-mono font-bold">
                    ${processDialog.amount?.toLocaleString()}
                  </span>
                </div>
                {processDialog.crm_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CRM Ref</span>
                    <span className="font-mono text-purple-600">
                      {processDialog.crm_reference}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Verify: What is {captcha.a} + {captcha.b}?
                </p>
                <Input
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Enter answer"
                  className="bg-white"
                  autoFocus
                  data-testid="process-captcha"
                />
              </div>
              <p className="text-xs text-slate-500">
                This will create a real transaction in the main Transactions
                page with "Pending" status.
              </p>
              <Button
                onClick={handleProcess}
                disabled={processing || !captchaAnswer}
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}{" "}
                Process & Create Transaction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
