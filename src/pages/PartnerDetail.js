import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [txType, setTxType] = useState('all');
  const [txLoading, setTxLoading] = useState(false);

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

  const fetchTransactions = useCallback(async (tagName, page, pageSize, type) => {
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
    if (partner) fetchTransactions(partner.name, txPage, txPageSize, txType);
  }, [partner, txPage, txPageSize, txType, fetchTransactions]);

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
        <TabsList className="bg-muted/50 border">
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
          <Select value={txType} onValueChange={(v) => { setTxType(v); setTxPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-xs bg-muted/50 border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
            </SelectContent>
          </Select>

          <div className="border rounded-lg overflow-hidden">
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
                  <p className="font-medium text-foreground">No transactions for {partner.name} yet</p>
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
