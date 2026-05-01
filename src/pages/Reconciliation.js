import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  Upload, CheckCircle2, Clock, History, Loader2, FileText, Download, Eye,
  X, FileSpreadsheet, Building2, CreditCard, Store, Trash2, Pencil,
  Search, SlidersHorizontal, Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getFileType(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt') return 'txt';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'unknown';
}

function ExcelPreview({ blob, filename }) {
  const [data, setData] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    if (!blob) return;
    blob.arrayBuffer().then(buf => {
      const wb = XLSX.read(buf, { type: 'array' });
      setSheets(wb.SheetNames);
      const ws = wb.Sheets[wb.SheetNames[0]];
      setData(XLSX.utils.sheet_to_json(ws, { header: 1 }));
    });
  }, [blob]);

  const switchSheet = (wb_raw, idx) => {
    blob.arrayBuffer().then(buf => {
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[idx]];
      setData(XLSX.utils.sheet_to_json(ws, { header: 1 }));
      setActiveSheet(idx);
    });
  };

  return (
    <div className="flex flex-col h-full">
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 border-b shrink-0 overflow-x-auto">
          {sheets.map((s, i) => (
            <button
              key={s}
              onClick={() => switchSheet(null, i)}
              className={`px-3 py-1 text-xs rounded whitespace-nowrap ${activeSheet === i ? 'bg-primary text-white' : 'bg-muted hover:bg-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="text-xs border-collapse w-full">
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}>
                {(Array.isArray(row) ? row : []).map((cell, ci) => (
                  <td key={ci} className="border border px-2 py-1 whitespace-nowrap">
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextPreview({ content }) {
  const lines = content.split('\n').filter(Boolean);
  const rows = lines.map(l => l.split(','));
  const looksLikeCSV = rows.length > 0 && rows[0].length > 1;

  if (looksLikeCSV) {
    return (
      <div className="overflow-auto h-full">
        <table className="text-xs border-collapse w-full">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border px-2 py-1 whitespace-nowrap">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-4">
      <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>
    </div>
  );
}

function FilePreviewModal({ open, onClose, statement, getAuthHeaders }) {
  const [blob, setBlob] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileType = statement ? getFileType(statement.filename) : null;

  useEffect(() => {
    if (!open || !statement) return;

    let currentUrl = null;
    setBlob(null);
    setObjectUrl(null);
    setTextContent(null);
    setLoading(true);

    const load = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/reconciliation/statements/${statement.statement_id}/file`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error('Failed');
        const b = await res.blob();
        setBlob(b);
        const url = URL.createObjectURL(b);
        currentUrl = url;
        setObjectUrl(url);
        if (fileType === 'csv' || fileType === 'txt') {
          const text = await b.text();
          setTextContent(text);
        }
      } catch (err) {
        toast.error(err?.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [open, statement]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = statement.filename;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm text-foreground truncate">{statement?.filename}</span>
            {fileType && <Badge variant="outline" className="text-xs uppercase shrink-0">{fileType}</Badge>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!objectUrl}>
              <Download className="w-4 h-4 mr-1.5" /> Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : fileType === 'pdf' && objectUrl ? (
            <iframe src={objectUrl} className="w-full h-full border-0" title="PDF Preview" />
          ) : fileType === 'excel' && blob ? (
            <ExcelPreview blob={blob} filename={statement?.filename} />
          ) : (fileType === 'csv' || fileType === 'txt') && textContent ? (
            <TextPreview content={textContent} />
          ) : fileType === 'image' && objectUrl ? (
            <div className="flex items-center justify-center h-full bg-muted/50">
              <img src={objectUrl} alt="preview" className="max-w-full max-h-full object-contain p-4" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Preview not available</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const isDone = (status) => status === 'completed' || status === 'done';

const TYPE_CONFIG = {
  treasury:  { label: 'Treasury',  Icon: Building2,  color: 'text-primary',   border: 'border-primary',   bg: 'bg-primary/10/40'   },
  psp:       { label: 'PSP',       Icon: CreditCard, color: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50/40' },
  exchanger: { label: 'Exchanger', Icon: Store,       color: 'text-orange-600', border: 'border-orange-600', bg: 'bg-orange-50/40' },
};

export default function Reconciliation() {
  const { getAuthHeaders } = useAuth();
  const [mainTab, setMainTab] = useState('reconciliation');

  // All accounts combined: { id, name, type, currency }
  const [allAccounts, setAllAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState('treasury');

  // Left panel: internal transactions
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotalFromApi, setTxTotalFromApi] = useState(null);
  const TX_PAGE_SIZE = 20; // individual transactions per page

  // Vendor data map: vendor_id → full vendor object (for correct settlement figures)
  const [vendorMap, setVendorMap] = useState({});

  // Exchanger: inner tab + settlement history
  const [exchInnerTab, setExchInnerTab] = useState('transactions'); // 'transactions' | 'settlements'
  const [exchSettlements, setExchSettlements] = useState([]);
  const [exchSettlementsLoading, setExchSettlementsLoading] = useState(false);

  // Right panel: uploaded statements
  const [statements, setStatements] = useState([]);
  const [stmtLoading, setStmtLoading] = useState(false);

  // Summary bar
  const [summary, setSummary] = useState({ txCount: 0, uploaded: 0, reconciled: 0, pending: 0 });

  // Upload
  const [statementDate, setStatementDate] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Inline date editing
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');

  // Inline description editing
  const [editingDescId, setEditingDescId] = useState(null);
  const [editDescValue, setEditDescValue] = useState('');

  // Preview
  const [previewStatement, setPreviewStatement] = useState(null);

  // Mark done modal
  const [doneModal, setDoneModal] = useState({ open: false, statement: null });
  const [doneDate, setDoneDate] = useState('');
  const [doneNotes, setDoneNotes] = useState('');
  const [doneSubmitting, setDoneSubmitting] = useState(false);

  // Transaction search & filters
  const [txSearchInput, setTxSearchInput] = useState(''); // raw input (debounced → txSearch)
  const [txSearch, setTxSearch] = useState('');           // debounced — triggers API fetch
  const txSearchTimer = useRef(null);
  const [txFilterType, setTxFilterType] = useState('all');
  const [txFilterStatus, setTxFilterStatus] = useState('all');
  const [txFilterDateFrom, setTxFilterDateFrom] = useState('');
  const [txFilterDateTo, setTxFilterDateTo] = useState('');
  const [txFilterAmountMin, setTxFilterAmountMin] = useState('');
  const [txFilterAmountMax, setTxFilterAmountMax] = useState('');
  const [txFilterTags, setTxFilterTags] = useState([]); // selected tag IDs
  const [txShowFilters, setTxShowFilters] = useState(false);

  // Available tags
  const [availableTags, setAvailableTags] = useState([]);

  // Recon History
  const [historyRows, setHistoryRows] = useState([]);   // { account, date, txCount, netAmount, statement, status }
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // all|treasury|psp|exchanger
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // all|done|pending
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historySummary, setHistorySummary] = useState({ treasury: { done: 0, pending: 0 }, psp: { done: 0, pending: 0 }, exchanger: { done: 0, pending: 0 } });
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 7;

  // ── Fetch accounts (treasury + PSP + exchangers) ────────────────
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const [tRes, pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/psp`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/vendors?page_size=100`, { headers: getAuthHeaders() }),
      ]);
      const treasury = tRes.ok ? (await tRes.json()) : {};
      const psps     = pRes.ok ? (await pRes.json()) : [];
      const vendors  = eRes.ok ? (await eRes.json()) : {};

      const combined = [
        ...(treasury.items || (Array.isArray(treasury) ? treasury : [])).map(a => ({
          id: a.account_id, name: a.account_name, type: 'treasury', currency: a.currency,
        })),
        ...(Array.isArray(psps) ? psps : []).map(p => ({
          id: p.psp_id, name: p.psp_name, type: 'psp', currency: p.currency || 'USD',
        })),
        ...(vendors.items || vendors || []).map(v => ({
          id: v.vendor_id, name: v.vendor_name, type: 'exchanger', currency: v.currency || 'USD',
        })),
      ];

      // Store full vendor objects for correct settlement_by_currency figures
      const vMap = {};
      (vendors.items || vendors || []).forEach(v => { vMap[v.vendor_id] = v; });
      setVendorMap(vMap);

      setAllAccounts(combined);
      return combined;
    } catch (e) {
      console.error('Error fetching accounts:', e);
    } finally {
      setAccountsLoading(false);
    }
    return [];
  }, [getAuthHeaders]);

  // ── Fetch transactions for selected account ─────────────────────
  const fetchTransactions = useCallback(async (accountId, accountType, page = 0, filters = {}) => {
    if (!accountId) return;
    setTxLoading(true);
    const {
      search = '', txType = 'all', txStatus = 'all',
      dateFrom = '', dateTo = '', amountMin = '', amountMax = '',
      tags = [],
    } = filters;
    try {
      let list = [];
      let totalCount = null;
      let totalPagesCount = 1;

      const buildParams = (extra = {}) => {
        const p = new URLSearchParams({ page: page + 1, page_size: 20 });
        if (search) p.set('search', search);
        if (dateFrom) p.set('date_from', dateFrom);
        if (dateTo) p.set('date_to', dateTo);
        if (amountMin) p.set('amount_min', amountMin);
        if (amountMax) p.set('amount_max', amountMax);
        if (tags && tags.length > 0) p.set('tags', tags.join(','));
        Object.entries(extra).forEach(([k, v]) => { if (v && v !== 'all') p.set(k, v); });
        return p.toString();
      };

      if (accountType === 'treasury') {
        const qs = new URLSearchParams({ page: page + 1, page_size: 20 });
        if (search) qs.set('search', search);
        if (txType !== 'all') qs.set('transaction_type', txType);
        if (dateFrom) qs.set('start_date', dateFrom);
        if (dateTo) qs.set('end_date', dateTo);
        if (amountMin) qs.set('amount_min', amountMin);
        if (amountMax) qs.set('amount_max', amountMax);
        if (tags && tags.length > 0) qs.set('tags', tags.join(','));

        const res = await fetch(`${API_URL}/api/treasury/${accountId}/history?${qs}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          list = data.items || [];
          totalPagesCount = data.total_pages || 1;
          totalCount = data.total ?? null;
        }
      } else if (accountType === 'psp') {
        const qs = buildParams({ transaction_type: txType, status: txStatus });
        const res = await fetch(`${API_URL}/api/psp/${accountId}/all-transactions?${qs}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          list = (data.items || []).map(t => ({
            ...t,
            amount: t.base_amount ?? t.amount,
            currency: t.base_currency || t.currency || 'USD',
            status: t.settled ? 'settled' : (t.status || ''),
          }));
          totalPagesCount = data.total_pages || 1;
          totalCount = data.total ?? null;
        }
      } else if (accountType === 'exchanger') {
        const qs = buildParams({ status: txStatus });
        const res = await fetch(`${API_URL}/api/vendors/${accountId}/transactions?${qs}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          list = (data.items || []).map(t => ({
            ...t,
            amount: t.base_amount ?? t.amount,
            currency: t.base_currency || t.currency || 'USD',
          }));
          totalPagesCount = data.total_pages || 1;
          totalCount = data.total ?? null;
        }
      }

      setTransactions(list);
      setTxTotalPages(totalPagesCount);
      setTxTotalFromApi(totalCount);
      setSummary(prev => ({ ...prev, txCount: totalCount ?? list.length }));
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setTxLoading(false);
    }
  }, [getAuthHeaders]);

  // ── Fetch statements for selected account ───────────────────────
  const fetchStatements = useCallback(async (accountId, accountType) => {
    if (!accountId) return;
    setStmtLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/reconciliation/statements?account_id=${accountId}&account_type=${accountType}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.statements || (Array.isArray(data) ? data : []);
        setStatements(list);
        const reconciled = list.filter(s => isDone(s.status)).length;
        setSummary(prev => {
          // Only count pending if transactions exist for this account
          const hasTx = (prev.txCount || 0) > 0;
          return {
            ...prev,
            uploaded: list.length,
            reconciled: hasTx ? reconciled : 0,
            pending: hasTx ? (list.length - reconciled) : 0,
          };
        });
      }
    } catch (e) {
      console.error('Error fetching statements:', e);
    } finally {
      setStmtLoading(false);
    }
  }, [getAuthHeaders]);

  // ── Fetch exchanger settlement history ───────────────────────────
  const fetchExchSettlements = useCallback(async (vendorId) => {
    if (!vendorId) return;
    setExchSettlementsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/settlements`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExchSettlements(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching exchanger settlements:', e);
    } finally {
      setExchSettlementsLoading(false);
    }
  }, [getAuthHeaders]);

  // ── Fetch available tags ─────────────────────────────────────────
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/client-tags`, { headers: getAuthHeaders() });
      if (res.ok) setAvailableTags(await res.json());
    } catch (e) { console.error('Failed to load tags', e); }
  }, [getAuthHeaders]);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    fetchAvailableTags();
    fetchAccounts().then(list => {
      if (list.length > 0) {
        const first = list[0];
        setSelectedAccountId(first.id);
        setSelectedAccountType(first.type);
        fetchTransactions(first.id, first.type);
        fetchStatements(first.id, first.type);
        if (first.type === 'exchanger') fetchExchSettlements(first.id);
      }
    });
  }, []);

  // ── On account switch ────────────────────────────────────────────
  const handleSelectAccount = (id, type) => {
    setSelectedAccountId(id);
    setSelectedAccountType(type);
    setTransactions([]);
    setStatements([]);
    setExchSettlements([]);
    setSummary({ txCount: 0, uploaded: 0, reconciled: 0, pending: 0 });
    setTxPage(0);
    setTxTotalPages(1);
    setTxTotalFromApi(null);
    if (txSearchTimer.current) clearTimeout(txSearchTimer.current);
    setTxSearchInput('');
    setTxSearch('');
    setTxFilterType('all');
    setTxFilterStatus('all');
    setTxFilterDateFrom('');
    setTxFilterDateTo('');
    setTxFilterAmountMin('');
    setTxFilterAmountMax('');
    setTxFilterTags([]);
    setTxShowFilters(false);
    setExchInnerTab('transactions');
    fetchTransactions(id, type, 0, {});
    fetchStatements(id, type);
    if (type === 'exchanger') fetchExchSettlements(id);
  };

  // ── Upload ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile || !selectedAccountId) {
      toast.error('Select a file and an account first');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('account_id', selectedAccountId);
    formData.append('account_type', selectedAccountType);
    formData.append('statement_type', 'auto');
    formData.append('date', statementDate || new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch(`${API_URL}/api/reconciliation/upload-statement`, {
        method: 'POST',
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formData,
      });
      if (res.ok) {
        toast.success('Statement uploaded successfully');
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchStatements(selectedAccountId, selectedAccountType);
        fetchTransactions(selectedAccountId, selectedAccountType);
        fetchHistory();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (e) {
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Update statement date inline ─────────────────────────────────
  const handleUpdateDate = async (statementId) => {
    try {
      const res = await fetch(`${API_URL}/api/reconciliation/statements/${statementId}/date`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement_date: editDateValue }),
      });
      if (res.ok) {
        toast.success('Date updated');
        setEditingDateId(null);
        fetchStatements(selectedAccountId, selectedAccountType);
        fetchHistory();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleUpdateDescription = async (statementId) => {
    try {
      const res = await fetch(`${API_URL}/api/reconciliation/statements/${statementId}/description`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescValue }),
      });
      if (res.ok) {
        toast.success('Description updated');
        setEditingDescId(null);
        fetchStatements(selectedAccountId, selectedAccountType);
        fetchHistory();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleDeleteStatement = async (stmt) => {
    if (!window.confirm(`Remove "${stmt.filename}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/reconciliation/statements/${stmt.statement_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success('Statement removed');
        fetchStatements(selectedAccountId, selectedAccountType);
        fetchHistory();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to remove statement');
    }
  };

  // ── Fetch history ─────────────────────────────────────────────────
  // Builds one row per account showing ALL their transactions date-grouped
  // and cross-references against uploaded statements for recon status.
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyDateFrom) params.set('date_from', historyDateFrom);
      if (historyDateTo)   params.set('date_to',   historyDateTo);

      const res = await fetch(
        `${API_URL}/api/reconciliation/history?${params}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error('Failed to fetch reconciliation history');
      const data = await res.json();
      setHistoryRows(data.rows || []);
      setHistorySummary(
        data.summary || { treasury: { done: 0, pending: 0 }, psp: { done: 0, pending: 0 }, exchanger: { done: 0, pending: 0 } }
      );
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [getAuthHeaders, historyDateFrom, historyDateTo]);

  useEffect(() => {
    if (mainTab === 'history') fetchHistory();
  }, [mainTab, fetchHistory]);

  useEffect(() => {
    setHistoryPage(0);
  }, [historyTypeFilter, historyStatusFilter, historyDateFrom, historyDateTo]);

  // ── Mark done ────────────────────────────────────────────────────
  const handleMarkDone = async () => {
    if (!doneModal.statement) return;
    setDoneSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/reconciliation/statements/${doneModal.statement.statement_id}/mark-done`,
        {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reconciliation_date: doneDate || new Date().toISOString().split('T')[0],
            notes: doneNotes,
          }),
        }
      );
      if (res.ok) {
        toast.success('Marked as reconciled');
        setDoneModal({ open: false, statement: null });
        setDoneDate('');
        setDoneNotes('');
        fetchStatements(selectedAccountId, selectedAccountType);
        fetchHistory();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setDoneSubmitting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const formatAmount = (amount, currency = '') => {
    const num = Number(amount) || 0;
    return `${currency ? currency + ' ' : ''}${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const selectedAccount = allAccounts.find(a => a.id === selectedAccountId);

  // Sort all transactions newest-first for pagination
  const sortedAllTxs = [...transactions].sort((a, b) => {
    const da = a.created_at || a.date || '';
    const db = b.created_at || b.date || '';
    return db.localeCompare(da);
  });

  // All filtering is server-side — API returns the correct page directly
  const txHasActiveFilter = txSearch || txFilterType !== 'all' || txFilterStatus !== 'all'
    || txFilterDateFrom || txFilterDateTo || txFilterAmountMin || txFilterAmountMax || txFilterTags.length > 0;

  const effectiveTotalTxPages = txTotalPages;
  const pagedTxs = sortedAllTxs; // server already returned only this page
  // Group paged transactions by date for display headers
  const pagedGrouped = pagedTxs.reduce((acc, tx) => {
    const date = (tx.created_at || tx.date || '').split('T')[0] || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});
  const pagedDates = Object.keys(pagedGrouped).sort((a, b) => b.localeCompare(a));

  // Compute daily net settlement per currency for PSP/exchanger
  const getDailyNetByCurrency = (txs) => {
    const netMap = {};
    txs.forEach(tx => {
      const amt  = tx.base_amount ?? tx.amount ?? 0;
      const cur  = tx.base_currency || tx.currency || selectedAccount?.currency || '';
      const type = tx.transaction_type || tx.type || '';
      const sign = /withdrawal|withdraw|debit|out/i.test(type) ? -1 : 1;
      netMap[cur] = (netMap[cur] || 0) + sign * Math.abs(Number(amt));
    });
    return Object.entries(netMap); // [[currency, net], ...]
  };

  // Helper: current filters object (used by page-change and filter effects)
  const currentFilters = () => ({
    search: txSearch, txType: txFilterType, txStatus: txFilterStatus,
    dateFrom: txFilterDateFrom, dateTo: txFilterDateTo,
    amountMin: txFilterAmountMin, amountMax: txFilterAmountMax,
    tags: txFilterTags,
  });

  // Re-fetch from server whenever filters change (txSearch is debounced)
  const skipFilterEffect = useRef(true); // skip on initial mount
  useEffect(() => {
    if (skipFilterEffect.current) { skipFilterEffect.current = false; return; }
    if (!selectedAccountId) return;
    setTxPage(0);
    fetchTransactions(selectedAccountId, selectedAccountType, 0, {
      search: txSearch, txType: txFilterType, txStatus: txFilterStatus,
      dateFrom: txFilterDateFrom, dateTo: txFilterDateTo,
      amountMin: txFilterAmountMin, amountMax: txFilterAmountMax,
      tags: txFilterTags,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSearch, txFilterType, txFilterStatus, txFilterDateFrom, txFilterDateTo, txFilterAmountMin, txFilterAmountMax, txFilterTags]);

  const handleTxPageChange = (newPage) => {
    setTxPage(newPage);
    fetchTransactions(selectedAccountId, selectedAccountType, newPage, currentFilters());
  };

  const clearTxFilters = () => {
    if (txSearchTimer.current) clearTimeout(txSearchTimer.current);
    setTxSearchInput('');
    setTxSearch('');
    setTxFilterType('all');
    setTxFilterStatus('all');
    setTxFilterDateFrom('');
    setTxFilterDateTo('');
    setTxFilterAmountMin('');
    setTxFilterAmountMax('');
    setTxFilterTags([]);
  };

  const getAccountName = (accountId) =>
    allAccounts.find(a => a.id === accountId)?.name || accountId;

  // Group allAccounts by type for the tab strip
  const accountsByType = ['treasury', 'psp', 'exchanger'].reduce((acc, t) => {
    acc[t] = allAccounts.filter(a => a.type === t);
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reconciliation</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Per-account bank statement management</p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="reconciliation" className="gap-2">
            <FileText className="w-4 h-4" /> Reconciliation
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Recon History
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ RECONCILIATION TAB ══════════════════ */}
        <TabsContent value="reconciliation" className="mt-4">
          {accountsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {['treasury', 'psp', 'exchanger'].map(type => {
                  const { label, Icon, color, border, bg } = TYPE_CONFIG[type];
                  const active = selectedAccountType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        const accs = accountsByType[type];
                        if (accs.length > 0) handleSelectAccount(accs[0].id, type);
                        else { setSelectedAccountType(type); setSelectedAccountId(null); }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        active
                          ? `${bg} ${border} border ${color}`
                          : 'border text-muted-foreground hover:border hover:text-card-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                      <span className="text-xs opacity-60">({accountsByType[type].length})</span>
                    </button>
                  );
                })}
              </div>

              {/* Account tabs for the selected type */}
              {accountsByType[selectedAccountType]?.length > 0 && (
                <div className="border-b border overflow-x-auto">
                  <div className="flex min-w-max">
                    {accountsByType[selectedAccountType].map(acc => {
                      const active = selectedAccountId === acc.id;
                      const { color, border, bg } = TYPE_CONFIG[selectedAccountType];
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSelectAccount(acc.id, acc.type)}
                          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            active
                              ? `${border} ${color} ${bg}`
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border'
                          }`}
                        >
                          {acc.name}
                          {acc.currency && (
                            <span className="ml-1.5 text-xs opacity-60">({acc.currency})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary font-medium">Transactions</p>
                    <p className="text-2xl font-bold text-primary">{summary.txCount}</p>
                  </div>
                  <FileText className="w-8 h-8 text-primary/50" />
                </div>
                <div className="bg-muted/50 border border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Statements</p>
                    <p className="text-2xl font-bold text-card-foreground">{summary.uploaded}</p>
                  </div>
                  <Upload className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Reconciled</p>
                    <p className="text-2xl font-bold text-green-700">{summary.reconciled}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-300" />
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-yellow-700">{summary.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-300" />
                </div>
              </div>

              {/* Upload bar */}
              <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/50 border border rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Statement Date</Label>
                  <Input
                    type="date"
                    value={statementDate}
                    onChange={e => setStatementDate(e.target.value)}
                    className="h-9 w-40"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    File — PDF, XLSX, XLS, CSV, TXT
                  </Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.txt"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="h-9"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="h-9 shrink-0"
                >
                  {uploading
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? 'Uploading…' : 'Upload Statement'}
                </Button>
              </div>

              {/* Two-panel layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* LEFT: Internal transactions */}
                <Card>
                  <CardHeader className="py-3 px-4 border-b space-y-2">
                    <CardTitle className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {selectedAccount?.type === 'exchanger' ? (
                        /* Exchanger: inner tab strip */
                        <div className="flex gap-1 ml-1">
                          {[['transactions', 'Transactions'], ['settlements', 'Settlements']].map(([val, lbl]) => (
                            <button
                              key={val}
                              onClick={() => setExchInnerTab(val)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                exchInnerTab === val
                                  ? 'bg-orange-600 text-white'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >{lbl}</button>
                          ))}
                        </div>
                      ) : 'Transactions'}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {selectedAccount?.type === 'exchanger' && exchInnerTab === 'settlements'
                          ? exchSettlements.length
                          : txTotalFromApi ?? transactions.length}
                      </Badge>
                    </CardTitle>

                    {/* Search + filter bar (hide for exchanger settlements tab) */}
                    {(selectedAccount?.type !== 'exchanger' || exchInnerTab === 'transactions') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search reference, client, ID…"
                              value={txSearchInput}
                              onChange={e => {
                                const val = e.target.value;
                                setTxSearchInput(val);
                                if (txSearchTimer.current) clearTimeout(txSearchTimer.current);
                                txSearchTimer.current = setTimeout(() => setTxSearch(val), 400);
                              }}
                              className="w-full h-8 pl-8 pr-3 text-xs border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {txSearchInput && (
                              <button onClick={clearTxFilters} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => setTxShowFilters(v => !v)}
                            className={`h-8 px-2.5 flex items-center gap-1.5 text-xs rounded-md border transition-colors ${
                              txShowFilters || (txFilterType !== 'all' || txFilterStatus !== 'all' || txFilterDateFrom || txFilterDateTo || txFilterAmountMin || txFilterAmountMax || txFilterTags.length > 0)
                                ? 'bg-foreground text-background border-foreground'
                                : 'border bg-background text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                          </button>
                          {txHasActiveFilter && (
                            <button onClick={clearTxFilters} className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive transition-colors" title="Clear filters">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {txShowFilters && (
                          <div className="space-y-2 p-2 bg-muted/50 rounded-md border">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Type filter */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Type</label>
                                <select
                                  value={txFilterType}
                                  onChange={e => setTxFilterType(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                >
                                  <option value="all">All types</option>
                                  <option value="deposit">Deposit</option>
                                  <option value="withdrawal">Withdrawal</option>
                                  <option value="transfer">Transfer</option>
                                  <option value="credit">Credit</option>
                                  <option value="debit">Debit</option>
                                </select>
                              </div>
                              {/* Status filter */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Status</label>
                                <select
                                  value={txFilterStatus}
                                  onChange={e => setTxFilterStatus(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                >
                                  <option value="all">All statuses</option>
                                  <option value="settled">Settled</option>
                                  <option value="pending">Pending</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                              {/* Date From */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Date from</label>
                                <input
                                  type="date"
                                  value={txFilterDateFrom}
                                  onChange={e => setTxFilterDateFrom(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                />
                              </div>
                              {/* Date To */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Date to</label>
                                <input
                                  type="date"
                                  value={txFilterDateTo}
                                  onChange={e => setTxFilterDateTo(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                />
                              </div>
                              {/* Amount Min */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Amount min</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={txFilterAmountMin}
                                  onChange={e => setTxFilterAmountMin(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                />
                              </div>
                              {/* Amount Max */}
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1 block">Amount max</label>
                                <input
                                  type="number"
                                  placeholder="∞"
                                  value={txFilterAmountMax}
                                  onChange={e => setTxFilterAmountMax(e.target.value)}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground focus:outline-none"
                                />
                              </div>
                            </div>
                            {/* Tags filter */}
                            {availableTags.length > 0 && (
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1">
                                  <Tag className="w-3 h-3" /> Tags (any match)
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {availableTags.map(tag => {
                                    const active = txFilterTags.includes(tag.tag_id);
                                    return (
                                      <button
                                        key={tag.tag_id}
                                        type="button"
                                        onClick={() => setTxFilterTags(active
                                          ? txFilterTags.filter(t => t !== tag.tag_id)
                                          : [...txFilterTags, tag.tag_id]
                                        )}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                                          active ? 'border-transparent text-white' : 'border bg-background text-muted-foreground hover:text-foreground'
                                        }`}
                                        style={active ? { backgroundColor: tag.color || 'hsl(var(--primary))' } : {}}
                                      >
                                        {tag.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* PSP: net pending settlement summary */}
                    {selectedAccount?.type === 'psp' && !txLoading && transactions.length > 0 && (() => {
                      const pending = transactions.filter(t => t.status !== 'settled');
                      // group pending net by currency
                      const netMap = {};
                      pending.forEach(t => {
                        const cur = t.base_currency || t.currency || 'USD';
                        const type = t.transaction_type || t.type || '';
                        const sign = /withdrawal|withdraw|debit|out/i.test(type) ? -1 : 1;
                        netMap[cur] = (netMap[cur] || 0) + sign * Math.abs(Number(t.base_amount ?? t.amount) || 0);
                      });
                      const entries = Object.entries(netMap);
                      if (entries.length === 0) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-amber-50 border-b border-amber-100">
                          <span className="text-xs font-semibold text-amber-700 shrink-0">Net Pending Settlement</span>
                          <span className="text-xs text-amber-500 shrink-0">({pending.length} txn{pending.length !== 1 ? 's' : ''})</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-auto">
                            {entries.map(([cur, net]) => (
                              <span key={cur} className={`text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {net >= 0 ? '+' : ''}{formatAmount(net, cur)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exchanger: net settlement from vendor API (includes commission) */}
                    {selectedAccount?.type === 'exchanger' && exchInnerTab === 'transactions' && !txLoading && (() => {
                      const vendor = vendorMap[selectedAccount.id];
                      const currencies = vendor?.settlement_by_currency || [];
                      if (currencies.length === 0) return null;
                      const pendingUsd = vendor?.pending_amount ?? vendor?.pending_settlement ?? null;
                      return (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-orange-50 border-b border-orange-100">
                          <span className="text-xs font-semibold text-orange-700 shrink-0">Net Settlement</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 ml-auto items-center">
                            {currencies.map(s => (
                              <span key={s.currency} className={`text-xs font-bold ${(s.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(s.amount ?? 0) >= 0 ? '+' : ''}{formatAmount(s.amount, s.currency)}
                                {s.usd_equivalent != null && s.currency !== 'USD' && (
                                  <span className="font-normal text-muted-foreground ml-1">
                                    (≈ USD {Math.abs(s.usd_equivalent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                  </span>
                                )}
                              </span>
                            ))}
                            {pendingUsd != null && currencies.every(s => s.currency === 'USD') === false && (
                              <span className={`text-xs font-semibold border-l border-orange-200 pl-4 ${pendingUsd >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                Total: {pendingUsd >= 0 ? '+' : ''}USD {Math.abs(pendingUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exchanger: Settlement History tab */}
                    {selectedAccount?.type === 'exchanger' && exchInnerTab === 'settlements' && (
                      exchSettlementsLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        </div>
                      ) : exchSettlements.length === 0 ? (
                        <div className="text-center py-14 text-muted-foreground text-sm">
                          No settlements found
                        </div>
                      ) : (
                        <ScrollArea className="h-[520px]">
                          {exchSettlements.map((s, i) => {
                            const statusColor = {
                              completed: 'bg-green-100 text-green-700',
                              approved:  'bg-primary/15 text-primary',
                              pending:   'bg-yellow-100 text-yellow-700',
                            }[s.status] || 'bg-muted text-muted-foreground';
                            const net = s.net_amount_source ?? s.settlement_amount ?? 0;
                            const srcCur = s.source_currency || 'USD';
                            const dstCur = s.destination_currency || srcCur;
                            const settleAmt = s.settlement_amount ?? 0;
                            return (
                              <div key={s.settlement_id || i} className="px-4 py-3 border-b border/60 hover:bg-muted/50/70">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-card-foreground">
                                        {s.settlement_type === 'cash' ? '💵 Cash' : '🏦 Bank'} Settlement
                                      </span>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${statusColor}`}>
                                        {s.status}
                                      </span>
                                      {s.settlement_mode === 'custom' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">Partial</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatDate(s.settled_at || s.created_at)}
                                      {s.settlement_destination_name && (
                                        <span className="ml-2 text-muted-foreground/60">→ {s.settlement_destination_name}</span>
                                      )}
                                    </p>
                                    {s.notes && <p className="text-[11px] text-muted-foreground mt-0.5 italic truncate">{s.notes}</p>}
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                                      {s.transaction_count > 0 && <span>{s.transaction_count} txns</span>}
                                      {s.commission_amount > 0 && <span className="text-red-500">Commission: -{formatAmount(s.commission_amount, srcCur)}</span>}
                                      {s.charges_amount > 0 && <span className="text-red-500">Charges: -{formatAmount(s.charges_amount, srcCur)}</span>}
                                      {s.exchange_rate && s.exchange_rate !== 1 && (
                                        <span className="text-muted-foreground">Rate: {s.exchange_rate}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0 ml-2">
                                    <span className="text-sm font-bold text-green-600">
                                      +{formatAmount(settleAmt, dstCur)}
                                    </span>
                                    {srcCur !== dstCur && (
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        Gross: {formatAmount(s.gross_amount, srcCur)}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      Net: {formatAmount(net, srcCur)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </ScrollArea>
                      )
                    )}

                    {/* Transactions tab (all types) — hidden for exchanger when settlements tab active */}
                    {(selectedAccount?.type !== 'exchanger' || exchInnerTab === 'transactions') && (
                    txLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-14 text-muted-foreground text-sm">
                        No transactions for this account
                      </div>
                    ) : transactions.length === 0 && txHasActiveFilter ? (
                      <div className="text-center py-14 text-muted-foreground text-sm">
                        No transactions match your search/filters
                        <br />
                        <button onClick={clearTxFilters} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
                      </div>
                    ) : (
                      <>
                      <ScrollArea className="h-[480px]">
                        {pagedDates.map(date => {
                          const txs = pagedGrouped[date];
                          const isTreasury = selectedAccount?.type === 'treasury';
                          const dailyNets = getDailyNetByCurrency(txs);

                          return (
                            <div key={date}>
                              {/* Date group header */}
                              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-y border/60 sticky top-0 z-10">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {formatDate(date)}
                                  <span className="ml-2 text-muted-foreground font-normal">({txs.length} txn{txs.length !== 1 ? 's' : ''})</span>
                                </span>
                                {!isTreasury && (
                                  /* PSP/Exchanger: net per payment currency */
                                  <div className="flex flex-col items-end gap-0.5">
                                    {dailyNets.map(([cur, net]) => (
                                      <span key={cur} className={`text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        Net: {net >= 0 ? '+' : ''}{formatAmount(net, cur)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {txs.map((tx, i) => {
                                const payAmt  = tx.base_amount ?? tx.amount;
                                const payCur  = tx.base_currency || tx.currency || selectedAccount?.currency;
                                const isCredit = (Number(tx.amount) || 0) >= 0;
                                const txType  = tx.type || tx.transaction_type || 'transfer';

                                return (
                                  <div
                                    key={tx.transaction_id || i}
                                    className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 hover:bg-muted/50/80"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-foreground truncate">
                                        {tx.reference || tx.client_name || 'Transaction'}
                                      </p>
                                      <p className="text-xs text-muted-foreground capitalize">{txType}</p>
                                      {/* Tag chips */}
                                      {(tx.client_tags || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(tx.client_tags || []).map(tagId => {
                                            const tag = availableTags.find(t => t.tag_id === tagId);
                                            if (!tag) return null;
                                            return (
                                              <span
                                                key={tagId}
                                                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                                                style={{ backgroundColor: tag.color || 'hsl(var(--primary))' }}
                                              >
                                                {tag.name}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end ml-3 shrink-0">
                                      {/* Payment currency amount */}
                                      <span className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                        {isCredit ? '+' : '-'}{formatAmount(payAmt, payCur)}
                                      </span>

                                      {/* Treasury: running balance */}
                                      {isTreasury && tx.running_balance != null && (
                                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                          Running balance: {formatAmount(tx.running_balance, selectedAccount?.currency)}
                                        </span>
                                      )}

                                      {/* PSP/Exchanger: show USD equivalent if different from payment currency */}
                                      {!isTreasury && payCur && payCur !== 'USD' && tx.amount != null && (
                                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                          ≈ USD {Math.abs(Number(tx.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </ScrollArea>

                      {/* Pagination controls */}
                      {(txTotalFromApi ?? transactions.length) > 0 && (
                        <div className="flex items-center justify-between px-4 py-2 border-t border/60 bg-muted/50/60">
                          <span className="text-xs text-muted-foreground">
                            {txPage * TX_PAGE_SIZE + 1}–{Math.min((txPage + 1) * TX_PAGE_SIZE, txTotalFromApi ?? transactions.length)} of {txTotalFromApi ?? transactions.length}{txHasActiveFilter ? ' filtered' : ''} transactions
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTxPageChange(0)}
                              disabled={txPage === 0}
                              className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >«</button>
                            <button
                              onClick={() => handleTxPageChange(Math.max(0, txPage - 1))}
                              disabled={txPage === 0}
                              className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >‹ Prev</button>
                            {Array.from({ length: effectiveTotalTxPages }, (_, i) => i)
                              .filter(i => Math.abs(i - txPage) <= 2)
                              .map(i => (
                                <button
                                  key={i}
                                  onClick={() => handleTxPageChange(i)}
                                  className={`px-2.5 py-1 text-xs rounded border ${
                                    i === txPage
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'border bg-card text-muted-foreground hover:border-slate-400'
                                  }`}
                                >{i + 1}</button>
                              ))}
                            <button
                              onClick={() => handleTxPageChange(Math.min(effectiveTotalTxPages - 1, txPage + 1))}
                              disabled={txPage === effectiveTotalTxPages - 1}
                              className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >Next ›</button>
                            <button
                              onClick={() => handleTxPageChange(effectiveTotalTxPages - 1)}
                              disabled={txPage === effectiveTotalTxPages - 1}
                              className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >»</button>
                          </div>
                        </div>
                      )}
                      </>
                    ))}
                  </CardContent>
                </Card>

                {/* RIGHT: Uploaded statements */}
                <Card>
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      Uploaded Statements
                      <Badge variant="outline" className="ml-auto text-xs">{statements.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stmtLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : statements.length === 0 ? (
                      <div className="text-center py-14 text-muted-foreground text-sm">
                        No statements uploaded yet
                      </div>
                    ) : (
                      <ScrollArea className="h-[480px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">File</TableHead>
                              <TableHead className="text-xs">Stmt Date</TableHead>
                              <TableHead className="text-xs">Uploaded</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="w-16 text-xs"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statements.map(stmt => (
                              <TableRow key={stmt.statement_id} className="text-xs hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span
                                      className="truncate max-w-[110px] text-card-foreground"
                                      title={stmt.filename}
                                    >
                                      {stmt.filename}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {editingDateId === stmt.statement_id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="date"
                                        value={editDateValue}
                                        onChange={e => setEditDateValue(e.target.value)}
                                        className="w-28 text-xs px-1 py-0.5 border border rounded"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateDate(stmt.statement_id)}
                                        className="text-green-600 hover:text-green-700 p-0.5"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingDateId(null)}
                                        className="text-muted-foreground hover:text-card-foreground p-0.5"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingDateId(stmt.statement_id);
                                        setEditDateValue(stmt.statement_date?.split('T')[0] || '');
                                      }}
                                      className="text-card-foreground hover:text-primary hover:underline"
                                    >
                                      {formatDate(stmt.statement_date)}
                                    </button>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(stmt.uploaded_at || stmt.created_at)}
                                </TableCell>
                                <TableCell>
                                  {isDone(stmt.status) ? (
                                    <Badge className="bg-green-100 text-green-700 text-xs py-0 px-1.5">Done</Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-700 text-xs py-0 px-1.5">Pending</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => setPreviewStatement(stmt)}
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    {!isDone(stmt.status) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => {
                                          setDoneModal({ open: true, statement: stmt });
                                          setDoneDate(new Date().toISOString().split('T')[0]);
                                          setDoneNotes('');
                                        }}
                                        title="Mark Done"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteStatement(stmt)}
                                      title="Remove statement"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ RECON HISTORY TAB ═══════════════════ */}
        <TabsContent value="history" className="mt-4">
          {(() => {
            // Type and status filters applied client-side;
            // date range is passed to backend as query params (fetchHistory)
            let visibleRows = historyRows;
            if (historyTypeFilter !== 'all')   visibleRows = visibleRows.filter(r => r.account_type === historyTypeFilter);
            if (historyStatusFilter !== 'all') visibleRows = visibleRows.filter(r => r.status === historyStatusFilter);

            // closing_balance already computed by backend per (account + currency)
            const runningBalanceMap = {};
            historyRows.forEach(r => {
              runningBalanceMap[r.key] = r.closing_balance;
            });

            // Group by date for display
            const byDate = {};
            visibleRows.forEach(r => {
              if (!byDate[r.date]) byDate[r.date] = [];
              byDate[r.date].push(r);
            });
            const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
            const totalHistoryPages = Math.ceil(sortedDates.length / HISTORY_PAGE_SIZE) || 1;
            const pagedHistoryDates = sortedDates.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE);

            return (
              <div className="space-y-4">
                {/* Summary cards per type */}
                <div className="grid grid-cols-3 gap-3">
                  {['treasury', 'psp', 'exchanger'].map(type => {
                    const { label, Icon, color, border, bg } = TYPE_CONFIG[type];
                    const s = historySummary[type] || { done: 0, pending: 0 };
                    return (
                      <div key={type} className={`rounded-lg border p-3 ${bg} ${border}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className={`text-xs font-semibold ${color}`}>{label}</span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs text-green-600">Done</p>
                            <p className="text-xl font-bold text-green-700">{s.done}</p>
                          </div>
                          <div>
                            <p className="text-xs text-yellow-600">Pending</p>
                            <p className="text-xl font-bold text-yellow-700">{s.pending}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/50 border border rounded-lg">
                  {/* Type filter */}
                  <div className="flex gap-1.5">
                    {['all', 'treasury', 'psp', 'exchanger'].map(t => (
                      <button
                        key={t}
                        onClick={() => setHistoryTypeFilter(t)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          historyTypeFilter === t
                            ? 'bg-slate-800 text-white'
                            : 'bg-card border border text-muted-foreground hover:border-slate-400'
                        }`}
                      >
                        {t === 'all' ? 'All Types' : TYPE_CONFIG[t].label}
                      </button>
                    ))}
                  </div>
                  {/* Status filter */}
                  <div className="flex gap-1.5">
                    {[['all','All'],['done','✅ Done'],['pending','⏳ Pending']].map(([v, lbl]) => (
                      <button
                        key={v}
                        onClick={() => setHistoryStatusFilter(v)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          historyStatusFilter === v
                            ? v === 'done' ? 'bg-green-600 text-white'
                              : v === 'pending' ? 'bg-yellow-500 text-white'
                              : 'bg-slate-800 text-white'
                            : 'bg-card border border text-muted-foreground hover:border-slate-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {/* Date range */}
                  <div className="flex items-end gap-2 ml-auto">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                      <Input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="h-8 w-32 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                      <Input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="h-8 w-32 text-xs" />
                    </div>
                    {(historyDateFrom || historyDateTo) && (
                      <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-500 px-2"
                        onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="h-8" onClick={fetchHistory} disabled={historyLoading}>
                      {historyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refresh'}
                    </Button>
                  </div>
                </div>

                {/* Main content */}
                {historyLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : visibleRows.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/50/50">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No records found</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {pagedHistoryDates.map(date => {
                      const dateRows = byDate[date];
                      const doneCount = dateRows.filter(r => r.status === 'done').length;
                      const pendingCount = dateRows.length - doneCount;
                      return (
                        <div key={date}>
                          {/* Date group header */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-card-foreground uppercase tracking-wider">
                              {formatDate(date)}
                            </span>
                            <span className="h-px flex-1 bg-slate-200" />
                            {doneCount > 0 && (
                              <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-100 rounded px-2 py-0.5">
                                {doneCount} done
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 border border-yellow-100 rounded px-2 py-0.5">
                                {pendingCount} pending
                              </span>
                            )}
                          </div>
                          <Card>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50/80">
                                  <TableHead className="text-xs py-2">Account</TableHead>
                                  <TableHead className="text-xs py-2">Type</TableHead>
                                  <TableHead className="text-xs py-2 text-right">Transactions</TableHead>
                                  <TableHead className="text-xs py-2 text-right">Net Amount</TableHead>
                                  <TableHead className="text-xs py-2 text-right">Closing Balance</TableHead>
                                  <TableHead className="text-xs py-2">Statement</TableHead>
                                  <TableHead className="text-xs py-2">Description</TableHead>
                                  <TableHead className="text-xs py-2">Recon Status</TableHead>
                                  <TableHead className="text-xs py-2">Done Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dateRows.map(row => {
                                  const tc = TYPE_CONFIG[row.account_type];
                                  return (
                                    <TableRow
                                      key={row.key}
                                      className={`text-xs ${row.status === 'done' ? 'bg-green-50/30' : 'bg-yellow-50/20'}`}
                                    >
                                      <TableCell className="font-medium text-foreground py-2.5">
                                        {row.account_name}
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${tc?.color}`}>
                                          {tc && <tc.Icon className="w-3 h-3" />}
                                          {tc?.label}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right text-card-foreground py-2.5">
                                        {row.tx_count > 0 ? row.tx_count : '—'}
                                      </TableCell>
                                      <TableCell className={`text-right font-medium py-2.5 ${row.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.tx_count > 0
                                          ? `${row.net_amount >= 0 ? '+' : ''}${formatAmount(row.net_amount, row.currency)}`
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="text-right py-2.5">
                                        {(() => {
                                          const bal = row.closing_balance ?? runningBalanceMap[row.key];
                                          if (bal == null) return <span className="text-muted-foreground/60">—</span>;
                                          return (
                                            <span className={`font-semibold text-xs ${bal >= 0 ? 'text-primary' : 'text-red-600'}`}>
                                              {formatAmount(bal, row.currency)}
                                            </span>
                                          );
                                        })()}
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        {row.statement ? (
                                          <div className="flex items-center gap-1.5">
                                            <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0" />
                                            <span
                                              className="text-card-foreground truncate max-w-[120px] cursor-pointer hover:text-primary hover:underline"
                                              title={row.statement.filename}
                                              onClick={() => setPreviewStatement(row.statement)}
                                            >
                                              {row.statement.filename}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground/60 italic text-xs">No statement</span>
                                        )}
                                      </TableCell>

                                      {/* Description cell — inline editable */}
                                      <TableCell className="py-2 min-w-[160px] max-w-[220px]">
                                        {row.statement ? (
                                          editingDescId === row.statement.statement_id ? (
                                            <div className="flex flex-col gap-1">
                                              <textarea
                                                autoFocus
                                                value={editDescValue}
                                                onChange={e => setEditDescValue(e.target.value)}
                                                rows={2}
                                                className="w-full text-xs px-2 py-1 border border-primary/50 rounded resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                                placeholder="Add description…"
                                              />
                                              <div className="flex gap-1">
                                                <button
                                                  onClick={() => handleUpdateDescription(row.statement.statement_id)}
                                                  className="text-[10px] px-2 py-0.5 bg-primary text-white rounded hover:bg-primary/85"
                                                >Save</button>
                                                <button
                                                  onClick={() => setEditingDescId(null)}
                                                  className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded hover:bg-slate-200"
                                                >Cancel</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div
                                              className="flex items-start gap-1 group cursor-pointer"
                                              onClick={() => {
                                                setEditingDescId(row.statement.statement_id);
                                                setEditDescValue(row.statement.description || row.statement.notes || '');
                                              }}
                                            >
                                              <span className={`text-xs flex-1 ${(row.statement.description || row.statement.notes) ? 'text-card-foreground' : 'text-muted-foreground/60 italic'}`}>
                                                {row.statement.description || row.statement.notes || 'Add description…'}
                                              </span>
                                              <Pencil className="w-3 h-3 text-muted-foreground/60 group-hover:text-primary/80 shrink-0 mt-0.5 transition-colors" />
                                            </div>
                                          )
                                        ) : (
                                          <span className="text-slate-200 text-xs">—</span>
                                        )}
                                      </TableCell>

                                      <TableCell className="py-2.5">
                                        {row.status === 'done' ? (
                                          <Badge className="bg-green-100 text-green-700 text-xs py-0 px-2 gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Done
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-yellow-100 text-yellow-700 text-xs py-0 px-2 gap-1">
                                            <Clock className="w-3 h-3" /> Pending
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground py-2.5">
                                        {row.statement?.reconciliation_date
                                          ? formatDate(row.statement.reconciliation_date)
                                          : '—'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* History pagination */}
                {!historyLoading && totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-2 border-t border/60">
                    <span className="text-xs text-muted-foreground">
                      Page {historyPage + 1} of {totalHistoryPages} ({sortedDates.length} date groups)
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setHistoryPage(0)} disabled={historyPage === 0} className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
                      <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0} className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">‹ Prev</button>
                      {Array.from({ length: totalHistoryPages }, (_, i) => i)
                        .filter(i => Math.abs(i - historyPage) <= 2)
                        .map(i => (
                          <button key={i} onClick={() => setHistoryPage(i)} className={`px-2.5 py-1 text-xs rounded border ${i === historyPage ? 'bg-slate-800 text-white border-slate-800' : 'border bg-card text-muted-foreground hover:border-slate-400'}`}>{i + 1}</button>
                        ))}
                      <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1))} disabled={historyPage === totalHistoryPages - 1} className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">Next ›</button>
                      <button onClick={() => setHistoryPage(totalHistoryPages - 1)} disabled={historyPage === totalHistoryPages - 1} className="px-2 py-1 text-xs rounded border border bg-card text-muted-foreground hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* File Preview Modal */}
      <FilePreviewModal
        open={!!previewStatement}
        onClose={() => setPreviewStatement(null)}
        statement={previewStatement}
        getAuthHeaders={getAuthHeaders}
      />

      {/* Mark Done Modal */}
      <Dialog
        open={doneModal.open}
        onOpenChange={(open) => { if (!open) setDoneModal({ open: false, statement: null }); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Mark as Reconciled
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {doneModal.statement && (
              <div className="bg-muted/50 border border rounded-lg p-3 text-sm text-card-foreground">
                <span className="font-medium">File:</span> {doneModal.statement.filename}
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Reconciliation Date</Label>
              <Input
                type="date"
                value={doneDate}
                onChange={e => setDoneDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Notes / Description</Label>
              <Textarea
                value={doneNotes}
                onChange={e => setDoneNotes(e.target.value)}
                placeholder="Add notes about this reconciliation…"
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneModal({ open: false, statement: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkDone}
              disabled={doneSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {doneSubmitting
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
