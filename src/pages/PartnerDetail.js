import { useEffect, useState, useCallback, useRef } from 'react';
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
  EyeOff,
  Percent,
  X,
  Download,
  FileText,
  Users,
  HandCoins,
  Trash2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TEMPORARY - testing only. This page reports on transactions from this date
// forward and nothing earlier; the matching PARTNERS_DATE_FLOOR in the backend
// covers the summary and treasury aggregations. Delete both to restore full
// history. It lives here rather than in the /transactions endpoint because that
// endpoint is shared with Transactions Summary, Reports and the vendor dashboard.
const PARTNERS_DATE_FLOOR = '2026-08-15';

// A user-picked "from" may narrow the window but never widen it past the floor.
const flooredFrom = (d) => (d && d > PARTNERS_DATE_FLOOR ? d : PARTNERS_DATE_FLOOR);

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
const fmtNum = (n) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCur = (n, cur) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur || ''}`.trim();

// One line per currency, e.g. "3,240,236.00 AED · 61,300.00 INR"
const CurrencyBreakdown = ({ byCurrency, className = '' }) => {
  const entries = Object.entries(byCurrency || {});
  if (!entries.length) return null;
  return (
    <div className={`text-[10px] font-mono leading-tight ${className}`}>
      <div className="grid grid-cols-4 gap-1 text-muted-foreground/60 uppercase tracking-wider mb-0.5">
        <span>Cur</span>
        <span className="text-right">In</span>
        <span className="text-right">Out</span>
        <span className="text-right">Net</span>
      </div>
      {entries.map(([cur, v]) => (
        <div key={cur} className="grid grid-cols-4 gap-1">
          <span className="text-muted-foreground font-semibold">{cur}</span>
          <span className="text-right text-green-600">{v.deposits ? fmtNum(v.deposits) : '-'}</span>
          <span className="text-right text-red-600">{v.withdrawals ? fmtNum(v.withdrawals) : '-'}</span>
          <span className={`text-right font-semibold ${v.net >= 0 ? 'text-foreground' : 'text-red-600'}`}>{fmtNum(v.net)}</span>
        </div>
      ))}
    </div>
  );
};

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
  const { canView, canEdit, canDelete } = usePermissions();
  const canManageTreasury = canView('partner_treasury');
  const canEditCharges = canEdit('partner_treasury');
  const canDeleteSettlement = canDelete('partner_treasury');

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
  // Revealing is per session only, like the Treasury page - hiding stays put,
  // a peek does not.
  const [revealedEntries, setRevealedEntries] = useState(new Set());
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

  // Partner settlement - this partner's own settlements, deliberately unrelated to
  // the exchanger/PSP settlement flow (which stamps `settled` on the transaction).
  const [psFilter, setPsFilter] = useState('all');        // all | yes | no
  const [settleFor, setSettleFor] = useState(null);       // { group, entry }
  const [settleRows, setSettleRows] = useState([]);
  // id -> gross USD. Carries the amount so the running total stays right for
  // picks made on pages we have since navigated away from.
  const [settlePicked, setSettlePicked] = useState({});
  const [settlePage, setSettlePage] = useState(1);
  const [settlePageSize, setSettlePageSize] = useState(20);
  const [settleTotal, setSettleTotal] = useState(0);
  const [settleAllLoading, setSettleAllLoading] = useState(false);
  // Identifies one dialog session. Bumped on every open and close so async work
  // started for one treasury card can never land on another.
  const settleRunRef = useRef(0);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleSaving, setSettleSaving] = useState(false);
  const [psHistory, setPsHistory] = useState([]);

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
      // The floor always rides on date_from (transaction_date). When the user is
      // filtering on that same field their value is clamped to it; when they are
      // filtering on another date field, both constraints simply apply.
      // Hidden on this partner means hidden across the whole partner - list,
      // totals and exports - not just on the treasury tab.
      qs.set('exclude_hidden_tag_id', tagId);
      qs.set('date_from', txDateType === 'transaction' ? flooredFrom(dateFrom) : PARTNERS_DATE_FLOOR);
      if (dateFrom && txDateType !== 'transaction') {
        qs.set(
          txDateType === 'approved' ? 'approved_date_from'
            : txDateType === 'bank_receipt' ? 'bank_receipt_date_from'
              : 'request_processed_date_from',
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
      if (psFilter !== 'all') { qs.set('partner_settled', psFilter); qs.set('partner_tag_id', tagId); }

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
    txDateType, txnTagFilter, psFilter, tagId,
  ]);

  // Any filter change sends us back to page 1 - staying on page 7 of a result set
  // that just shrank to 2 pages would show an empty table.
  useEffect(() => {
    setTxPage(1);
  }, [
    txType, statusFilter, baseCurrencyFilter, completedFilter, hasCrmFilter,
    destinationFilter, destinationIdFilter, search, emailFilter, dateFrom, dateTo,
    txDateType, txnTagFilter, psFilter, txPageSize,
  ]);

  useEffect(() => {
    if (partner) fetchTransactions(partner.name, txPage);
  }, [partner, txPage, fetchTransactions]);

  const filtersActive = txType !== 'all' || statusFilter !== 'all' || baseCurrencyFilter !== 'all'
    || completedFilter !== 'all' || hasCrmFilter !== 'all' || destinationFilter !== 'all'
    || destinationIdFilter !== 'all' || txnTagFilter !== 'all' || psFilter !== 'all' || dateFrom || dateTo
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
    setPsFilter('all');
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
      date_from: PARTNERS_DATE_FLOOR,
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

  // ── Partner settlement ────────────────────────────────────────────────────
  // Records what this partner was actually paid across for a chosen set of its
  // transactions. Deliberately parallel to the exchanger/PSP settlement flow:
  // nothing is written onto the transaction, and neither side reads the other.
  // Same status set the card counted, minus anything already settled here.
  const settleParams = (group, entry, page, size) => {
    const qs = drillParams(group, entry, page);
    qs.set('page_size', String(size));
    qs.set('partner_settled', 'no');
    qs.set('partner_tag_id', tagId);
    return qs;
  };

  const closeSettle = () => {
    settleRunRef.current += 1;   // orphan anything still in flight
    setSettleAllLoading(false);
    setSettleFor(null);
  };

  const openSettle = (group, entry) => {
    const run = ++settleRunRef.current;
    setSettleAllLoading(false);
    setSettlePicked({});
    setSettleAmount('');
    setSettleNotes('');
    setSettleRows([]);
    setPsHistory([]);
    setSettleTotal(0);
    setSettlePage(1);
    setSettleFor({ group, entry });   // the effect below loads page 1
    const hs = new URLSearchParams({
      tag_id: tagId,
      destination_type: group.destination_type,
      entity_key: entry.key,
    });
    fetch(`${API_URL}/api/partner-settlements?${hs.toString()}`, {
      headers: getAuthHeaders(), credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { if (settleRunRef.current === run) setPsHistory(d.items || []); })
      .catch(() => { if (settleRunRef.current === run) setPsHistory([]); });
  };

  // One loading path for the rows, so opening and paging cannot disagree.
  useEffect(() => {
    if (!settleFor) return;
    let cancelled = false;
    const { group, entry } = settleFor;
    setSettleLoading(true);
    fetch(`${API_URL}/api/transactions?${settleParams(group, entry, settlePage, settlePageSize).toString()}`, {
      headers: getAuthHeaders(), credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed');
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const total = d.total || 0;
        setSettleTotal(total);
        // Someone else may have settled rows out from under us, shrinking the set.
        // Land on the real last page instead of an empty one; the effect refires.
        const lastPage = Math.max(1, Math.ceil(total / settlePageSize));
        if (settlePage > lastPage) { setSettlePage(lastPage); return; }
        setSettleRows(d.items || []);
      })
      .catch(() => {
        if (cancelled) return;
        setSettleRows([]);
        toast.error('Failed to load unsettled transactions');
      })
      .finally(() => { if (!cancelled) setSettleLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleFor, settlePage, settlePageSize]);

  const grossOf = (tx) => Math.abs(tx.amount || 0);

  const togglePicked = (tx) =>
    setSettlePicked((prev) => {
      const next = { ...prev };
      if (tx.transaction_id in next) delete next[tx.transaction_id];
      else next[tx.transaction_id] = grossOf(tx);
      return next;
    });

  const pageAllPicked = settleRows.length > 0
    && settleRows.every((t) => t.transaction_id in settlePicked);

  const togglePage = () =>
    setSettlePicked((prev) => {
      // Decide from `prev`, not from the render-scope pageAllPicked, so this stays
      // correct when it lands in the same batch as another selection change.
      const allOnPage = settleRows.length > 0
        && settleRows.every((t) => t.transaction_id in prev);
      const next = { ...prev };
      if (allOnPage) settleRows.forEach((t) => delete next[t.transaction_id]);
      else settleRows.forEach((t) => { next[t.transaction_id] = grossOf(t); });
      return next;
    });

  // Paging to select everything would mean walking every page by hand, so offer
  // it directly. Walks the pages at the API's max size rather than pretending a
  // single request could return them all.
  const selectAllOutstanding = async () => {
    if (!settleFor) return;
    const { group, entry } = settleFor;
    const run = settleRunRef.current;   // this walk belongs to the session open now
    setSettleAllLoading(true);
    try {
      const picked = {};
      const SIZE = 100;              // the API caps a page here
      const MAX_PAGES = 60;          // 6,000 transactions; refuse silently to spin past it
      let page = 1;
      let total = null;
      while (page <= MAX_PAGES) {
        const r = await fetch(`${API_URL}/api/transactions?${settleParams(group, entry, page, SIZE).toString()}`, {
          headers: getAuthHeaders(), credentials: 'include',
        });
        if (settleRunRef.current !== run) return;   // dialog closed or moved on
        if (!r.ok) { toast.error('Failed to select all outstanding'); return; }
        const d = await r.json();
        if (settleRunRef.current !== run) return;
        total = d.total || 0;
        (d.items || []).forEach((t) => { picked[t.transaction_id] = grossOf(t); });
        if (!d.items || d.items.length < SIZE || Object.keys(picked).length >= total) break;
        page += 1;
      }
      if (settleRunRef.current !== run) return;
      // Merge, so a tick made while the walk was running is not silently undone.
      setSettlePicked((prev) => ({ ...prev, ...picked }));
      const n = Object.keys(picked).length;
      if (total !== null && n < total) {
        toast.warning(`Selected ${n} of ${total} \u2014 stopped at the ${MAX_PAGES}-page limit`);
      }
    } catch {
      toast.error('Failed to select all outstanding');
    } finally {
      if (settleRunRef.current === run) setSettleAllLoading(false);
    }
  };

  const pickedIds = Object.keys(settlePicked);
  const pickedCount = pickedIds.length;
  const pickedGross = Object.values(settlePicked).reduce((sum, v) => sum + v, 0);

  const saveSettlement = async () => {
    if (pickedCount === 0) { toast.error('Select at least one transaction'); return; }
    setSettleSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/partner-settlements`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tag_id: tagId,
          destination_type: settleFor.group.destination_type,
          entity_key: settleFor.entry.key,
          transaction_ids: pickedIds,
          // Left blank means "settled at face value".
          settled_amount: settleAmount === '' ? pickedGross : Number(settleAmount),
          currency: 'USD',
          notes: settleNotes || null,
        }),
      });
      if (!r.ok) { toast.error(await getApiError(r, 'Failed to save settlement')); return; }
      toast.success(`Settled ${pickedCount} transaction(s)`);
      closeSettle();
      fetchTreasury();
      if (partner) fetchTransactions(partner.name, txPage);
    } catch {
      toast.error('Failed to save settlement');
    } finally {
      setSettleSaving(false);
    }
  };

  const deleteSettlement = async (settlementId) => {
    try {
      const r = await fetch(`${API_URL}/api/partner-settlements/${settlementId}`, {
        method: 'DELETE', headers: getAuthHeaders(), credentials: 'include',
      });
      if (!r.ok) { toast.error(await getApiError(r, 'Failed to remove settlement')); return; }
      toast.success('Settlement removed');
      closeSettle();
      fetchTreasury();
      if (partner) fetchTransactions(partner.name, txPage);
    } catch {
      toast.error('Failed to remove settlement');
    }
  };

  const toggleEntryHidden = async (group, entry) => {
    const next = !entry.is_hidden;
    try {
      const r = await fetch(`${API_URL}/api/partner-treasury/hidden`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          tag_id: tagId,
          destination_type: group.destination_type,
          entity_key: entry.key,
          is_hidden: next,
        }),
      });
      if (!r.ok) { toast.error(await getApiError(r, 'Failed to update')); return; }
      toast.success(next ? `${entry.name} hidden` : `${entry.name} unhidden`);
      if (!next) {
        setRevealedEntries((prev) => {
          const s = new Set(prev); s.delete(entry.key); return s;
        });
      }
      fetchTreasury();
    } catch {
      toast.error('Failed to update');
    }
  };

  // ── Charges (display-only overlay) ────────────────────────────────────────
  const openChargeEditor = (group, entry) => {
    setChargeEdit({ group, entry });
    setChargeIn(String(entry.in_rate ?? 0));
    setChargeOut(String(entry.out_rate ?? 0));
  };

  // Live view of what the entered rates actually cost, so the outcome is visible
  // while typing rather than only after saving.
  const chargePreview = (() => {
    const e = chargeEdit?.entry;
    const depo = e?.deposits_usd || 0;
    const wdr = e?.withdrawals_usd || 0;
    const inR = parseFloat(chargeIn) || 0;
    const outR = parseFloat(chargeOut) || 0;
    const inAmt = depo * inR / 100;
    const outAmt = wdr * outR / 100;
    return {
      depo, wdr, inR, outR, inAmt, outAmt,
      total: inAmt + outAmt,
      netBefore: e?.net_usd || 0,
      netAfter: (e?.net_usd || 0) - (inAmt + outAmt),
      dirty: inR !== (e?.in_rate ?? 0) || outR !== (e?.out_rate ?? 0),
      invalid: inR < 0 || inR > 100 || outR < 0 || outR > 100,
    };
  })();

  const CHARGE_PRESETS = [0, 0.5, 1, 1.5, 2, 2.5];

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
    qs.set('exclude_hidden_tag_id', tagId);
    qs.set('date_from', txDateType === 'transaction' ? flooredFrom(dateFrom) : PARTNERS_DATE_FLOOR);
    if (dateFrom && txDateType !== 'transaction') qs.set(txDateType === 'approved' ? 'approved_date_from' : txDateType === 'bank_receipt' ? 'bank_receipt_date_from' : 'request_processed_date_from', dateFrom);
    if (dateTo) qs.set(txDateType === 'approved' ? 'approved_date_to' : txDateType === 'bank_receipt' ? 'bank_receipt_date_to' : txDateType === 'request_processed' ? 'request_processed_date_to' : 'date_to', dateTo);
    if (txnTagFilter !== 'all') qs.set('transaction_tag', txnTagFilter);
    if (psFilter !== 'all') { qs.set('partner_settled', psFilter); qs.set('partner_tag_id', tagId); }
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
            {/* Carrying the tag and having activity are different numbers - showing
                only the first makes "189 clients / 12 transactions" look broken. */}
            <p className="text-[11px] text-muted-foreground mt-1" data-testid="partner-active-client-count">
              <span className="font-mono font-semibold text-green-600">
                {(partner.active_client_count ?? 0).toLocaleString()}
              </span>{' '}transacted
            </p>
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

            {canManageTreasury && (
              <Select value={psFilter} onValueChange={setPsFilter}>
                <SelectTrigger className="w-[170px] bg-card border text-foreground" data-testid="pd-filter-partner-settled">
                  <SelectValue placeholder="Partner Settlement" />
                </SelectTrigger>
                <SelectContent className="bg-card border">
                  <SelectItem value="all" className="text-foreground hover:bg-muted">All Settlements</SelectItem>
                  <SelectItem value="yes" className="text-foreground hover:bg-muted">Partner Settled</SelectItem>
                  <SelectItem value="no" className="text-foreground hover:bg-muted">Not Settled</SelectItem>
                </SelectContent>
              </Select>
            )}

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
                            className="bg-card border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => openDrill(group, entry)}
                            title="Click to see the transactions behind this figure"
                            data-testid={`ptreasury-card-${group.destination_type}-${entry.key}`}
                          >
                            {/* Hidden entries still render, blurred behind a one-off reveal -
                                same treatment the Treasury page gives a hidden account. */}
                            {entry.is_hidden && !revealedEntries.has(entry.key) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevealedEntries((prev) => new Set(prev).add(entry.key));
                                }}
                                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-card/50 backdrop-blur-[1px] cursor-pointer"
                                data-testid={`ptreasury-reveal-${entry.key}`}
                              >
                                <EyeOff className="w-5 h-5 text-muted-foreground/60" />
                                <span className="text-xs text-muted-foreground font-medium">Hidden &mdash; click to reveal</span>
                              </button>
                            )}
                            <div className={entry.is_hidden && !revealedEntries.has(entry.key)
                              ? 'blur-sm opacity-60 pointer-events-none select-none' : ''}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate" title={entry.name}>{entry.name}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {canEditCharges && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleEntryHidden(group, entry); }}
                                      className="h-9 w-9 rounded-lg border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                      title={entry.is_hidden ? 'Unhide from this partner\u2019s treasury' : 'Hide from this partner\u2019s treasury'}
                                      data-testid={`ptreasury-toggle-hidden-${entry.key}`}
                                    >
                                      {entry.is_hidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                  )}
                                  {canEditCharges && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); openSettle(group, entry); }}
                                      className="h-9 w-9 rounded-lg border bg-card text-muted-foreground flex items-center justify-center transition-colors hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-500/10"
                                      title="Settle transactions with this partner"
                                      data-testid={`ptreasury-settle-${entry.key}`}
                                    >
                                      <HandCoins className="w-5 h-5" />
                                    </button>
                                  )}
                                  {canEditCharges && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); openChargeEditor(group, entry); }}
                                      className="h-9 w-9 rounded-lg border bg-card text-muted-foreground flex items-center justify-center transition-colors hover:text-primary hover:border-primary/40 hover:bg-primary/10"
                                      title="Set in/out charges"
                                      data-testid={`ptreasury-edit-charge-${entry.key}`}
                                    >
                                      <Percent className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
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
                              <CurrencyBreakdown byCurrency={entry.by_currency} className="mt-2 pt-2 border-t border" />
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
                              {/* This partner's own settlement position - unrelated to
                                  the exchanger/PSP settled flag on the transaction. */}
                              {(entry.partner_settled_count > 0 || entry.partner_unsettled_count > 0) && (
                                <div className="mt-2 pt-2 border-t space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Settled with partner</span>
                                    <span className="font-mono text-emerald-600">
                                      {fmtUsd(entry.partner_settled_usd)} <span className="text-muted-foreground/60">({entry.partner_settled_count})</span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Outstanding</span>
                                    <span className="font-mono text-amber-600">
                                      {fmtUsd(entry.partner_unsettled_usd)} <span className="text-muted-foreground/60">({entry.partner_unsettled_count})</span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                            </div>
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

      {/* Settle transactions with this partner. Writes only to partner_settlements -
          the exchanger/PSP settlement flow is untouched and unaware of it. */}
      <Dialog open={!!settleFor} onOpenChange={(o) => { if (!o) closeSettle(); }}>
        <DialogContent className="bg-card border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Settle with {partner?.name}
            </DialogTitle>
            {settleFor && (
              <p className="text-sm text-muted-foreground">
                {settleFor.group.label} &middot; {settleFor.entry.name}
              </p>
            )}
          </DialogHeader>

          {settleLoading ? (
            <div className="py-10 text-center text-muted-foreground/60">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="ps-count">
                  {settleTotal} outstanding transaction{settleTotal === 1 ? '' : 's'}
                  {pickedCount > 0 && (
                    <span className="text-muted-foreground/60"> &middot; {pickedCount} selected</span>
                  )}
                </p>
                {settleTotal > 0 && (
                  <div className="flex items-center gap-1">
                    {/* Selections are kept by id across pages, so these compose. */}
                    {settleRows.length > 0 && (
                    <Button
                      variant="ghost" size="sm"
                      className="text-primary hover:text-primary/80"
                      onClick={togglePage}
                      data-testid="ps-toggle-page"
                    >
                      {pageAllPicked ? 'Clear page' : `Select page (${settleRows.length})`}
                    </Button>
                    )}
                    {settleTotal > settleRows.length && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-primary hover:text-primary/80"
                        onClick={selectAllOutstanding}
                        disabled={settleAllLoading}
                        data-testid="ps-select-all-outstanding"
                      >
                        {settleAllLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : `Select all ${settleTotal}`}
                      </Button>
                    )}
                    {pickedCount > 0 && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => setSettlePicked({})}
                        data-testid="ps-clear-picked"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Bounded so the amount fields and Save stay reachable at any page
                  size - the page control below is the way through the rest. */}
              <div className="border rounded-lg overflow-hidden max-h-[45vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Reference</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (USD)</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settleRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground/60">
                          {settleTotal === 0
                            ? 'Nothing outstanding \u2014 everything here is already settled'
                            : 'No transactions on this page'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      settleRows.map((tx) => (
                        <TableRow
                          key={tx.transaction_id}
                          className="cursor-pointer"
                          onClick={() => togglePicked(tx)}
                          data-testid={`ps-row-${tx.transaction_id}`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={tx.transaction_id in settlePicked}
                              onChange={() => togglePicked(tx)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{tx.reference || '-'}</TableCell>
                          <TableCell className="text-foreground text-sm">{tx.client_name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm capitalize">{tx.transaction_type}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-foreground">
                            {fmtUsd(Math.abs(tx.amount || 0))}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(tx.transaction_date || tx.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                currentPage={settlePage}
                totalPages={Math.max(1, Math.ceil(settleTotal / settlePageSize))}
                totalItems={settleTotal}
                pageSize={settlePageSize}
                onPageChange={setSettlePage}
                onPageSizeChange={(n) => { setSettlePageSize(n); setSettlePage(1); }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Selected (gross)</label>
                  <p className="font-mono font-bold text-foreground h-9 flex items-center" data-testid="ps-picked-gross">
                    {fmtUsd(pickedGross)} <span className="text-muted-foreground/60 text-xs ml-1">({pickedCount})</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Amount paid (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder={pickedGross ? pickedGross.toFixed(2) : '0.00'}
                    className="bg-muted/50 border"
                    data-testid="ps-amount"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                  <Input
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="Optional"
                    className="bg-muted/50 border"
                    data-testid="ps-notes"
                  />
                </div>
              </div>

              {psHistory.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Past settlements</p>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {psHistory.map((h) => (
                      <div
                        key={h.settlement_id}
                        className="flex items-center justify-between text-xs bg-muted/40 border rounded px-2.5 py-1.5"
                        data-testid={`ps-history-${h.settlement_id}`}
                      >
                        <span className="text-muted-foreground">
                          {h.settlement_date} &middot; {h.transaction_count} txn
                          {h.notes ? <span className="text-muted-foreground/60"> &middot; {h.notes}</span> : null}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-foreground">{fmtUsd(h.settled_amount)}</span>
                          {canDeleteSettlement && (
                            <button
                              type="button"
                              onClick={() => deleteSettlement(h.settlement_id)}
                              className="text-muted-foreground/60 hover:text-red-500"
                              title="Remove this settlement"
                              data-testid={`ps-delete-${h.settlement_id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={closeSettle} className="border text-muted-foreground">
                  Cancel
                </Button>
                <Button
                  onClick={saveSettlement}
                  disabled={settleSaving || pickedCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="ps-save"
                >
                  {settleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record settlement'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <CurrencyBreakdown byCurrency={drill.entry.by_currency} className="pb-2 border-b border" />
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
        <DialogContent className="bg-card border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Charges &mdash; {chargeEdit?.entry?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Applied to this partner only, for reporting. Nothing in the ledger changes,
            and this is separate from any exchanger/PSP commission on the transactions themselves.
          </p>

          <div className="space-y-3">
            {[
              { key: 'in', label: 'In charge', value: chargeIn, set: setChargeIn,
                base: chargePreview.depo, amount: chargePreview.inAmt,
                baseLabel: 'in', testid: 'charge-in-rate' },
              { key: 'out', label: 'Out charge', value: chargeOut, set: setChargeOut,
                base: chargePreview.wdr, amount: chargePreview.outAmt,
                baseLabel: 'out', testid: 'charge-out-rate' },
            ].map((f) => (
              <div key={f.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground/60">on {fmtUsd(f.base)} {f.baseLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="number" step="0.01" min="0" max="100"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-24 pr-7 text-right bg-muted/50 border text-foreground"
                        data-testid={f.testid}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm pointer-events-none">%</span>
                    </div>
                    <span className="font-mono text-sm text-amber-600 w-24 text-right" data-testid={`charge-${f.key}-amount`}>
                      &minus;{fmtUsd(f.amount)}
                    </span>
                  </div>
                </div>
                {/* One tap for the rates people actually use. */}
                <div className="flex items-center gap-1 mt-2">
                  {CHARGE_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => f.set(String(r))}
                      className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        (parseFloat(f.value) || 0) === r
                          ? 'bg-primary border-primary text-white'
                          : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
                      }`}
                      data-testid={`charge-${f.key}-preset-${r}`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total charge</span>
              <span className="font-mono font-semibold text-amber-600" data-testid="charge-total">
                &minus;{fmtUsd(chargePreview.total)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1.5 border-t">
              <span className="text-foreground font-medium">Net after charges</span>
              <span className="text-right">
                <span className={`font-mono font-bold ${chargePreview.netAfter >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="charge-net-after">
                  {fmtUsd(chargePreview.netAfter)}
                </span>
                {chargePreview.total > 0 && (
                  <span className="block text-[11px] text-muted-foreground/60 font-mono">was {fmtUsd(chargePreview.netBefore)}</span>
                )}
              </span>
            </div>
          </div>

          {chargePreview.invalid && (
            <p className="text-xs text-red-600" data-testid="charge-invalid">
              Charges must be between 0 and 100 percent.
            </p>
          )}

          <div className="flex justify-between items-center gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => { setChargeIn('0'); setChargeOut('0'); }}
              className="text-muted-foreground hover:text-red-500"
              data-testid="charge-clear"
            >
              Clear both
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setChargeEdit(null)} className="border text-muted-foreground">Cancel</Button>
              <Button onClick={saveCharges} disabled={chargeSaving || chargePreview.invalid || !chargePreview.dirty}
                className="bg-primary hover:bg-primary/90 text-white" data-testid="save-charges">
                {chargeSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
