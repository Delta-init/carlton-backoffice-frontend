import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import PaginationControls from "../components/PaginationControls";
import { toast } from "sonner";
import { getApiError } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeftRight,
  Store,
  Wallet,
  Banknote,
  Receipt,
  CreditCard,
  RotateCcw,
  Calculator,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MathCaptcha = ({ onVerified, onCancel }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const generateCaptcha = useCallback(() => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setAnswer("");
    setError("");
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseInt(answer) === num1 + num2) {
      onVerified();
    } else {
      setError("Incorrect answer. Please try again.");
      generateCaptcha();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-indigo-600">
        <Calculator className="w-5 h-5" />
        <span className="text-sm uppercase tracking-wider">Security Verification</span>
      </div>
      <div className="p-4 bg-muted/50 rounded-lg border border">
        <p className="text-card-foreground text-sm mb-3">
          Solve this math problem to confirm reinstatement:
        </p>
        <div className="flex items-center justify-center gap-4 text-3xl font-mono text-foreground">
          <span>{num1}</span>
          <span className="text-indigo-600">+</span>
          <span>{num2}</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-indigo-600">?</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-card-foreground text-xs uppercase tracking-wider">Your Answer</Label>
          <Input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="bg-muted/50 border text-foreground focus:border-indigo-500 font-mono text-xl text-center"
            placeholder="Enter the sum"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border text-card-foreground hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
          >
            Verify & Reinstate
          </Button>
        </div>
      </form>
    </div>
  );
};

const fmt = (n, currency = "") =>
  `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();

function BalanceRow({ label, before, after, currency }) {
  const change = after - before;
  const isPositive = change > 0;
  const isNegative = change < 0;
  return (
    <div className="grid grid-cols-3 gap-2 items-center py-2 border-b border/60 last:border-0">
      <span className="text-card-foreground text-xs">{label}</span>
      <div className="text-right">
        <span className="text-foreground text-xs font-mono">{fmt(before, currency)}</span>
        <p className="text-card-foreground text-[10px]">Before</p>
      </div>
      <div className="text-right">
        <span
          className={`text-xs font-mono font-semibold ${
            isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-foreground"
          }`}
        >
          {fmt(after, currency)}
        </span>
        <p className="flex items-center justify-end gap-0.5 text-[10px]">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : isNegative ? (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span
            className={
              isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-muted-foreground"
            }
          >
            {isPositive ? "+" : ""}
            {fmt(change, currency)}
          </span>
        </p>
      </div>
    </div>
  );
}

function PreviewSummary({ preview }) {
  if (!preview) return null;
  const { balance_changes = [], affected_records = [], vendor_stats, psp_changes, loan_changes, item } = preview;

  return (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
      {/* Item info */}
      <div className="bg-muted/50 rounded-lg border border/60 p-3">
        <p className="text-indigo-600 text-xs uppercase tracking-wider mb-2">Record Being Reinstated</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(() => {
            const FIELDS = ["transaction_id", "settlement_id", "entry_id", "loan_id", "repayment_id",
              "transaction_type", "entry_type", "status",
              "client_name", "vendor_name", "psp_name", "description"];
            const entries = Object.entries(item || {}).filter(([k]) => FIELDS.includes(k));
            // Show base_amount/base_currency if present, else amount/currency
            const displayAmount = item?.base_amount != null ? item.base_amount : item?.amount;
            const displayCurrency = item?.base_currency || item?.currency || "";
            if (displayAmount != null) {
              entries.push(["amount", `${displayCurrency} ${Number(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            }
            return entries.map(([k, v]) => (
              <div key={k}>
                <p className="text-card-foreground text-[10px] uppercase tracking-wider">{k.replace(/_/g, " ")}</p>
                <p className="text-foreground text-xs font-mono truncate">{String(v ?? "-")}</p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Balance changes */}
      {balance_changes.length > 0 && (
        <div className="bg-muted/50 rounded-lg border border/60 p-3">
          <p className="text-indigo-600 text-xs uppercase tracking-wider mb-3">Balance Changes</p>
          <div className="grid grid-cols-3 gap-2 mb-1">
            <span />
            <span className="text-card-foreground text-[10px] text-right uppercase">Before</span>
            <span className="text-card-foreground text-[10px] text-right uppercase">After</span>
          </div>
          {balance_changes.map((bc, i) => (
            <div key={i}>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge
                  className={`text-[10px] px-1.5 py-0 ${
                    bc.type === "psp"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-primary/80/20 text-primary/50 border-primary/30"
                  }`}
                >
                  {bc.type === "psp" ? "PSP" : "Treasury"}
                </Badge>
                <span className="text-foreground text-xs font-semibold">{bc.account_name}</span>
              </div>
              <BalanceRow
                label={bc.description}
                before={bc.balance_before}
                after={bc.balance_after}
                currency={bc.currency}
              />
            </div>
          ))}
        </div>
      )}

      {/* Vendor stats */}
      {vendor_stats && (
        <div className="bg-muted/50 rounded-lg border border/60 p-3">
          <p className="text-indigo-600 text-xs uppercase tracking-wider mb-2">
            Exchanger Stats — {vendor_stats.vendor_name}
          </p>
          <BalanceRow
            label="Total Volume"
            before={vendor_stats.total_volume_before}
            after={vendor_stats.total_volume_after}
            currency=""
          />
          <BalanceRow
            label="Total Commission"
            before={vendor_stats.total_commission_before}
            after={vendor_stats.total_commission_after}
            currency=""
          />
        </div>
      )}

      {/* PSP changes */}
      {psp_changes && (
        <div className="bg-muted/50 rounded-lg border border/60 p-3">
          <p className="text-indigo-600 text-xs uppercase tracking-wider mb-2">
            PSP Stats — {psp_changes.psp_name}
          </p>
          <BalanceRow
            label="Pending Settlement"
            before={psp_changes.pending_settlement_before}
            after={psp_changes.pending_settlement_after}
            currency={psp_changes.currency}
          />
          <BalanceRow
            label="Total Volume"
            before={psp_changes.total_volume_before}
            after={psp_changes.total_volume_after}
            currency={psp_changes.currency}
          />
        </div>
      )}

      {/* Loan changes */}
      {loan_changes && (
        <div className="bg-muted/50 rounded-lg border border/60 p-3">
          <p className="text-indigo-600 text-xs uppercase tracking-wider mb-2">
            Loan Impact — {loan_changes.loan_id}
          </p>
          <BalanceRow
            label="Total Repaid"
            before={loan_changes.total_repaid_before}
            after={loan_changes.total_repaid_after}
            currency={loan_changes.currency}
          />
          <BalanceRow
            label="Outstanding Balance"
            before={loan_changes.outstanding_before}
            after={loan_changes.outstanding_after}
            currency={loan_changes.currency}
          />
          <div className="grid grid-cols-3 gap-2 items-center py-2">
            <span className="text-card-foreground text-xs">Repayment Count</span>
            <span className="text-foreground text-xs font-mono text-right">{loan_changes.repayment_count_before}</span>
            <span className="text-red-400 text-xs font-mono font-semibold text-right">
              {loan_changes.repayment_count_after}
              <span className="text-red-400 ml-1 text-[10px]">(-1)</span>
            </span>
          </div>
        </div>
      )}

      {/* Affected records */}
      {affected_records.length > 0 && (
        <div className="space-y-1.5">
          {affected_records.map((rec, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2.5 rounded-sm border text-xs ${
                rec.type === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                  : "bg-muted/50 border text-card-foreground"
              }`}
            >
              {rec.type === "warning" && (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              )}
              {rec.description}
            </div>
          ))}
        </div>
      )}

      {balance_changes.length === 0 && !vendor_stats && !psp_changes && !loan_changes && (
        <div className="text-center py-4 text-card-foreground text-sm">
          No balance changes found — treasury transactions may have already been cleared.
        </div>
      )}
    </div>
  );
}

const tabConfig = [
  {
    key: "transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    endpoint: "transactions",
    idField: "transaction_id",
    searchPlaceholder: "Search by ID, reference, client, CRM ref...",
    displayFields: (item) => {
      const currency = item.base_currency || item.currency || "";
      const amount = item.base_amount != null ? item.base_amount : item.amount;
      return [
        { label: "ID", value: item.transaction_id },
        { label: "Type", value: item.transaction_type },
        { label: "Amount", value: `${currency} ${Number(amount).toLocaleString()}` },
        { label: "Client", value: item.client_name || item.client_id || "-" },
        { label: "Status", value: item.status },
      ];
    },
  },
  {
    key: "vendor-settlements",
    label: "Vendor Settlements",
    icon: Store,
    endpoint: "vendor-settlements",
    idField: "settlement_id",
    displayFields: (item) => [
      { label: "ID", value: item.settlement_id },
      { label: "Vendor", value: item.vendor_name || item.vendor_id || "-" },
      { label: "Amount", value: `${item.currency || ""} ${Number(item.settlement_amount || 0).toLocaleString()}` },
      { label: "Status", value: item.status },
    ],
  },
  {
    key: "income-expenses",
    label: "Income / Expenses",
    icon: Wallet,
    endpoint: "income-expenses",
    idField: "entry_id",
    displayFields: (item) => [
      { label: "ID", value: item.entry_id },
      { label: "Type", value: item.entry_type },
      { label: "Description", value: item.description || "-" },
      { label: "Amount", value: `${item.currency || ""} ${Number(item.amount || 0).toLocaleString()}` },
      { label: "Status", value: item.status },
    ],
  },
  {
    key: "loans",
    label: "Loans",
    icon: Banknote,
    endpoint: "loans",
    idField: "loan_id",
    displayFields: (item) => [
      { label: "ID", value: item.loan_id },
      { label: "Borrower", value: item.borrower_name || item.client_name || "-" },
      { label: "Amount", value: `${item.currency || ""} ${Number(item.amount || 0).toLocaleString()}` },
      { label: "Status", value: item.status },
    ],
  },
  {
    key: "repayments",
    label: "Repayments",
    icon: Receipt,
    endpoint: "repayments",
    idField: "repayment_id",
    displayFields: (item) => [
      { label: "ID", value: item.repayment_id },
      { label: "Loan", value: item.loan_id || "-" },
      { label: "Amount", value: `${item.currency || ""} ${Number(item.amount || 0).toLocaleString()}` },
      { label: "Status", value: item.status },
    ],
  },
  {
    key: "psp-settlements",
    label: "PSP Settlements",
    icon: CreditCard,
    endpoint: "psp-settlements",
    idField: "settlement_id",
    displayFields: (item) => [
      { label: "ID", value: item.settlement_id },
      { label: "PSP", value: item.psp_name || item.psp_id || "-" },
      { label: "Net Amount", value: `${item.currency || ""} ${Number(item.net_amount || 0).toLocaleString()}` },
      { label: "Status", value: item.status },
    ],
  },
];

function ReinstateTab({ tabCfg }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // confirm flow state
  const [previewLoading, setPreviewLoading] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [processing, setProcessing] = useState(null);

  const debounceRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const fetchItems = useCallback(
    async (p, ps, q) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: p, page_size: ps });
        if (q) params.set("search", q);
        const res = await fetch(
          `${API_URL}/api/reinstate/${tabCfg.endpoint}?${params.toString()}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setItems(data.items || data.data || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        toast.error(err?.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [tabCfg.endpoint, tabCfg.label]
  );

  useEffect(() => {
    fetchItems(page, pageSize, search);
  }, [fetchItems, page, pageSize, search]);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(val.trim());
    }, 400);
  };

  const handlePageSizeChange = (ps) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleReinstateClick = async (item) => {
    const id = item[tabCfg.idField];
    setPreviewLoading(id);
    try {
      const res = await fetch(
        `${API_URL}/api/reinstate/${tabCfg.endpoint}/${id}/preview`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error("Failed to load preview");
      const preview = await res.json();
      setConfirmData({ item, preview });
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleCaptchaVerified = async () => {
    if (!confirmData) return;
    const id = confirmData.item[tabCfg.idField];
    setProcessing(id);
    setConfirmData(null);
    setShowCaptcha(false);
    try {
      const res = await fetch(
        `${API_URL}/api/reinstate/${tabCfg.endpoint}/${id}`,
        { method: "POST", headers: getAuthHeaders() }
      );
      if (!res.ok) { toast.error(await getApiError(res)); return; }
      await res.json();
      toast.success("Reinstated successfully");
      fetchItems(page, pageSize, search);
    } catch (e) {
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  const closeConfirm = () => {
    setConfirmData(null);
    setShowCaptcha(false);
  };

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-card-foreground" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={tabCfg.searchPlaceholder || `Search by ID, reference, name...`}
          className="w-full pl-9 pr-9 py-2 bg-card border border rounded-md text-foreground text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
        {searchInput && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-card-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-card-foreground gap-3">
          <tabCfg.icon className="w-10 h-10 opacity-30" />
          <p className="text-sm">
            {search ? `No results for "${search}"` : "No items available for reinstatement"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const id = item[tabCfg.idField];
            const fields = tabCfg.displayFields(item);
            const isLoadingThis = previewLoading === id;
            return (
              <div
                key={id}
                className="bg-card border border rounded-lg p-4 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-1 flex-1">
                  {fields.map((f) => (
                    <div key={f.label}>
                      <p className="text-card-foreground text-xs uppercase tracking-wider">{f.label}</p>
                      <p className="text-foreground text-sm font-mono truncate">{f.value}</p>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                  onClick={() => handleReinstateClick(item)}
                  disabled={isLoadingThis || processing === id}
                >
                  {isLoadingThis || processing === id ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3 h-3 mr-1" />
                  )}
                  Reinstate
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Confirm Dialog with Preview Summary */}
      <Dialog open={!!confirmData && !showCaptcha} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
        <DialogContent className="bg-card border text-foreground max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              Confirm Reinstatement
            </DialogTitle>
          </DialogHeader>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-orange-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            All financial effects will be reversed and status reset to pending. This cannot be undone automatically.
          </div>

          {confirmData && <PreviewSummary preview={confirmData.preview} />}

          <div className="flex gap-3 pt-2 border-t border/60">
            <Button
              variant="outline"
              className="flex-1 border text-card-foreground hover:bg-muted"
              onClick={closeConfirm}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setShowCaptcha(true)}
            >
              Proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Captcha Dialog */}
      <Dialog open={showCaptcha} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
        <DialogContent className="bg-card border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Verify to Reinstate</DialogTitle>
          </DialogHeader>
          <MathCaptcha
            onVerified={handleCaptchaVerified}
            onCancel={closeConfirm}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ReinstateCenter() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("transactions");

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-card-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <RotateCcw className="w-6 h-6 text-orange-400" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reinstate Center</h1>
          <p className="text-muted-foreground text-sm">
            Reverse approved records back to pending status. Admin only.
          </p>
        </div>
        <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">
          Admin Only
        </Badge>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2 shrink-0">
        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <p className="text-orange-700 text-sm">
          Reinstating a record reverses all treasury balance changes, resets statuses, and removes
          approval data. A full before/after summary is shown before confirmation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="bg-muted border border flex-wrap h-auto gap-1 p-1 shrink-0">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-card-foreground flex items-center gap-1.5"
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabConfig.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1"
          >
            <ReinstateTab tabCfg={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
