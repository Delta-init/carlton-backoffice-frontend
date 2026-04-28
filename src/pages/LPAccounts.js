import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Edit,
  Download,
  BarChart3,
  History,
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calculator,
  Calendar,
  Upload,
  Trash2,
  Save,
  Mail,
  Send,
} from 'lucide-react';

import PaginationControls from '../components/PaginationControls';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'USDT'];

export default function LPAccounts() {
  const { user } = useAuth();
  const [lpAccounts, setLPAccounts] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [mainTab, setMainTab] = useState('dashboard');
  
  // Dialogs
  const [isAddLPOpen, setIsAddLPOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [selectedLP, setSelectedLP] = useState(null);
  const [lpTransactions, setLPTransactions] = useState([]);
  
  // Forms
  const [lpForm, setLPForm] = useState({
    lp_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
    currency: 'USD',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });
  
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    currency: 'USD',
    treasury_account_id: '',
    reference: '',
    notes: '',
  });

  // Dealing P&L State
  const [dealingPnLRecords, setDealingPnLRecords] = useState([]);
  const [dealingPnLSummary, setDealingPnLSummary] = useState(null);
  const [dealingPnLLoading, setDealingPnLLoading] = useState(false);
  const [isDealingFormOpen, setIsDealingFormOpen] = useState(false);
  const [dealingForm, setDealingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    mt5_booked_pnl: '',
    mt5_floating_pnl: '',
    lp_entries: [], // Array of {lp_id, lp_name, booked_pnl, floating_pnl}
    notes: '',
  });
  const [savingDealingPnL, setSavingDealingPnL] = useState(false);

  const isAdmin = user?.role === 'admin';
  const canManage = ['admin', 'accountant'].includes(user?.role);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchLPAccounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/lp?page=${currentPage}&page_size=${pageSize}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLPAccounts(data.items || data);
        setTotalPages(data.total_pages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching LP accounts:', error);
      toast.error('Failed to load LP accounts');
    }
  }, [currentPage, pageSize]);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/lp/dashboard`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setDashboard(await response.json());
      }
    } catch (error) {
      console.error('Error fetching LP dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const accounts = data.items || data;
        setTreasuryAccounts(accounts.filter(a => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchLPTransactions = async (lpId) => {
    try {
      const response = await fetch(`${API_URL}/api/lp/${lpId}/transactions`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLPTransactions(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error('Error fetching LP transactions:', error);
    }
  };

  const fetchDealingPnL = async () => {
    setDealingPnLLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/dealing-pnl?limit=30`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`${API_URL}/api/dealing-pnl/summary?days=30`, { headers: getAuthHeaders(), credentials: 'include' }),
      ]);
      if (recordsRes.ok) {
        setDealingPnLRecords(await recordsRes.json());
      }
      if (summaryRes.ok) {
        setDealingPnLSummary(await summaryRes.json());
      }
    } catch (error) {
      console.error('Error fetching dealing P&L:', error);
    } finally {
      setDealingPnLLoading(false);
    }
  };

  const handleSaveDealingPnL = async () => {
    if (!dealingForm.date) {
      toast.error('Date is required');
      return;
    }
    
    setSavingDealingPnL(true);
    try {
      // Process LP entries - filter out empty ones and convert to numbers
      const lp_entries = dealingForm.lp_entries
        .filter(e => e.lp_id && (e.booked_pnl || e.floating_pnl))
        .map(e => ({
          lp_id: e.lp_id,
          lp_name: e.lp_name,
          booked_pnl: parseFloat(e.booked_pnl) || 0,
          floating_pnl: parseFloat(e.floating_pnl) || 0,
        }));
      
      const response = await fetch(`${API_URL}/api/dealing-pnl`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          date: dealingForm.date,
          mt5_booked_pnl: parseFloat(dealingForm.mt5_booked_pnl) || 0,
          mt5_floating_pnl: parseFloat(dealingForm.mt5_floating_pnl) || 0,
          lp_entries: lp_entries,
          notes: dealingForm.notes,
        }),
      });
      
      if (response.ok) {
        toast.success('Dealing P&L saved');
        setIsDealingFormOpen(false);
        resetDealingForm();
        fetchDealingPnL();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSavingDealingPnL(false);
    }
  };

  const resetDealingForm = () => {
    // Initialize LP entries from existing LP accounts
    const initialLPEntries = lpAccounts.map(lp => ({
      lp_id: lp.lp_id,
      lp_name: lp.lp_name,
      booked_pnl: '',
      floating_pnl: '',
    }));
    
    setDealingForm({
      date: new Date().toISOString().split('T')[0],
      mt5_booked_pnl: '',
      mt5_floating_pnl: '',
      lp_entries: initialLPEntries,
      notes: '',
    });
  };

  const updateLPEntry = (lpId, field, value) => {
    setDealingForm(prev => ({
      ...prev,
      lp_entries: prev.lp_entries.map(e => 
        e.lp_id === lpId ? { ...e, [field]: value } : e
      ),
    }));
  };

  const handleDeleteDealingPnL = async (date) => {
    if (!window.confirm(`Delete dealing P&L record for ${date}?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/dealing-pnl/${date}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Record deleted');
        fetchDealingPnL();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleSendDealingEmail = async (date) => {
    if (!window.confirm(`Send Dealing P&L email for ${date} to directors?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/dealing-pnl/${date}/send-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Email sent to ${data.recipients?.length || 0} directors`);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  useEffect(() => {
    fetchLPAccounts();
    fetchDashboard();
    fetchTreasuryAccounts();
  }, [fetchLPAccounts, fetchDashboard]);

  const handleCreateLP = async () => {
    if (!lpForm.lp_name) {
      toast.error('LP name is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/lp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(lpForm),
      });
      
      if (response.ok) {
        toast.success('LP account created');
        setIsAddLPOpen(false);
        resetLPForm();
        fetchLPAccounts();
        fetchDashboard();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleUpdateLP = async () => {
    if (!selectedLP) return;
    
    try {
      const response = await fetch(`${API_URL}/api/lp/${selectedLP.lp_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(lpForm),
      });
      
      if (response.ok) {
        toast.success('LP account updated');
        setIsEditOpen(false);
        fetchLPAccounts();
        fetchDashboard();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleDeposit = async () => {
    if (!selectedLP || !transactionForm.amount) {
      toast.error('Amount is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/lp/${selectedLP.lp_id}/deposit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          transaction_type: 'deposit',
        }),
      });
      
      if (response.ok) {
        toast.success('Deposit recorded');
        setIsDepositOpen(false);
        resetTransactionForm();
        fetchLPAccounts();
        fetchDashboard();
        if (isDetailOpen) fetchLPTransactions(selectedLP.lp_id);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    if (!selectedLP || !transactionForm.amount) {
      toast.error('Amount is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/lp/${selectedLP.lp_id}/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          transaction_type: 'withdrawal',
        }),
      });
      
      if (response.ok) {
        toast.success('Withdrawal recorded');
        setIsWithdrawOpen(false);
        resetTransactionForm();
        fetchLPAccounts();
        fetchDashboard();
        if (isDetailOpen) fetchLPTransactions(selectedLP.lp_id);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/lp/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lp_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('LP data exported');
      }
    } catch (err) { toast.error(err?.message || "Something went wrong. Please try again."); }
  };

  const openLPDetail = async (lp) => {
    setSelectedLP(lp);
    await fetchLPTransactions(lp.lp_id);
    setIsDetailOpen(true);
  };

  const openEditLP = (lp) => {
    setSelectedLP(lp);
    setLPForm({
      lp_name: lp.lp_name || '',
      account_number: lp.account_number || '',
      bank_name: lp.bank_name || '',
      swift_code: lp.swift_code || '',
      currency: lp.currency || 'USD',
      contact_person: lp.contact_person || '',
      contact_email: lp.contact_email || '',
      contact_phone: lp.contact_phone || '',
      notes: lp.notes || '',
    });
    setIsEditOpen(true);
  };

  const openDeposit = (lp) => {
    setSelectedLP(lp);
    setTransactionForm({ ...transactionForm, currency: lp.currency || 'USD' });
    setIsDepositOpen(true);
  };

  const openWithdraw = (lp) => {
    setSelectedLP(lp);
    setTransactionForm({ ...transactionForm, currency: lp.currency || 'USD' });
    setIsWithdrawOpen(true);
  };

  const resetLPForm = () => {
    setLPForm({
      lp_name: '',
      account_number: '',
      bank_name: '',
      swift_code: '',
      currency: 'USD',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      notes: '',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      amount: '',
      currency: 'USD',
      treasury_account_id: '',
      reference: '',
      notes: '',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount === null || amount === undefined) return '-';
    return `${currency === 'USD' ? '$' : ''}${amount.toLocaleString()}${currency !== 'USD' ? ` ${currency}` : ''}`;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="lp-accounts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            LP Management
          </h1>
          <p className="text-muted-foreground">Manage Liquidity Provider accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border text-muted-foreground hover:bg-muted font-bold uppercase tracking-wider rounded-sm"
            data-testid="export-lp-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {canManage && (
            <Button
              onClick={() => setIsAddLPOpen(true)}
              className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
              data-testid="add-lp-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New LP
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); if (v === 'dealing') fetchDealingPnL(); }} className="w-full">
        <TabsList className="bg-card border border mb-4">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Landmark className="w-4 h-4 mr-2" /> LP Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <History className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="dealing" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-600">
            <Calculator className="w-4 h-4 mr-2" /> Dealing P&L
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dashboard ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Balance</p>
                        <p className="text-xl font-bold font-mono text-foreground">${dashboard.total_balance?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-primary/80/10 rounded-sm">
                        <Wallet className="w-5 h-5 text-primary/60" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Deposits</p>
                        <p className="text-xl font-bold font-mono text-green-500">${dashboard.total_deposits?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-sm">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Withdrawals</p>
                        <p className="text-xl font-bold font-mono text-red-400">${dashboard.total_withdrawals?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-red-500/10 rounded-sm">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Active LPs</p>
                        <p className="text-xl font-bold font-mono text-foreground">{dashboard.active_lp_count} / {dashboard.total_lp_count}</p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-sm">
                        <Landmark className="w-5 h-5 text-cyan-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* LP Accounts Overview */}
              <Card className="bg-card border">
                <CardContent className="p-0">
                  <div className="p-4 border-b border">
                    <h3 className="font-bold uppercase tracking-wider text-card-foreground">LP Accounts Overview</h3>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border hover:bg-transparent">
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">LP Name</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Currency</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Balance</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Deposits</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Withdrawals</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.accounts?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No LP accounts found
                            </TableCell>
                          </TableRow>
                        ) : (
                          dashboard.accounts?.map((lp) => (
                            <TableRow key={lp.lp_id} className="border hover:bg-muted">
                              <TableCell className="font-medium text-foreground">{lp.lp_name}</TableCell>
                              <TableCell className="text-card-foreground">{lp.currency}</TableCell>
                              <TableCell className="text-right font-mono text-primary font-semibold">
                                {formatCurrency(lp.balance, lp.currency)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-500">
                                {formatCurrency(lp.total_deposits, lp.currency)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-400">
                                {formatCurrency(lp.total_withdrawals, lp.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge className={lp.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'}>
                                  {lp.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* LP Accounts Tab */}
        <TabsContent value="accounts">
          <Card className="bg-card border">
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">LP Name</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Bank Details</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Currency</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Net Balance</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Status</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lpAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Landmark className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                          <p className="text-muted-foreground">No LP accounts found</p>
                          <p className="text-sm text-muted-foreground">Click "New LP" to add your first liquidity provider</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      lpAccounts.map((lp) => (
                        <TableRow key={lp.lp_id} className="border hover:bg-muted">
                          <TableCell>
                            <div className="font-medium text-foreground">{lp.lp_name}</div>
                            {lp.contact_person && <div className="text-xs text-muted-foreground">{lp.contact_person}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="text-card-foreground text-sm">{lp.bank_name || '-'}</div>
                            {lp.account_number && <div className="text-xs text-muted-foreground">{lp.account_number}</div>}
                          </TableCell>
                          <TableCell className="text-card-foreground">{lp.currency}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-primary font-semibold text-lg">
                              {formatCurrency(lp.balance, lp.currency)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={lp.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'}>
                              {lp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLPDetail(lp)}
                                className="text-primary hover:text-primary hover:bg-primary/15 h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canManage && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeposit(lp)}
                                    className="text-green-500 hover:text-green-500 hover:bg-green-100 h-8 w-8 p-0"
                                    title="Deposit to LP"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openWithdraw(lp)}
                                    className="text-red-400 hover:text-red-400 hover:bg-red-100 h-8 w-8 p-0"
                                    title="Withdraw from LP"
                                  >
                                    <ArrowDownRight className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditLP(lp)}
                                    className="text-muted-foreground hover:text-card-foreground hover:bg-muted h-8 w-8 p-0"
                                    title="Edit LP"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="bg-card border">
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Date</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">LP Name</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Type</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Treasury</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard?.recent_transactions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      dashboard?.recent_transactions?.map((tx) => (
                        <TableRow key={tx.lp_transaction_id} className="border hover:bg-muted">
                          <TableCell className="text-card-foreground text-sm">{formatDate(tx.created_at)}</TableCell>
                          <TableCell className="font-medium text-foreground">{tx.lp_name}</TableCell>
                          <TableCell>
                            <Badge className={tx.transaction_type === 'deposit' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                              {tx.transaction_type === 'deposit' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                              {tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium ${tx.transaction_type === 'deposit' ? 'text-green-500' : 'text-red-400'}`}>
                            {tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">{tx.reference || '-'}</TableCell>
                          <TableCell className="text-card-foreground text-sm">{tx.treasury_name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{tx.created_by_name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dealing P&L Tab */}
        <TabsContent value="dealing">
          {dealingPnLLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              {dealingPnLSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-card border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Dealing P&L (30d)</p>
                          <p className={`text-2xl font-bold font-mono ${dealingPnLSummary.total_dealing_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {dealingPnLSummary.total_dealing_pnl >= 0 ? '+' : ''}{dealingPnLSummary.total_dealing_pnl?.toLocaleString()} USD
                          </p>
                        </div>
                        <Calculator className={`w-8 h-8 ${dealingPnLSummary.total_dealing_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Profitable Days</p>
                      <p className="text-2xl font-bold text-green-500">{dealingPnLSummary.profitable_days}</p>
                      <p className="text-xs text-muted-foreground">out of {dealingPnLSummary.record_count} records</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Loss Days</p>
                      <p className="text-2xl font-bold text-red-500">{dealingPnLSummary.loss_days}</p>
                      <p className="text-xs text-muted-foreground">out of {dealingPnLSummary.record_count} records</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Day</p>
                      {dealingPnLSummary.best_day ? (
                        <>
                          <p className="text-lg font-bold text-green-500 font-mono">+{dealingPnLSummary.best_day.pnl?.toLocaleString()} USD</p>
                          <p className="text-xs text-muted-foreground">{dealingPnLSummary.best_day.date}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">-</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Add Record Button */}
              <div className="flex justify-end">
                {canManage && (
                  <Button
                    onClick={() => {
                      resetDealingForm();
                      setIsDealingFormOpen(true);
                    }}
                    className="bg-green-500 text-white hover:bg-green-600 font-bold uppercase tracking-wider rounded-sm"
                    data-testid="add-dealing-pnl-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Daily P&L
                  </Button>
                )}
              </div>

              {/* Records Table */}
              <Card className="bg-card border">
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="border">
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase">Date</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">MT5 Booked</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">MT5 Floating</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">MT5 P&L</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">LP Summary</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">LP P&L</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">Total Dealing</TableHead>
                          <TableHead className="text-muted-foreground font-bold text-xs uppercase text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dealingPnLRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No dealing P&L records. Add your first daily record.
                            </TableCell>
                          </TableRow>
                        ) : (
                          dealingPnLRecords.map((record) => (
                            <React.Fragment key={record.date}>
                              <TableRow className="border hover:bg-muted/50" data-testid={`dealing-row-${record.date}`}>
                                <TableCell className="font-medium text-foreground">{record.date}</TableCell>
                                <TableCell className={`text-right font-mono ${record.mt5_booked_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {record.mt5_booked_pnl >= 0 ? '+' : ''}{record.mt5_booked_pnl?.toLocaleString()}
                                </TableCell>
                                <TableCell className={`text-right font-mono ${record.mt5_floating_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {record.mt5_floating_pnl >= 0 ? '+' : ''}{record.mt5_floating_pnl?.toLocaleString()}
                                  <span className="text-xs text-muted-foreground block">
                                    Δ {record.mt5_floating_change >= 0 ? '+' : ''}{record.mt5_floating_change?.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold ${record.broker_mt5_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {record.broker_mt5_pnl >= 0 ? '+' : ''}{record.broker_mt5_pnl?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {record.lp_entries?.length || 0} LPs
                                  </div>
                                  <div className={`font-mono text-sm ${(record.total_lp_booked || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    B: {(record.total_lp_booked || 0) >= 0 ? '+' : ''}{(record.total_lp_booked || 0)?.toLocaleString()}
                                  </div>
                                  <div className={`font-mono text-sm ${(record.total_lp_floating || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    F: {(record.total_lp_floating || 0) >= 0 ? '+' : ''}{(record.total_lp_floating || 0)?.toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold ${record.broker_lp_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {record.broker_lp_pnl >= 0 ? '+' : ''}{record.broker_lp_pnl?.toLocaleString()}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold text-lg ${record.total_dealing_pnl >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                  {record.total_dealing_pnl >= 0 ? '+' : ''}{record.total_dealing_pnl?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {canManage && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSendDealingEmail(record.date)}
                                        className="text-primary/80 hover:text-primary hover:bg-primary/10"
                                        data-testid={`email-dealing-${record.date}`}
                                        title="Send email to directors"
                                      >
                                        <Mail className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteDealingPnL(record.date)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`delete-dealing-${record.date}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {/* LP Breakdown Row */}
                              {record.lp_entries?.length > 0 && (
                                <TableRow className="bg-green-50/50 border/60">
                                  <TableCell colSpan={8} className="py-2 px-4">
                                    <div className="flex flex-wrap gap-3">
                                      {record.lp_entries.map((lp) => (
                                        <div key={lp.lp_id} className="bg-card p-2 rounded border border-green-200 text-xs min-w-[140px]">
                                          <div className="font-medium text-green-700 mb-1">{lp.lp_name || lp.lp_id}</div>
                                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                                            <div>
                                              <span className="text-muted-foreground">Booked:</span>
                                              <span className={`ml-1 font-mono ${lp.booked_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {lp.booked_pnl >= 0 ? '+' : ''}{lp.booked_pnl?.toLocaleString()}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Float:</span>
                                              <span className={`ml-1 font-mono ${lp.floating_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {lp.floating_pnl >= 0 ? '+' : ''}{lp.floating_pnl?.toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-muted-foreground">P&L:</span>
                                              <span className={`ml-1 font-mono font-bold ${lp.lp_pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                {lp.lp_pnl >= 0 ? '+' : ''}{lp.lp_pnl?.toLocaleString()}
                                              </span>
                                              <span className="text-muted-foreground ml-1">(Δ{lp.floating_change >= 0 ? '+' : ''}{lp.floating_change?.toLocaleString()})</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Calculation Explanation */}
              <Card className="bg-muted/50 border">
                <CardContent className="p-4">
                  <h4 className="font-bold text-card-foreground mb-2">How Dealing P&L is Calculated:</h4>
                  <div className="text-sm text-card-foreground space-y-1">
                    <p><strong>MT5 Broker P&L</strong> = -(Client Booked P&L) - (Change in Client Floating)</p>
                    <p><strong>LP P&L</strong> = (LP Booked P&L) + (Change in LP Floating)</p>
                    <p><strong>Total Dealing P&L</strong> = MT5 Broker P&L + LP P&L</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      * Positive client booked P&L means clients profited, which is a loss for the broker.
                      <br />* Increase in client floating loss (more negative) is a gain for the broker.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }} />

      {/* Add Dealing P&L Dialog */}
      <Dialog open={isDealingFormOpen} onOpenChange={setIsDealingFormOpen}>
        <DialogContent className="bg-card border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-green-600">
              <Calculator className="w-6 h-6 inline mr-2" />
              Add Daily Dealing P&L
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Date */}
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Date *</Label>
              <Input
                type="date"
                value={dealingForm.date}
                onChange={(e) => setDealingForm({ ...dealingForm, date: e.target.value })}
                className="bg-muted/50 border text-foreground"
                data-testid="dealing-date"
              />
            </div>

            {/* MT5 Section */}
            <div className="p-3 bg-primary/10 rounded-md border border-primary/30">
              <h4 className="font-bold text-primary mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                MT5 Client Data
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-primary text-xs uppercase">Booked P&L</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={dealingForm.mt5_booked_pnl}
                    onChange={(e) => setDealingForm({ ...dealingForm, mt5_booked_pnl: e.target.value })}
                    className="bg-card border-primary/30 text-foreground font-mono"
                    placeholder="e.g. 50000 or -30000"
                    data-testid="dealing-mt5-booked"
                  />
                  <p className="text-xs text-primary/80 mt-1">Client profits/losses today</p>
                </div>
                <div>
                  <Label className="text-primary text-xs uppercase">Running Floating</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={dealingForm.mt5_floating_pnl}
                    onChange={(e) => setDealingForm({ ...dealingForm, mt5_floating_pnl: e.target.value })}
                    className="bg-card border-primary/30 text-foreground font-mono"
                    placeholder="e.g. -100000"
                    data-testid="dealing-mt5-floating"
                  />
                  <p className="text-xs text-primary/80 mt-1">Current open positions P&L</p>
                </div>
              </div>
            </div>

            {/* LP Section - Multiple LPs */}
            <div className="p-3 bg-green-50 rounded-md border border-green-200 max-h-[300px] overflow-y-auto">
              <h4 className="font-bold text-green-700 mb-3 flex items-center sticky top-0 bg-green-50 pb-2">
                <Landmark className="w-4 h-4 mr-2" />
                LP Hedging Data ({dealingForm.lp_entries?.length || 0} LPs)
              </h4>
              
              {dealingForm.lp_entries?.length === 0 ? (
                <div className="text-center py-4 text-green-600">
                  <p className="text-sm">No LP accounts found.</p>
                  <p className="text-xs text-green-500">Add LP accounts in the "LP Accounts" tab first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dealingForm.lp_entries?.map((lpEntry, idx) => (
                    <div key={lpEntry.lp_id} className="p-2 bg-card rounded border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-700 text-sm">{lpEntry.lp_name || lpEntry.lp_id}</span>
                        <span className="text-xs text-green-500">LP #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-green-600 text-[10px] uppercase">Booked P&L</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={lpEntry.booked_pnl}
                            onChange={(e) => updateLPEntry(lpEntry.lp_id, 'booked_pnl', e.target.value)}
                            className="bg-green-50 border-green-200 text-foreground font-mono h-8 text-sm"
                            placeholder="0"
                            data-testid={`dealing-lp-${lpEntry.lp_id}-booked`}
                          />
                        </div>
                        <div>
                          <Label className="text-green-600 text-[10px] uppercase">Floating P&L</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={lpEntry.floating_pnl}
                            onChange={(e) => updateLPEntry(lpEntry.lp_id, 'floating_pnl', e.target.value)}
                            className="bg-green-50 border-green-200 text-foreground font-mono h-8 text-sm"
                            placeholder="0"
                            data-testid={`dealing-lp-${lpEntry.lp_id}-floating`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
              <Textarea
                value={dealingForm.notes}
                onChange={(e) => setDealingForm({ ...dealingForm, notes: e.target.value })}
                className="bg-muted/50 border text-foreground"
                placeholder="Any additional notes..."
                rows={2}
                data-testid="dealing-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDealingFormOpen(false)}
                className="border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDealingPnL}
                disabled={savingDealingPnL}
                className="bg-green-500 text-white hover:bg-green-600"
                data-testid="save-dealing-btn"
              >
                {savingDealingPnL ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add LP Dialog */}
      <Dialog open={isAddLPOpen} onOpenChange={setIsAddLPOpen}>
        <DialogContent className="bg-card border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Add Liquidity Provider
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">LP Name *</Label>
                <Input
                  value={lpForm.lp_name}
                  onChange={(e) => setLPForm({ ...lpForm, lp_name: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., Prime Brokerage LLC"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Bank Name</Label>
                <Input
                  value={lpForm.bank_name}
                  onChange={(e) => setLPForm({ ...lpForm, bank_name: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., JP Morgan Chase"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Account Number</Label>
                <Input
                  value={lpForm.account_number}
                  onChange={(e) => setLPForm({ ...lpForm, account_number: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., 123456789"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">SWIFT Code</Label>
                <Input
                  value={lpForm.swift_code}
                  onChange={(e) => setLPForm({ ...lpForm, swift_code: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., CHASUS33"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Currency</Label>
                <Select value={lpForm.currency} onValueChange={(v) => setLPForm({ ...lpForm, currency: v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Person</Label>
                <Input
                  value={lpForm.contact_person}
                  onChange={(e) => setLPForm({ ...lpForm, contact_person: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Email</Label>
                <Input
                  type="email"
                  value={lpForm.contact_email}
                  onChange={(e) => setLPForm({ ...lpForm, contact_email: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., john@lp.com"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Phone</Label>
                <Input
                  value={lpForm.contact_phone}
                  onChange={(e) => setLPForm({ ...lpForm, contact_phone: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., +1 555 1234"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
                <Textarea
                  value={lpForm.notes}
                  onChange={(e) => setLPForm({ ...lpForm, notes: e.target.value })}
                  className="border mt-1"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddLPOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleCreateLP} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E]">
                Create LP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit LP Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit LP: {selectedLP?.lp_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">LP Name *</Label>
                <Input
                  value={lpForm.lp_name}
                  onChange={(e) => setLPForm({ ...lpForm, lp_name: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Bank Name</Label>
                <Input
                  value={lpForm.bank_name}
                  onChange={(e) => setLPForm({ ...lpForm, bank_name: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Account Number</Label>
                <Input
                  value={lpForm.account_number}
                  onChange={(e) => setLPForm({ ...lpForm, account_number: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">SWIFT Code</Label>
                <Input
                  value={lpForm.swift_code}
                  onChange={(e) => setLPForm({ ...lpForm, swift_code: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Currency</Label>
                <Select value={lpForm.currency} onValueChange={(v) => setLPForm({ ...lpForm, currency: v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Person</Label>
                <Input
                  value={lpForm.contact_person}
                  onChange={(e) => setLPForm({ ...lpForm, contact_person: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Email</Label>
                <Input
                  type="email"
                  value={lpForm.contact_email}
                  onChange={(e) => setLPForm({ ...lpForm, contact_email: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Phone</Label>
                <Input
                  value={lpForm.contact_phone}
                  onChange={(e) => setLPForm({ ...lpForm, contact_phone: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
                <Textarea
                  value={lpForm.notes}
                  onChange={(e) => setLPForm({ ...lpForm, notes: e.target.value })}
                  className="border mt-1"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleUpdateLP} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E]">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="bg-card border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              <span className="text-green-500">Deposit</span> to {selectedLP?.lp_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-sm text-sm text-green-700">
              Recording a deposit means you are sending funds TO the LP. This will increase the LP balance.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Amount *</Label>
                <Input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="border mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Currency</Label>
                <Select value={transactionForm.currency} onValueChange={(v) => setTransactionForm({ ...transactionForm, currency: v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Source Treasury Account</Label>
                <Select value={transactionForm.treasury_account_id || "none"} onValueChange={(v) => setTransactionForm({ ...transactionForm, treasury_account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue placeholder="Select source account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Manual tracking only)</SelectItem>
                    {treasuryAccounts.map((acc) => (
                      <SelectItem key={acc.account_id} value={acc.account_id}>
                        {acc.account_name} ({acc.currency}) - ${acc.balance?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Reference</Label>
                <Input
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., Wire transfer ref"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
                <Textarea
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                  className="border mt-1"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDepositOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleDeposit} className="bg-green-500 text-white hover:bg-green-600">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Record Deposit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="bg-card border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              <span className="text-red-400">Withdraw</span> from {selectedLP?.lp_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
              Recording a withdrawal means you are receiving funds FROM the LP. This will decrease the LP balance.
            </div>
            <div className="p-3 bg-muted/50 border border rounded-sm">
              <p className="text-sm text-card-foreground">Available Balance: <span className="font-bold text-primary">{formatCurrency(selectedLP?.balance, selectedLP?.currency)}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Amount *</Label>
                <Input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="border mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Currency</Label>
                <Select value={transactionForm.currency} onValueChange={(v) => setTransactionForm({ ...transactionForm, currency: v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Destination Treasury Account</Label>
                <Select value={transactionForm.treasury_account_id || "none"} onValueChange={(v) => setTransactionForm({ ...transactionForm, treasury_account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="border mt-1">
                    <SelectValue placeholder="Select destination account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Manual tracking only)</SelectItem>
                    {treasuryAccounts.map((acc) => (
                      <SelectItem key={acc.account_id} value={acc.account_id}>
                        {acc.account_name} ({acc.currency}) - ${acc.balance?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Reference</Label>
                <Input
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., Wire transfer ref"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
                <Textarea
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                  className="border mt-1"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsWithdrawOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleWithdraw} className="bg-red-500 text-white hover:bg-red-600">
                <ArrowDownRight className="w-4 h-4 mr-2" />
                Record Withdrawal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LP Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-card border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {selectedLP?.lp_name}
            </DialogTitle>
          </DialogHeader>
          {selectedLP && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-sm text-center">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Net Balance</p>
                  <p className="text-xl font-bold font-mono text-primary">{formatCurrency(selectedLP.balance, selectedLP.currency)}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-sm text-center">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Total Deposits</p>
                  <p className="text-xl font-bold font-mono text-green-500">{formatCurrency(selectedLP.total_deposits, selectedLP.currency)}</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-center">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Total Withdrawals</p>
                  <p className="text-xl font-bold font-mono text-red-400">{formatCurrency(selectedLP.total_withdrawals, selectedLP.currency)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Bank Name</p>
                  <p className="text-foreground">{selectedLP.bank_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Account Number</p>
                  <p className="text-foreground font-mono">{selectedLP.account_number || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">SWIFT Code</p>
                  <p className="text-foreground font-mono">{selectedLP.swift_code || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Currency</p>
                  <p className="text-foreground">{selectedLP.currency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Contact Person</p>
                  <p className="text-foreground">{selectedLP.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Contact Email</p>
                  <p className="text-foreground">{selectedLP.contact_email || '-'}</p>
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-card-foreground mb-3">Transaction History</h4>
                <ScrollArea className="h-[200px] border border rounded-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border">
                        <TableHead className="text-muted-foreground text-xs">Date</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Type</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Amount</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lpTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No transactions yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        lpTransactions.map((tx) => (
                          <TableRow key={tx.lp_transaction_id} className="border">
                            <TableCell className="text-card-foreground text-sm">{formatDate(tx.created_at)}</TableCell>
                            <TableCell>
                              <Badge className={tx.transaction_type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-mono ${tx.transaction_type === 'deposit' ? 'text-green-500' : 'text-red-400'}`}>
                              {tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{tx.reference || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex gap-2 justify-end pt-4 border-t border">
                  <Button onClick={() => { setIsDetailOpen(false); openDeposit(selectedLP); }} className="bg-green-500 text-white hover:bg-green-600">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                  <Button onClick={() => { setIsDetailOpen(false); openWithdraw(selectedLP); }} className="bg-red-500 text-white hover:bg-red-600">
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
