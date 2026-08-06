import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
import PaginationControls from '../components/PaginationControls';
import { toast } from 'sonner';
import {
  Handshake,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fmtUsd = (n) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (s) =>
  s
    ? new Date(s).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '-';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
  <Card className="bg-card border shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === 'green' ? 'bg-green-100' : color === 'red' ? 'bg-red-100' : color === 'yellow' ? 'bg-yellow-100' : 'bg-primary/15'}`}>
          <Icon className={`w-5 h-5 ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-yellow-600' : 'text-primary'}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Partners() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [summary, setSummary] = useState(null);

  const [viewPartner, setViewPartner] = useState(null);
  const [txItems, setTxItems] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);
  const [txType, setTxType] = useState('all');
  const [txLoading, setTxLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/reports/partner-summary`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setPartners(d.partners || []);
        setSummary(d.summary || null);
      } else {
        toast.error('Failed to load partner summary');
      }
    } catch {
      toast.error('Failed to load partner summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fetchPartnerTransactions = useCallback(async (tagName, page, pageSize, type) => {
    setTxLoading(true);
    try {
      const qs = new URLSearchParams({
        client_tag: tagName, page: String(page), page_size: String(pageSize),
      });
      if (type && type !== 'all') qs.set('transaction_type', type);
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
  }, []);

  useEffect(() => {
    if (viewPartner) fetchPartnerTransactions(viewPartner.name, txPage, txPageSize, txType);
  }, [viewPartner, txPage, txPageSize, txType, fetchPartnerTransactions]);

  const openPartner = (p) => {
    setViewPartner(p);
    setTxPage(1);
    setTxType('all');
  };

  const closePartner = () => {
    setViewPartner(null);
    setTxItems([]);
    setTxTotal(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partners</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deposits, withdrawals, and transactions by partner (client tag)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Partners" value={summary?.total_partners ?? 0} icon={Users} color="blue" />
        <StatCard title="Total Deposits" value={fmtUsd(summary?.total_deposits_usd)} icon={ArrowUpRight} color="green" />
        <StatCard title="Total Withdrawals" value={fmtUsd(summary?.total_withdrawals_usd)} icon={ArrowDownRight} color="red" />
        <StatCard title="Net" value={fmtUsd(summary?.total_net)} icon={TrendingUp} color="blue" />
      </div>

      {partners.length === 0 ? (
        <Card className="bg-card border">
          <CardContent className="p-10 text-center text-muted-foreground">
            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No partners visible</p>
            <p className="text-sm mt-1">No client tags exist yet, or your role isn't granted access to any.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map((p) => (
            <Card
              key={p.tag_id}
              className="bg-card border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openPartner(p)}
              data-testid={`partner-card-${p.tag_id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#94a3b8' }} />
                    <span className="font-semibold text-foreground truncate">{p.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{p.transaction_count} txns</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposits</p>
                    <p className="text-sm font-mono font-semibold text-green-600">{fmtUsd(p.total_deposits_usd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawals</p>
                    <p className="text-sm font-mono font-semibold text-red-600">{fmtUsd(p.total_withdrawals_usd)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Net</span>
                  <span className={`text-sm font-mono font-semibold ${p.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtUsd(p.net)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Partner drill-down */}
      <Dialog open={!!viewPartner} onOpenChange={(open) => { if (!open) closePartner(); }}>
        <DialogContent className="bg-white border-border text-foreground max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: viewPartner?.color || '#94a3b8' }} />
              {viewPartner?.name}
            </DialogTitle>
          </DialogHeader>

          {viewPartner && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposits</p>
                  <p className="text-base font-mono font-semibold text-green-600">{fmtUsd(viewPartner.total_deposits_usd)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{viewPartner.deposit_count} txns</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawals</p>
                  <p className="text-base font-mono font-semibold text-red-600">{fmtUsd(viewPartner.total_withdrawals_usd)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{viewPartner.withdrawal_count} txns</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Net</p>
                  <p className={`text-base font-mono font-semibold ${viewPartner.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtUsd(viewPartner.net)}
                  </p>
                </div>
              </div>

              <Select value={txType} onValueChange={(v) => { setTxType(v); setTxPage(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs bg-white border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (USD)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : txItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions</TableCell>
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
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{tx.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
