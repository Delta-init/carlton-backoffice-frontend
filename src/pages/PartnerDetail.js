import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import PaginationControls from '../components/PaginationControls';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { usePermissions } from '../context/usePermissions';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Landmark,
  Wallet,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];

const fmtUsd = (n) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtAmount = (n, currency) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`.trim();

const formatDate = (s) =>
  s
    ? new Date(s).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '-';

const emptyForm = { account_name: '', bank_name: '', account_number: '', currency: 'USD', balance: '0', description: '' };

export default function PartnerDetail() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const { canView, canCreate, canEdit, canDelete } = usePermissions();
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

  // Treasury tab
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [treasuryTotal, setTreasuryTotal] = useState(0);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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
        setTreasuryAccounts(d.items || []);
        setTreasuryTotal(d.total_balance || 0);
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

  const openCreate = () => {
    setEditingAccount(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      currency: account.currency,
      balance: String(account.balance ?? 0),
      description: account.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingAccount
        ? `${API_URL}/api/partner-treasury/${editingAccount.account_id}`
        : `${API_URL}/api/partner-treasury`;
      const method = editingAccount ? 'PUT' : 'POST';
      const payload = { ...formData, balance: parseFloat(formData.balance) || 0 };
      if (!editingAccount) payload.tag_id = tagId;

      const r = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        toast.success(editingAccount ? 'Account updated' : 'Account created');
        setIsDialogOpen(false);
        fetchTreasury();
      } else {
        toast.error(await getApiError(r));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Delete this account? This only removes it from the partner treasury, not any real accounts.')) return;
    try {
      const r = await fetch(`${API_URL}/api/partner-treasury/${accountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (r.ok) {
        toast.success('Account deleted');
        fetchTreasury();
      } else {
        toast.error(await getApiError(r));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
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
          <TabsContent value="treasury" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Partner Treasury</p>
                <p className="text-xs text-muted-foreground mt-0.5">This partner's own accounts - separate from the company Treasury, no shared balance.</p>
              </div>
              {canCreate('partner_treasury') && (
                <Button onClick={openCreate} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider text-xs" data-testid="add-partner-treasury-account">
                  <Plus className="w-4 h-4 mr-2" /> Add Account
                </Button>
              )}
            </div>

            {treasuryLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : treasuryAccounts.length === 0 ? (
              <Card className="bg-card border">
                <CardContent className="p-10 text-center text-muted-foreground">
                  <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-foreground">No treasury accounts for {partner.name} yet</p>
                  {canCreate('partner_treasury') && <p className="text-sm mt-1">Click "Add Account" to create one</p>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treasuryAccounts.map((account) => (
                  <Card key={account.account_id} className="bg-card border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{account.account_name}</p>
                          <p className="text-xs text-muted-foreground">{account.bank_name || 'N/A'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {canEdit('partner_treasury') && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(account)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canDelete('partner_treasury') && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(account.account_id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Balance</span>
                        <span className="text-lg font-mono font-bold text-foreground">{fmtAmount(account.balance, account.currency)}</span>
                      </div>
                      {account.account_number && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Account: <span className="font-mono text-foreground">{account.account_number}</span>
                        </p>
                      )}
                      {account.description && (
                        <p className="text-xs text-muted-foreground mt-1">{account.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Add / Edit partner treasury account */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingAccount ? 'Edit Account' : 'Add Partner Treasury Account'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Account Name</Label>
              <Input
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="bg-muted/50 border text-foreground"
                data-testid="ptreasury-account-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="bg-muted/50 border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                  data-testid="ptreasury-balance"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-muted/50 border text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border text-muted-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider" data-testid="save-ptreasury-btn">
                {submitting ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
