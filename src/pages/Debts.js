import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  MoreVertical,
  Eye,
  CreditCard,
  Users,
  Store,
  Receipt,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];

export default function Debts() {
  const [activeTab, setActiveTab] = useState('receivables');
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [vendors, setExchangers] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [debtDetails, setDebtDetails] = useState(null);

  const [debtForm, setDebtForm] = useState({
    debt_type: 'receivable',
    party_type: 'other',
    party_id: '',
    party_name: '',
    amount: '',
    currency: 'USD',
    due_date: '',
    interest_rate: '0',
    description: '',
    reference: '',
    treasury_account_id: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    payment_date: new Date().toISOString().split('T')[0],
    treasury_account_id: '',
    reference: '',
    notes: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [debtsRes, summaryRes, clientsRes, vendorsRes, treasuryRes] = await Promise.all([
        fetch(`${API_URL}/api/debts`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/debts/summary/overview`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/clients?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/vendors?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' }),
      ]);

      if (debtsRes.ok) setDebts(await debtsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (clientsRes.ok) { const d = await clientsRes.json(); setClients(d.items || d); }
      if (vendorsRes.ok) {
        const vendorData = await vendorsRes.json();
        setExchangers(vendorData.items || (Array.isArray(vendorData) ? vendorData : []));
      }
      if (treasuryRes.ok) { const d = await treasuryRes.json(); setTreasuryAccounts(d.items || d); }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtDetails = async (debtId) => {
    try {
      const response = await fetch(`${API_URL}/api/debts/${debtId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        setDebtDetails(await response.json());
        setIsViewDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load debt details');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/debts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...debtForm,
          amount: parseFloat(debtForm.amount),
          interest_rate: parseFloat(debtForm.interest_rate || 0),
        }),
      });

      if (response.ok) {
        toast.success('Debt created successfully');
        setIsDebtDialogOpen(false);
        resetDebtForm();
        fetchData();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDebt) return;

    try {
      const response = await fetch(`${API_URL}/api/debts/${selectedDebt.debt_id}/payments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      if (response.ok) {
        toast.success('Payment recorded successfully');
        setIsPaymentDialogOpen(false);
        resetPaymentForm();
        setSelectedDebt(null);
        fetchData();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const resetDebtForm = () => {
    setDebtForm({
      debt_type: activeTab === 'receivables' ? 'receivable' : 'payable',
      party_type: 'other',
      party_id: '',
      party_name: '',
      amount: '',
      currency: 'USD',
      due_date: '',
      interest_rate: '0',
      description: '',
      reference: '',
      treasury_account_id: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      currency: 'USD',
      payment_date: new Date().toISOString().split('T')[0],
      treasury_account_id: '',
      reference: '',
      notes: '',
    });
  };

  const openPaymentDialog = (debt) => {
    setSelectedDebt(debt);
    setPaymentForm({
      ...paymentForm,
      currency: debt.currency,
      amount: (debt.outstanding_balance || 0).toString(),
    });
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending:        'bg-amber-100 text-amber-700 border-amber-200',
      partially_paid: 'bg-primary/15 text-primary border-primary/30',
      fully_paid:     'bg-emerald-100 text-emerald-700 border-emerald-200',
      overdue:        'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <Badge variant="outline" className={`${styles[status] || styles.pending} text-xs uppercase font-medium`}>
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredDebts = debts.filter((d) =>
    activeTab === 'receivables' ? d.debt_type === 'receivable' : d.debt_type === 'payable'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="debts-page">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Outstanding Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track receivables (debtors) and payables (creditors)</p>
        </div>

        <Dialog open={isDebtDialogOpen} onOpenChange={(open) => { setIsDebtDialogOpen(open); if (!open) resetDebtForm(); }}>
          <DialogTrigger asChild>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              data-testid="add-debt-btn"
              onClick={() => {
                setDebtForm({ ...debtForm, debt_type: activeTab === 'receivables' ? 'receivable' : 'payable' });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {activeTab === 'receivables' ? 'Receivable' : 'Payable'}
            </Button>
          </DialogTrigger>

          {/* ── Add Debt Dialog ── */}
          <DialogContent className="bg-card border text-foreground max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {debtForm.debt_type === 'receivable' ? 'Add Receivable (Debtor)' : 'Add Payable (Creditor)'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Party Type</Label>
                <Select
                  value={debtForm.party_type}
                  onValueChange={(value) => setDebtForm({ ...debtForm, party_type: value, party_id: '', party_name: '' })}
                >
                  <SelectTrigger className="bg-muted/50 border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="other">Other Party</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Exchanger</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {debtForm.party_type === 'client' && (
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Select Client</Label>
                  <Select
                    value={debtForm.party_id}
                    onValueChange={(value) => {
                      const client = clients.find((c) => c.client_id === value);
                      setDebtForm({
                        ...debtForm,
                        party_id: value,
                        party_name: client ? `${client.first_name} ${client.last_name}` : '',
                      });
                    }}
                  >
                    <SelectTrigger className="bg-muted/50 border text-foreground">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {clients.map((client) => (
                        <SelectItem key={client.client_id} value={client.client_id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {debtForm.party_type === 'vendor' && (
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Select Exchanger</Label>
                  <Select
                    value={debtForm.party_id}
                    onValueChange={(value) => {
                      const vendor = vendors.find((v) => v.vendor_id === value);
                      setDebtForm({
                        ...debtForm,
                        party_id: value,
                        party_name: vendor ? vendor.vendor_name : '',
                      });
                    }}
                  >
                    <SelectTrigger className="bg-muted/50 border text-foreground">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.vendor_id} value={vendor.vendor_id}>
                          {vendor.vendor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {debtForm.party_type === 'other' && (
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Party Name</Label>
                  <Input
                    value={debtForm.party_name}
                    onChange={(e) => setDebtForm({ ...debtForm, party_name: e.target.value })}
                    className="bg-muted/50 border text-foreground"
                    placeholder="Enter party name"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={debtForm.amount}
                    onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                    className="bg-muted/50 border text-foreground font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Currency</Label>
                  <Select value={debtForm.currency} onValueChange={(value) => setDebtForm({ ...debtForm, currency: value })}>
                    <SelectTrigger className="bg-muted/50 border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Due Date</Label>
                  <Input
                    type="date"
                    value={debtForm.due_date}
                    onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                    className="bg-muted/50 border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Interest Rate (%/year)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={debtForm.interest_rate}
                    onChange={(e) => setDebtForm({ ...debtForm, interest_rate: e.target.value })}
                    className="bg-muted/50 border text-foreground font-mono"
                    placeholder="e.g., 12 for 12%"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Reference</Label>
                <Input
                  value={debtForm.reference}
                  onChange={(e) => setDebtForm({ ...debtForm, reference: e.target.value })}
                  className="bg-muted/50 border text-foreground font-mono"
                  placeholder="Invoice #, Contract #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Description</Label>
                <Textarea
                  value={debtForm.description}
                  onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDebtDialogOpen(false)} className="border text-card-foreground">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Section ─────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Summary */}
          <Card className="bg-card border shadow-sm lg:col-span-2">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receivables</p>
                  <p className="text-xl font-bold font-mono text-emerald-600">${(summary.receivables?.outstanding || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.receivables?.count || 0} records</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payables</p>
                  <p className="text-xl font-bold font-mono text-red-600">${(summary.payables?.outstanding || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.payables?.count || 0} records</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Position</p>
                  <p className={`text-xl font-bold font-mono ${summary.net_position >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${Math.abs(summary.net_position || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.net_position >= 0 ? 'Net Receivable' : 'Net Payable'}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overdue</p>
                  <p className="text-xl font-bold font-mono text-amber-600">
                    ${((summary.receivables?.overdue_amount || 0) + (summary.payables?.overdue_amount || 0)).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(summary.receivables?.overdue_count || 0) + (summary.payables?.overdue_count || 0)} overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aging Summary */}
          {summary?.aging && (
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Aging Summary
                </p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Current</span>
                    <span className="text-sm font-mono font-semibold text-emerald-600">${(summary.aging.current || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">1–30 Days</span>
                    <span className="text-sm font-mono font-semibold text-amber-600">${(summary.aging.days_1_30 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">31–60 Days</span>
                    <span className="text-sm font-mono font-semibold text-orange-600">${(summary.aging.days_31_60 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">61–90 Days</span>
                    <span className="text-sm font-mono font-semibold text-red-500">${(summary.aging.days_61_90 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border/60 pt-2">
                    <span className="text-xs text-muted-foreground">90+ Days</span>
                    <span className="text-sm font-mono font-bold text-red-600">${(summary.aging.days_over_90 || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted border border">
          <TabsTrigger
            value="receivables"
            className="data-[state=active]:bg-card data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Receivables (Debtors)
          </TabsTrigger>
          <TabsTrigger
            value="payables"
            className="data-[state=active]:bg-card data-[state=active]:text-red-700 data-[state=active]:shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Payables (Creditors)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border/60 hover:bg-transparent bg-muted/50">
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Party</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Paid</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Outstanding</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Interest</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Due Date</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                      <TableHead className="text-muted-foreground font-semibold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No {activeTab === 'receivables' ? 'receivables' : 'payables'} found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDebts.map((debt) => (
                        <TableRow key={debt.debt_id} className="border/60 hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="text-foreground font-medium">{debt.party_name}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                {debt.party_type === 'client' && <Users className="w-3 h-3" />}
                                {debt.party_type === 'vendor' && <Store className="w-3 h-3" />}
                                <span className="capitalize">{debt.party_type}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-foreground font-mono font-medium">{debt.amount?.toLocaleString()} {debt.currency}</p>
                            <p className="text-xs text-muted-foreground">≈ ${debt.amount_usd?.toLocaleString()} USD</p>
                          </TableCell>
                          <TableCell className="text-emerald-600 font-mono font-medium">
                            {(debt.total_paid || 0).toLocaleString()} {debt.currency}
                          </TableCell>
                          <TableCell className="text-foreground font-mono font-bold">
                            {(debt.outstanding_balance || 0).toLocaleString()} {debt.currency}
                          </TableCell>
                          <TableCell>
                            {debt.accrued_interest > 0 ? (
                              <div>
                                <p className="text-amber-600 font-mono font-medium">${debt.accrued_interest?.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{debt.interest_rate}%/yr</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-card-foreground">{debt.due_date?.split('T')[0]}</p>
                              {debt.days_overdue > 0 && (
                                <p className="text-xs text-red-500 font-medium">{debt.days_overdue}d overdue</p>
                              )}
                              {debt.days_until_due > 0 && (
                                <p className="text-xs text-muted-foreground">{debt.days_until_due}d left</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(debt.calculated_status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-card-foreground hover:bg-muted">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border shadow-md">
                                <DropdownMenuItem onClick={() => fetchDebtDetails(debt.debt_id)} className="text-card-foreground hover:bg-muted/50 cursor-pointer">
                                  <Eye className="w-4 h-4 mr-2 text-muted-foreground" /> View Details
                                </DropdownMenuItem>
                                {debt.calculated_status !== 'fully_paid' && (
                                  <DropdownMenuItem onClick={() => openPaymentDialog(debt)} className="text-emerald-700 hover:bg-emerald-50 cursor-pointer">
                                    <CreditCard className="w-4 h-4 mr-2" /> Record Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Payment Dialog ───────────────────────────────────────────────── */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if (!open) { resetPaymentForm(); setSelectedDebt(null); } }}>
        <DialogContent className="bg-card border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Record Payment</DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg border border/60">
                <p className="text-sm text-muted-foreground">Party: <span className="text-foreground font-medium">{selectedDebt.party_name}</span></p>
                <p className="text-sm text-muted-foreground mt-1">Outstanding: <span className="text-foreground font-mono font-semibold">{selectedDebt.outstanding_balance?.toLocaleString()} {selectedDebt.currency}</span></p>
                {selectedDebt.accrued_interest > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">+ Interest: <span className="text-amber-600 font-mono font-semibold">${selectedDebt.accrued_interest?.toLocaleString()}</span></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="bg-muted/50 border text-foreground font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Currency</Label>
                  <Select value={paymentForm.currency} onValueChange={(value) => setPaymentForm({ ...paymentForm, currency: value })}>
                    <SelectTrigger className="bg-muted/50 border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Treasury Account</Label>
                <Select
                  value={paymentForm.treasury_account_id}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, treasury_account_id: value })}
                  required
                >
                  <SelectTrigger className="bg-muted/50 border text-foreground">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    {treasuryAccounts.map((acc) => (
                      <SelectItem key={acc.account_id} value={acc.account_id}>
                        {acc.account_name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Reference</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="bg-muted/50 border text-foreground font-mono"
                  placeholder="Payment reference"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground text-xs font-semibold uppercase tracking-wider">Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="bg-muted/50 border text-foreground"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="border text-card-foreground">
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Record Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ──────────────────────────────────────────── */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setDebtDetails(null); }}>
        <DialogContent className="bg-card border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Debt Details</DialogTitle>
          </DialogHeader>
          {debtDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Party</p>
                  <p className="text-foreground font-semibold">{debtDetails.party_name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{debtDetails.party_type}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Type</p>
                  <p className={`font-semibold ${debtDetails.debt_type === 'receivable' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {debtDetails.debt_type === 'receivable' ? 'Receivable (Debtor)' : 'Payable (Creditor)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Original Amount</p>
                  <p className="text-lg font-mono font-bold text-foreground">{debtDetails.amount?.toLocaleString()} {debtDetails.currency}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Total Paid</p>
                  <p className="text-lg font-mono font-bold text-emerald-700">{debtDetails.total_paid?.toLocaleString()} {debtDetails.currency}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Outstanding</p>
                  <p className="text-lg font-mono font-bold text-indigo-700">{debtDetails.outstanding_balance?.toLocaleString()} {debtDetails.currency}</p>
                </div>
              </div>

              {debtDetails.accrued_interest > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-amber-700 uppercase font-semibold">Accrued Interest</p>
                  </div>
                  <p className="text-lg font-mono font-bold text-amber-700">${debtDetails.accrued_interest?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{debtDetails.interest_rate}% annual rate · {debtDetails.days_overdue} days overdue</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Due Date</p>
                  <p className="text-foreground font-medium">{debtDetails.due_date?.split('T')[0]}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Status</p>
                  {getStatusBadge(debtDetails.calculated_status)}
                </div>
              </div>

              {debtDetails.description && (
                <div className="p-3 bg-muted/50 rounded-lg border border/60">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Description</p>
                  <p className="text-card-foreground">{debtDetails.description}</p>
                </div>
              )}

              {/* Payment History */}
              {debtDetails.payments && debtDetails.payments.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Payment History</p>
                  <div className="space-y-2">
                    {debtDetails.payments.map((payment) => (
                      <div key={payment.payment_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border/60">
                        <div>
                          <p className="text-foreground font-mono font-semibold">{payment.amount?.toLocaleString()} {payment.currency}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{payment.payment_date?.split('T')[0]} · {payment.treasury_account_name}</p>
                        </div>
                        {payment.reference && (
                          <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">{payment.reference}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
