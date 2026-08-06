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
import { usePermissions } from '../context/usePermissions';
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
  const { canView } = usePermissions();
  const canManageTreasury = canView('partner_treasury');

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

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <Card className="bg-card border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposits</p>
            <p className="text-lg font-mono font-semibold text-green-600">{fmtUsd(partner.total_deposits_usd)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{partner.deposit_count} txns</p>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawals</p>
            <p className="text-lg font-mono font-semibold text-red-600">{fmtUsd(partner.total_withdrawals_usd)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{partner.withdrawal_count} txns</p>
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
          {canManageTreasury && (
            <TabsTrigger value="treasury" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]" data-testid="partner-treasury-tab">
              <Landmark className="w-3.5 h-3.5 mr-1.5" /> Treasury
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-4">
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
                          <Card key={entry.key} className="bg-card border">
                            <CardContent className="p-4">
                              <p className="font-semibold text-foreground truncate" title={entry.name}>{entry.name}</p>
                              <div className="flex items-baseline justify-between mt-2">
                                <span className="text-muted-foreground text-sm">Net</span>
                                <span className={`text-lg font-mono font-bold ${entry.net_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {fmtUsd(entry.net_usd)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs mt-2 pt-2 border-t">
                                <span className="text-green-600">+{fmtUsd(entry.deposits_usd)} <span className="text-muted-foreground">({entry.deposit_count})</span></span>
                                <span className="text-red-600">&minus;{fmtUsd(entry.withdrawals_usd)} <span className="text-muted-foreground">({entry.withdrawal_count})</span></span>
                              </div>
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
    </div>
  );
}
