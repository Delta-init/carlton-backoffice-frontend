import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import PaginationControls from '../components/PaginationControls';
import {
  CreditCard,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Percent,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  Timer,
  Shield,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PSPs() {
  const { user } = useAuth();
  const [psps, setPsps] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pspWithdrawals, setPspWithdrawals] = useState([]);
  const [extraCommDialog, setExtraCommDialog] = useState({ open: false, tx: null, amount: '', note: '', type: 'withdrawal' });
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPsp, setSelectedPsp] = useState(null);
  const [viewPsp, setViewPsp] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [settlementDestination, setSettlementDestination] = useState('');
  const [reserveFundLedger, setReserveFundLedger] = useState(null);
  const [reserveFundLoading, setReserveFundLoading] = useState(false);
  const [globalReserveSummary, setGlobalReserveSummary] = useState(null);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState([]);
  // Compound settlement state
  const [selectedSettleTxIds, setSelectedSettleTxIds] = useState([]);
  const [batchSettleDialogOpen, setBatchSettleDialogOpen] = useState(false);
  const [batchSettleDestination, setBatchSettleDestination] = useState('');
  const [batchSettleDate, setBatchSettleDate] = useState('');
  const [batchSettling, setBatchSettling] = useState(false);
  const [expandedSettlement, setExpandedSettlement] = useState(null);
  const [expandedTxs, setExpandedTxs] = useState([]);
  // Net settlement state
  const [netSettleDialogOpen, setNetSettleDialogOpen] = useState(false);
  const [netSettleDestination, setNetSettleDestination] = useState('');
  const [netSettleDate, setNetSettleDate] = useState('');
  const [netSettling, setNetSettling] = useState(false);
  // PSP detail date filters
  const [depDateFrom, setDepDateFrom] = useState('');
  const [depDateTo, setDepDateTo] = useState('');
  const [wdrDateFrom, setWdrDateFrom] = useState('');
  const [wdrDateTo, setWdrDateTo] = useState('');
  const [stlDateFrom, setStlDateFrom] = useState('');
  const [stlDateTo, setStlDateTo] = useState('');
  // Pagination state
  const [pspPage, setPspPage] = useState(1);
  const [pspTotalPages, setPspTotalPages] = useState(1);
  const [pspTotal, setPspTotal] = useState(0);
  const [pspPageSize, setPspPageSize] = useState(20);
  const [depPage, setDepPage] = useState(1);
  const [depTotalPages, setDepTotalPages] = useState(1);
  const [depTotal, setDepTotal] = useState(0);
    const [depPageSize, setDepPageSize] = useState(20);
    const [wdrPage, setWdrPage] = useState(1);
    const [wdrTotalPages, setWdrTotalPages] = useState(1);
    const [wdrTotal, setWdrTotal] = useState(0);
    const [wdrPageSize, setWdrPageSize] = useState(20);
    const [stlPage, setStlPage] = useState(1);
    const [stlTotalPages, setStlTotalPages] = useState(1);
    const [stlTotal, setStlTotal] = useState(0);
    const [stlPageSize, setStlPageSize] = useState(20);
  const [formData, setFormData] = useState({
    psp_name: '',
    commission_rate: '',
    reserve_fund_rate: '0',
    holding_days: '0',
    settlement_days: '1',
    settlement_destination_id: '',
    min_settlement_amount: '0',
    gateway_fee: '0',
    refund_fee: '0',
    monthly_minimum_fee: '0',
    description: '',
    status: 'active',
  });

  // State for recording charges on transactions
  const [chargesDialogOpen, setChargesDialogOpen] = useState(false);
  const [chargesForm, setChargesForm] = useState({
    reserve_fund_amount: '0',
    extra_charges: '0',
    charges_description: '',
  });
  
  // State for recording payment received
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    actual_amount_received: '',
    destination_account_id: '',
  });

  const isAdmin = user?.role === 'admin';
  const isAccountantOrAdmin = user?.role === 'admin' || user?.role === 'accountant';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchPsps = async (pg = pspPage) => {
    try {
      const response = await fetch(`${API_URL}/api/psp-summary?page=${pg}&page_size=${pspPageSize}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPsps(data.items || data);
        setPspTotalPages(data.total_pages || 1);
        setPspTotal(data.total || 0);
        setPspPage(pg);
      }
    } catch (error) {
      console.error('Error fetching PSPs:', error);
      toast.error('Failed to load PSPs');
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const d = await response.json();
        setTreasuryAccounts(d.items || d);
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };


  const fetchPendingTransactions = async (pspId, pg = 1, ps = depPageSize) => {
    try {
      const params = new URLSearchParams({ page: pg, page_size: ps });
      if (depDateFrom) params.append('date_from', depDateFrom);
      if (depDateTo) params.append('date_to', depDateTo);
      const response = await fetch(`${API_URL}/api/psp/${pspId}/pending-transactions?${params}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPendingTransactions(data.items || data);
        setDepTotalPages(data.total_pages || 1);
        setDepTotal(data.total || 0);
        setDepPage(pg);
      }
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
    }
  };

  const fetchPspWithdrawals = async (pspId, pg = 1, ps = wdrPageSize) => {
    try {
      const params = new URLSearchParams({ page: pg, page_size: ps });
      if (wdrDateFrom) params.append('date_from', wdrDateFrom);
      if (wdrDateTo) params.append('date_to', wdrDateTo);
      const response = await fetch(`${API_URL}/api/psp/${pspId}/withdrawal-transactions?${params}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPspWithdrawals(data.items || data);
        setWdrTotalPages(data.total_pages || 1);
        setWdrTotal(data.total || 0);
        setWdrPage(pg);
      }
    } catch (error) {
      console.error('Error fetching PSP withdrawals:', error);
    }
  };

  const handleExtraCommission = async () => {
    if (!extraCommDialog.tx) return;
    const endpoint = extraCommDialog.type === 'deposit' ? 'deposit-extra-commission' : 'withdrawal-extra-commission';
    try {
      const response = await fetch(`${API_URL}/api/psp/${viewPsp.psp_id}/${endpoint}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          transaction_id: extraCommDialog.tx.transaction_id,
          extra_commission: parseFloat(extraCommDialog.amount) || 0,
          note: extraCommDialog.note,
        }),
      });
      if (response.ok) {
        toast.success('Extra commission updated');
        setExtraCommDialog({ open: false, tx: null, amount: '', note: '', type: 'withdrawal' });
        fetchPendingTransactions(viewPsp.psp_id);
        fetchPspWithdrawals(viewPsp.psp_id);
        fetchPsps();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed');
      }
    } catch { toast.error('Failed to update extra commission'); }
  };

  const fetchSettlements = async (pspId, pg = 1, ps = stlPageSize) => {
    try {
      const params = new URLSearchParams({ page: pg, page_size: ps });
      if (stlDateFrom) params.append('date_from', stlDateFrom);
      if (stlDateTo) params.append('date_to', stlDateTo);
      const response = await fetch(`${API_URL}/api/psp/${pspId}/settlements?${params}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSettlements(data.items || data);
        setStlTotalPages(data.total_pages || 1);
        setStlTotal(data.total || 0);
        setStlPage(pg);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  const fetchReserveFundLedger = async (pspId) => {
    setReserveFundLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/psps/${pspId}/reserve-funds`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setReserveFundLedger(await response.json());
      }
    } catch (error) {
      console.error('Error fetching reserve fund ledger:', error);
    } finally {
      setReserveFundLoading(false);
    }
  };

  const fetchGlobalReserveSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psps/reserve-funds/global-summary`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setGlobalReserveSummary(await response.json());
      }
    } catch (error) {
      console.error('Error fetching global reserve summary:', error);
    }
  };

  const handleReleaseReserveFund = async (txId) => {
    try {
      const response = await fetch(`${API_URL}/api/psps/reserve-funds/${txId}/release`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Reserve fund $${data.amount} released & credited to treasury`);
        fetchReserveFundLedger(viewPsp.psp_id);
        fetchGlobalReserveSummary();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to release');
      }
    } catch (error) {
      toast.error('Error releasing reserve fund');
    }
  };

  const handleBulkRelease = async () => {
    if (selectedReleaseIds.length === 0) return;
    try {
      const response = await fetch(`${API_URL}/api/psps/reserve-funds/bulk-release`, {
        method: 'POST', headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify({ transaction_ids: selectedReleaseIds }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Released ${data.count} reserve funds totaling $${data.total_released}`);
        setSelectedReleaseIds([]);
        fetchReserveFundLedger(viewPsp.psp_id);
        fetchGlobalReserveSummary();
      } else {
        toast.error('Failed to bulk release');
      }
    } catch (error) {
      toast.error('Error in bulk release');
    }
  };

  useEffect(() => {
    fetchPsps();
    fetchTreasuryAccounts();
    fetchGlobalReserveSummary();
  }, []);

  useEffect(() => {
    if (viewPsp) {
      fetchPendingTransactions(viewPsp.psp_id, 1);
      fetchPspWithdrawals(viewPsp.psp_id, 1);
      fetchSettlements(viewPsp.psp_id, 1);
      fetchReserveFundLedger(viewPsp.psp_id);
    }
  }, [viewPsp]);

  // Re-fetch when date filters change
  useEffect(() => {
    if (viewPsp) { setDepPage(1); fetchPendingTransactions(viewPsp.psp_id, 1); }
  }, [depDateFrom, depDateTo]);
  useEffect(() => {
    if (viewPsp) { setWdrPage(1); fetchPspWithdrawals(viewPsp.psp_id, 1); }
  }, [wdrDateFrom, wdrDateTo]);
  useEffect(() => {
    if (viewPsp) { setStlPage(1); fetchSettlements(viewPsp.psp_id, 1); }
  }, [stlDateFrom, stlDateTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedPsp
        ? `${API_URL}/api/psp/${selectedPsp.psp_id}`
        : `${API_URL}/api/psp`;
      const method = selectedPsp ? 'PUT' : 'POST';

      const payload = {
        psp_name: formData.psp_name,
        commission_rate: parseFloat(formData.commission_rate),
        reserve_fund_rate: parseFloat(formData.reserve_fund_rate) || 0,
        holding_days: parseInt(formData.holding_days) || 0,
        settlement_days: parseInt(formData.settlement_days),
        settlement_destination_id: formData.settlement_destination_id,
        min_settlement_amount: parseFloat(formData.min_settlement_amount) || 0,
        gateway_fee: parseFloat(formData.gateway_fee) || 0,
        refund_fee: parseFloat(formData.refund_fee) || 0,
        monthly_minimum_fee: parseFloat(formData.monthly_minimum_fee) || 0,
        description: formData.description || null,
      };

      if (selectedPsp) {
        payload.status = formData.status;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedPsp ? 'PSP updated' : 'PSP created');
        setIsDialogOpen(false);
        resetForm();
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  // Handle recording charges on a transaction
  const handleRecordCharges = async (e) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    try {
      const hasDiffCurrency = selectedTransaction?.base_currency && selectedTransaction?.base_currency !== 'USD';
      const txRate = selectedTransaction?.exchange_rate || 1;
      // Convert from payment currency to USD if needed
      const extraInUsd = hasDiffCurrency ? (parseFloat(chargesForm.extra_charges) || 0) * txRate : (parseFloat(chargesForm.extra_charges) || 0);
      const reserveInUsd = hasDiffCurrency ? (parseFloat(chargesForm.reserve_fund_amount) || 0) * txRate : (parseFloat(chargesForm.reserve_fund_amount) || 0);
      
      const response = await fetch(`${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/charges`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          reserve_fund_amount: reserveInUsd,
          extra_charges: extraInUsd,
          charges_description: chargesForm.charges_description || null,
        }),
      });

      if (response.ok) {
        toast.success('Charges recorded successfully');
        setChargesDialogOpen(false);
        setChargesForm({ reserve_fund_amount: '0', extra_charges: '0', charges_description: '' });
        if (viewPsp) fetchPendingTransactions(viewPsp.psp_id);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to record charges');
      }
    } catch (error) {
      toast.error('Failed to record charges');
    }
  };

  const openChargesDialog = (transaction) => {
    setSelectedTransaction(transaction);
    const hasDiffCurrency = transaction.base_currency && transaction.base_currency !== 'USD';
    const txRate = transaction.exchange_rate || 1;
    // Convert existing USD charges back to payment currency for display
    const reserveUsd = transaction.psp_reserve_fund_amount || transaction.psp_chargeback_amount || 0;
    const extraUsd = transaction.psp_extra_charges || 0;
    setChargesForm({
      reserve_fund_amount: hasDiffCurrency ? (reserveUsd / txRate).toFixed(2) : reserveUsd.toString(),
      extra_charges: hasDiffCurrency ? (extraUsd / txRate).toFixed(2) : extraUsd.toString(),
      charges_description: transaction.psp_charges_description || '',
    });
    setChargesDialogOpen(true);
  };

  const handleDelete = async (pspId) => {
    if (!window.confirm('Are you sure you want to delete this PSP?')) return;
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('PSP deleted');
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (psp) => {
    setSelectedPsp(psp);
    setFormData({
      psp_name: psp.psp_name,
      commission_rate: psp.commission_rate.toString(),
      reserve_fund_rate: (psp.reserve_fund_rate || psp.chargeback_rate || 0).toString(),
      holding_days: (psp.holding_days || 0).toString(),
      settlement_days: psp.settlement_days.toString(),
      settlement_destination_id: psp.settlement_destination_id,
      min_settlement_amount: (psp.min_settlement_amount || 0).toString(),
      gateway_fee: (psp.gateway_fee || 0).toString(),
      refund_fee: (psp.refund_fee || 0).toString(),
      monthly_minimum_fee: (psp.monthly_minimum_fee || 0).toString(),
      description: psp.description || '',
      status: psp.status,
    });
    setIsDialogOpen(true);
  };

  // Handle recording payment received from PSP
  const handleRecordPayment = async () => {
    if (!selectedTransaction) return;
    
    try {
      const psp = psps.find(p => p.psp_id === selectedTransaction.psp_id);
      const destId = paymentForm.destination_account_id || psp?.settlement_destination_id;
      
      let url = `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/record-payment`;
      const params = new URLSearchParams();
      if (destId) params.append('destination_account_id', destId);
      if (paymentForm.actual_amount_received) params.append('actual_amount_received', paymentForm.actual_amount_received);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Payment recorded successfully! Treasury updated.');
        setRecordPaymentDialogOpen(false);
        setSelectedTransaction(null);
        setPaymentForm({ actual_amount_received: '', destination_account_id: '' });
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
          fetchSettlements(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Recording payment failed');
      }
    } catch (error) {
      toast.error('Recording payment failed');
    }
  };
  
  // Open record payment dialog
  const openRecordPaymentDialog = (tx) => {
    setSelectedTransaction(tx);
    const netAmount = (tx.amount || 0) - (tx.psp_commission_amount || 0) - (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0) - (tx.psp_extra_charges || 0);
    setPaymentForm({
      actual_amount_received: netAmount.toString(),
      destination_account_id: '',
    });
    setRecordPaymentDialogOpen(true);
  };

  const handleSettleTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      const psp = psps.find(p => p.psp_id === selectedTransaction.psp_id);
      const destId = settlementDestination || psp?.settlement_destination_id;
      
      const response = await fetch(
        `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/settle${destId ? `?destination_account_id=${destId}` : ''}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );
      
      if (response.ok) {
        toast.success('Transaction settled successfully');
        setSettleDialogOpen(false);
        setSelectedTransaction(null);
        setSettlementDestination('');
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Settlement failed');
      }
    } catch (error) {
      toast.error('Settlement failed');
    }
  };

  // Toggle a single transaction in the batch selection
  const toggleSettleTx = (txId) => {
    setSelectedSettleTxIds(prev =>
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  // Toggle all transactions in the batch selection
  const toggleAllSettleTx = () => {
    if (selectedSettleTxIds.length === pendingTransactions.length) {
      setSelectedSettleTxIds([]);
    } else {
      setSelectedSettleTxIds(pendingTransactions.map(tx => tx.transaction_id));
    }
  };

  // Calculate summary for selected transactions
  const batchSummary = (() => {
    const selected = pendingTransactions.filter(tx => selectedSettleTxIds.includes(tx.transaction_id));
    const gross = selected.reduce((s, tx) => s + (tx.amount || 0), 0);
    const commission = selected.reduce((s, tx) => s + (tx.psp_commission_amount || 0), 0);
    const reserve = selected.reduce((s, tx) => s + (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0), 0);
    const extra = selected.reduce((s, tx) => s + (tx.psp_extra_charges || 0), 0);
    const deductions = commission + reserve + extra;
    const net = gross - deductions;
    // Payment currency info
    const currencies = [...new Set(selected.map(tx => tx.base_currency).filter(c => c && c !== 'USD'))];
    const payCurrency = currencies.length === 1 ? currencies[0] : null;
    const baseGross = payCurrency ? selected.reduce((s, tx) => s + (tx.base_amount || 0), 0) : null;
    const avgRate = payCurrency && baseGross ? gross / baseGross : null;
    const baseDeductions = payCurrency && avgRate ? deductions / avgRate : null;
    const baseNet = payCurrency && baseGross && baseDeductions != null ? baseGross - baseDeductions : null;
    return { count: selected.length, gross, commission, reserve, extra, deductions, net, payCurrency, baseGross, baseDeductions, baseNet, avgRate };
  })();

  // Handle compound batch settlement
  const handleBatchSettle = async () => {
    if (!viewPsp || selectedSettleTxIds.length === 0) return;
    setBatchSettling(true);
    try {
      const destId = batchSettleDestination || viewPsp.settlement_destination_id;
      const response = await fetch(`${API_URL}/api/psp/${viewPsp.psp_id}/settle-batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          transaction_ids: selectedSettleTxIds,
          destination_account_id: destId || null,
          settlement_date: batchSettleDate || null,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Compound settlement created: ${result.transaction_count} transactions, Net $${result.net_amount?.toLocaleString()}`);
        setBatchSettleDialogOpen(false);
        setSelectedSettleTxIds([]);
        setBatchSettleDestination('');
        setBatchSettleDate('');
        fetchPendingTransactions(viewPsp.psp_id);
        fetchSettlements(viewPsp.psp_id);
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Batch settlement failed');
      }
    } catch (error) {
      toast.error('Batch settlement failed');
    } finally {
      setBatchSettling(false);
    }
  };

  // Handle net settlement (all deposits + withdrawals)
  const handleNetSettle = async () => {
    if (!viewPsp) return;
    setNetSettling(true);
    try {
      const destId = netSettleDestination || viewPsp.settlement_destination_id;
      const response = await fetch(`${API_URL}/api/psp/${viewPsp.psp_id}/net-settle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          destination_account_id: destId || null,
          settlement_date: netSettleDate || null,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Net settlement created: ${result.deposit_count} deposits + ${result.withdrawal_count} withdrawals, Net $${result.net_amount?.toLocaleString()}`);
        setNetSettleDialogOpen(false);
        setNetSettleDestination('');
        setNetSettleDate('');
        setSelectedSettleTxIds([]);
        fetchPendingTransactions(viewPsp.psp_id);
        fetchPspWithdrawals(viewPsp.psp_id);
        fetchSettlements(viewPsp.psp_id);
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Net settlement failed');
      }
    } catch (error) {
      toast.error('Net settlement failed');
    } finally {
      setNetSettling(false);
    }
  };


  // Toggle expanded settlement detail to show included transactions
  const toggleSettlementDetail = async (settlement) => {
    if (expandedSettlement === settlement.settlement_id) {
      setExpandedSettlement(null);
      setExpandedTxs([]);
      return;
    }
    setExpandedSettlement(settlement.settlement_id);
    if (settlement.transaction_ids?.length) {
      try {
        const response = await fetch(`${API_URL}/api/psp/${settlement.psp_id}/settlement/${settlement.settlement_id}/transactions`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (response.ok) {
          setExpandedTxs(await response.json());
        }
      } catch (e) {
        setExpandedTxs([]);
      }
    }
  };

  const resetForm = () => {
    setSelectedPsp(null);
    setFormData({
      psp_name: '',
      commission_rate: '',
      reserve_fund_rate: '0',
      holding_days: '0',
      settlement_days: '1',
      settlement_destination_id: '',
      min_settlement_amount: '0',
      description: '',
      status: 'active',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const isOverdue = (expectedDate) => {
    if (!expectedDate) return false;
    const exp = new Date(expectedDate);
    return exp < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPendingAmount = psps.reduce((sum, psp) => sum + (psp.pending_amount || 0), 0);
  const totalOverdue = psps.reduce((sum, psp) => sum + (psp.overdue_count || 0), 0);

  return (
    <div className="space-y-6 h-[100vh] animate-fade-in" data-testid="psp-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
            Payment Service Providers
          </h1>
          <p className="text-slate-500">Manage PSPs, commissions, and settlements</p>
        </div>
        {isAccountantOrAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
                data-testid="add-psp-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add PSP
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedPsp ? 'Edit PSP' : 'Add Payment Service Provider'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">PSP Name *</Label>
                  <Input
                    value={formData.psp_name}
                    onChange={(e) => setFormData({ ...formData, psp_name: e.target.value })}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    placeholder="e.g., Stripe, PayPal"
                    data-testid="psp-name"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Commission Rate (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="2.5"
                      data-testid="psp-commission"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Reserve Fund % *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.reserve_fund_rate}
                      onChange={(e) => setFormData({ ...formData, reserve_fund_rate: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="0"
                      data-testid="psp-reserve-fund"
                    />
                  </div>
                </div>

                {/* New PSP Fee Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Gateway Fee (per tx)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gateway_fee}
                      onChange={(e) => setFormData({ ...formData, gateway_fee: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="0.00"
                      data-testid="psp-gateway-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Refund Fee</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.refund_fee}
                      onChange={(e) => setFormData({ ...formData, refund_fee: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="0.00"
                      data-testid="psp-refund-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Monthly Min Fee</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthly_minimum_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_minimum_fee: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="0.00"
                      data-testid="psp-monthly-min-fee"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Holding Days</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.holding_days}
                      onChange={(e) => setFormData({ ...formData, holding_days: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="0"
                      data-testid="psp-holding-days"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Days *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.settlement_days}
                      onChange={(e) => setFormData({ ...formData, settlement_days: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="T+1"
                      data-testid="psp-settlement-days"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Destination *</Label>
                  <Select
                    value={formData.settlement_destination_id}
                    onValueChange={(value) => setFormData({ ...formData, settlement_destination_id: value })}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="psp-destination">
                      <SelectValue placeholder="Select treasury account" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {treasuryAccounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id} className="text-slate-800 hover:bg-slate-100">
                          {account.account_name} - {account.bank_name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Min Settlement Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_settlement_amount}
                    onChange={(e) => setFormData({ ...formData, min_settlement_amount: e.target.value })}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                    placeholder="0"
                    data-testid="psp-min-amount"
                  />
                </div>
                
                {selectedPsp && (
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="psp-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="active" className="text-slate-800 hover:bg-slate-100">Active</SelectItem>
                        <SelectItem value="inactive" className="text-slate-800 hover:bg-slate-100">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    rows={2}
                    data-testid="psp-description"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsDialogOpen(false); resetForm(); }}
                    className="border-slate-200 text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                    data-testid="save-psp-btn"
                  >
                    {selectedPsp ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total PSPs</p>
                <p className="text-3xl font-bold font-mono text-slate-800">{psps.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-sm">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending Settlement</p>
                <p className="text-3xl font-bold font-mono text-slate-800">${totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 border-l-2 border-l-orange-500/50" data-testid="total-reserve-fund-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reserve Fund Held</p>
                <p className="text-3xl font-bold font-mono text-orange-400">${(globalReserveSummary?.total_held || 0).toLocaleString()}</p>
                {globalReserveSummary?.due_for_release > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">${globalReserveSummary.due_for_release.toLocaleString()} due for release</p>
                )}
              </div>
              <div className="p-3 bg-orange-500/10 rounded-sm">
                <Shield className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-white border-slate-200 ${totalOverdue > 0 ? 'border-red-500/30' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Overdue Settlements</p>
                <p className={`text-3xl font-bold font-mono ${totalOverdue > 0 ? 'text-red-400' : 'text-slate-800'}`}>{totalOverdue}</p>
              </div>
              <div className={`p-3 rounded-sm ${totalOverdue > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {totalOverdue > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PSPs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : psps.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500">No PSPs found</p>
            {isAccountantOrAdmin && <p className="text-sm text-slate-500/60 mt-2">Click "Add PSP" to create one</p>}
          </div>
        ) : (
          psps.map((psp) => (
            <Card 
              key={psp.psp_id} 
              className={`bg-white border-slate-200 card-hover cursor-pointer ${psp.overdue_count > 0 ? 'border-l-2 border-l-red-500' : ''}`}
              onClick={() => setViewPsp(psp)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-sm ${psp.overdue_count > 0 ? 'bg-red-500/10' : 'bg-blue-100'}`}>
                      <CreditCard className={`w-5 h-5 ${psp.overdue_count > 0 ? 'text-red-500' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-800">{psp.psp_name}</CardTitle>
                      <p className="text-xs text-slate-500">{psp.description || 'No description'}</p>
                    </div>
                  </div>
                  {isAccountantOrAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100" data-testid={`psp-actions-${psp.psp_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-slate-200">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewPsp(psp); }} className="text-slate-800 hover:bg-slate-100 cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(psp); }} className="text-slate-800 hover:bg-slate-100 cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(psp.psp_id); }} className="text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Commission
                    </span>
                    <span className="text-slate-800 font-mono">{psp.commission_rate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Reserve Fund
                    </span>
                    <span className="text-slate-800 font-mono">{psp.reserve_fund_rate || psp.chargeback_rate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Holding
                    </span>
                    <span className="text-slate-800 font-mono">{psp.holding_days || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Settlement
                    </span>
                    <span className="text-slate-800 font-mono">T+{psp.settlement_days}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Pending</span>
                    <span className="text-yellow-400 font-mono">${(psp.pending_amount || 0).toLocaleString()}</span>
                  </div>
                  {psp.total_reserve_fund_held > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Reserve Held
                      </span>
                      <span className="text-orange-400 font-mono">${(psp.total_reserve_fund_held || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {psp.overdue_count > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{psp.overdue_count} transactions</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-sm">Status</span>
                    {getStatusBadge(psp.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {pspTotalPages > 1 && (
        <div className="mt-4">
          <PaginationControls currentPage={pspPage} totalPages={pspTotalPages} totalItems={pspTotal} pageSize={pspPageSize} onPageChange={(p) => fetchPsps(p)} onPageSizeChange={() => {}} />
        </div>
      )}

      {/* View PSP Details - Full Page */}
      {viewPsp && (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto dark:bg-slate-900">
        <div className="max-w-[1600px] mx-auto px-6 py-4 min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => { setViewPsp(null); setPendingTransactions([]); setPspWithdrawals([]); setSettlements([]); setSelectedSettleTxIds([]); setDepDateFrom(''); setDepDateTo(''); setWdrDateFrom(''); setWdrDateTo(''); setStlDateFrom(''); setStlDateTo(''); }} className="text-slate-600 hover:text-slate-800" data-testid="psp-detail-back">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-blue-600" />
                <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>{viewPsp.psp_name}</h1>
              </div>
            </div>
          </div>
            <div className="space-y-4 flex-1 flex flex-col">
              {/* PSP Info */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Commission Rate</p>
                  <p className="text-xl font-mono text-slate-800">{viewPsp.commission_rate}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reserve Fund Rate</p>
                  <p className="text-xl font-mono text-slate-800">{viewPsp.reserve_fund_rate || viewPsp.chargeback_rate || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Holding Time</p>
                  <p className="text-xl font-mono text-slate-800">{viewPsp.holding_days || 0} days</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Settlement Time</p>
                  <p className="text-xl font-mono text-slate-800">T+{viewPsp.settlement_days}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net Pending</p>
                  {(() => {
                    const totalDeposits = pendingTransactions.reduce((s, tx) => s + (tx.amount || 0), 0);
                    const totalWithdrawals = pspWithdrawals.filter(tx => tx.status === 'approved').reduce((s, tx) => s + (tx.amount || 0), 0);
                    const totalComm = pendingTransactions.reduce((s, tx) => s + (tx.psp_commission_amount || 0), 0);
                    const totalDepExtraCharges = pendingTransactions.reduce((s, tx) => s + (tx.psp_extra_charges || 0), 0);
                    const totalDepExtraComm = pendingTransactions.reduce((s, tx) => s + (tx.psp_extra_commission || 0), 0);
                    const totalDepReserve = pendingTransactions.reduce((s, tx) => s + (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0), 0);
                    const totalWdrExtraComm = pspWithdrawals.filter(tx => tx.status === 'approved').reduce((s, tx) => s + (tx.psp_withdrawal_extra_commission || 0), 0);
                    const totalAllDeductions = totalComm + totalDepExtraCharges + totalDepExtraComm + totalDepReserve + totalWdrExtraComm;
                    const rawNet = totalDeposits - totalWithdrawals - totalAllDeductions;
                    const net = Math.max(rawNet, 0);
                    const hasItems = pendingTransactions.length > 0 || pspWithdrawals.filter(tx => tx.status === 'approved').length > 0;
                    return (
                      <div>
                        <p className={`text-xl font-mono ${net === 0 ? 'text-slate-400' : 'text-yellow-400'}`}>${net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        {hasItems && <p className="text-[10px] text-slate-400">Dep: ${totalDeposits.toLocaleString()} - Wdr: ${totalWithdrawals.toLocaleString()} - Ded: ${totalAllDeductions.toLocaleString()}</p>}
                        {net > 0 && hasItems && (
                          <Button
                            size="sm"
                            className="mt-2 bg-green-600 text-white hover:bg-green-700 h-7 text-xs font-bold"
                            onClick={() => { setNetSettleDate(new Date().toISOString().split('T')[0]); setNetSettleDialogOpen(true); }}
                            data-testid="net-settle-btn"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" /> Settle Net ${net.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Settlement To</p>
                  <p className="text-sm text-slate-800">{viewPsp.settlement_destination_name}</p>
                  <p className="text-xs text-slate-500">{viewPsp.settlement_destination_bank}</p>
                </div>
              </div>
              {/* Fee Details Row */}
              {(viewPsp.gateway_fee > 0 || viewPsp.refund_fee > 0 || viewPsp.monthly_minimum_fee > 0) && (
                <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-sm border border-slate-200 mt-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Gateway Fee</p>
                    <p className="text-lg font-mono text-slate-800">${(viewPsp.gateway_fee || 0).toLocaleString()}<span className="text-xs text-slate-500">/tx</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Refund Fee</p>
                    <p className="text-lg font-mono text-slate-800">${(viewPsp.refund_fee || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Min Fee</p>
                    <p className="text-lg font-mono text-slate-800">${(viewPsp.monthly_minimum_fee || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="pending" className="w-full flex-1 flex flex-col">
                <TabsList className="bg-slate-50 border border-slate-200">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Deposits ({pendingTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="withdrawals" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Withdrawals ({pspWithdrawals.length})
                  </TabsTrigger>
                  <TabsTrigger value="reserve-fund" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]" data-testid="reserve-fund-tab">
                    Reserve Fund
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Settlement History
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="mt-4 flex-1 flex flex-col">
                  {/* Date Filter */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Input type="date" value={depDateFrom} onChange={e => setDepDateFrom(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" placeholder="From" data-testid="dep-date-from" />
                    <span className="text-slate-400 text-xs">to</span>
                    <Input type="date" value={depDateTo} onChange={e => setDepDateTo(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" placeholder="To" data-testid="dep-date-to" />
                    {(depDateFrom || depDateTo) && <Button variant="ghost" size="sm" onClick={() => { setDepDateFrom(''); setDepDateTo(''); }} className="text-slate-400 hover:text-red-500 h-8 text-xs">Clear</Button>}
                    <span className="text-xs text-slate-400 ml-auto">{depTotal} deposits</span>
                  </div>
                  <ScrollArea className="h-[calc(100vh-480px)]">
                    {pendingTransactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No pending settlements
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="w-10">
                              <input
                                type="checkbox"
                                checked={selectedSettleTxIds.length === pendingTransactions.length && pendingTransactions.length > 0}
                                onChange={toggleAllSettleTx}
                                className="rounded border-slate-300 accent-[#66FCF1]"
                                data-testid="select-all-settle-checkbox"
                              />
                            </TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tx Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Pay Currency</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Deductions</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Net</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Extra Comm.</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Holding</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Release Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTransactions.map((tx) => {
                            const overdue = isOverdue(tx.psp_expected_settlement_date);
                            const holdingReleaseOverdue = isOverdue(tx.psp_holding_release_date);
                            const netAmount = (tx.amount || 0) - (tx.psp_commission_amount || 0) - (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0) - (tx.psp_extra_charges || 0) - (tx.psp_extra_commission || 0);
                            const totalDeductions = (tx.psp_commission_amount || 0) + (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0) + (tx.psp_extra_charges || 0) + (tx.psp_extra_commission || 0);
                            const holdingDays = tx.psp_holding_days || viewPsp?.holding_days || 0;
                            const isReleased = tx.psp_holding_release_date && new Date(tx.psp_holding_release_date) <= new Date();
                            const hasDiffCurrency = tx.base_currency && tx.base_currency !== 'USD' && tx.base_currency !== tx.currency;
                            const rate = tx.exchange_rate || 1;
                            const baseGross = hasDiffCurrency ? (tx.base_amount || (tx.amount / rate)) : null;
                            const baseComm = hasDiffCurrency ? ((tx.psp_commission_amount || 0) / rate) : null;
                            const baseReserve = hasDiffCurrency ? ((tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0) / rate) : null;
                            const baseExtra = hasDiffCurrency ? ((tx.psp_extra_charges || 0) / rate) : null;
                            const baseNet = hasDiffCurrency ? (baseGross - baseComm - baseReserve - baseExtra) : null;
                            return (
                              <TableRow key={tx.transaction_id} className={`border-slate-200 hover:bg-slate-100 ${overdue ? 'bg-red-500/5' : ''} ${selectedSettleTxIds.includes(tx.transaction_id) ? 'bg-[#66FCF1]/5' : ''}`}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedSettleTxIds.includes(tx.transaction_id)}
                                    onChange={() => toggleSettleTx(tx.transaction_id)}
                                    className="rounded border-slate-300 accent-[#66FCF1]"
                                    data-testid={`select-settle-${tx.transaction_id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-mono text-slate-800 text-xs">{tx.reference}</span>
                                    <p className="text-[10px] text-slate-500">{tx.client_name}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-slate-600">{(tx.transaction_date || tx.created_at) ? new Date(tx.transaction_date || tx.created_at).toLocaleDateString() : '-'}</span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-800 font-medium" data-testid={`pay-currency-${tx.transaction_id}`}>
                                  {hasDiffCurrency ? tx.base_currency : tx.currency || 'USD'}
                                  {hasDiffCurrency && <p className="text-[10px] text-slate-400">Rate: {rate}</p>}
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono text-slate-800 text-xs">
                                    ${tx.amount?.toLocaleString()}
                                    {hasDiffCurrency && <p className="text-[10px] text-blue-500">{baseGross?.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.base_currency}</p>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Comm:</span>
                                      <span className="font-mono text-yellow-400">-${(tx.psp_commission_amount || 0).toLocaleString()}</span>
                                    </div>
                                    {hasDiffCurrency && (
                                      <div className="flex justify-between">
                                        <span></span>
                                        <span className="font-mono text-[10px] text-blue-500">-{baseComm?.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.base_currency}</span>
                                      </div>
                                    )}
                                    {(tx.psp_reserve_fund_amount || tx.psp_chargeback_amount) > 0 && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Reserve:</span>
                                          <span className="font-mono text-red-400">-${(tx.psp_reserve_fund_amount || tx.psp_chargeback_amount).toLocaleString()}</span>
                                        </div>
                                        {hasDiffCurrency && (
                                          <div className="flex justify-between">
                                            <span></span>
                                            <span className="font-mono text-[10px] text-blue-500">-{baseReserve?.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.base_currency}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {tx.psp_extra_charges > 0 && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Extra:</span>
                                          <span className="font-mono text-red-400">-${tx.psp_extra_charges.toLocaleString()}</span>
                                        </div>
                                        {hasDiffCurrency && (
                                          <div className="flex justify-between">
                                            <span></span>
                                            <span className="font-mono text-[10px] text-blue-500">-{baseExtra?.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.base_currency}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono text-blue-600 font-bold">
                                    ${netAmount.toLocaleString()}
                                    {hasDiffCurrency && <p className="text-[10px] text-blue-500 font-normal">{baseNet?.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.base_currency}</p>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="cursor-pointer" onClick={() => setExtraCommDialog({ open: true, tx, amount: (tx.psp_extra_commission || '').toString(), note: tx.psp_extra_commission_note || '', type: 'deposit' })}>
                                    {tx.psp_extra_commission > 0 ? (
                                      <div>
                                        <span className="font-mono text-orange-400 text-xs hover:underline">${tx.psp_extra_commission.toLocaleString()}</span>
                                        {tx.psp_extra_commission_note && <p className="text-[10px] text-slate-400 truncate max-w-[80px]" title={tx.psp_extra_commission_note}>{tx.psp_extra_commission_note}</p>}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-orange-400 hover:text-orange-600">+ Add</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Timer className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-800 font-mono text-xs">{holdingDays} days</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {tx.psp_holding_release_date ? (
                                    <span className={`flex items-center gap-1 text-xs ${isReleased ? 'text-green-400' : 'text-slate-500'}`}>
                                      {isReleased ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {formatDate(tx.psp_holding_release_date)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {tx.settlement_status === 'awaiting' ? (
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Awaiting</Badge>
                                  ) : isReleased ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ready</Badge>
                                  ) : (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Holding</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openChargesDialog(tx)}
                                      className="text-slate-500 hover:text-slate-800 hover:bg-white/10 px-2"
                                      title="Record Charges (Reserve Fund/Extra)"
                                    >
                                      <Receipt className="w-3 h-3" />
                                    </Button>
                                    {isAccountantOrAdmin && (
                                      <Button
                                        size="sm"
                                        onClick={() => openRecordPaymentDialog(tx)}
                                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-2"
                                        data-testid={`record-payment-${tx.transaction_id}`}
                                        title="Record Payment Received"
                                      >
                                        <Wallet className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                  {depTotalPages > 1 && (
                    <div className="mt-2">
                     <PaginationControls currentPage={depPage} totalPages={depTotalPages} totalItems={depTotal} pageSize={depPageSize} onPageChange={(p) => fetchPendingTransactions(viewPsp.psp_id, p)} onPageSizeChange={(ps) => { setDepPageSize(ps); fetchPendingTransactions(viewPsp.psp_id, 1, ps); }} />
                    </div>
                  )}

                  {/* Batch Settlement Action Bar */}
                  {selectedSettleTxIds.length > 0 && (
                    <div className="mt-3 p-3 bg-[#0B0C10] border border-[#66FCF1]/30 rounded-sm flex items-center justify-between" data-testid="batch-settle-bar">
                      <div className="flex items-center gap-4">
                        <span className="text-[#66FCF1] text-sm font-medium">{batchSummary.count} selected</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-400">Gross: <span className="text-white font-mono">${batchSummary.gross.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>{batchSummary.payCurrency && <span className="text-blue-400 ml-1">({batchSummary.baseGross?.toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency})</span>}</span>
                          <span className="text-slate-400">Deductions: <span className="text-yellow-400 font-mono">-${batchSummary.deductions.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>{batchSummary.payCurrency && <span className="text-yellow-400/70 ml-1">(-{batchSummary.baseDeductions?.toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency})</span>}</span>
                          <span className="text-slate-400">Net: <span className="text-green-400 font-mono font-bold">${batchSummary.net.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>{batchSummary.payCurrency && <span className="text-green-400/70 ml-1">({batchSummary.baseNet?.toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency})</span>}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSettleTxIds([])}
                          className="text-slate-400 hover:text-white h-7 text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setBatchSettleDate(new Date().toISOString().split('T')[0]); setBatchSettleDialogOpen(true); }}
                          className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#66FCF1]/80 h-7 text-xs font-bold"
                          data-testid="settle-selected-btn"
                        >
                          Settle Selected ({batchSummary.count})
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals" className="mt-4 flex-1 flex flex-col">
                  {/* Date Filter */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Input type="date" value={wdrDateFrom} onChange={e => setWdrDateFrom(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" data-testid="wdr-date-from" />
                    <span className="text-slate-400 text-xs">to</span>
                    <Input type="date" value={wdrDateTo} onChange={e => setWdrDateTo(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" data-testid="wdr-date-to" />
                    {(wdrDateFrom || wdrDateTo) && <Button variant="ghost" size="sm" onClick={() => { setWdrDateFrom(''); setWdrDateTo(''); }} className="text-slate-400 hover:text-red-500 h-8 text-xs">Clear</Button>}
                    <span className="text-xs text-slate-400 ml-auto">{wdrTotal} withdrawals</span>
                  </div>

                  {/* Withdrawal Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Withdrawals</p>
                      <p className="text-lg font-mono text-red-500 font-bold">${pspWithdrawals.reduce((s, tx) => s + (tx.amount || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Commission</p>
                      <p className="text-lg font-mono text-yellow-500 font-bold">${pspWithdrawals.reduce((s, tx) => s + (tx.psp_commission_amount || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Extra Commission</p>
                      <p className="text-lg font-mono text-orange-400 font-bold">${pspWithdrawals.reduce((s, tx) => s + (tx.psp_withdrawal_extra_commission || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Count</p>
                      <p className="text-lg font-mono text-slate-800 font-bold">{wdrTotal}</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[calc(100vh-540px)]">
                    {pspWithdrawals.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No withdrawal transactions
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tx Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Client</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Commission</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Extra Comm.</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pspWithdrawals.map((tx) => (
                            <TableRow key={tx.transaction_id} className="border-slate-200 hover:bg-slate-100">
                              <TableCell>
                                <div>
                                  <span className="font-mono text-slate-800 text-xs">{tx.reference}</span>
                                  <p className="text-[10px] text-slate-500">{tx.crm_reference || ''}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                {(tx.transaction_date || tx.created_at) ? new Date(tx.transaction_date || tx.created_at).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{tx.client_name || '-'}</TableCell>
                              <TableCell className="font-mono text-right text-red-500 text-sm">${tx.amount?.toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-right text-yellow-500 text-xs">${(tx.psp_commission_amount || 0).toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-right text-orange-400 text-xs">
                                {tx.psp_withdrawal_extra_commission ? `$${tx.psp_withdrawal_extra_commission.toLocaleString()}` : '-'}
                                {tx.psp_withdrawal_extra_commission_note && (
                                  <p className="text-[10px] text-slate-400 truncate max-w-[100px]" title={tx.psp_withdrawal_extra_commission_note}>{tx.psp_withdrawal_extra_commission_note}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${tx.status === 'approved' ? 'text-green-600 border-green-300' : 'text-yellow-600 border-yellow-300'}`}>
                                  {tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExtraCommDialog({ open: true, tx, amount: tx.psp_withdrawal_extra_commission?.toString() || '', note: tx.psp_withdrawal_extra_commission_note || '' })}
                                  className="h-7 text-xs text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                                  data-testid={`extra-comm-${tx.transaction_id}`}
                                >
                                  <DollarSign className="w-3 h-3 mr-1" /> Extra Comm.
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                  {wdrTotalPages > 1 && (
                    <div className="mt-2">
                   <PaginationControls currentPage={wdrPage} totalPages={wdrTotalPages} totalItems={wdrTotal} pageSize={wdrPageSize} onPageChange={(p) => fetchPspWithdrawals(viewPsp.psp_id, p)} onPageSizeChange={(ps) => { setWdrPageSize(ps); fetchPspWithdrawals(viewPsp.psp_id, 1, ps); }} />
                    </div>
                  )}
                </TabsContent>
                
                {/* Reserve Fund Ledger Tab */}
                <TabsContent value="reserve-fund" className="mt-4 flex-1 flex flex-col">
                  {reserveFundLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : reserveFundLedger ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Held</p>
                          <p className="text-lg font-mono text-orange-400 font-bold">${reserveFundLedger.summary.total_held.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Due This Week</p>
                          <p className="text-lg font-mono text-yellow-400 font-bold">${reserveFundLedger.summary.due_this_week.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Released</p>
                          <p className="text-lg font-mono text-green-400 font-bold">${reserveFundLedger.summary.total_released.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Holding Period</p>
                          <p className="text-lg font-mono text-slate-800 font-bold">{reserveFundLedger.summary.holding_days} days</p>
                        </div>
                      </div>

                      {/* Bulk Release Button */}
                      {selectedReleaseIds.length > 0 && (
                        <div className="flex items-center gap-3 mb-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-sm">
                          <span className="text-orange-400 text-sm">{selectedReleaseIds.length} selected</span>
                          <Button size="sm" onClick={handleBulkRelease} className="bg-green-600 hover:bg-green-700 text-slate-800 h-7 text-xs" data-testid="bulk-release-btn">
                            Release Selected
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedReleaseIds([])} className="text-slate-500 h-7 text-xs">
                            Clear
                          </Button>
                        </div>
                      )}

                      <ScrollArea className="h-[300px]">
                        {reserveFundLedger.ledger.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">No reserve fund entries</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-8">
                                  <input
                                    type="checkbox"
                                    className="rounded border-white/20"
                                    checked={selectedReleaseIds.length === reserveFundLedger.ledger.filter(e => e.status !== 'released').length && reserveFundLedger.ledger.filter(e => e.status !== 'released').length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedReleaseIds(reserveFundLedger.ledger.filter(en => en.status !== 'released').map(en => en.transaction_id));
                                      } else {
                                        setSelectedReleaseIds([]);
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Client</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tx Amount</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reserve Held</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Hold Date</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Release Date</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Days Left</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reserveFundLedger.ledger.map((entry) => (
                                <TableRow key={entry.transaction_id} className={`border-slate-200 hover:bg-slate-100 ${entry.status === 'due' ? 'bg-yellow-500/5' : ''}`}>
                                  <TableCell>
                                    {entry.status !== 'released' && (
                                      <input
                                        type="checkbox"
                                        className="rounded border-white/20"
                                        checked={selectedReleaseIds.includes(entry.transaction_id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedReleaseIds(prev => [...prev, entry.transaction_id]);
                                          } else {
                                            setSelectedReleaseIds(prev => prev.filter(id => id !== entry.transaction_id));
                                          }
                                        }}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">{entry.reference}</TableCell>
                                  <TableCell className="text-slate-500 text-xs">{entry.client_name || '-'}</TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">${entry.amount?.toLocaleString()}</TableCell>
                                  <TableCell className="font-mono text-orange-400 font-bold">${entry.reserve_fund_amount.toLocaleString()}</TableCell>
                                  <TableCell className="text-slate-500 text-xs">{formatDate(entry.hold_date)}</TableCell>
                                  <TableCell className="text-slate-500 text-xs">{formatDate(entry.release_date)}</TableCell>
                                  <TableCell className="font-mono text-slate-800 text-xs">
                                    {entry.status === 'released' ? '-' : entry.days_remaining === 0 ? (
                                      <span className="text-yellow-400">Due now</span>
                                    ) : (
                                      <span>{entry.days_remaining}d</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      entry.status === 'released' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                      entry.status === 'due' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                      'bg-red-500/20 text-red-400 border-red-500/30'
                                    } data-testid={`rf-status-${entry.transaction_id}`}>
                                      {entry.status === 'released' ? 'Released' : entry.status === 'due' ? 'Due' : 'Held'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {entry.status !== 'released' ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleReleaseReserveFund(entry.transaction_id)}
                                        className="text-green-400 hover:bg-green-500/10 h-7 px-2 text-xs"
                                        data-testid={`release-rf-${entry.transaction_id}`}
                                      >
                                        Release
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-slate-500">{entry.released_by_name}</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">No data available</div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4 flex-1 flex flex-col">
                  {/* Date Filter */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Input type="date" value={stlDateFrom} onChange={e => setStlDateFrom(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" data-testid="stl-date-from" />
                    <span className="text-slate-400 text-xs">to</span>
                    <Input type="date" value={stlDateTo} onChange={e => setStlDateTo(e.target.value)} className="w-36 h-8 text-xs bg-white border-slate-200 text-slate-800" data-testid="stl-date-to" />
                    {(stlDateFrom || stlDateTo) && <Button variant="ghost" size="sm" onClick={() => { setStlDateFrom(''); setStlDateTo(''); }} className="text-slate-400 hover:text-red-500 h-8 text-xs">Clear</Button>}
                  </div>
                  {(() => {
                    const filteredStls = settlements.filter(s => {
                      const d = s.settlement_date || s.created_at || '';
                      if (stlDateFrom && d < stlDateFrom) return false;
                      if (stlDateTo && d > stlDateTo + 'T23:59:59') return false;
                      return true;
                    });
                    return (
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {filteredStls.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No settlement history
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Pay Currency</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Commission</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reserve Fund</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Extra Charges</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Net Received</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStls.map((settlement) => {
                            const hasDiffCurrency = settlement.payment_currency && settlement.payment_currency !== 'USD';
                            const rate = settlement.avg_exchange_rate || 1;
                            const baseGross = hasDiffCurrency ? settlement.base_gross_amount : null;
                            const baseComm = hasDiffCurrency && baseGross ? ((settlement.commission_amount || 0) / rate) : null;
                            const baseReserve = hasDiffCurrency && baseGross ? ((settlement.reserve_fund_amount || settlement.chargeback_amount || 0) / rate) : null;
                            const extraUsd = (settlement.extra_charges || 0) + (settlement.gateway_fees || 0);
                            const baseExtra = hasDiffCurrency && baseGross ? (extraUsd / rate) : null;
                            const baseNet = hasDiffCurrency && baseGross ? (baseGross - (baseComm || 0) - (baseReserve || 0) - (baseExtra || 0)) : null;
                            const isCompound = settlement.settlement_type === 'compound' || settlement.settlement_type === 'net_settlement' || (settlement.transaction_count > 1);
                            const isNetSettle = settlement.settlement_type === 'net_settlement';
                            const isExpanded = expandedSettlement === settlement.settlement_id;
                            return (
                            <React.Fragment key={settlement.settlement_id}>
                            <TableRow className={`border-slate-200 hover:bg-slate-100 ${isExpanded ? 'bg-slate-50' : ''}`} data-testid={`settlement-row-${settlement.settlement_id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isCompound && (
                                    <button
                                      onClick={() => toggleSettlementDetail(settlement)}
                                      className="text-slate-400 hover:text-[#66FCF1] transition-colors"
                                      data-testid={`expand-settlement-${settlement.settlement_id}`}
                                    >
                                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                  <div>
                                    <span className="font-mono text-slate-800 text-xs">{settlement.reference || settlement.settlement_id}</span>
                                    {settlement.transaction_count > 1 && (
                                      <p className="text-[10px] text-slate-500">
                                        {isNetSettle 
                                          ? `${settlement.deposit_count || 0} deposits + ${settlement.withdrawal_count || 0} withdrawals`
                                          : `${settlement.transaction_count} transactions`}
                                      </p>
                                    )}
                                    {isNetSettle ? (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 text-[9px] mt-0.5">Net Settlement</Badge>
                                    ) : isCompound && (
                                      <Badge className="bg-[#66FCF1]/10 text-[#0B0C10] border-[#66FCF1]/30 text-[9px] mt-0.5">Compound</Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-800 font-medium">
                                {settlement.payment_currency || 'USD'}
                                {hasDiffCurrency && rate !== 1 && <p className="text-[10px] text-slate-400">Rate: {rate}</p>}
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-slate-800 text-xs">
                                  ${settlement.gross_amount?.toLocaleString()}
                                  {hasDiffCurrency && baseGross && <p className="text-[10px] text-blue-500">{baseGross.toLocaleString(undefined, {maximumFractionDigits: 2})} {settlement.payment_currency}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-yellow-400 text-xs">
                                  -${(settlement.commission_amount || 0).toLocaleString()}
                                  {hasDiffCurrency && baseComm != null && <p className="text-[10px] text-blue-500">-{baseComm.toLocaleString(undefined, {maximumFractionDigits: 2})} {settlement.payment_currency}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-red-400 text-xs">
                                  {settlement.chargeback_amount || settlement.reserve_fund_amount ? `-$${(settlement.reserve_fund_amount || settlement.chargeback_amount).toLocaleString()}` : '-'}
                                  {hasDiffCurrency && baseReserve != null && baseReserve > 0 && <p className="text-[10px] text-blue-500">-{baseReserve.toLocaleString(undefined, {maximumFractionDigits: 2})} {settlement.payment_currency}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-orange-400 text-xs">
                                  {extraUsd > 0 ? `-$${extraUsd.toLocaleString()}` : '-'}
                                  {hasDiffCurrency && baseExtra != null && baseExtra > 0 && <p className="text-[10px] text-blue-500">-{baseExtra.toLocaleString(undefined, {maximumFractionDigits: 2})} {settlement.payment_currency}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-green-500 font-bold text-xs">
                                  +${settlement.net_amount?.toLocaleString()}
                                  {hasDiffCurrency && baseNet != null && <p className="text-[10px] text-blue-500 font-normal">{baseNet.toLocaleString(undefined, {maximumFractionDigits: 2})} {settlement.payment_currency}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs">{formatDate(settlement.settled_at || settlement.created_at)}</TableCell>
                              <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                            </TableRow>
                            {/* Expanded detail: individual transactions in compound settlement */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/80">
                                <TableCell colSpan={9} className="p-0">
                                  <div className="px-6 py-3 border-l-2 border-[#66FCF1] ml-4">
                                    <p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-wider">
                                      Included Transactions ({expandedTxs.length})
                                      {isNetSettle && expandedTxs.length > 0 && (
                                        <span className="normal-case font-normal ml-2">
                                          — {expandedTxs.filter(t => t.transaction_type === 'deposit').length} Deposits, {expandedTxs.filter(t => t.transaction_type === 'withdrawal').length} Withdrawals
                                        </span>
                                      )}
                                    </p>
                                    {expandedTxs.length === 0 ? (
                                      <p className="text-xs text-slate-400">Loading...</p>
                                    ) : (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-slate-400 border-b border-slate-200">
                                            <th className="text-left py-1 font-medium">Reference</th>
                                            <th className="text-left py-1 font-medium">Type</th>
                                            <th className="text-left py-1 font-medium">Client</th>
                                            <th className="text-right py-1 font-medium">Amount (USD)</th>
                                            <th className="text-right py-1 font-medium">Commission</th>
                                            <th className="text-right py-1 font-medium">Extra Charges</th>
                                            <th className="text-right py-1 font-medium">Extra Comm.</th>
                                            <th className="text-right py-1 font-medium">Net</th>
                                            <th className="text-left py-1 font-medium">Date</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedTxs.map((tx) => {
                                            const isWithdrawal = tx.transaction_type === 'withdrawal';
                                            const comm = tx.psp_commission_amount || 0;
                                            const extraCharges = (tx.psp_extra_charges || 0) + (tx.psp_gateway_fee || 0);
                                            const extraComm = isWithdrawal ? (tx.psp_withdrawal_extra_commission || 0) : (tx.psp_extra_commission || 0);
                                            const reserve = tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0;
                                            const netAmt = isWithdrawal
                                              ? -(tx.amount + extraComm)
                                              : (tx.amount - comm - extraCharges - extraComm - reserve);
                                            return (
                                            <tr key={tx.transaction_id} className="border-b border-slate-100">
                                              <td className="py-1.5 font-mono text-slate-700">{tx.reference || tx.transaction_id}</td>
                                              <td className="py-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isWithdrawal ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                                  {tx.transaction_type || '-'}
                                                </span>
                                              </td>
                                              <td className="py-1.5 text-slate-600">{tx.client_name || '-'}</td>
                                              <td className={`py-1.5 text-right font-mono ${isWithdrawal ? 'text-red-500' : 'text-slate-800'}`}>
                                                {isWithdrawal ? '-' : ''}${tx.amount?.toLocaleString()}
                                              </td>
                                              <td className="py-1.5 text-right font-mono text-yellow-500">
                                                {comm > 0 ? `-$${comm.toLocaleString()}` : '-'}
                                              </td>
                                              <td className="py-1.5 text-right font-mono text-orange-400">
                                                {extraCharges > 0 ? `-$${extraCharges.toLocaleString()}` : '-'}
                                              </td>
                                              <td className="py-1.5 text-right font-mono text-orange-400">
                                                {extraComm > 0 ? `-$${extraComm.toLocaleString()}` : '-'}
                                              </td>
                                              <td className={`py-1.5 text-right font-mono font-bold ${netAmt >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {netAmt >= 0 ? '+' : ''}${netAmt.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                              </td>
                                              <td className="py-1.5 text-slate-500">{(tx.transaction_date || tx.created_at) ? new Date(tx.transaction_date || tx.created_at).toLocaleDateString() : '-'}</td>
                                            </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                    );
                  })()}
                  {stlTotalPages > 1 && (
                    <div className="mt-2">
                       <PaginationControls currentPage={stlPage} totalPages={stlTotalPages} totalItems={stlTotal} pageSize={stlPageSize} onPageChange={(p) => fetchSettlements(viewPsp.psp_id, p)} onPageSizeChange={(ps) => { setStlPageSize(ps); fetchSettlements(viewPsp.psp_id, 1, ps); }} />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
        </div>
      </div>
      )}

      {/* Settle Transaction Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={() => { setSettleDialogOpen(false); setSelectedTransaction(null); setSettlementDestination(''); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Confirm Settlement
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="text-slate-800 font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span className="text-slate-800">{selectedTransaction.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Amount</span>
                  <span className="text-slate-800 font-mono">${selectedTransaction.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Commission ({selectedTransaction.psp_commission_paid_by === 'client' ? 'Client pays' : 'Broker pays'})</span>
                  <span className="text-red-400 font-mono">-${selectedTransaction.psp_commission_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Net to Settle</span>
                  <span className="text-green-400 font-mono text-lg">${selectedTransaction.psp_net_amount?.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Destination</Label>
                <Select
                  value={settlementDestination || (psps.find(p => p.psp_id === selectedTransaction.psp_id)?.settlement_destination_id || '')}
                  onValueChange={setSettlementDestination}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id} className="text-slate-800 hover:bg-slate-100">
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSettleDialogOpen(false); setSelectedTransaction(null); setSettlementDestination(''); }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleTransaction}
                  className="bg-green-500 text-slate-800 hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-settle-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Charges Dialog */}
      <Dialog open={chargesDialogOpen} onOpenChange={(open) => { if (!open) { setChargesDialogOpen(false); setSelectedTransaction(null); } }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Record Charges
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <form onSubmit={handleRecordCharges} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Transaction: <span className="text-slate-800 font-mono">{selectedTransaction.transaction_id}</span></p>
                <p className="text-sm text-slate-500">Amount: <span className="text-slate-800 font-mono">${selectedTransaction.amount?.toLocaleString()}</span></p>
                <p className="text-sm text-slate-500">Commission: <span className="text-yellow-400 font-mono">-${(selectedTransaction.psp_commission_amount || 0).toLocaleString()}</span></p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Reserve Fund Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.reserve_fund_amount}
                  onChange={(e) => setChargesForm({ ...chargesForm, reserve_fund_amount: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono"
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Extra Charges ({selectedTransaction?.base_currency && selectedTransaction?.base_currency !== 'USD' ? selectedTransaction.base_currency : 'USD'})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.extra_charges}
                  onChange={(e) => setChargesForm({ ...chargesForm, extra_charges: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono"
                  placeholder="0.00"
                />
                {selectedTransaction?.base_currency && selectedTransaction?.base_currency !== 'USD' && selectedTransaction?.exchange_rate && (
                  <p className="text-[10px] text-blue-500">= ${(parseFloat(chargesForm.extra_charges || 0) * (selectedTransaction.exchange_rate || 1)).toLocaleString(undefined, {maximumFractionDigits: 2})} USD (rate: {selectedTransaction.exchange_rate})</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Description</Label>
                <Input
                  value={chargesForm.charges_description}
                  onChange={(e) => setChargesForm({ ...chargesForm, charges_description: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  placeholder="Reason for charges..."
                />
              </div>
              
              {/* Settlement Preview */}
              {(() => {
                const txRate = selectedTransaction?.exchange_rate || 1;
                const hasDiffCurrency = selectedTransaction?.base_currency && selectedTransaction?.base_currency !== 'USD';
                const payCurr = hasDiffCurrency ? selectedTransaction.base_currency : null;
                // Extra charges entered in payment currency → convert to USD for display
                const extraInPayCurrency = parseFloat(chargesForm.extra_charges || 0);
                const extraInUsd = hasDiffCurrency ? extraInPayCurrency * txRate : extraInPayCurrency;
                const reserveInPayCurrency = parseFloat(chargesForm.reserve_fund_amount || 0);
                const reserveInUsd = hasDiffCurrency ? reserveInPayCurrency * txRate : reserveInPayCurrency;
                const grossUsd = selectedTransaction?.amount || 0;
                const grossBase = selectedTransaction?.base_amount || grossUsd;
                const commUsd = selectedTransaction?.psp_commission_amount || 0;
                const commBase = hasDiffCurrency ? commUsd / txRate : commUsd;
                const netUsd = grossUsd - commUsd - reserveInUsd - extraInUsd;
                const netBase = hasDiffCurrency ? grossBase - commBase - reserveInPayCurrency - extraInPayCurrency : null;
                return (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 uppercase mb-2">Settlement Preview</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Amount</span>
                    <div className="text-right">
                      <span className="text-slate-800 font-mono">${grossUsd.toLocaleString()}</span>
                      {payCurr && <p className="text-[10px] text-blue-500">{grossBase.toLocaleString()} {payCurr}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commission</span>
                    <div className="text-right">
                      <span className="text-red-400 font-mono">-${commUsd.toLocaleString()}</span>
                      {payCurr && <p className="text-[10px] text-blue-500">-{commBase.toLocaleString(undefined, {maximumFractionDigits: 2})} {payCurr}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reserve Fund</span>
                    <div className="text-right">
                      <span className="text-red-400 font-mono">-${reserveInUsd.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      {payCurr && <p className="text-[10px] text-blue-500">-{reserveInPayCurrency.toLocaleString()} {payCurr}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Extra Charges</span>
                    <div className="text-right">
                      <span className="text-red-400 font-mono">-${extraInUsd.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      {payCurr && <p className="text-[10px] text-blue-500">-{extraInPayCurrency.toLocaleString()} {payCurr}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-800 font-bold">Net Settlement</span>
                    <div className="text-right">
                      <span className="text-blue-600 font-mono font-bold">${netUsd.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      {payCurr && netBase != null && <p className="text-[10px] text-green-500 font-bold">{netBase.toLocaleString(undefined, {maximumFractionDigits: 2})} {payCurr}</p>}
                    </div>
                  </div>
                </div>
              </div>
                );
              })()}
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setChargesDialogOpen(false)} className="border-slate-200 text-slate-500">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#66FCF1] hover:bg-[#66FCF1]/90 text-[#0B0C10] font-bold uppercase">
                  Save Charges
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Received Dialog */}
      <Dialog open={recordPaymentDialogOpen} onOpenChange={(open) => { if (!open) { setRecordPaymentDialogOpen(false); setSelectedTransaction(null); } }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <Wallet className="w-5 h-5 text-green-400" />
              Record Payment Received
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Summary */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reference</span>
                  <span className="text-slate-800 font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Client</span>
                  <span className="text-slate-800">{selectedTransaction.client_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PSP</span>
                  <span className="text-slate-800">{selectedTransaction.psp_name}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gross Amount</span>
                    <span className="text-slate-800 font-mono">${(selectedTransaction.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Commission</span>
                    <span className="text-yellow-400 font-mono">-${(selectedTransaction.psp_commission_amount || 0).toLocaleString()}</span>
                  </div>
                  {(selectedTransaction.psp_reserve_fund_amount || selectedTransaction.psp_chargeback_amount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Reserve Fund</span>
                      <span className="text-red-400 font-mono">-${(selectedTransaction.psp_reserve_fund_amount || selectedTransaction.psp_chargeback_amount).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTransaction.psp_extra_charges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Extra Charges</span>
                      <span className="text-red-400 font-mono">-${selectedTransaction.psp_extra_charges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-800 font-bold">Expected Net</span>
                    <span className="text-blue-600 font-mono font-bold">
                      ${((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_reserve_fund_amount || selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Holding Info */}
              {selectedTransaction.psp_holding_days > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Holding Period: {selectedTransaction.psp_holding_days} days</span>
                  </div>
                  {selectedTransaction.psp_holding_release_date && (
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      Release Date: {formatDate(selectedTransaction.psp_holding_release_date)}
                    </p>
                  )}
                </div>
              )}

              {/* Actual Amount Received */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Actual Amount Received (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.actual_amount_received}
                  onChange={(e) => setPaymentForm({ ...paymentForm, actual_amount_received: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-800 font-mono text-lg"
                  placeholder="Enter actual amount received"
                  data-testid="actual-amount-received"
                />
                <p className="text-xs text-slate-500">Leave as-is if the amount matches the expected net settlement</p>
              </div>

              {/* Settlement Destination */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Credit to Treasury Account</Label>
                <Select
                  value={paymentForm.destination_account_id || (psps.find(p => p.psp_id === selectedTransaction.psp_id)?.settlement_destination_id || '')}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, destination_account_id: value })}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id} className="text-slate-800 hover:bg-slate-100">
                        {account.account_name} - {account.bank_name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variance Warning */}
              {paymentForm.actual_amount_received && parseFloat(paymentForm.actual_amount_received) !== ((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_reserve_fund_amount || selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0)) && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Variance: ${(parseFloat(paymentForm.actual_amount_received) - ((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_reserve_fund_amount || selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0))).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRecordPaymentDialogOpen(false); setSelectedTransaction(null); }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="bg-green-500 text-slate-800 hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-record-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch/Compound Settlement Confirmation Dialog */}
      <Dialog open={batchSettleDialogOpen} onOpenChange={setBatchSettleDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#66FCF1]" />
              Compound Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              You are creating <strong className="text-slate-800">1 compound settlement</strong> from <strong className="text-[#66FCF1]">{batchSummary.count} transactions</strong>. 
              The net amount will be credited to your treasury as a single lump sum entry.
            </p>

            {/* Summary Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Gross Amount ({batchSummary.count} txns)</span>
                <div className="text-right">
                  <span className="font-mono text-slate-800 font-bold">${batchSummary.gross.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  {batchSummary.payCurrency && <p className="text-[10px] text-blue-500 font-mono">{batchSummary.baseGross?.toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency}</p>}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Commission</span>
                <div className="text-right">
                  <span className="font-mono text-yellow-600">-${batchSummary.commission.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  {batchSummary.payCurrency && batchSummary.avgRate && <p className="text-[10px] text-yellow-500 font-mono">-{(batchSummary.commission / batchSummary.avgRate).toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency}</p>}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reserve Fund</span>
                <div className="text-right">
                  <span className="font-mono text-red-500">-${batchSummary.reserve.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  {batchSummary.payCurrency && batchSummary.avgRate && batchSummary.reserve > 0 && <p className="text-[10px] text-red-400 font-mono">-{(batchSummary.reserve / batchSummary.avgRate).toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency}</p>}
                </div>
              </div>
              {batchSummary.extra > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Extra Charges</span>
                  <div className="text-right">
                    <span className="font-mono text-red-500">-${batchSummary.extra.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    {batchSummary.payCurrency && batchSummary.avgRate && <p className="text-[10px] text-red-400 font-mono">-{(batchSummary.extra / batchSummary.avgRate).toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency}</p>}
                  </div>
                </div>
              )}
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-700">Net to Treasury</span>
                <div className="text-right">
                  <span className="font-mono text-green-600">${batchSummary.net.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  {batchSummary.payCurrency && <p className="text-[10px] text-green-500 font-mono font-bold">{batchSummary.baseNet?.toLocaleString(undefined, {maximumFractionDigits: 2})} {batchSummary.payCurrency}</p>}
                </div>
              </div>
              {batchSummary.payCurrency && batchSummary.avgRate && (
                <div className="pt-1 text-[10px] text-slate-400 text-right">
                  Avg. FX Rate: 1 {batchSummary.payCurrency} = {batchSummary.avgRate.toFixed(4)} USD
                </div>
              )}
            </div>

            {/* Destination Treasury Account */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 text-xs uppercase tracking-wider">Destination Treasury Account</Label>
              <Select
                value={batchSettleDestination || viewPsp?.settlement_destination_id || ''}
                onValueChange={setBatchSettleDestination}
              >
                <SelectTrigger className="border-slate-200 bg-white text-slate-800" data-testid="batch-settle-destination">
                  <SelectValue placeholder="Use PSP default destination" />
                </SelectTrigger>
                <SelectContent>
                  {treasuryAccounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.account_name} - {account.bank_name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewPsp?.settlement_destination_name && !batchSettleDestination && (
                <p className="text-[10px] text-slate-400">Default: {viewPsp.settlement_destination_name}</p>
              )}
            </div>

            {/* Settlement Date */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 text-xs uppercase tracking-wider">Settlement Date (When credited to bank)</Label>
              <Input
                type="date"
                value={batchSettleDate}
                onChange={e => setBatchSettleDate(e.target.value)}
                className="border-slate-200 bg-white text-slate-800"
                data-testid="batch-settle-date"
              />
              <p className="text-[10px] text-slate-400">Date the PSP settlement was received in the bank. Used for reconciliation matching.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchSettleDialogOpen(false)}
                className="border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBatchSettle}
                disabled={batchSettling}
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#66FCF1]/80 font-bold"
                data-testid="confirm-batch-settle-btn"
              >
                {batchSettling ? 'Processing...' : `Settle $${batchSummary.net.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra Commission Dialog */}
      <Dialog open={extraCommDialog.open} onOpenChange={(open) => { if (!open) setExtraCommDialog({ open: false, tx: null, amount: '', note: '' }); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Extra Commission</DialogTitle>
          </DialogHeader>
          {extraCommDialog.tx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-slate-800">{extraCommDialog.tx.reference}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono text-red-500">${extraCommDialog.tx.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Client:</span>
                  <span className="text-slate-800">{extraCommDialog.tx.client_name || '-'}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Extra Commission Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extraCommDialog.amount}
                  onChange={(e) => setExtraCommDialog(prev => ({ ...prev, amount: e.target.value }))}
                  className="border-slate-200 bg-white text-slate-800"
                  placeholder="0.00"
                  data-testid="extra-comm-amount"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Note (Optional)</Label>
                <Input
                  value={extraCommDialog.note}
                  onChange={(e) => setExtraCommDialog(prev => ({ ...prev, note: e.target.value }))}
                  className="border-slate-200 bg-white text-slate-800"
                  placeholder="Reason for extra commission"
                  data-testid="extra-comm-note"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setExtraCommDialog({ open: false, tx: null, amount: '', note: '' })} className="border-slate-200 text-slate-600">Cancel</Button>
                <Button size="sm" onClick={handleExtraCommission} className="bg-orange-500 text-white hover:bg-orange-600" data-testid="save-extra-comm-btn">Save Extra Commission</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Net Settlement Dialog */}
      <Dialog open={netSettleDialogOpen} onOpenChange={setNetSettleDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Net Pending Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              This will settle <strong className="text-slate-800">all pending deposits and approved withdrawals</strong> for <strong className="text-[#66FCF1]">{viewPsp?.psp_name}</strong> as a single net amount to your treasury.
            </p>

            {(() => {
              const deps = pendingTransactions;
              const wdrs = pspWithdrawals.filter(tx => tx.status === 'approved');
              const depGross = deps.reduce((s, tx) => s + (tx.amount || 0), 0);
              const depComm = deps.reduce((s, tx) => s + (tx.psp_commission_amount || 0), 0);
              const depExtraCharges = deps.reduce((s, tx) => s + (tx.psp_extra_charges || 0), 0);
              const depExtraComm = deps.reduce((s, tx) => s + (tx.psp_extra_commission || 0), 0);
              const depReserve = deps.reduce((s, tx) => s + (tx.psp_reserve_fund_amount || tx.psp_chargeback_amount || 0), 0);
              const depGateway = deps.reduce((s, tx) => s + (tx.psp_gateway_fee || 0), 0);
              const depDeductions = depComm + depExtraCharges + depExtraComm + depReserve + depGateway;
              const depNet = depGross - depDeductions;
              const wdrGross = wdrs.reduce((s, tx) => s + (tx.amount || 0), 0);
              const wdrExtraComm = wdrs.reduce((s, tx) => s + (tx.psp_withdrawal_extra_commission || 0), 0);
              const wdrTotal = wdrGross + wdrExtraComm;
              const netAmount = depNet - wdrTotal;
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Deposits ({deps.length})</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gross Amount</span>
                    <span className="font-mono text-slate-800">${depGross.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  {depDeductions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Deductions (Comm + Extra + Reserve)</span>
                      <span className="font-mono text-yellow-600">-${depDeductions.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-600">Deposit Net</span>
                    <span className="font-mono text-slate-800">${depNet.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>

                  {wdrs.length > 0 && (
                    <>
                      <div className="border-t border-slate-200 my-2" />
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Withdrawals ({wdrs.length})</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Withdrawal Amount</span>
                        <span className="font-mono text-red-500">-${wdrGross.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      </div>
                      {wdrExtraComm > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Withdrawal Extra Commission</span>
                          <span className="font-mono text-red-500">-${wdrExtraComm.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-slate-700">Net to Treasury</span>
                    <span className="font-mono text-green-600">${netAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-slate-600 text-xs uppercase tracking-wider">Destination Treasury Account</Label>
              <Select
                value={netSettleDestination || viewPsp?.settlement_destination_id || ''}
                onValueChange={setNetSettleDestination}
              >
                <SelectTrigger className="border-slate-200 bg-white text-slate-800" data-testid="net-settle-destination">
                  <SelectValue placeholder="Use PSP default destination" />
                </SelectTrigger>
                <SelectContent>
                  {treasuryAccounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.account_name} - {account.bank_name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewPsp?.settlement_destination_name && !netSettleDestination && (
                <p className="text-[10px] text-slate-400">Default: {viewPsp.settlement_destination_name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600 text-xs uppercase tracking-wider">Settlement Date</Label>
              <Input
                type="date"
                value={netSettleDate}
                onChange={e => setNetSettleDate(e.target.value)}
                className="border-slate-200 bg-white text-slate-800"
                data-testid="net-settle-date"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNetSettleDialogOpen(false)}
                className="border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleNetSettle}
                disabled={netSettling}
                className="bg-green-600 text-white hover:bg-green-700 font-bold"
                data-testid="confirm-net-settle-btn"
              >
                {netSettling ? 'Processing...' : 'Confirm Net Settlement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
