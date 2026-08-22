import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Trash2, FileText, Send, Download, Wallet, Loader2, Search,
  CheckCircle2, XCircle, ArrowRight, Receipt,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CURRENCIES = ["USD", "AED", "INR", "EUR", "GBP"];

const STATUS_TONE = {
  draft: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  sent: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  accepted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  declined: "bg-red-500/15 text-red-500 border-red-500/30",
  expired: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  converted: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  partially_paid: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  overdue: "bg-red-500/15 text-red-500 border-red-500/30",
  void: "bg-slate-400/15 text-slate-400 border-slate-400/30",
};

const money = (n, ccy) =>
  `${ccy || ""} ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`.trim();

const emptyDoc = () => ({
  client_id: "",
  client_label: "",
  currency: "USD",
  tax_rate: "",
  due_date: "",
  valid_until: "",
  notes: "",
  terms: "",
  line_items: [{ description: "", quantity: "1", unit_price: "" }],
});

export default function Billing() {
  const [tab, setTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [outstanding, setOutstanding] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [settings, setSettings] = useState(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);

  const [docDialog, setDocDialog] = useState(false);
  const [docKind, setDocKind] = useState("invoice");
  const [form, setForm] = useState(emptyDoc());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState([]);

  const [payDialog, setPayDialog] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: "", treasury_account_id: "", method: "", reference: "", exchange_rate: "",
  });

  const [sendDialog, setSendDialog] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendForm, setSendForm] = useState({ to: "", subject: "", message: "" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const apiError = async (res) => {
    try {
      const d = await res.json();
      return d.detail || "Request failed";
    } catch {
      return `Request failed (${res.status})`;
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page_size: "100" });
      if (search) qs.set("search", search);
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const [invRes, quoRes] = await Promise.all([
        fetch(`${API_URL}/api/invoices?${qs}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/quotations?${qs}`, { headers: getAuthHeaders() }),
      ]);
      if (invRes.ok) {
        const d = await invRes.json();
        setInvoices(d.items || []);
        setOutstanding(d.outstanding_by_currency || {});
      }
      if (quoRes.ok) setQuotations((await quoRes.json()).items || []);
    } catch {
      toast.error("Could not load billing documents");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          fetch(`${API_URL}/api/billing/settings`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders() }),
        ]);
        if (s.ok) setSettings(await s.json());
        if (t.ok) {
          const d = await t.json();
          setTreasuryAccounts(
            (Array.isArray(d) ? d : d.items || d.accounts || []).filter(
              (a) => a.status === "active"
            )
          );
        }
      } catch {
        /* non-fatal: the page still lists documents */
      }
    })();
  }, []);

  // Client lookup. There are thousands of clients, so this searches rather than
  // loading them all into a dropdown.
  useEffect(() => {
    if (!clientQuery || clientQuery.length < 2) {
      setClientResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${API_URL}/api/clients?search=${encodeURIComponent(clientQuery)}&page_size=8`,
          { headers: getAuthHeaders() }
        );
        if (r.ok) {
          const d = await r.json();
          setClientResults(d.items || d.clients || []);
        }
      } catch {
        /* ignore - the field stays empty and the form blocks on submit */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const lineTotals = () => {
    const subtotal = form.line_items.reduce(
      (a, li) => a + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0),
      0
    );
    const rate =
      form.tax_rate === "" ? settings?.tax_rate ?? 0 : parseFloat(form.tax_rate) || 0;
    const tax = subtotal * rate / 100;
    return { subtotal, rate, tax, total: subtotal + tax };
  };

  const setLine = (i, field, value) => {
    setForm((f) => {
      const items = [...f.line_items];
      items[i] = { ...items[i], [field]: value };
      return { ...f, line_items: items };
    });
  };
  const addLine = () =>
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { description: "", quantity: "1", unit_price: "" }],
    }));
  const removeLine = (i) =>
    setForm((f) => ({
      ...f,
      line_items: f.line_items.filter((_, idx) => idx !== i),
    }));

  const openCreate = (kind) => {
    setDocKind(kind);
    setEditingId(null);
    setForm({ ...emptyDoc(), tax_rate: String(settings?.tax_rate ?? "") });
    setClientQuery("");
    setClientResults([]);
    setDocDialog(true);
  };

  const openEdit = (kind, doc) => {
    setDocKind(kind);
    setEditingId(kind === "invoice" ? doc.invoice_id : doc.quotation_id);
    setForm({
      client_id: doc.client_id,
      client_label: doc.client_name,
      currency: doc.currency || "USD",
      tax_rate: String(doc.tax_rate ?? ""),
      due_date: doc.due_date || "",
      valid_until: doc.valid_until || "",
      notes: doc.notes || "",
      terms: doc.terms || "",
      line_items: (doc.line_items || []).map((li) => ({
        description: li.description || "",
        quantity: String(li.quantity ?? 1),
        unit_price: String(li.unit_price ?? 0),
      })),
    });
    setClientQuery("");
    setDocDialog(true);
  };

  const saveDoc = async () => {
    if (!form.client_id) {
      toast.error("Pick a client first");
      return;
    }
    const items = form.line_items
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: parseFloat(li.quantity) || 0,
        unit_price: parseFloat(li.unit_price) || 0,
      }));
    if (!items.length) {
      toast.error("Add at least one line with a description");
      return;
    }
    setSaving(true);
    const body = {
      client_id: form.client_id,
      currency: form.currency,
      tax_rate: form.tax_rate === "" ? undefined : parseFloat(form.tax_rate),
      line_items: items,
      notes: form.notes || undefined,
      terms: form.terms || undefined,
      ...(docKind === "invoice"
        ? { due_date: form.due_date || undefined }
        : { valid_until: form.valid_until || undefined }),
    };
    const base = docKind === "invoice" ? "invoices" : "quotations";
    const url = editingId
      ? `${API_URL}/api/${base}/${editingId}`
      : `${API_URL}/api/${base}`;
    try {
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(await apiError(res));
        return;
      }
      toast.success(editingId ? "Saved" : `${docKind === "invoice" ? "Invoice" : "Quotation"} created`);
      setDocDialog(false);
      load();
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const act = async (path, okMessage, body) => {
    try {
      const res = await fetch(`${API_URL}/api/${path}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) {
        toast.error(await apiError(res));
        return false;
      }
      toast.success(okMessage);
      load();
      return true;
    } catch {
      toast.error("Something went wrong");
      return false;
    }
  };

  const downloadPdf = async (kind, id, number) => {
    try {
      const res = await fetch(`${API_URL}/api/${kind}s/${id}/pdf`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        toast.error(await apiError(res));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the PDF");
    }
  };

  const openPay = (inv) => {
    setPayTarget(inv);
    setPayForm({
      amount: String(inv.balance_due ?? ""),
      treasury_account_id: "",
      method: "",
      reference: "",
      exchange_rate: "",
    });
    setPayDialog(true);
  };

  const submitPayment = async () => {
    const acct = treasuryAccounts.find(
      (a) => a.account_id === payForm.treasury_account_id
    );
    if (!acct) {
      toast.error("Choose the account the money landed in");
      return;
    }
    const needsRate = (acct.currency || "USD") !== (payTarget.currency || "USD");
    if (needsRate && !parseFloat(payForm.exchange_rate)) {
      toast.error(
        `This invoice is in ${payTarget.currency} but the account holds ${acct.currency}. Enter the rate used.`
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/api/invoices/${payTarget.invoice_id}/payments`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            amount: parseFloat(payForm.amount),
            treasury_account_id: payForm.treasury_account_id,
            method: payForm.method || undefined,
            reference: payForm.reference || undefined,
            exchange_rate: needsRate ? parseFloat(payForm.exchange_rate) : undefined,
            // Guards a double-clicked button against crediting treasury twice.
            idempotency_key: `${payTarget.invoice_id}-${payForm.amount}-${payForm.reference || ""}-${payForm.treasury_account_id}`,
          }),
        }
      );
      if (!res.ok) {
        toast.error(await apiError(res));
        return;
      }
      const d = await res.json();
      toast.success(
        `Recorded. ${money(d.payment.credited_amount, d.payment.treasury_currency)} into ${d.payment.treasury_account_name}`
      );
      setPayDialog(false);
      load();
    } catch {
      toast.error("Could not record the payment");
    } finally {
      setSaving(false);
    }
  };

  const openSend = (kind, doc) => {
    setSendTarget({ kind, doc });
    setSendForm({ to: doc.client_email || "", subject: "", message: "" });
    setSendDialog(true);
  };

  const submitSend = async () => {
    const { kind, doc } = sendTarget;
    const id = kind === "invoice" ? doc.invoice_id : doc.quotation_id;
    setSaving(true);
    const ok = await act(
      `${kind}s/${id}/send`,
      `Sent to ${sendForm.to}`,
      {
        to_emails: sendForm.to
          ? sendForm.to.split(",").map((e) => e.trim()).filter(Boolean)
          : undefined,
        subject: sendForm.subject || undefined,
        message: sendForm.message || undefined,
      }
    );
    setSaving(false);
    if (ok) setSendDialog(false);
  };

  const totals = lineTotals();
  const payAccount = treasuryAccounts.find(
    (a) => a.account_id === payForm.treasury_account_id
  );
  const payNeedsRate =
    payAccount && payTarget && (payAccount.currency || "USD") !== (payTarget.currency || "USD");

  const StatusBadge = ({ status }) => (
    <Badge
      variant="outline"
      className={`text-xs capitalize ${STATUS_TONE[status] || ""}`}
    >
      {String(status || "").replace("_", " ")}
    </Badge>
  );

  return (
    <div className="space-y-6 p-6" data-testid="billing-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing</h1>
          <p className="text-muted-foreground">
            Quotations, invoices and the payments received against them
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openCreate("quotation")}
            className="border text-card-foreground hover:bg-muted"
            data-testid="new-quotation-btn"
          >
            <FileText className="w-4 h-4 mr-2" /> New Quotation
          </Button>
          <Button
            onClick={() => openCreate("invoice")}
            className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
            data-testid="new-invoice-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Outstanding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Outstanding
                </p>
                {Object.keys(outstanding).length === 0 ? (
                  <p className="text-3xl font-bold font-mono text-foreground">-</p>
                ) : (
                  Object.entries(outstanding).map(([ccy, amt]) => (
                    <p key={ccy} className="text-2xl font-bold font-mono text-amber-500">
                      {money(amt, ccy)}
                    </p>
                  ))
                )}
              </div>
              <div className="p-3 bg-amber-500/10 rounded-sm">
                <Wallet className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Invoices</p>
                <p className="text-3xl font-bold font-mono text-foreground">{invoices.length}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {invoices.filter((i) => i.status === "overdue").length} overdue
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-sm">
                <Receipt className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quotations</p>
                <p className="text-3xl font-bold font-mono text-foreground">{quotations.length}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {quotations.filter((q) => q.status === "accepted").length} accepted
                </p>
              </div>
              <div className="p-3 bg-violet-500/10 rounded-sm">
                <FileText className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            placeholder="Search number, client or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="billing-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[190px]" data-testid="billing-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partially_paid">Partially paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="w-4 h-4 mr-2" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="quotations" data-testid="tab-quotations">
            <FileText className="w-4 h-4 mr-2" /> Quotations
          </TabsTrigger>
        </TabsList>

        {/* ---------------- invoices ---------------- */}
        <TabsContent value="invoices">
          <Card className="bg-card border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground/60">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground/60">
                          No invoices yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.invoice_id} data-testid={`invoice-${inv.invoice_id}`}>
                          <TableCell className="font-mono text-xs text-foreground">
                            {inv.invoice_number || <span className="text-muted-foreground/60">draft</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">{inv.client_name}</div>
                            <div className="text-xs text-muted-foreground/60">{inv.client_email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {(inv.issued_at || "").slice(0, 10) || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.due_date || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            {money(inv.total, inv.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={Number(inv.balance_due) > 0 ? "text-amber-500" : "text-emerald-600"}>
                              {money(inv.balance_due, inv.currency)}
                            </span>
                          </TableCell>
                          <TableCell><StatusBadge status={inv.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {inv.status === "draft" && (
                                <>
                                  <Button size="sm" variant="ghost" title="Edit"
                                    onClick={() => openEdit("invoice", inv)} className="text-muted-foreground px-2">
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" title="Issue"
                                    onClick={() => act(`invoices/${inv.invoice_id}/issue`, "Invoice issued")}
                                    className="text-emerald-600 px-2" data-testid={`issue-${inv.invoice_id}`}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {inv.invoice_number && (
                                <>
                                  <Button size="sm" variant="ghost" title="Download PDF"
                                    onClick={() => downloadPdf("invoice", inv.invoice_id, inv.invoice_number)}
                                    className="text-muted-foreground px-2">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" title="Email to client"
                                    onClick={() => openSend("invoice", inv)} className="text-muted-foreground px-2">
                                    <Send className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {["sent", "partially_paid", "overdue"].includes(inv.status) && (
                                <Button size="sm" title="Record payment" onClick={() => openPay(inv)}
                                  className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border border-emerald-500/30 px-2"
                                  data-testid={`pay-${inv.invoice_id}`}>
                                  <Wallet className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {inv.status !== "void" && Number(inv.amount_paid || 0) === 0 && inv.invoice_number && (
                                <Button size="sm" variant="ghost" title="Void"
                                  onClick={() => act(`invoices/${inv.invoice_id}/void`, "Invoice voided")}
                                  className="text-red-500 px-2">
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- quotations ---------------- */}
        <TabsContent value="quotations">
          <Card className="bg-card border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Valid until</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground/60">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : quotations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground/60">
                          No quotations yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      quotations.map((q) => (
                        <TableRow key={q.quotation_id} data-testid={`quotation-${q.quotation_id}`}>
                          <TableCell className="font-mono text-xs text-foreground">
                            {q.quotation_number || <span className="text-muted-foreground/60">draft</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">{q.client_name}</div>
                            <div className="text-xs text-muted-foreground/60">{q.client_email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{q.valid_until || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            {money(q.total, q.currency)}
                          </TableCell>
                          <TableCell><StatusBadge status={q.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {q.status === "draft" && (
                                <>
                                  <Button size="sm" variant="ghost" title="Edit"
                                    onClick={() => openEdit("quotation", q)} className="text-muted-foreground px-2">
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" title="Issue"
                                    onClick={() => act(`quotations/${q.quotation_id}/issue`, "Quotation issued")}
                                    className="text-emerald-600 px-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {q.quotation_number && (
                                <>
                                  <Button size="sm" variant="ghost" title="Download PDF"
                                    onClick={() => downloadPdf("quotation", q.quotation_id, q.quotation_number)}
                                    className="text-muted-foreground px-2">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" title="Email to client"
                                    onClick={() => openSend("quotation", q)} className="text-muted-foreground px-2">
                                    <Send className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {["sent"].includes(q.status) && (
                                <Button size="sm" variant="ghost" title="Mark accepted"
                                  onClick={() => act(`quotations/${q.quotation_id}/status`, "Marked accepted", { status: "accepted" })}
                                  className="text-emerald-600 px-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {["accepted", "sent"].includes(q.status) && (
                                <Button size="sm" title="Convert to invoice"
                                  onClick={() => act(`quotations/${q.quotation_id}/convert`, "Invoice created from quotation")}
                                  className="bg-violet-500/15 text-violet-500 hover:bg-violet-500/25 border border-violet-500/30 px-2"
                                  data-testid={`convert-${q.quotation_id}`}>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {q.status === "draft" && (
                                <Button size="sm" variant="ghost" title="Delete draft"
                                  onClick={async () => {
                                    const r = await fetch(`${API_URL}/api/quotations/${q.quotation_id}`, {
                                      method: "DELETE", headers: getAuthHeaders(),
                                    });
                                    if (r.ok) { toast.success("Draft deleted"); load(); }
                                    else toast.error(await apiError(r));
                                  }}
                                  className="text-red-500 px-2">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------------- create / edit ---------------- */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "New"} {docKind === "invoice" ? "Invoice" : "Quotation"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* client */}
            <div>
              <Label>Client</Label>
              {form.client_id ? (
                <div className="flex items-center justify-between mt-1 p-2 rounded-sm bg-card border">
                  <span className="text-foreground text-sm">{form.client_label}</span>
                  <Button size="sm" variant="ghost" className="text-muted-foreground"
                    onClick={() => setForm((f) => ({ ...f, client_id: "", client_label: "" }))}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input className="mt-1" placeholder="Search by name or email..."
                    value={clientQuery} onChange={(e) => setClientQuery(e.target.value)}
                    data-testid="client-search" />
                  {clientResults.length > 0 && (
                    <div className="mt-1 border rounded-sm max-h-44 overflow-y-auto">
                      {clientResults.map((c) => {
                        const label =
                          [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || c.client_id;
                        return (
                          <button key={c.client_id} type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, client_id: c.client_id, client_label: label }));
                              setClientResults([]); setClientQuery("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 text-foreground">
                            {label}
                            <span className="text-muted-foreground/60 ml-2 text-xs">{c.email}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Currency</Label>
                <Select value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{docKind === "invoice" ? "Due date" : "Valid until"}</Label>
                <Input type="date" className="mt-1"
                  value={docKind === "invoice" ? form.due_date : form.valid_until}
                  onChange={(e) =>
                    setForm((f) =>
                      docKind === "invoice"
                        ? { ...f, due_date: e.target.value }
                        : { ...f, valid_until: e.target.value })} />
              </div>
              <div>
                <Label>VAT %</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.tax_rate}
                  placeholder={String(settings?.tax_rate ?? 5)}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))} />
              </div>
            </div>

            {/* line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line items</Label>
                <Button size="sm" variant="outline" onClick={addLine}
                  className="border text-card-foreground hover:bg-muted" data-testid="add-line-btn">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add line
                </Button>
              </div>
              <div className="space-y-2">
                {form.line_items.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-6" placeholder="Description"
                      value={li.description}
                      onChange={(e) => setLine(i, "description", e.target.value)}
                      data-testid={`line-desc-${i}`} />
                    <Input className="col-span-2 text-right" type="number" step="0.01"
                      placeholder="Qty" value={li.quantity}
                      onChange={(e) => setLine(i, "quantity", e.target.value)} />
                    <Input className="col-span-2 text-right" type="number" step="0.01"
                      placeholder="Unit price" value={li.unit_price}
                      onChange={(e) => setLine(i, "unit_price", e.target.value)} />
                    <div className="col-span-1 text-right font-mono text-xs text-muted-foreground">
                      {((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0)).toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      {form.line_items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeLine(i)}
                          className="text-red-500 px-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* live totals - the same arithmetic the server does on save */}
              <div className="mt-3 flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT {totals.rate}%</span>
                    <span className="font-mono">{totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1 border-t">
                    <span>Total</span>
                    <span className="font-mono">{money(totals.total, form.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Notes</Label>
                <Textarea className="mt-1" rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <Label>Terms</Label>
                <Textarea className="mt-1" rows={2} value={form.terms}
                  onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDocDialog(false)} className="border text-card-foreground hover:bg-muted">
                Cancel
              </Button>
              <Button onClick={saveDoc} disabled={saving}
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm"
                data-testid="save-doc-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save draft"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------- record payment ---------------- */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-sm bg-card border text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Invoice</span>
                  <span className="font-mono text-foreground">{payTarget.invoice_number}</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Outstanding</span>
                  <span className="font-mono text-amber-500">
                    {money(payTarget.balance_due, payTarget.currency)}
                  </span>
                </div>
              </div>

              <div>
                <Label>Amount received ({payTarget.currency})</Label>
                <Input type="number" step="0.01" className="mt-1" value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  data-testid="pay-amount" />
              </div>

              <div>
                <Label>Credit to treasury account</Label>
                <Select value={payForm.treasury_account_id}
                  onValueChange={(v) => setPayForm((f) => ({ ...f, treasury_account_id: v }))}>
                  <SelectTrigger className="mt-1" data-testid="pay-account">
                    <SelectValue placeholder="Where did the money land?" />
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

              {payNeedsRate && (
                <div>
                  <Label>
                    Rate {payTarget.currency} to {payAccount.currency}
                  </Label>
                  <Input type="number" step="0.00000001" className="mt-1"
                    value={payForm.exchange_rate}
                    onChange={(e) => setPayForm((f) => ({ ...f, exchange_rate: e.target.value }))}
                    data-testid="pay-rate" />
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Credits{" "}
                    {money(
                      (parseFloat(payForm.amount) || 0) * (parseFloat(payForm.exchange_rate) || 0),
                      payAccount.currency
                    )}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Method</Label>
                  <Input className="mt-1" placeholder="bank transfer" value={payForm.method}
                    onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))} />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input className="mt-1" value={payForm.reference}
                    onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayDialog(false)} className="border text-card-foreground hover:bg-muted">
                  Cancel
                </Button>
                <Button onClick={submitPayment} disabled={saving}
                  className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold"
                  data-testid="submit-payment">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- send ---------------- */}
      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Email to client</DialogTitle></DialogHeader>
          {sendTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sends{" "}
                <span className="font-mono text-foreground">
                  {sendTarget.doc.invoice_number || sendTarget.doc.quotation_number}
                </span>{" "}
                as a PDF attachment.
              </p>
              <div>
                <Label>To</Label>
                <Input className="mt-1" value={sendForm.to}
                  placeholder="comma separated for more than one"
                  onChange={(e) => setSendForm((f) => ({ ...f, to: e.target.value }))}
                  data-testid="send-to" />
              </div>
              <div>
                <Label>Subject</Label>
                <Input className="mt-1" value={sendForm.subject} placeholder="(default)"
                  onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea className="mt-1" rows={3} value={sendForm.message}
                  placeholder="(default)"
                  onChange={(e) => setSendForm((f) => ({ ...f, message: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendDialog(false)} className="border text-card-foreground hover:bg-muted">
                  Cancel
                </Button>
                <Button onClick={submitSend} disabled={saving || !sendForm.to}
                  className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm"
                  data-testid="submit-send">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
