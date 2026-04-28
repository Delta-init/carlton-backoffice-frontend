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
  X, FileSpreadsheet, Building2, CreditCard, Store, Trash2,
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
              className={`px-3 py-1 text-xs rounded whitespace-nowrap ${activeSheet === i ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
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
              <tr key={ri} className={ri === 0 ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}>
                {(Array.isArray(row) ? row : []).map((cell, ci) => (
                  <td key={ci} className="border border-slate-200 px-2 py-1 whitespace-nowrap">
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
              <tr key={ri} className={ri === 0 ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-slate-200 px-2 py-1 whitespace-nowrap">{cell.trim()}</td>
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
        if (!res.ok) { toast.error(await getApiError(res)); setLoading(false); return; }
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
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-sm text-slate-800 truncate">{statement?.filename}</span>
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
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : fileType === 'pdf' && objectUrl ? (
            <iframe src={objectUrl} className="w-full h-full border-0" title="PDF Preview" />
          ) : fileType === 'excel' && blob ? (
            <ExcelPreview blob={blob} filename={statement?.filename} />
          ) : (fileType === 'csv' || fileType === 'txt') && textContent ? (
            <TextPreview content={textContent} />
          ) : fileType === 'image' && objectUrl ? (
            <div className="flex items-center justify-center h-full bg-slate-50">
              <img src={objectUrl} alt="preview" className="max-w-full max-h-full object-contain p-4" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
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
  treasury:  { label: 'Treasury',  Icon: Building2,  color: 'text-blue-600',   border: 'border-blue-600',   bg: 'bg-blue-50/40'   },
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

  // Preview
  const [previewStatement, setPreviewStatement] = useState(null);

  // Mark done modal
  const [doneModal, setDoneModal] = useState({ open: false, statement: null });
  const [doneDate, setDoneDate] = useState('');
  const [doneNotes, setDoneNotes] = useState('');
  const [doneSubmitting, setDoneSubmitting] = useState(false);

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
  const fetchTransactions = useCallback(async (accountId, accountType, page = 0) => {
    if (!accountId) return;
    setTxLoading(true);
    try {
      let list = [];

      if (accountType === 'treasury') {
        const res = await fetch(
          `${API_URL}/api/treasury/${accountId}/history?page=${page + 1}&page_size=20`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          list = data.items || (Array.isArray(data) ? data : []);
          setTxTotalPages(data.total_pages || 1);
          setTxTotalFromApi(data.total || null);
        }
      } else if (accountType === 'psp') {
        // Combine settled + unsettled (deposit + withdrawal) for full picture
        const [settledRes, depRes, wthRes] = await Promise.all([
          fetch(`${API_URL}/api/reconciliation/psp/${accountId}/details`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/psp/${accountId}/pending-transactions?page_size=200`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/psp/${accountId}/withdrawal-transactions?page_size=200`, { headers: getAuthHeaders() }),
        ]);
        // settled: normalize fields to common shape — prefer payment (base) currency over USD
        const settledRaw = settledRes.ok ? (await settledRes.json()) : [];
        const settled = (Array.isArray(settledRaw) ? settledRaw : []).map(t => ({
          transaction_id: t.transaction_id,
          reference: t.reference,
          client_name: t.client_name,
          // Use base (payment) currency when available, fall back to USD gross_amount
          amount: t.base_amount ?? t.gross_amount,
          currency: t.base_currency || t.currency || 'USD',
          transaction_type: t.transaction_type || 'deposit',
          status: 'settled',
          created_at: t.settled_at,
        }));
        const dep = depRes.ok ? (await depRes.json()) : {};
        const wth = wthRes.ok ? (await wthRes.json()) : {};
        // Normalize unsettled PSP transactions to payment (base) currency too
        const unsettledRaw = [...(dep.items || []), ...(wth.items || [])];
        const unsettled = unsettledRaw.map(t => ({
          ...t,
          amount: t.base_amount ?? t.amount,
          currency: t.base_currency || t.currency || 'USD',
        }));
        // Deduplicate by transaction_id (settled takes precedence)
        const settledIds = new Set(settled.map(t => t.transaction_id));
        const dedupedUnsettled = unsettled.filter(t => !settledIds.has(t.transaction_id));
        list = [...settled, ...dedupedUnsettled];
        list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      } else if (accountType === 'exchanger') {
        const res = await fetch(
          `${API_URL}/api/vendors/${accountId}/transactions`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          const raw = Array.isArray(data) ? data : data.items || [];
          // Only show approved / completed transactions
          const approved = raw.filter(t =>
            ['approved', 'completed'].includes((t.status || '').toLowerCase())
          );
          // Normalize to payment (base) currency — same as PSP
          list = approved.map(t => ({
            ...t,
            amount: t.base_amount ?? t.amount,
            currency: t.base_currency || t.currency || 'USD',
          }));
        }
      }

      setTransactions(list);
      setSummary(prev => ({ ...prev, txCount: list.length }));
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
        setSummary(prev => ({
          ...prev,
          uploaded: list.length,
          reconciled,
          pending: list.length - reconciled,
        }));
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

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
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
    setExchInnerTab('transactions');
    fetchTransactions(id, type, 0);
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
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
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
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  // ── Fetch history ─────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (allAccounts.length === 0) return;
    setHistoryLoading(true);
    try {
      const headers = getAuthHeaders();

      // 1. Fetch all uploaded statements (no filter — we need all for cross-ref)
      const stmtRes = await fetch(`${API_URL}/api/reconciliation/statements`, { headers });
      const stmtData = stmtRes.ok ? await stmtRes.json() : {};
      const allStatements = stmtData.statements || [];

      // Build lookup: account_id → list of statements
      const stmtByAccount = {};
      allStatements.forEach(s => {
        if (!stmtByAccount[s.account_id]) stmtByAccount[s.account_id] = [];
        stmtByAccount[s.account_id].push(s);
      });

      // 2. Fetch transactions for ALL accounts in parallel
      const txFetches = allAccounts.map(async (acc) => {
        try {
          let txList = [];
          if (acc.type === 'treasury') {
            const r = await fetch(`${API_URL}/api/treasury/${acc.id}/history?page_size=200&limit=5000`, { headers });
            if (r.ok) { const d = await r.json(); txList = d.items || []; }
          } else if (acc.type === 'psp') {
            const [sr, dr, wr] = await Promise.all([
              fetch(`${API_URL}/api/reconciliation/psp/${acc.id}/details`, { headers }),
              fetch(`${API_URL}/api/psp/${acc.id}/pending-transactions?page_size=200`, { headers }),
              fetch(`${API_URL}/api/psp/${acc.id}/withdrawal-transactions?page_size=200`, { headers }),
            ]);
            const normalise = t => ({ ...t, amount: t.base_amount ?? t.gross_amount ?? t.amount, currency: t.base_currency || t.currency || 'USD' });
            const srData = sr.ok ? await sr.json() : {};
            const settled = (Array.isArray(srData) ? srData : (srData.transactions || [])).map(normalise);
            const dep     = dr.ok ? ((await dr.json()).items || []) : [];
            const wth     = wr.ok ? ((await wr.json()).items || []) : [];
            const settledIds = new Set(settled.map(t => t.transaction_id));
            txList = [...settled, ...[...dep, ...wth].filter(t => !settledIds.has(t.transaction_id)).map(normalise)];
          } else {
            const r = await fetch(`${API_URL}/api/vendors/${acc.id}/transactions`, { headers });
            if (r.ok) {
              const d = await r.json();
              const raw = Array.isArray(d) ? d : d.items || [];
              txList = raw.map(t => ({ ...t, amount: t.base_amount ?? t.amount, currency: t.base_currency || t.currency || 'USD' }));
            }
          }
          return { acc, txList };
        } catch { return { acc, txList: [] }; }
      });

      const results = await Promise.all(txFetches);

      // 3. Build display rows: one row per account × date
      const rows = [];
      results.forEach(({ acc, txList }) => {
        // Group this account's transactions by date
        const byDate = {};
        txList.forEach(tx => {
          const d = (tx.created_at || tx.date || '')?.split('T')[0] || 'Unknown';
          if (!byDate[d]) byDate[d] = { txs: [], net: 0 };
          byDate[d].txs.push(tx);
          byDate[d].net += Number(tx.amount) || 0;
        });

        // Cross-reference: find statement for this account that covers each date
        const accStatements = stmtByAccount[acc.id] || [];

        // Emit one row per date with transactions
        Object.entries(byDate).forEach(([date, { txs, net }]) => {
          const matchedStmt = accStatements.find(s =>
            (s.statement_date || '').startsWith(date)
          ) || null;

          rows.push({
            key: `${acc.id}-${date}`,
            account_id: acc.id,
            account_name: acc.name,
            account_type: acc.type,
            currency: acc.currency,
            date,
            tx_count: txs.length,
            net_amount: net,
            statement: matchedStmt,
            status: matchedStmt ? (isDone(matchedStmt.status) ? 'done' : 'pending') : 'pending',
          });
        });

        // Also add rows for statements that don't correspond to a date with transactions
        accStatements.forEach(s => {
          const sd = (s.statement_date || '').split('T')[0];
          const alreadyCovered = rows.some(r => r.account_id === acc.id && r.date === sd);
          if (!alreadyCovered) {
            rows.push({
              key: `${acc.id}-stmt-${s.statement_id}`,
              account_id: acc.id,
              account_name: acc.name,
              account_type: acc.type,
              currency: acc.currency,
              date: sd,
              tx_count: 0,
              net_amount: 0,
              statement: s,
              status: isDone(s.status) ? 'done' : 'pending',
            });
          }
        });
      });

      // Sort: newest date first, then by account name
      rows.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return a.account_name.localeCompare(b.account_name);
      });

      // Build summary
      const summary = { treasury: { done: 0, pending: 0 }, psp: { done: 0, pending: 0 }, exchanger: { done: 0, pending: 0 } };
      rows.forEach(r => {
        if (summary[r.account_type]) {
          if (r.status === 'done') summary[r.account_type].done++;
          else summary[r.account_type].pending++;
        }
      });

      setHistoryRows(rows);
      setHistorySummary(summary);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [allAccounts, getAuthHeaders]);

  useEffect(() => {
    if (mainTab === 'history' && allAccounts.length > 0) fetchHistory();
  }, [mainTab, fetchHistory, allAccounts.length]);

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
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setDoneSubmitting(false);
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
  const effectiveTotalTxPages = selectedAccountType === 'treasury'
    ? txTotalPages
    : Math.ceil(sortedAllTxs.length / TX_PAGE_SIZE) || 1;
  // Treasury: API already returns exactly this page's items — no local slice needed
  const pagedTxs = selectedAccountType === 'treasury'
    ? sortedAllTxs
    : sortedAllTxs.slice(txPage * TX_PAGE_SIZE, (txPage + 1) * TX_PAGE_SIZE);
  // Group paged transactions by date for display headers
  const pagedGrouped = pagedTxs.reduce((acc, tx) => {
    const date = (tx.created_at || tx.date || '').split('T')[0] || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});
  const pagedDates = Object.keys(pagedGrouped).sort((a, b) => b.localeCompare(a));

  const handleTxPageChange = (newPage) => {
    setTxPage(newPage);
    if (selectedAccountType === 'treasury') {
      fetchTransactions(selectedAccountId, 'treasury', newPage);
    }
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
        <h1 className="text-2xl font-bold text-slate-800">Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-0.5">Per-account bank statement management</p>
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
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
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
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
                <div className="border-b border-slate-200 overflow-x-auto">
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
                              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
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
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Transactions</p>
                    <p className="text-2xl font-bold text-blue-700">{summary.txCount}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-300" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Statements</p>
                    <p className="text-2xl font-bold text-slate-700">{summary.uploaded}</p>
                  </div>
                  <Upload className="w-8 h-8 text-slate-300" />
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
              <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Statement Date</Label>
                  <Input
                    type="date"
                    value={statementDate}
                    onChange={e => setStatementDate(e.target.value)}
                    className="h-9 w-40"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-slate-500 mb-1 block">
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
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
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
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >{lbl}</button>
                          ))}
                        </div>
                      ) : 'Transactions'}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {selectedAccount?.type === 'exchanger' && exchInnerTab === 'settlements'
                          ? exchSettlements.length
                          : transactions.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* PSP: net pending settlement summary */}
                    {selectedAccount?.type === 'psp' && !txLoading && transactions.length > 0 && (() => {
                      const pending = transactions.filter(t => t.status !== 'settled');
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
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-orange-50/10 border-b border-orange-900/20">
                          <span className="text-xs font-semibold text-orange-400 shrink-0">Net Settlement</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 ml-auto items-center">
                            {currencies.map(s => (
                              <span key={s.currency} className={`text-xs font-bold ${(s.amount ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(s.amount ?? 0) >= 0 ? '+' : ''}{formatAmount(s.amount, s.currency)}
                                {s.usd_equivalent != null && s.currency !== 'USD' && (
                                  <span className="font-normal text-slate-500 ml-1">
                                    (≈ USD {Math.abs(s.usd_equivalent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                  </span>
                                )}
                              </span>
                            ))}
                            {pendingUsd != null && currencies.every(s => s.currency === 'USD') === false && (
                              <span className={`text-xs font-semibold border-l border-orange-900/30 pl-4 ${pendingUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                        <div className="text-center py-14 text-slate-400 text-sm">
                          No settlements found
                        </div>
                      ) : (
                        <ScrollArea className="h-[520px]">
                          {exchSettlements.map((s, i) => {
                            const statusColor = {
                              completed: 'bg-green-100 text-green-700',
                              approved:  'bg-blue-100 text-blue-700',
                              pending:   'bg-yellow-100 text-yellow-700',
                            }[s.status] || 'bg-slate-100 text-slate-500';
                            const net = s.net_amount_source ?? s.settlement_amount ?? 0;
                            const srcCur = s.source_currency || 'USD';
                            const dstCur = s.destination_currency || srcCur;
                            const settleAmt = s.settlement_amount ?? 0;
                            return (
                              <div key={s.settlement_id || i} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50/70">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-slate-700">
                                        {s.settlement_type === 'cash' ? '💵 Cash' : '🏦 Bank'} Settlement
                                      </span>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${statusColor}`}>
                                        {s.status}
                                      </span>
                                      {s.settlement_mode === 'custom' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">Partial</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {formatDate(s.settled_at || s.created_at)}
                                      {s.settlement_destination_name && (
                                        <span className="ml-2 text-slate-300">→ {s.settlement_destination_name}</span>
                                      )}
                                    </p>
                                    {s.notes && <p className="text-[11px] text-slate-400 mt-0.5 italic truncate">{s.notes}</p>}
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                                      {s.transaction_count > 0 && <span>{s.transaction_count} txns</span>}
                                      {s.commission_amount > 0 && <span className="text-red-500">Commission: -{formatAmount(s.commission_amount, srcCur)}</span>}
                                      {s.charges_amount > 0 && <span className="text-red-500">Charges: -{formatAmount(s.charges_amount, srcCur)}</span>}
                                      {s.exchange_rate && s.exchange_rate !== 1 && (
                                        <span className="text-slate-400">Rate: {s.exchange_rate}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0 ml-2">
                                    <span className="text-sm font-bold text-green-600">
                                      +{formatAmount(settleAmt, dstCur)}
                                    </span>
                                    {srcCur !== dstCur && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        Gross: {formatAmount(s.gross_amount, srcCur)}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">
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
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-14 text-slate-400 text-sm">
                        No transactions for this account
                      </div>
                    ) : (
                      <>
                      <ScrollArea className="h-[480px]">
                        {pagedDates.map(date => {
                          const txs = pagedGrouped[date];
                          const net = txs.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
                          return (
                            <div key={date}>
                              {/* Date group header */}
                              <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-y border-slate-100 sticky top-0 z-10">
                                <span className="text-xs font-semibold text-slate-500">
                                  {formatDate(date)}
                                </span>
                                {selectedAccountType !== 'treasury' && (
                                  <span className={`text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Net: {net >= 0 ? '+' : '-'}{formatAmount(net, selectedAccount?.currency)}
                                  </span>
                                )}
                              </div>
                              {txs.map((tx, i) => (
                                <div
                                  key={tx.transaction_id || i}
                                  className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50/80"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-800 truncate">
                                      {tx.reference || tx.client_name || 'Transaction'}
                                    </p>
                                    <p className="text-xs text-slate-400 capitalize">
                                      {tx.type || tx.transaction_type || 'transfer'}
                                    </p>
                                  </div>
                                  <span className={`text-sm font-semibold ml-3 shrink-0 ${(Number(tx.amount) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(Number(tx.amount) || 0) >= 0 ? '+' : '-'}
                                    {formatAmount(
                                      tx.base_amount ?? tx.amount,
                                      tx.base_currency || tx.currency || selectedAccount?.currency
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </ScrollArea>

                      {/* Pagination controls */}
                      {transactions.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/60">
                          <span className="text-xs text-slate-400">
                            {txPage * TX_PAGE_SIZE + 1}–{Math.min((txPage + 1) * TX_PAGE_SIZE, selectedAccountType === 'treasury' && txTotalFromApi != null ? txTotalFromApi : sortedAllTxs.length)} of {selectedAccountType === 'treasury' && txTotalFromApi != null ? txTotalFromApi : sortedAllTxs.length} transactions
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTxPageChange(0)}
                              disabled={txPage === 0}
                              className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >«</button>
                            <button
                              onClick={() => handleTxPageChange(Math.max(0, txPage - 1))}
                              disabled={txPage === 0}
                              className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                                  }`}
                                >{i + 1}</button>
                              ))}
                            <button
                              onClick={() => handleTxPageChange(Math.min(effectiveTotalTxPages - 1, txPage + 1))}
                              disabled={txPage === effectiveTotalTxPages - 1}
                              className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >Next ›</button>
                            <button
                              onClick={() => handleTxPageChange(effectiveTotalTxPages - 1)}
                              disabled={txPage === effectiveTotalTxPages - 1}
                              className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
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
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-slate-400" />
                      Uploaded Statements
                      <Badge variant="outline" className="ml-auto text-xs">{statements.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stmtLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : statements.length === 0 ? (
                      <div className="text-center py-14 text-slate-400 text-sm">
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
                              <TableRow key={stmt.statement_id} className="text-xs hover:bg-slate-50">
                                <TableCell>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span
                                      className="truncate max-w-[110px] text-slate-700"
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
                                        className="w-28 text-xs px-1 py-0.5 border border-slate-300 rounded"
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
                                        className="text-slate-400 hover:text-slate-600 p-0.5"
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
                                      className="text-slate-600 hover:text-blue-600 hover:underline"
                                    >
                                      {formatDate(stmt.statement_date)}
                                    </button>
                                  )}
                                </TableCell>
                                <TableCell className="text-slate-400">
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
                                      className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50/10"
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
            // Apply filters to historyRows
            let visibleRows = historyRows;
            if (historyTypeFilter !== 'all') visibleRows = visibleRows.filter(r => r.account_type === historyTypeFilter);
            if (historyStatusFilter !== 'all') visibleRows = visibleRows.filter(r => r.status === historyStatusFilter);
            if (historyDateFrom) visibleRows = visibleRows.filter(r => r.date >= historyDateFrom);
            if (historyDateTo)   visibleRows = visibleRows.filter(r => r.date <= historyDateTo);

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
                <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {/* Type filter */}
                  <div className="flex gap-1.5">
                    {['all', 'treasury', 'psp', 'exchanger'].map(t => (
                      <button
                        key={t}
                        onClick={() => setHistoryTypeFilter(t)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          historyTypeFilter === t
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
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
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {/* Date range */}
                  <div className="flex items-end gap-2 ml-auto">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">From</Label>
                      <Input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="h-8 w-32 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">To</Label>
                      <Input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="h-8 w-32 text-xs" />
                    </div>
                    {(historyDateFrom || historyDateTo) && (
                      <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-red-500 px-2"
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
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : visibleRows.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 border rounded-lg bg-slate-50/50">
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
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
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
                                <TableRow className="bg-slate-50/80">
                                  <TableHead className="text-xs py-2">Account</TableHead>
                                  <TableHead className="text-xs py-2">Type</TableHead>
                                  <TableHead className="text-xs py-2 text-right">Transactions</TableHead>
                                  <TableHead className="text-xs py-2 text-right">Net Amount</TableHead>
                                  <TableHead className="text-xs py-2">Statement</TableHead>
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
                                      <TableCell className="font-medium text-slate-800 py-2.5">
                                        {row.account_name}
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${tc?.color}`}>
                                          {tc && <tc.Icon className="w-3 h-3" />}
                                          {tc?.label}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right text-slate-600 py-2.5">
                                        {row.tx_count > 0 ? row.tx_count : '—'}
                                      </TableCell>
                                      <TableCell className={`text-right font-medium py-2.5 ${row.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.tx_count > 0
                                          ? `${row.net_amount >= 0 ? '+' : ''}${formatAmount(row.net_amount, row.currency)}`
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="py-2.5">
                                        {row.statement ? (
                                          <div className="flex items-center gap-1.5">
                                            <FileSpreadsheet className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span
                                              className="text-slate-600 truncate max-w-[120px] cursor-pointer hover:text-blue-600 hover:underline"
                                              title={row.statement.filename}
                                              onClick={() => setPreviewStatement(row.statement)}
                                            >
                                              {row.statement.filename}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic text-xs">No statement</span>
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
                                      <TableCell className="text-slate-400 py-2.5">
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
                  <div className="flex items-center justify-between px-2 py-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      Page {historyPage + 1} of {totalHistoryPages} ({sortedDates.length} date groups)
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setHistoryPage(0)} disabled={historyPage === 0} className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
                      <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0} className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">‹ Prev</button>
                      {Array.from({ length: totalHistoryPages }, (_, i) => i)
                        .filter(i => Math.abs(i - historyPage) <= 2)
                        .map(i => (
                          <button key={i} onClick={() => setHistoryPage(i)} className={`px-2.5 py-1 text-xs rounded border ${i === historyPage ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'}`}>{i + 1}</button>
                        ))}
                      <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1))} disabled={historyPage === totalHistoryPages - 1} className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">Next ›</button>
                      <button onClick={() => setHistoryPage(totalHistoryPages - 1)} disabled={historyPage === totalHistoryPages - 1} className="px-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
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
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
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
