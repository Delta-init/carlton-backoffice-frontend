import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import PaginationControls from '../components/PaginationControls';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import * as XLSX from 'xlsx';
import { usePermissions } from '../context/usePermissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  Landmark,
  Wallet,
  Building2,
  CreditCard,
  Repeat,
  Coins,
  Search,
  Filter,
  Eye,
  Percent,
  X,
  Download,
  FileText,
  Users,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const transactionTypes = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'commission', label: 'Commission' },
  { value: 'rebate', label: 'Rebate' },
  { value: 'adjustment', label: 'Adjustment' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];

// Amounts in the transaction's own payment currency. USD figures stay the common
// base for totals; this shows what actually moved.
const fmtCur = (n, cur) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur || ''}`.trim();

// One line per currency, e.g. "3,240,236.00 AED · 61,300.00 INR"
const CurrencyLines = ({ byCurrency, field = 'net', className = '' }) => {
  const entries = Object.entries(byCurrency || {});
  if (!entries.length) return null;
  return (
    <div className={`text-[10px] text-muted-foreground font-mono leading-tight ${className}`}>
      {entries.map(([cur, v]) => (
        <div key={cur}>{fmtCur(v[field], cur)}</div>
      ))}
    </div>
  );
};

const fmtUsd = (n) => {
  const v = n || 0;
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (s) =>
  s
    ? new Date(s).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '-';

const DEST_ICONS = {
  treasury: Landmark,
  vendor: Repeat,
  psp: CreditCard,
  bank: Building2,
  usdt: Coins,
};

export default function PartnerDetail() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const { canView, canEdit } = usePermissions();
  const canManageTreasury = canView('partner_treasury');
  const canEditCharges = canEdit('partner_treasury');

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  // Transactions tab
  const [txItems, setTxItems] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);
  const [txLoading, setTxLoading] = useState(false);

  // Filters - same set the Transactions Summary page offers, minus the client-tag
  // filter (this page is already scoped to exactly one tag).
  const [txType, setTxType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [baseCurrencyFilter, setBaseCurrencyFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('all');
  const [hasCrmFilter, setHasCrmFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [destinationIdFilter, setDestinationIdFilter] = useState('all');
  const [txnTagFilter, setTxnTagFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [txDateType, setTxDateType] = useState('transaction');
  // Text inputs are debounced so typing doesn't fire a request per keystroke
  const [searchInput, setSearchInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  // Dropdown option sources
  const [vendors, setVendors] = useState([]);
  const [psps, setPsps] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [txnTags, setTxnTags] = useState([]);

  // Treasury tab (computed from real transactions, read-only)
  const [treasuryGroups, setTreasuryGroups] = useState([]);
  const [treasuryTotal, setTreasuryTotal] = useState(0);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [treasuryCharges, setTreasuryCharges] = useState(0);
  const [treasuryNetAfter, setTreasuryNetAfter] = useState(0);

  // Clients tab - clients carrying this partner's tag
  const [clientRows, setClientRows] = useState([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(20);
  const [clientSearchInput, setClientSearchInput] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  // Drill-down: the transactions behind one treasury card
  const [drill, setDrill] = useState(null);          // { group, entry }
  const [drillRows, setDrillRows] = useState([]);
  const [drillTotal, setDrillTotal] = useState(0);
  const [drillPage, setDrillPage] = useState(1);
  const [drillLoading, setDrillLoading] = useState(false);

  // Charge editor
  const [chargeEdit, setChargeEdit] = useState(null); // { group, entry }
  const [chargeIn, setChargeIn] = useState('0');
  const [chargeOut, setChargeOut] = useState('0');
  const [chargeSaving, setChargeSaving] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchPartner = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/reports/partner-summary`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        const match = (d.partners || []).find((p) => p.tag_id === tagId);
        if (!match) {
          toast.error('Partner not found, or you are not permitted to view it');
          navigate('/partners');
          return;
        }
        setPartner(match);
      } else {
        toast.error('Failed to load partner');
      }
    } catch {
      toast.error('Failed to load partner');
    } finally {
      setLoading(false);
    }
  }, [tagId, navigate]);

  useEffect(() => { fetchPartner(); }, [fetchPartner]);

  // Debounce the two free-text filters
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setEmailFilter(emailInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, emailInput]);

  // One call gives us vendors + PSPs + treasury accounts, and only requires
  // Transaction permission - hitting /api/vendors, /api/psp and /api/treasury
  // directly would leave the dropdowns empty for anyone without those modules.
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [formRes, tagRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions/form-data`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/transaction-tags`, { headers: getAuthHeaders(), credentials: 'include' }),
      ]);
      if (formRes.ok) {
        const d = await formRes.json();
        setVendors(d.vendors || []);
        setPsps(d.psps || []);
        setTreasuryAccounts(d.treasury_accounts || []);
      }
      if (tagRes.ok) {
        const d = await tagRes.json();
        setTxnTags(Array.isArray(d) ? d : d.items || []);
      }
    } catch {
      // Non-fatal: the transaction list still works, the dropdowns are just empty
    }
  }, []);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  const fetchTransactions = useCallback(async (tagName, page) => {
    setTxLoading(true);
    try {
      const qs = new URLSearchParams({
        client_tag: tagName,
        page: String(page),
        page_size: String(txPageSize),
      });
      if (txType !== 'all') qs.set('transaction_type', txType);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (baseCurrencyFilter !== 'all') qs.set('base_currency', baseCurrencyFilter);
      if (completedFilter !== 'all') qs.set('completed', completedFilter);
      if (hasCrmFilter !== 'all') qs.set('has_crm', hasCrmFilter);
      if (destinationFilter !== 'all') qs.set('destination_type', destinationFilter);
      if (destinationIdFilter !== 'all') {
        if (destinationFilter === 'vendor') qs.set('vendor_id', destinationIdFilter);
        else if (destinationFilter === 'psp') qs.set('psp_id', destinationIdFilter);
        else if (destinationFilter === 'treasury' || destinationFilter === 'usdt') qs.set('destination_account_id', destinationIdFilter);
      }
      if (search) qs.set('search', search);
      if (emailFilter) qs.set('client_email', emailFilter);
      // Which date field the range applies to is chosen by txDateType
      if (dateFrom) {
        qs.set(
          txDateType === 'approved' ? 'approved_date_from'
            : txDateType === 'bank_receipt' ? 'bank_receipt_date_from'
              : txDateType === 'request_processed' ? 'request_processed_date_from'
                : 'date_from',
          dateFrom,
        );
      }
      if (dateTo) {
        qs.set(
          txDateType === 'approved' ? 'approved_date_to'
            : txDateType === 'bank_receipt' ? 'bank_receipt_date_to'
              : txDateType === 'request_processed' ? 'request_processed_date_to'
                : 'date_to',
          dateTo,
        );
      }
      if (txnTagFilter !== 'all') qs.set('transaction_tag', txnTagFilter);

      const r = await fetch(`${API_URL}/api/transactions?${qs.toString()}`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setTxItems(d.items || []);
        setTxTotal(d.total || 0);
      } else {
        toast.error('Failed to load transactions');
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [
    txPageSize, txType, statusFilter, baseCurrencyFilter, completedFilter, hasCrmFilter,
    destinationFilter, destinationIdFilter, search, emailFilter, dateFrom, dateTo,
    txDateType, txnTagFilter,
  ]);

  // Any filter change sends us back to page 1 - staying on page 7 of a result set
  // that just shrank to 2 pages would show an empty table.
  useEffect(() => {
    setTxPage(1);
  }, [
    txType, statusFilter, baseCurrencyFilter, completedFilter, hasCrmFilter,
    destinationFilter, destinationIdFilter, search, emailFilter, dateFrom, dateTo,
    txDateType, txnTagFilter, txPageSize,
  ]);

  useEffect(() => {
    if (partner) fetchTransactions(partner.name, txPage);
  }, [partner, txPage, fetchTransactions]);

  const filtersActive = txType !== 'all' || statusFilter !== 'all' || baseCurrencyFilter !== 'all'
    || completedFilter !== 'all' || hasCrmFilter !== 'all' || destinationFilter !== 'all'
    || destinationIdFilter !== 'all' || txnTagFilter !== 'all' || dateFrom || dateTo
    || searchInput || emailInput;

  const clearFilters = () => {
    setTxType('all');
    setStatusFilter('all');
    setBaseCurrencyFilter('all');
    setCompletedFilter('all');
    setHasCrmFilter('all');
    setDestinationFilter('all');
    setDestinationIdFilter('all');
    setTxnTagFilter('all');
    setDateFrom('');
    setDateTo('');
    setTxDateType('transaction');
    setSearchInput('');
    setEmailInput('');
  };

  // Jump to the real Transactions Summary page, pre-filtered to this one
  // transaction - that page owns the full detail dialog (proofs, bank details,
  // PSP/exchanger breakdown), so we link to it rather than duplicating it here.
  const viewFullDetails = (tx) => {
    const ref = tx.reference || tx.transaction_id;
    navigate(`/transactions?search=${encodeURIComponent(ref)}`);
  };

  useEffect(() => {
    const t = setTimeout(() => setClientSearch(clientSearchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [clientSearchInput]);

  // Clients store tag IDs, so this filters by tagId (not the tag name that
  // transactions carry).
  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const qs = new URLSearchParams({
        tags: tagId, page: String(clientPage), page_size: String(clientPageSize),
      });
      if (clientSearch) qs.set('search', clientSearch);
      const r = await fetch(`${API_URL}/api/clients?${qs.toString()}`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setClientRows(d.items || []);
        setClientTotal(d.total || 0);
      } else toast.error('Failed to load clients');
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  }, [tagId, clientPage, clientPageSize, clientSearch]);

  useEffect(() => { setClientPage(1); }, [clientSearch, clientPageSize]);
  useEffect(() => {
    if (activeTab === 'clients') fetchClients();
  }, [activeTab, fetchClients]);

  const fetchTreasury = useCallback(async () => {
    if (!canManageTreasury) return;
    setTreasuryLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/partner-treasury?tag_id=${tagId}`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setTreasuryGroups(d.groups || []);
        setTreasuryTotal(d.grand_total_net_usd || 0);
        setTreasuryCharges(d.grand_total_charges_usd || 0);
        setTreasuryNetAfter(d.grand_total_net_after_charges_usd || 0);
      } else {
        toast.error('Failed to load partner treasury');
      }
    } catch {
      toast.error('Failed to load partner treasury');
    } finally {
      setTreasuryLoading(false);
    }
  }, [tagId, canManageTreasury]);

  useEffect(() => {
    if (activeTab === 'treasury') fetchTreasury();
  }, [activeTab, fetchTreasury]);

  // ── Drill-down ────────────────────────────────────────────────────────────
  // The card counts approved+completed only, so the list asks for exactly that
  // set - otherwise the rows would not add up to the figure they came from.
  const drillParams = (group, entry, page) => {
    const qs = new URLSearchParams({
      client_tag: partner.name,
      status: 'approved,completed',
      page: String(page),
      page_size: '20',
    });
    qs.set('destination_type', group.destination_type);
    if (group.destination_type === 'vendor') qs.set('vendor_id', entry.key);
    else if (group.destination_type === 'psp') qs.set('psp_id', entry.key);
    else if (group.destination_type === 'treasury' || group.destination_type === 'usdt') {
      qs.set('destination_account_id', entry.key);
    }
    return qs;
  };

  const loadDrill = useCallback(async (group, entry, page) => {
    setDrillLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/transactions?${drillParams(group, entry, page).toString()}`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setDrillRows(d.items || []);
        setDrillTotal(d.total || 0);
      } else toast.error('Failed to load transactions');
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setDrillLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  const openDrill = (group, entry) => {
    setDrill({ group, entry });
    setDrillPage(1);
    loadDrill(group, entry, 1);
  };

  useEffect(() => {
    if (drill) loadDrill(drill.group, drill.entry, drillPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillPage]);

  // ── Charges (display-only overlay) ────────────────────────────────────────
  const openChargeEditor = (group, entry) => {
    setChargeEdit({ group, entry });
    setChargeIn(String(entry.in_rate ?? 0));
    setChargeOut(String(entry.out_rate ?? 0));
  };

  const saveCharges = async () => {
    const inR = parseFloat(chargeIn) || 0;
    const outR = parseFloat(chargeOut) || 0;
    if (inR < 0 || inR > 100 || outR < 0 || outR > 100) {
      toast.error('Charges must be between 0 and 100 percent');
      return;
    }
    setChargeSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/partner-treasury/charges`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          tag_id: tagId,
          destination_type: chargeEdit.group.destination_type,
          entity_key: chargeEdit.entry.key,
          in_rate: inR,
          out_rate: outR,
        }),
      });
      if (r.ok) {
        toast.success('Charges updated');
        setChargeEdit(null);
        fetchTreasury();
      } else toast.error(await getApiError(r));
    } catch (e) {
      toast.error(e?.message || 'Something went wrong');
    } finally {
      setChargeSaving(false);
    }
  };

  // Same filters the Transactions tab list uses, without page/page_size - an
  // export covers the whole filtered set, not the page on screen.
  const txExportParams = () => {
    const qs = new URLSearchParams({ client_tag: partner.name });
    if (txType !== 'all') qs.set('transaction_type', txType);
    if (statusFilter !== 'all') qs.set('status', statusFilter);
    if (baseCurrencyFilter !== 'all') qs.set('base_currency', baseCurrencyFilter);
    if (destinationFilter !== 'all') qs.set('destination_type', destinationFilter);
    if (destinationIdFilter !== 'all') {
      if (destinationFilter === 'vendor') qs.set('vendor_id', destinationIdFilter);
      else if (destinationFilter === 'psp') qs.set('psp_id', destinationIdFilter);
      else if (destinationFilter === 'treasury' || destinationFilter === 'usdt') qs.set('destination_account_id', destinationIdFilter);
    }
    if (search) qs.set('search', search);
    if (emailFilter) qs.set('client_email', emailFilter);
    if (dateFrom) qs.set(txDateType === 'approved' ? 'approved_date_from' : txDateType === 'bank_receipt' ? 'bank_receipt_date_from' : txDateType === 'request_processed' ? 'request_processed_date_from' : 'date_from', dateFrom);
    if (dateTo) qs.set(txDateType === 'approved' ? 'approved_date_to' : txDateType === 'bank_receipt' ? 'bank_receipt_date_to' : txDateType === 'request_processed' ? 'request_processed_date_to' : 'date_to', dateTo);
    if (txnTagFilter !== 'all') qs.set('transaction_tag', txnTagFilter);
    return qs;
  };

  // The drill-down export must carry the same status set the card counted.
  const drillExportParams = () => {
    const qs = drillParams(drill.group, drill.entry, 1);
    qs.delete('page'); qs.delete('page_size');
    return qs;
  };

  // ── Export ────────────────────────────────────────────────────────────────
  // Both transaction areas export through the same path: /transactions/export
  // returns every row matching the filters (no page cap), then the file is built
  // client-side - the same approach the Transactions Summary page uses.
  const destinationLabel = (tx) => {
    if (tx.destination_type === 'treasury' || tx.destination_type === 'usdt')
      return tx.destination_account_name || (tx.destination_type || '').toUpperCase();
    if (tx.destination_type === 'psp') return tx.psp_name || 'PSP';
    if (tx.destination_type === 'vendor') return tx.vendor_name || 'Exchanger';
    if (tx.destination_type === 'bank') return tx.client_bank_name || 'Bank Transfer';
    return tx.destination_type || '-';
  };

  const EXPORT_HEADERS = [
    'Date', 'Reference', 'CRM Reference', 'Client', 'Email', 'Type',
    'Payment Currency', 'Amount', 'USD Amount', 'Status', 'Destination',
    'Client Tags', 'Transaction Tags',
  ];
  const exportRow = (tx) => [
    formatDate(tx.transaction_date || tx.created_at),
    tx.reference || '',
    tx.crm_reference || '',
    tx.client_name || '',
    tx.client_email || '',
    tx.transaction_type,
    tx.base_currency || tx.currency || 'USD',
    tx.base_amount ?? tx.amount,
    tx.amount,
    tx.status,
    destinationLabel(tx),
    (tx.client_tags || []).join('; '),
    (tx.transaction_tags || []).join('; '),
  ];

  const fetchAllForExport = async (params) => {
    const r = await fetch(`${API_URL}/api/transactions/export?${params.toString()}`, {
      headers: getAuthHeaders(), credentials: 'include',
    });
    if (!r.ok) throw new Error('Export failed');
    const d = await r.json();
    return d.items || [];
  };

  const exportExcel = async (params, title) => {
    const id = toast.loading('Preparing export…');
    try {
      const rows = await fetchAllForExport(params);
      if (!rows.length) { toast.error('Nothing to export', { id }); return; }
      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows.map(exportRow)]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${rows.length} row(s)`, { id });
    } catch (e) {
      toast.error(e?.message || 'Export failed', { id });
    }
  };

  const exportPDF = async (params, title) => {
    const id = toast.loading('Preparing export…');
    try {
      const rows = await fetchAllForExport(params);
      if (!rows.length) { toast.error('Nothing to export', { id }); return; }
      const dep = rows.filter(t => t.transaction_type === 'deposit').reduce((a, t) => a + (t.amount || 0), 0);
      const wd = rows.filter(t => t.transaction_type === 'withdrawal').reduce((a, t) => a + (t.amount || 0), 0);
      const esc = (v) => String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const w = window.open('', '_blank');
      if (!w) { toast.error('Pop-up blocked - allow pop-ups to export PDF', { id }); return; }
      w.document.write(`
        <html><head><title>${esc(title)}</title><style>
          body{font-family:Arial,sans-serif;padding:20px}
          h1{color:#1F2833;border-bottom:2px solid #66FCF1;padding-bottom:10px}
          .summary{display:flex;gap:30px;margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px}
          .summary-item label{font-size:12px;color:#666;display:block}
          .summary-item span{font-size:18px;font-weight:bold}
          .dep{color:#22c55e}.wd{color:#ef4444}
          table{width:100%;border-collapse:collapse;margin-top:20px}
          th{background:#1F2833;color:#fff;padding:8px;text-align:left;font-size:10px}
          td{padding:6px 8px;border-bottom:1px solid #eee;font-size:10px}
        </style></head><body>
          <h1>${esc(title)}</h1>
          <p>Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}</p>
          <div class="summary">
            <div class="summary-item"><label>Total Deposits (USD)</label><span class="dep">${fmtUsd(dep)}</span></div>
            <div class="summary-item"><label>Total Withdrawals (USD)</label><span class="wd">${fmtUsd(wd)}</span></div>
            <div class="summary-item"><label>Net (USD)</label><span>${fmtUsd(dep - wd)}</span></div>
          </div>
          <table><thead><tr>${EXPORT_HEADERS.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(t => `<tr>${exportRow(t).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 400);
      toast.success(`Exported ${rows.length} row(s)`, { id });
    } catch (e) {
      toast.error(e?.message || 'Export failed', { id });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/partners')} className="text-muted-foreground hover:text-foreground -ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Partners
        </Button>
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: partner.color || '#94a3b8' }} />
          <h1 className="text-2xl font-bold text-foreground">{partner.name}</h1>
          <Badge variant="outline" className="text-xs">{partner.transaction_count} txns</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
        <Card className="bg-card border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">Clients</p>
            <p className="text-lg font-mono font-semibold text-foreground" data-testid="partner-client-count">
              {(partner.client_count ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">tagged {partner.name}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4">
<p className="text-xs text-muted-foreground uppercase tracking-wider">Deposits</p>
            <p className="text-lg font-mono font-semibold text-green-600">{fmtUsd(partner.total_deposits_usd)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{partner.deposit_count} txns</p>
            <CurrencyLines byCurrency={partner.by_currency} field="deposits" className="mt-1" />
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawals</p>
            <p className="text-lg font-mono font-semibold text-red-600">{fmtUsd(partner.total_withdrawals_usd)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{partner.withdrawal_count} txns</p>
            <CurrencyLines byCurrency={partner.by_currency} field="withdrawals" className="mt-1" />
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Net</p>
            <p className={`text-lg font-mono font-semibold ${partner.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtUsd(partner.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border border">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Wallet className="w-3.5 h-3.5 mr-1.5" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]" data-testid="partner-clients-tab">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Clients
          </TabsTrigger>
          {canManageTreasury && (
            <TabsTrigger value="treasury" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]" data-testid="partner-treasury-tab">
              <Landmark className="w-3.5 h-3.5 mr-1.5" /> Treasury
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => exportExcel(txExportParams(), `${partner.name}_transactions`)}
              className="border-green-200 text-green-600 hover:bg-green-50 h-8 px-3" data-testid="pd-export-excel">
              <Download className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPDF(txExportParams(), `${partner.name} Transactions`)}
              className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3" data-testid="pd-export-pdf">
              <FileText className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
          {/* Filters - mirrors the Transactions Summary page (client tag is implicit here) */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, reference or CRM ref..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-white border-border text-foreground placeholder:text-foreground/30"
                data-testid="pd-search-transactions"
              />
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by client email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="pl-10 bg-white border-border text-foreground placeholder:text-foreground/30"
                data-testid="pd-filter-client-email"
              />
            </div>

            <Select value={txType} onValueChange={setTxType}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-border text-foreground" data-testid="pd-filter-tx-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Types</SelectItem>
                {transactionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-foreground hover:bg-muted">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-border text-foreground" data-testid="pd-filter-tx-status">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Status</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-foreground hover:bg-muted">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={baseCurrencyFilter} onValueChange={setBaseCurrencyFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-border text-foreground" data-testid="pd-filter-tx-base-currency">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Currencies</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c} className="text-foreground hover:bg-muted">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={completedFilter} onValueChange={setCompletedFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-border text-foreground" data-testid="pd-filter-completed">
                <SelectValue placeholder="Completed" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All (completion)</SelectItem>
                <SelectItem value="yes" className="text-foreground hover:bg-muted">✅ Completed</SelectItem>
                <SelectItem value="no" className="text-foreground hover:bg-muted">⚪ Not completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hasCrmFilter} onValueChange={setHasCrmFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-border text-foreground" data-testid="pd-filter-has-crm">
                <SelectValue placeholder="CRM Ref" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All (CRM ref)</SelectItem>
                <SelectItem value="yes" className="text-foreground hover:bg-muted">Has CRM ref</SelectItem>
                <SelectItem value="no" className="text-foreground hover:bg-muted">No CRM ref (N/A)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={destinationFilter} onValueChange={(v) => { setDestinationFilter(v); setDestinationIdFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-44 bg-white border-border text-foreground" data-testid="pd-filter-tx-destination">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Destinations</SelectItem>
                <SelectItem value="treasury" className="text-foreground hover:bg-muted">Treasury</SelectItem>
                <SelectItem value="psp" className="text-foreground hover:bg-muted">PSP</SelectItem>
                <SelectItem value="vendor" className="text-foreground hover:bg-muted">Exchanger</SelectItem>
                <SelectItem value="bank" className="text-foreground hover:bg-muted">Bank</SelectItem>
                <SelectItem value="usdt" className="text-foreground hover:bg-muted">USDT</SelectItem>
              </SelectContent>
            </Select>

            {/* Secondary filter: the specific account within the chosen destination type */}
            {destinationFilter === 'vendor' && (
              <Select value={destinationIdFilter} onValueChange={setDestinationIdFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-border text-foreground">
                  <SelectValue placeholder="All Exchangers" />
                </SelectTrigger>
                <SelectContent className="bg-card border">
                  <SelectItem value="all" className="text-foreground hover:bg-muted">All Exchangers</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.vendor_id} value={v.vendor_id} className="text-foreground hover:bg-muted">{v.vendor_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {destinationFilter === 'psp' && (
              <Select value={destinationIdFilter} onValueChange={setDestinationIdFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-border text-foreground">
                  <SelectValue placeholder="All PSPs" />
                </SelectTrigger>
                <SelectContent className="bg-card border">
                  <SelectItem value="all" className="text-foreground hover:bg-muted">All PSPs</SelectItem>
                  {psps.map((p) => (
                    <SelectItem key={p.psp_id} value={p.psp_id} className="text-foreground hover:bg-muted">{p.psp_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(destinationFilter === 'treasury' || destinationFilter === 'usdt') && (
              <Select value={destinationIdFilter} onValueChange={setDestinationIdFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-border text-foreground">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent className="bg-card border">
                  <SelectItem value="all" className="text-foreground hover:bg-muted">All Accounts</SelectItem>
                  {treasuryAccounts
                    .filter((a) => (destinationFilter === 'usdt' ? a.account_type === 'usdt' : a.account_type !== 'usdt'))
                    .map((a) => (
                      <SelectItem key={a.account_id} value={a.account_id} className="text-foreground hover:bg-muted">{a.account_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            <Select value={txnTagFilter} onValueChange={setTxnTagFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-white border-amber-200 text-foreground" data-testid="pd-filter-txn-tag">
                <SelectValue placeholder="Txn Tag" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Txn Tags</SelectItem>
                {txnTags.map((tag) => (
                  <SelectItem key={tag.tag_id} value={tag.name} className="text-foreground hover:bg-muted">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: tag.color }} /> {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <select
                value={txDateType}
                onChange={(e) => setTxDateType(e.target.value)}
                className="h-9 text-xs border border-border rounded px-2 bg-white text-foreground/80"
                data-testid="pd-filter-date-type"
              >
                <option value="transaction">Txn Date</option>
                <option value="approved">Processed Date</option>
                <option value="bank_receipt">Approved Date</option>
                <option value="request_processed">Req. Processed Date</option>
              </select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px] bg-white border-border text-foreground"
                  data-testid="pd-filter-date-from"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px] bg-white border-border text-foreground"
                  data-testid="pd-filter-date-to"
                />
              </div>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-red-500" data-testid="pd-clear-filters">
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount (USD)</TableHead>
                  <TableHead>Payment Currency</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : txItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions</TableCell>
                  </TableRow>
                ) : (
                  txItems.map((tx) => (
                    <TableRow key={tx.transaction_id}>
                      <TableCell className="font-mono text-xs">{tx.reference || tx.transaction_id}</TableCell>
                      <TableCell className="text-sm">{tx.client_name || tx.client_email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tx.transaction_type === 'deposit' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}>
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}{fmtUsd(tx.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {tx.base_currency && tx.base_currency !== 'USD' && tx.base_amount != null ? (
                          <>
                            {fmtCur(tx.base_amount, tx.base_currency)}
                            {tx.exchange_rate ? <div className="text-muted-foreground/60">@ {tx.exchange_rate}</div> : null}
                          </>
                        ) : <span className="text-muted-foreground/60">USD</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {tx.destination_type === 'vendor' && tx.vendor_name ? (
                          <span className="text-orange-500">
                            {tx.vendor_name}
                            <br />
                            <span className="text-xs text-orange-400">Exchanger</span>
                          </span>
                        ) : tx.destination_type === 'psp' && tx.psp_name ? (
                          <span className="text-purple-500">
                            {tx.psp_name}
                            <br />
                            <span className="text-xs text-purple-400">PSP</span>
                          </span>
                        ) : tx.destination_bank_name ? (
                          <span>
                            {tx.destination_account_name}
                            <br />
                            <span className="text-xs">{tx.destination_bank_name}</span>
                          </span>
                        ) : tx.destination_account_name ? (
                          <span>{tx.destination_account_name}</span>
                        ) : tx.client_bank_name ? (
                          <span>
                            {tx.client_bank_name}
                            <br />
                            <span className="text-xs text-muted-foreground">{tx.client_bank_account_name}</span>
                          </span>
                        ) : tx.client_usdt_address ? (
                          <span className="text-xs font-mono">
                            {tx.client_usdt_address.slice(0, 10)}...
                            <br />
                            <span className="text-xs text-muted-foreground">{tx.client_usdt_network || 'USDT'}</span>
                          </span>
                        ) : tx.destination_type ? (
                          <span className="text-xs capitalize text-muted-foreground">{tx.destination_type}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{tx.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewFullDetails(tx)}
                          title="View full details in Transactions Summary"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 p-0"
                          data-testid={`pd-view-tx-${tx.transaction_id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={txPage}
            totalPages={Math.max(1, Math.ceil(txTotal / txPageSize))}
            totalItems={txTotal}
            pageSize={txPageSize}
            onPageChange={setTxPage}
            onPageSizeChange={(s) => { setTxPageSize(s); setTxPage(1); }}
          />
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email or phone..."
                value={clientSearchInput}
                onChange={(e) => setClientSearchInput(e.target.value)}
                className="pl-10 bg-card border text-foreground"
                data-testid="pd-client-search"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {clientTotal.toLocaleString()} client{clientTotal === 1 ? '' : 's'} tagged {partner.name}
            </span>
          </div>

          <div className="border border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead className="text-right">Deposits</TableHead>
                  <TableHead className="text-right">Withdrawals</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground/60"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                ) : clientRows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground/60">No clients</TableCell></TableRow>
                ) : clientRows.map((c) => (
                  <TableRow key={c.client_id}>
                    <TableCell>
                      <div className="text-foreground font-medium">{`${c.first_name || ''} ${c.last_name || ''}`.trim() || '-'}</div>
                      {c.mt5_number && <div className="text-[10px] text-muted-foreground/60">MT5 {c.mt5_number}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{c.email || '-'}</div>
                      {c.phone && <div className="text-muted-foreground/60">{c.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${c.kyc_status === 'approved' ? 'text-green-600 border-green-200' : 'text-muted-foreground'}`}>
                        {c.kyc_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">{fmtUsd(c.total_deposits)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">{fmtUsd(c.total_withdrawals)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${(c.net_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtUsd(c.net_balance)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{c.transaction_count ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={clientPage}
            totalPages={Math.max(1, Math.ceil(clientTotal / clientPageSize))}
            totalItems={clientTotal}
            pageSize={clientPageSize}
            onPageChange={setClientPage}
            onPageSizeChange={(n) => { setClientPageSize(n); setClientPage(1); }}
          />
        </TabsContent>

        {canManageTreasury && (
          <TabsContent value="treasury" className="mt-4 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Partner Treasury</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Where {partner.name}'s money actually moved - computed from approved and completed transactions. Net = deposits &minus; withdrawals.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Net</p>
                <p className={`text-xl font-mono font-bold ${treasuryTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="ptreasury-grand-total">
                  {fmtUsd(treasuryTotal)}
                </p>
                {treasuryCharges > 0 && (
                  <>
                    <p className="text-xs text-amber-600 font-mono mt-0.5">&minus;{fmtUsd(treasuryCharges)} charges</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Net after charges</p>
                    <p className={`text-lg font-mono font-bold ${treasuryNetAfter >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="ptreasury-net-after-charges">
                      {fmtUsd(treasuryNetAfter)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {treasuryLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : treasuryGroups.every((g) => g.entries.length === 0) ? (
              <Card className="bg-card border">
                <CardContent className="p-10 text-center text-muted-foreground">
                  <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-muted-foreground">No transactions for {partner.name} yet</p>
                </CardContent>
              </Card>
            ) : (
              treasuryGroups
                .filter((g) => g.entries.length > 0)
                .map((group) => {
                  const Icon = DEST_ICONS[group.destination_type] || Landmark;
                  return (
                    <div key={group.destination_type} className="space-y-2" data-testid={`ptreasury-group-${group.destination_type}`}>
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">{group.label}</span>
                          <Badge variant="outline" className="text-xs">{group.entries.length}</Badge>
                        </div>
                        <span className={`font-mono text-sm font-semibold ${group.net_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtUsd(group.net_usd)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.entries.map((entry) => (
                          <Card
                            key={entry.key}
                            className="bg-card border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                            onClick={() => openDrill(group, entry)}
                            title="Click to see the transactions behind this figure"
                            data-testid={`ptreasury-card-${group.destination_type}-${entry.key}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate" title={entry.name}>{entry.name}</p>
                                {canEditCharges && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openChargeEditor(group, entry); }}
                                    className="shrink-0 text-muted-foreground/60 hover:text-primary"
                                    title="Set in/out charges"
                                    data-testid={`ptreasury-edit-charge-${entry.key}`}
                                  >
                                    <Percent className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between mt-2">
                                <span className="text-muted-foreground text-sm">Net</span>
                                <span className={`text-lg font-mono font-bold ${entry.net_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {fmtUsd(entry.net_usd)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs mt-2 pt-2 border-t border">
                                <span className="text-green-600">+{fmtUsd(entry.deposits_usd)} <span className="text-muted-foreground/60">({entry.deposit_count})</span></span>
                                <span className="text-red-600">&minus;{fmtUsd(entry.withdrawals_usd)} <span className="text-muted-foreground/60">({entry.withdrawal_count})</span></span>
                              </div>
                              <CurrencyLines byCurrency={entry.by_currency} field="net" className="mt-1.5 pt-1.5 border-t border" />
                              {/* Charges are a reporting overlay - they never touch the ledger */}
                              {entry.charges_usd > 0 && (
                                <div className="mt-2 pt-2 border-t border space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Charges <span className="text-muted-foreground/60">({entry.in_rate}% in / {entry.out_rate}% out)</span>
                                    </span>
                                    <span className="font-mono text-amber-600">&minus;{fmtUsd(entry.charges_usd)}</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-muted-foreground text-xs font-medium">Net after charges</span>
                                    <span className={`font-mono text-sm font-bold ${entry.net_after_charges_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {fmtUsd(entry.net_after_charges_usd)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Transactions behind one treasury card */}
      <Dialog open={!!drill} onOpenChange={(o) => { if (!o) setDrill(null); }}>
        <DialogContent className="bg-card border max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {drill?.entry?.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{drill?.group?.label}</span>
            </DialogTitle>
          </DialogHeader>
          {drill && (
            <>
              <div className="flex flex-wrap gap-4 text-sm pb-2 border-b border">
                <span className="text-green-600">In +{fmtUsd(drill.entry.deposits_usd)} <span className="text-muted-foreground/60">({drill.entry.deposit_count})</span></span>
                <span className="text-red-600">Out &minus;{fmtUsd(drill.entry.withdrawals_usd)} <span className="text-muted-foreground/60">({drill.entry.withdrawal_count})</span></span>
                <span className="text-foreground font-semibold">Net {fmtUsd(drill.entry.net_usd)}</span>
                <CurrencyLines byCurrency={drill.entry.by_currency} field="net" />
                {drill.entry.charges_usd > 0 && (
                  <>
                    <span className="text-amber-600">Charges &minus;{fmtUsd(drill.entry.charges_usd)}</span>
                    <span className="text-foreground font-bold">After charges {fmtUsd(drill.entry.net_after_charges_usd)}</span>
                  </>
                )}
                <span className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportExcel(drillExportParams(), `${partner.name}_${drill.entry.name}`)}
                    className="border-green-200 text-green-600 hover:bg-green-50 h-7 px-2 text-xs" data-testid="drill-export-excel">
                    <Download className="w-3 h-3 mr-1" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportPDF(drillExportParams(), `${partner.name} — ${drill.entry.name}`)}
                    className="border-red-200 text-red-600 hover:bg-red-50 h-7 px-2 text-xs" data-testid="drill-export-pdf">
                    <FileText className="w-3 h-3 mr-1" /> PDF
                  </Button>
                </span>
              </div>
              <div className="border border rounded-lg overflow-hidden max-h-[45vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (USD)</TableHead>
                      <TableHead>Payment Currency</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground/60"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : drillRows.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground/60">No transactions</TableCell></TableRow>
                    ) : drillRows.map((tx) => (
                      <TableRow key={tx.transaction_id}>
                        <TableCell className="font-mono text-xs">{tx.reference || tx.transaction_id}</TableCell>
                        <TableCell className="text-sm">{tx.client_name || tx.client_email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tx.transaction_type === 'deposit' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}>
                            {tx.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transaction_type === 'deposit' ? '+' : '-'}{fmtUsd(tx.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {tx.base_currency && tx.base_currency !== 'USD' && tx.base_amount != null ? (
                            <>
                              {fmtCur(tx.base_amount, tx.base_currency)}
                              {tx.exchange_rate ? <div className="text-muted-foreground/60">@ {tx.exchange_rate}</div> : null}
                            </>
                          ) : <span className="text-muted-foreground/60">USD</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => viewFullDetails(tx)}
                            title="Open in Transactions Summary"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                currentPage={drillPage}
                totalPages={Math.max(1, Math.ceil(drillTotal / 20))}
                totalItems={drillTotal}
                pageSize={20}
                onPageChange={setDrillPage}
                onPageSizeChange={() => {}}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* In/out charge percentages for one destination */}
      <Dialog open={!!chargeEdit} onOpenChange={(o) => { if (!o) setChargeEdit(null); }}>
        <DialogContent className="bg-card border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Charges &mdash; {chargeEdit?.entry?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Applied to this partner only, for reporting. Nothing in the ledger changes,
            and this is separate from any exchanger/PSP commission on the transactions themselves.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">In charge %</label>
              <Input type="number" step="0.01" min="0" max="100" value={chargeIn}
                onChange={(e) => setChargeIn(e.target.value)}
                className="bg-muted/50 border" data-testid="charge-in-rate" />
              <p className="text-[10px] text-muted-foreground/60">on {fmtUsd(chargeEdit?.entry?.deposits_usd || 0)} in</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Out charge %</label>
              <Input type="number" step="0.01" min="0" max="100" value={chargeOut}
                onChange={(e) => setChargeOut(e.target.value)}
                className="bg-muted/50 border" data-testid="charge-out-rate" />
              <p className="text-[10px] text-muted-foreground/60">on {fmtUsd(chargeEdit?.entry?.withdrawals_usd || 0)} out</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            Estimated charge:{' '}
            <span className="font-mono font-semibold text-amber-600">
              {fmtUsd(((chargeEdit?.entry?.deposits_usd || 0) * (parseFloat(chargeIn) || 0) / 100)
                + ((chargeEdit?.entry?.withdrawals_usd || 0) * (parseFloat(chargeOut) || 0) / 100))}
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setChargeEdit(null)} className="border text-muted-foreground">Cancel</Button>
            <Button onClick={saveCharges} disabled={chargeSaving}
              className="bg-primary hover:bg-primary/90 text-white" data-testid="save-charges">
              {chargeSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
