import { useEffect, useState } from 'react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Percent,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Banknote,
  Wallet,
  Receipt,
  FileText,
  Printer,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  ImageIcon,
  Archive,
  ArchiveRestore,
  Coins,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Exchangers() {
  const { user } = useAuth();
  const [vendors, setExchangers] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [vendorIeEntries, setVendorIeEntries] = useState([]);
  const [vendorLoanTxs, setVendorLoanTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExchanger, setSelectedExchanger] = useState(null);
  const [viewExchanger, setViewExchanger] = useState(null);
  const [proofGallery, setProofGallery] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settlementType, setSettlementType] = useState('bank');
  const [settlementDestination, setSettlementDestination] = useState('');
  const [settlementCommission, setSettlementCommission] = useState('');
  const [settlementCharges, setSettlementCharges] = useState('');
  const [settlementChargesDescription, setSettlementChargesDescription] = useState('');
  const [settlementAmountInDestCurrency, setSettlementAmountInDestCurrency] = useState('');
  const [settlementMode, setSettlementMode] = useState('full'); // 'full' or 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [customCurrency, setCustomCurrency] = useState('USD');
  const [isDirectTransfer, setIsDirectTransfer] = useState(false);
  const [settlementNotes, setSettlementNotes] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;
  
  const [formData, setFormData] = useState({
    vendor_name: '',
    email: '',
    password: '',
    deposit_commission: '',
    withdrawal_commission: '',
    deposit_commission_cash: '',
    withdrawal_commission_cash: '',
    description: '',
    status: 'active',
    dealing_currency: '',
  });

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'CHF', 'CAD', 'AUD', 'SGD', 'HKD', 'JPY', 'CNY'];

  const isAdmin = user?.role === 'admin';
  const isAccountantOrAdmin = user?.role === 'admin' || user?.role === 'accountant';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchExchangers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/vendors?page=${page}&page_size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format
        if (data.items) {
          setExchangers(data.items);
          setTotalPages(data.total_pages || 1);
          setTotalItems(data.total || 0);
          setCurrentPage(data.page || 1);
        } else {
          // Fallback for non-paginated response
          setExchangers(Array.isArray(data) ? data : []);
          setTotalPages(1);
          setTotalItems(Array.isArray(data) ? data.length : 0);
        }
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
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

  const fetchExchangerTransactions = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}/transactions`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setPendingTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendor transactions:', error);
    }
  };

  const fetchExchangerSettlements = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}/settlements`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSettlements(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendor settlements:', error);
    }
  };

  const fetchVendorIeEntries = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/income-expenses?vendor_id=${vendorId}&page_size=100`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        setVendorIeEntries(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (error) {
      console.error('Error fetching vendor I&E entries:', error);
      setVendorIeEntries([]);
    }
  };

  const fetchVendorLoanTransactions = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/loans/transactions?vendor_id=${vendorId}&page_size=100`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        setVendorLoanTxs(Array.isArray(data) ? data : (data.items || data.transactions || []));
      }
    } catch (error) {
      console.error('Error fetching vendor loan transactions:', error);
      setVendorLoanTxs([]);
    }
  };

  const fetchExchangerDetails = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const vendorData = await response.json();
        setViewExchanger(vendorData);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    }
  };

  const openExchangerView = async (vendor) => {
    setViewExchanger(vendor);
    setDetailLoading(true);
    setPendingTransactions([]);
    setSettlements([]);
    setVendorIeEntries([]);
    setVendorLoanTxs([]);
    
    try {
      await Promise.all([
        fetchExchangerDetails(vendor.vendor_id),
        fetchVendorIeEntries(vendor.vendor_id),
        fetchVendorLoanTransactions(vendor.vendor_id),
        fetchExchangerTransactions(vendor.vendor_id),
        fetchExchangerSettlements(vendor.vendor_id)
      ]);
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatement = async (settlementId) => {
    setStatementLoading(true);
    setStatementOpen(true);
    try {
      const response = await fetch(`${API_URL}/api/settlements/${settlementId}/statement`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setStatementData(await response.json());
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setStatementLoading(false);
    }
  };

  const printStatement = () => {
    const el = document.getElementById('settlement-statement');
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Settlement Statement</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; padding: 40px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0B3D91; padding-bottom: 20px; margin-bottom: 24px; }
      .logo { font-size: 22px; font-weight: 800; color: #0B3D91; }
      .subtitle { font-size: 11px; color: #666; margin-top: 2px; }
      .stmt-title { font-size: 18px; font-weight: 700; text-align: right; color: #0B3D91; }
      .stmt-id { font-size: 11px; color: #666; text-align: right; }
      .info-row { display: flex; gap: 40px; margin-bottom: 20px; }
      .info-block { flex: 1; }
      .info-block h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
      .info-block p { font-size: 12px; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { background: #0B3D91; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; text-align: left; }
      td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e5e5e5; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .summary { background: #f0f4fa; border: 1px solid #d0d8e8; border-radius: 4px; padding: 16px; margin-top: 20px; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
      .summary-row.total { border-top: 2px solid #0B3D91; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 15px; color: #0B3D91; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #888; text-align: center; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
      .badge-approved { background: #d1fae5; color: #065f46; }
      .badge-pending { background: #fef3c7; color: #92400e; }
      .mono { font-family: 'Courier New', monospace; }
    </style></head><body>`);
    win.document.write(el.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const fmtCurrency = (amount, currency) => {
    if (!currency || currency === 'USD') return `$${(amount || 0).toLocaleString()}`;
    return `${currency} ${(amount || 0).toLocaleString()}`;
  };

  useEffect(() => {
    fetchExchangers(currentPage, searchTerm);
    fetchTreasuryAccounts();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (viewExchanger) {
      fetchExchangerTransactions(viewExchanger.vendor_id);
      fetchExchangerSettlements(viewExchanger.vendor_id);
    }
  }, [viewExchanger?.vendor_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedExchanger
        ? `${API_URL}/api/vendors/${selectedExchanger.vendor_id}`
        : `${API_URL}/api/vendors`;
      const method = selectedExchanger ? 'PUT' : 'POST';

      const payload = {
        vendor_name: formData.vendor_name,
        deposit_commission: parseFloat(formData.deposit_commission) || 0,
        withdrawal_commission: parseFloat(formData.withdrawal_commission) || 0,
        deposit_commission_cash: parseFloat(formData.deposit_commission_cash) || 0,
        withdrawal_commission_cash: parseFloat(formData.withdrawal_commission_cash) || 0,
        description: formData.description || null,
        dealing_currency: formData.dealing_currency || null,
      };

      if (!selectedExchanger) {
        payload.email = formData.email;
        payload.password = formData.password;
      } else {
        payload.status = formData.status;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedExchanger ? 'Exchanger updated' : 'Exchanger created');
        setIsDialogOpen(false);
        resetForm();
        fetchExchangers(currentPage, searchTerm);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Exchanger deleted');
        fetchExchangers(currentPage, searchTerm);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleEdit = (vendor) => {
    setSelectedExchanger(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      email: vendor.email,
      password: '',
      deposit_commission: vendor.deposit_commission?.toString() || '',
      withdrawal_commission: vendor.withdrawal_commission?.toString() || '',
      deposit_commission_cash: vendor.deposit_commission_cash?.toString() || '',
      withdrawal_commission_cash: vendor.withdrawal_commission_cash?.toString() || '',
      description: vendor.description || '',
      status: vendor.status,
      dealing_currency: vendor.dealing_currency || '',
    });
    setIsDialogOpen(true);
  };

  const handleArchive = async (vendor) => {
    if (!window.confirm(`Archive "${vendor.vendor_name}"? They will no longer appear in reports or daily emails, and cannot receive new transactions.`)) return;
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendor.vendor_id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success(`${vendor.vendor_name} has been archived`);
        fetchExchangers(currentPage, searchTerm);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to archive exchanger');
    }
  };

  const handleUnarchive = async (vendor) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendor.vendor_id}/unarchive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success(`${vendor.vendor_name} has been restored to active`);
        fetchExchangers(currentPage, searchTerm);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to unarchive exchanger');
    }
  };

  const handleSettleExchanger = async () => {
    const isCustom = settlementMode === 'custom';
    const isDirect = isDirectTransfer;

    // Validations
    if (!viewExchanger) return;
    if (!isDirect && !settlementDestination) {
      toast.error('Please select a settlement destination');
      return;
    }
    if (isCustom && (!customAmount || parseFloat(customAmount) <= 0)) {
      toast.error('Please enter a valid custom settlement amount');
      return;
    }

    const destAccount = !isDirect ? treasuryAccounts.find(a => a.account_id === settlementDestination) : null;
    const destCurrency = destAccount?.currency || customCurrency || 'USD';
    const baseCurrencyData = viewExchanger?.settlement_by_currency?.[0];
    const baseCurrency = isCustom ? customCurrency : (baseCurrencyData?.currency || 'USD');
    const isSameCurrency = destCurrency === baseCurrency;

    if (!isCustom && !isSameCurrency && !settlementAmountInDestCurrency && !isDirect) {
      toast.error(`Please enter the settlement amount in ${destCurrency}`);
      return;
    }

    try {
      const preCalculatedCommission = isCustom ? 0 : (baseCurrencyData?.commission_earned_base || 0);

      const payload = {
        settlement_type: settlementType,
        destination_account_id: isDirect ? null : settlementDestination,
        commission_amount: preCalculatedCommission,
        charges_amount: parseFloat(settlementCharges) || 0,
        charges_description: settlementChargesDescription || null,
        source_currency: baseCurrency,
        destination_currency: isDirect ? baseCurrency : destCurrency,
        settlement_amount_in_dest_currency: settlementAmountInDestCurrency ? parseFloat(settlementAmountInDestCurrency) : null,
        settlement_mode: settlementMode,
        custom_amount: isCustom ? parseFloat(customAmount) : null,
        custom_currency: isCustom ? customCurrency : null,
        is_direct_transfer: isDirect,
        notes: settlementNotes || null,
      };

      const response = await fetch(`${API_URL}/api/vendors/${viewExchanger.vendor_id}/settle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Settlement submitted for approval');
        resetSettleDialog();
        fetchExchangerTransactions(viewExchanger.vendor_id);
        fetchExchangerSettlements(viewExchanger.vendor_id);
        fetchExchangers(currentPage, searchTerm);
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const resetSettleDialog = () => {
    setSettleDialogOpen(false);
    setSettlementType('bank');
    setSettlementDestination('');
    setSettlementCommission('');
    setSettlementCharges('');
    setSettlementChargesDescription('');
    setSettlementAmountInDestCurrency('');
    setSettlementMode('full');
    setCustomAmount('');
    setCustomCurrency('USD');
    setIsDirectTransfer(false);
    setSettlementNotes('');
  };

  const resetForm = () => {
    setSelectedExchanger(null);
    setFormData({
      vendor_name: '',
      email: '',
      password: '',
      deposit_commission: '',
      withdrawal_commission: '',
      deposit_commission_cash: '',
      withdrawal_commission_cash: '',
      description: '',
      status: 'active',
      dealing_currency: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
      archived: 'bg-slate-100 text-slate-500 border border-slate-200',
      pending: 'status-pending',
      approved: 'status-approved',
      completed: 'status-approved',
      rejected: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
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

  const totalPendingAmount = vendors.reduce((sum, v) => sum + (v.pending_amount || 0), 0);
  const pendingApproved = pendingTransactions.filter(t => t.status === 'approved' && !t.settled);

  return (
    <>
    {viewExchanger ? (
      <div className="space-y-6 animate-fade-in" data-testid="exchanger-detail-page">
        {/* Back button + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setViewExchanger(null); setPendingTransactions([]); setSettlements([]); }} className="text-slate-500 hover:text-slate-800 h-8 w-8 p-0" data-testid="back-to-exchangers">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Store className="w-6 h-6 text-blue-600" />
          <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
            {viewExchanger?.vendor_name}
          </h1>
          {detailLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
        </div>

        {/* Archived banner */}
        {viewExchanger.status === 'archived' && (
          <div className="flex items-center gap-3 p-3 bg-slate-100 border border-slate-200 rounded-sm text-slate-500 text-sm">
            <Archive className="w-4 h-4 shrink-0" />
            <span>This exchanger is <strong>archived</strong> — excluded from reports and daily emails. New transactions are blocked.</span>
            {isAccountantOrAdmin && (
              <Button size="sm" variant="outline" className="ml-auto text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleUnarchive(viewExchanger)}>
                <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Restore
              </Button>
            )}
          </div>
        )}

        {/* Exchanger Info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Money In (Bank)</p>
            <p className="text-xl font-mono text-slate-800">{viewExchanger.deposit_commission || 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Money In (Cash)</p>
            <p className="text-xl font-mono text-amber-600">{viewExchanger.deposit_commission_cash || 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Money Out (Bank)</p>
            <p className="text-xl font-mono text-slate-800">{viewExchanger.withdrawal_commission || 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Money Out (Cash)</p>
            <p className="text-xl font-mono text-amber-600">{viewExchanger.withdrawal_commission_cash || 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dealing Currency</p>
            {viewExchanger.dealing_currency ? (
              <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-mono flex items-center gap-1 w-fit mt-1">
                <Coins className="w-3.5 h-3.5" />{viewExchanger.dealing_currency}
              </Badge>
            ) : (
              <p className="text-sm text-slate-400">All currencies</p>
            )}
          </div>
        </div>
              <div className="p-4 bg-slate-50 rounded-sm border-l-4 border-l-[#1FA21B]">
                <p className="text-xs text-blue-600 uppercase tracking-wider mb-3">Settlement Balance (Money In - Money Out - Commission)</p>
                {viewExchanger.settlement_by_currency && viewExchanger.settlement_by_currency.length > 0 ? (
                  <div className="space-y-3">
                    {viewExchanger.settlement_by_currency.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                              item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                              item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                              item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {item.currency}
                            </Badge>
                            <span className="text-xs text-slate-500">({item.transaction_count} entries)</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold font-mono ${item.amount >= 0 ? 'text-blue-600' : 'text-red-400'}`}>
                              {item.amount?.toLocaleString()}
                            </span>
                            {item.currency !== 'USD' && (
                              <span className="text-xs text-slate-500 block">≈ ${item.usd_equivalent?.toLocaleString()} USD</span>
                            )}
                          </div>
                        </div>
                        {/* Money In breakdown */}
                        <div className="pl-2 text-xs space-y-0.5">
                          <div className="flex justify-between text-green-400">
                            <span>Money In:</span>
                            <span>+{item.total_in?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 pl-3">
                            <span>Deposits ({item.deposit_count})</span>
                            <span>+{item.deposit_amount?.toLocaleString()}</span>
                          </div>
                          {(item.ie_in > 0) && <div className="flex justify-between text-slate-400 pl-3"><span>I&E In</span><span>+{item.ie_in?.toLocaleString()}</span></div>}
                          {(item.loan_in > 0) && <div className="flex justify-between text-slate-400 pl-3"><span>Loan In</span><span>+{item.loan_in?.toLocaleString()}</span></div>}
                          {/* Money Out breakdown */}
                          <div className="flex justify-between text-red-400">
                            <span>Money Out:</span>
                            <span>-{item.total_out?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 pl-3">
                            <span>Withdrawals ({item.withdrawal_count})</span>
                            <span>-{item.withdrawal_amount?.toLocaleString()}</span>
                          </div>
                          {(item.ie_out > 0) && <div className="flex justify-between text-slate-400 pl-3"><span>I&E Out</span><span>-{item.ie_out?.toLocaleString()}</span></div>}
                          {(item.loan_out > 0) && <div className="flex justify-between text-slate-400 pl-3"><span>Loan Out</span><span>-{item.loan_out?.toLocaleString()}</span></div>}
                          {/* Commission */}
                          <div className="flex justify-between text-yellow-400">
                            <span>Commission:</span>
                            <span>-{item.commission_earned_base?.toLocaleString()}</span>
                          </div>
                          {/* Custom Settled */}
                          {(item.custom_settled > 0) && (
                            <div className="flex justify-between text-blue-500">
                              <span>Custom Settled:</span>
                              <span>-{item.custom_settled?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 text-sm">Total Commission:</span>
                        <span className="text-sm font-bold font-mono text-yellow-400">
                          ${viewExchanger.settlement_by_currency.reduce((sum, item) => sum + (item.commission_earned_usd || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Net Settlement (USD):</span>
                        <span className={`text-lg font-bold font-mono ${viewExchanger.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0) >= 0 ? 'text-slate-800' : 'text-red-400'}`}>
                          ${viewExchanger.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No pending settlement</p>
                )}
              </div>

              {/* Settle Button */}
              {isAccountantOrAdmin && pendingTransactions.filter(t => (t.status === 'approved' || t.status === 'completed') && !t.settled).length > 0 && (
                <Button
                  onClick={() => setSettleDialogOpen(true)}
                  className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  data-testid="settle-vendor-btn"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Settle Exchanger Balance (${viewExchanger?.settlement_by_currency?.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString() || '0'})
                </Button>
              )}

              {/* Tabs */}
              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="bg-slate-50 border border-slate-200">
                  <TabsTrigger value="transactions" className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]">
                    Transactions ({pendingTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]">
                    Settlement History
                  </TabsTrigger>
                  <TabsTrigger value="ie" className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]">
                    Income/Expenses ({vendorIeEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="loans" className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]">
                    Loan Transactions ({vendorLoanTxs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="transactions" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {pendingTransactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No transactions
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Client</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Amount</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Currency</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Commission</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Mode</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Settled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTransactions.map((tx) => {
                            const displayCurrency = tx.base_currency || tx.currency || 'USD';
                            const displayAmount = tx.base_amount || tx.amount;
                            return (
                            <TableRow key={tx.transaction_id} className="border-slate-200 hover:bg-slate-100">
                              <TableCell className="font-mono text-slate-800">
                              <div className="flex items-center gap-1">
                                {tx.reference}
                                {(tx.proof_images?.length || tx.proof_image) && (
                                  <button onClick={() => { const imgs = tx.proof_images?.length ? tx.proof_images : [tx.proof_image]; setProofGallery({ images: imgs, label: tx.reference }); }} className="text-blue-500 hover:text-blue-700" title="View proof images">
                                    <ImageIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              </TableCell>
                              <TableCell>
                                <span className={`flex items-center gap-1 ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                  {tx.transaction_type === 'deposit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {tx.transaction_type}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-800">{tx.client_name}</TableCell>
                              <TableCell className="font-mono text-slate-800">
                                {displayAmount?.toLocaleString()}
                                {tx.base_currency && tx.base_currency !== tx.currency && (
                                  <span className="text-xs text-slate-500 block">(${tx.amount?.toLocaleString()} USD)</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${
                                  displayCurrency === 'USD' ? 'bg-green-500/20 text-green-400' :
                                  displayCurrency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                                  displayCurrency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                                  displayCurrency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                                  displayCurrency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {displayCurrency}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {tx.vendor_commission_base_amount ? (
                                  <div className="font-mono text-yellow-400">
                                    <span>{tx.vendor_commission_base_amount?.toLocaleString()} {tx.vendor_commission_base_currency || tx.base_currency || 'USD'}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={tx.transaction_mode === 'cash' ? 'bg-amber-100 text-amber-700 text-[10px]' : 'bg-blue-100 text-blue-700 text-[10px]'}>
                                  {tx.transaction_mode === 'cash' ? 'Cash' : 'Bank'}
                                </Badge>
                                {tx.transaction_mode === 'cash' && tx.collecting_person_name && (
                                  <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                                    <p className="font-medium">{tx.collecting_person_name}</p>
                                    {tx.collecting_person_number && <p className="text-slate-500">{tx.collecting_person_number}</p>}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(tx.status)}</TableCell>
                              <TableCell>
                                {tx.settled ? (
                                  <Badge className="bg-green-500/20 text-green-400">Yes</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-400">No</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {settlements.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No settlement history
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">ID</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Deductions</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Settled</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.settlement_id} className="border-slate-200 hover:bg-slate-100">
                              <TableCell className="font-mono text-slate-800 text-xs">{settlement.settlement_id}</TableCell>
                              <TableCell>
                                <Badge className={settlement.settlement_type === 'bank' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}>
                                  {settlement.settlement_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-slate-800">
                                {settlement.source_currency && settlement.source_currency !== 'USD'
                                  ? `${settlement.source_currency} ${settlement.gross_amount?.toLocaleString()}`
                                  : `$${settlement.gross_amount?.toLocaleString()}`}
                              </TableCell>
                              <TableCell className="font-mono text-red-400">
                                <div className="text-xs">
                                  <div>Comm: -{settlement.source_currency && settlement.source_currency !== 'USD' ? `${settlement.source_currency} ` : '$'}{settlement.commission_amount?.toLocaleString()}</div>
                                  {settlement.charges_amount > 0 && (
                                    <div>Charges: -{settlement.source_currency && settlement.source_currency !== 'USD' ? `${settlement.source_currency} ` : '$'}{settlement.charges_amount?.toLocaleString()}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-green-400">
                                {settlement.destination_currency && settlement.destination_currency !== 'USD' ? (
                                  <span>{settlement.destination_currency} {settlement.settlement_amount?.toLocaleString()}</span>
                                ) : (
                                  <span>${settlement.settlement_amount?.toLocaleString()}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-500">{formatDate(settlement.settled_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openStatement(settlement.settlement_id)}
                                  className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                                  data-testid={`view-statement-${settlement.settlement_id}`}
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" />
                                  <span className="text-xs">Statement</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ie" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {vendorIeEntries.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No income/expense entries for this exchanger</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-slate-500 text-xs uppercase">Reference</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Type</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Category</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Amount</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Currency</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Commission</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Mode</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Status</TableHead>
                            <TableHead className="text-slate-500 text-xs uppercase">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorIeEntries.map((entry) => {
                            const isIncome = entry.entry_type === 'income';
                            return (
                              <TableRow key={entry.entry_id} className="border-slate-200 hover:bg-slate-50">
                                <TableCell className="font-mono text-xs text-slate-800">{entry.entry_id?.slice(-10)?.toUpperCase()}</TableCell>
                                <TableCell>
                                  <span className={`flex items-center gap-1 text-xs ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                                    {isIncome ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    {isIncome ? 'Income' : 'Expense'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-slate-600 text-xs capitalize">{entry.category?.replace('_', ' ') || '-'}</TableCell>
                                <TableCell className={`font-mono text-xs ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                                  {isIncome ? '+' : '-'}{entry.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge className="text-[10px] bg-slate-100 text-slate-600">{entry.currency || 'USD'}</Badge>
                                </TableCell>
                                <TableCell>
                                  {entry.vendor_commission_base_amount ? (
                                    <span className="font-mono text-xs text-yellow-600">
                                      {entry.vendor_commission_base_amount?.toLocaleString()} {entry.vendor_commission_base_currency || entry.base_currency || entry.currency}
                                    </span>
                                  ) : <span className="text-slate-400 text-xs">-</span>}
                                </TableCell>
                                <TableCell>
                                  <Badge className={entry.transaction_mode === 'cash' ? 'bg-amber-100 text-amber-700 text-[10px]' : 'bg-blue-100 text-blue-700 text-[10px]'}>
                                    {entry.transaction_mode === 'cash' ? 'Cash' : 'Bank'}
                                  </Badge>
                                  {entry.transaction_mode === 'cash' && entry.collecting_person_name && (
                                    <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                                      <p className="font-medium">{entry.collecting_person_name}</p>
                                      {entry.collecting_person_number && <p className="text-slate-500">{entry.collecting_person_number}</p>}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {entry.status === 'pending_vendor' && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Pending</Badge>}
                                  {entry.status === 'completed' && <Badge className="bg-green-100 text-green-700 text-[10px]">Completed</Badge>}
                                  {entry.status === 'rejected' && <Badge className="bg-red-100 text-red-700 text-[10px]">Rejected</Badge>}
                                  {entry.status === 'active' && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Active</Badge>}
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                  {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Loan Transactions Tab */}
                <TabsContent value="loans" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {vendorLoanTxs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No loan transactions involving this exchanger
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Borrower</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Amount</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Currency</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorLoanTxs.map((tx) => {
                            const isDisbursement = tx.transaction_type === 'disbursement';
                            const isVendorSource = tx.source_vendor_id === viewExchanger?.vendor_id;
                            return (
                              <TableRow key={tx.transaction_id} className="border-slate-200 hover:bg-slate-100">
                                <TableCell className="font-mono text-slate-800 text-xs">{tx.transaction_id?.slice(-12).toUpperCase()}</TableCell>
                                <TableCell>
                                  <span className={`flex items-center gap-1 ${isVendorSource ? 'text-red-400' : 'text-green-400'}`}>
                                    {isVendorSource ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    <span className="text-xs font-medium">{isVendorSource ? 'OUT (Disbursement)' : 'IN (Repayment)'}</span>
                                  </span>
                                </TableCell>
                                <TableCell className="text-slate-800 text-sm">{tx.borrower_name || '-'}</TableCell>
                                <TableCell className={`font-mono ${isVendorSource ? 'text-red-400' : 'text-green-400'}`}>
                                  {isVendorSource ? '-' : '+'}{tx.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-500/20 text-green-400">{tx.currency || 'USD'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={
                                    tx.status === 'pending_vendor' ? 'bg-amber-100 text-amber-700 text-[10px]' :
                                    tx.status === 'completed' ? 'bg-green-100 text-green-700 text-[10px]' :
                                    tx.status === 'rejected' ? 'bg-red-100 text-red-700 text-[10px]' :
                                    'bg-slate-100 text-slate-600 text-[10px]'
                                  }>
                                    {tx.status === 'pending_vendor' ? 'Pending' : tx.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
    ) : (
    <div className="space-y-6 animate-fade-in" data-testid="vendors-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
            Exchangers
          </h1>
          <p className="text-slate-500">Manage exchangers, commissions, and settlements</p>
        </div>
        {isAccountantOrAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
                data-testid="add-vendor-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exchanger
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedExchanger ? 'Edit Exchanger' : 'Add New Exchanger'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Exchanger Name *</Label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    placeholder="e.g., MoneyExchange Pro"
                    data-testid="vendor-name"
                    required
                  />
                </div>
                
                {!selectedExchanger && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">Email (Login) *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                        placeholder="vendor@example.com"
                        data-testid="vendor-email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">Password *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                        placeholder="Min 6 characters"
                        data-testid="vendor-password"
                        required
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-3">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Commission Rates (%)</p>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div></div>
                    <Label className="text-center text-xs text-blue-600 uppercase">Bank</Label>
                    <Label className="text-center text-xs text-amber-600 uppercase">Cash</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-slate-500 text-xs uppercase">Money In</Label>
                    <Input type="number" step="0.01" value={formData.deposit_commission} onChange={(e) => setFormData({ ...formData, deposit_commission: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-mono" placeholder="0" data-testid="vendor-deposit-commission" />
                    <Input type="number" step="0.01" value={formData.deposit_commission_cash} onChange={(e) => setFormData({ ...formData, deposit_commission_cash: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-mono" placeholder="0" data-testid="vendor-deposit-commission-cash" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-slate-500 text-xs uppercase">Money Out</Label>
                    <Input type="number" step="0.01" value={formData.withdrawal_commission} onChange={(e) => setFormData({ ...formData, withdrawal_commission: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-mono" placeholder="0" data-testid="vendor-withdrawal-commission" />
                    <Input type="number" step="0.01" value={formData.withdrawal_commission_cash} onChange={(e) => setFormData({ ...formData, withdrawal_commission_cash: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-mono" placeholder="0" data-testid="vendor-withdrawal-commission-cash" />
                  </div>
                </div>
                
                {/* Dealing Currency */}
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-indigo-500" /> Dealing Currency
                  </Label>
                  <Select
                    value={formData.dealing_currency || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, dealing_currency: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="vendor-dealing-currency">
                      <SelectValue placeholder="No restriction (all currencies)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="__none__" className="text-slate-500 hover:bg-slate-100">No restriction (all currencies)</SelectItem>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c} className="text-slate-800 hover:bg-slate-100">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">If set, only transactions in this currency will be allowed for this exchanger.</p>
                </div>

                {selectedExchanger && (
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="vendor-status">
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
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    rows={2}
                    data-testid="vendor-description"
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
                    disabled={submitting}
                    className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                    data-testid="save-vendor-btn"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                    ) : (
                      selectedExchanger ? 'Update' : 'Create'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Exchangers</p>
                <p className="text-3xl font-bold font-mono text-slate-800">{vendors.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-sm">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net Settlement</p>
                <p className="text-3xl font-bold font-mono text-blue-600">${totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Exchangers</p>
                <p className="text-3xl font-bold font-mono text-slate-800">{vendors.filter(v => v.status === 'active').length}</p>
                {vendors.filter(v => v.status === 'archived').length > 0 && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Archive className="w-3 h-3" />{vendors.filter(v => v.status === 'archived').length} archived
                  </p>
                )}
              </div>
              <div className="p-3 bg-green-500/10 rounded-sm">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search exchangers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 bg-white border-slate-200"
            data-testid="vendor-search"
          />
        </div>
        <div className="text-sm text-slate-500">
          Showing {vendors.length} of {totalItems} exchangers
        </div>
      </div>

      {/* Exchangers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Store className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500">No vendors found</p>
            {isAccountantOrAdmin && <p className="text-sm text-slate-500/60 mt-2">Click "Add Exchanger" to create one</p>}
          </div>
        ) : (
          vendors.map((vendor) => (
            <Card
              key={vendor.vendor_id}
              className={`bg-white border-slate-200 card-hover cursor-pointer ${vendor.status === 'archived' ? 'opacity-60 grayscale-[30%]' : ''}`}
              onClick={() => openExchangerView(vendor)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-sm">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-800">{vendor.vendor_name}</CardTitle>
                      <p className="text-xs text-slate-500">{vendor.email}</p>
                    </div>
                  </div>
                  {isAccountantOrAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100" data-testid={`vendor-actions-${vendor.vendor_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-slate-200">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openExchangerView(vendor); }} className="text-slate-800 hover:bg-slate-100 cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(vendor); }} className="text-slate-800 hover:bg-slate-100 cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {vendor.status !== 'archived' ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(vendor); }} className="text-amber-600 hover:bg-amber-50 cursor-pointer">
                            <Archive className="w-4 h-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUnarchive(vendor); }} className="text-blue-600 hover:bg-blue-50 cursor-pointer">
                            <ArchiveRestore className="w-4 h-4 mr-2" /> Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(vendor.vendor_id); }} className="text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div></div>
                    <span className="text-center text-blue-600 font-semibold">Bank</span>
                    <span className="text-center text-amber-600 font-semibold">Cash</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-green-400" /> In
                    </span>
                    <span className="text-slate-800 font-mono text-center">{vendor.deposit_commission || 0}%</span>
                    <span className="text-slate-800 font-mono text-center">{vendor.deposit_commission_cash || 0}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-red-400" /> Out
                    </span>
                    <span className="text-slate-800 font-mono text-center">{vendor.withdrawal_commission || 0}%</span>
                    <span className="text-slate-800 font-mono text-center">{vendor.withdrawal_commission_cash || 0}%</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-xs uppercase tracking-wider">Net Settlement</span>
                    {vendor.settlement_by_currency && vendor.settlement_by_currency.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {vendor.settlement_by_currency.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <Badge className={`text-xs ${
                              item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                              item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                              item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                              item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {item.currency}
                            </Badge>
                            <span className="text-blue-600 font-mono">
                              {item.amount?.toLocaleString()}
                              {item.currency !== 'USD' && (
                                <span className="text-slate-500 text-xs ml-1">(${item.usd_equivalent?.toLocaleString()})</span>
                              )}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-slate-500 text-xs">Total USD</span>
                          <span className="text-blue-600 font-mono font-bold">${(vendor.pending_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm mt-1">No pending settlement</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {vendor.dealing_currency && (
                        <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs flex items-center gap-1">
                          <Coins className="w-3 h-3" />{vendor.dealing_currency}
                        </Badge>
                      )}
                      {getStatusBadge(vendor.status)}
                    </div>
                  </div>
                  {vendor.status === 'archived' && (
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
                      <Archive className="w-3 h-3" />
                      <span>Archived — excluded from reports &amp; emails</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  className={`cursor-pointer ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  className={`cursor-pointer ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
    )}

      {/* Settle Exchanger Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={() => resetSettleDialog()}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Settle Exchanger Balance
            </DialogTitle>
          </DialogHeader>
          {viewExchanger && (
            <div className="space-y-4">
              {/* Settlement Mode Toggle */}
              <div className="flex border border-slate-200 rounded-sm overflow-hidden">
                <button
                  onClick={() => setSettlementMode('full')}
                  className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${settlementMode === 'full' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  data-testid="settle-mode-full"
                >
                  Settle All
                </button>
                <button
                  onClick={() => setSettlementMode('custom')}
                  className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${settlementMode === 'custom' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  data-testid="settle-mode-custom"
                >
                  Custom Amount
                </button>
              </div>

              {/* Exchanger Info */}
              <div className="p-4 bg-slate-50 rounded-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Exchanger</span>
                  <span className="text-slate-800">{viewExchanger.vendor_name}</span>
                </div>

                {settlementMode === 'full' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transactions to Settle</span>
                      <span className="text-slate-800">{pendingTransactions.filter(t => (t.status === 'approved' || t.status === 'completed') && !t.settled).length}</span>
                    </div>

                    {viewExchanger?.settlement_by_currency?.map((item, idx) => (
                      <div key={idx} className="border-t border-slate-200 pt-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <Badge className={`text-xs ${
                            item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                            item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                            item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                            item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.currency}
                          </Badge>
                          <span className="text-slate-800 font-mono font-bold">
                            {item.amount?.toLocaleString()} {item.currency}
                          </span>
                        </div>
                        <div className="text-xs space-y-0.5 pl-1">
                          <div className="flex justify-between text-green-500"><span>Money In (Dep + I&E + Loan)</span><span>+{item.total_in?.toLocaleString()}</span></div>
                          <div className="flex justify-between text-red-400"><span>Money Out (Wdr + I&E + Loan)</span><span>-{item.total_out?.toLocaleString()}</span></div>
                          <div className="flex justify-between text-yellow-400"><span>Commission</span><span>-{item.commission_earned_base?.toLocaleString()}</span></div>
                        {(item.custom_settled > 0) && <div className="flex justify-between text-blue-400"><span>Custom Settled</span><span>-{item.custom_settled?.toLocaleString()}</span></div>}
                        </div>
                        {item.currency !== 'USD' && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">USD Equivalent</span>
                            <span className="text-slate-500">${item.usd_equivalent?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-blue-600 font-semibold">Total Net (USD)</span>
                      <span className="text-blue-600 font-mono font-bold">${viewExchanger?.settlement_by_currency?.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString() || '0'}</span>
                    </div>
                  </>
                ) : (
                  /* Custom Amount Mode */
                  <div className="border-t border-slate-200 pt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Currency *</Label>
                      <Select value={customCurrency} onValueChange={setCustomCurrency}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-800" data-testid="custom-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {['USD', 'AED', 'EUR', 'GBP', 'INR', 'USDT', 'SAR', 'BHD', 'OMR', 'QAR', 'KWD'].map(c => (
                            <SelectItem key={c} value={c} className="text-slate-800 hover:bg-slate-100">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono text-lg"
                        placeholder={`0.00 ${customCurrency}`}
                        data-testid="custom-amount"
                      />
                    </div>
                    {viewExchanger?.settlement_by_currency?.length > 0 && (
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <p className="font-medium text-slate-500">Outstanding Balances:</p>
                        {viewExchanger.settlement_by_currency.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.currency}</span>
                            <span className="font-mono">{item.amount?.toLocaleString()} {item.currency}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settlement Type */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Type *</Label>
                <Select value={settlementType} onValueChange={setSettlementType}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="bank" className="text-slate-800 hover:bg-slate-100">
                      <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Bank Transfer</span>
                    </SelectItem>
                    <SelectItem value="cash" className="text-slate-800 hover:bg-slate-100">
                      <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Cash</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direct Transfer Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">Direct Transfer</p>
                  <p className="text-xs text-slate-400">Record payment without linking to a treasury account</p>
                </div>
                <button
                  onClick={() => { setIsDirectTransfer(!isDirectTransfer); if (!isDirectTransfer) setSettlementDestination(''); }}
                  className={`w-10 h-5 rounded-full transition-colors relative ${isDirectTransfer ? 'bg-blue-500' : 'bg-slate-300'}`}
                  data-testid="direct-transfer-toggle"
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${isDirectTransfer ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Settlement Destination (hidden if Direct Transfer) */}
              {!isDirectTransfer && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Settlement Destination *</Label>
                  <Select value={settlementDestination} onValueChange={setSettlementDestination}>
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
              )}

              {/* Additional Charges */}
              {(settlementDestination || isDirectTransfer) && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Additional Charges (Optional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settlementCharges}
                    onChange={(e) => setSettlementCharges(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                    placeholder="0.00"
                    data-testid="settlement-charges"
                  />
                </div>
              )}

              {settlementCharges && parseFloat(settlementCharges) > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Charges Description</Label>
                  <Input
                    value={settlementChargesDescription}
                    onChange={(e) => setSettlementChargesDescription(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                    placeholder="e.g., Bank transfer fee, Processing fee"
                    data-testid="settlement-charges-desc"
                  />
                </div>
              )}

              {/* Settlement Preview for full mode with cross-currency */}
              {settlementMode === 'full' && !isDirectTransfer && settlementDestination && (() => {
                const destAccount = treasuryAccounts.find(a => a.account_id === settlementDestination);
                const destCurrency = destAccount?.currency || 'USD';
                const baseCurrencyData = viewExchanger?.settlement_by_currency?.[0];
                const baseCurrency = baseCurrencyData?.currency || 'USD';
                const netSettlementBase = baseCurrencyData?.amount || 0;
                const additionalChargesDest = parseFloat(settlementCharges) || 0;
                const isSameCurrency = destCurrency === baseCurrency;
                const finalAmountDest = isSameCurrency ? (netSettlementBase - additionalChargesDest) : null;

                return (
                  <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 space-y-3">
                    <p className="text-xs text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="w-3 h-3" /> Settlement Preview
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Net Settlement</span>
                        <span className="text-slate-800 font-mono">{netSettlementBase.toLocaleString()} {baseCurrency}</span>
                      </div>
                      {additionalChargesDest > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Additional Charges</span>
                          <span className="text-red-400 font-mono">-{additionalChargesDest.toLocaleString()} {destCurrency}</span>
                        </div>
                      )}
                      {isSameCurrency ? (
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-blue-600 font-semibold">Final Amount to Pay</span>
                          <span className="text-blue-600 font-mono font-bold">{finalAmountDest?.toLocaleString()} {destCurrency}</span>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <p className="text-xs text-yellow-500">Destination: {destCurrency} (different from {baseCurrency})</p>
                          <div className="space-y-1">
                            <Label className="text-slate-500 text-xs">Final Settlement Amount in {destCurrency} *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={settlementAmountInDestCurrency}
                              onChange={(e) => setSettlementAmountInDestCurrency(e.target.value)}
                              className="bg-white border-slate-200 text-slate-800 focus:border-[#1FA21B] font-mono"
                              placeholder={`Enter final amount in ${destCurrency}`}
                              data-testid="settlement-dest-amount"
                            />
                          </div>
                          {settlementAmountInDestCurrency && (
                            <div className="flex justify-between pt-2">
                              <span className="text-blue-600 font-semibold">Amount to Transfer</span>
                              <span className="text-green-500 font-mono text-lg">{parseFloat(settlementAmountInDestCurrency).toLocaleString()} {destCurrency}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Custom mode preview */}
              {settlementMode === 'custom' && customAmount && parseFloat(customAmount) > 0 && (
                <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 space-y-2">
                  <p className="text-xs text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Receipt className="w-3 h-3" /> Custom Settlement Preview
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-slate-800 font-mono font-bold">{parseFloat(customAmount).toLocaleString()} {customCurrency}</span>
                  </div>
                  {parseFloat(settlementCharges) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Charges</span>
                      <span className="text-red-400 font-mono">-{parseFloat(settlementCharges).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                    <span className="text-blue-600 font-semibold">Net Settlement</span>
                    <span className="text-blue-600 font-mono font-bold">{(parseFloat(customAmount) - (parseFloat(settlementCharges) || 0)).toLocaleString()} {customCurrency}</span>
                  </div>
                  {isDirectTransfer && (
                    <p className="text-xs text-amber-500 flex items-center gap-1 pt-1">Direct transfer — no treasury account linked</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Notes (Optional)</Label>
                <Input
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#1FA21B]"
                  placeholder="Settlement reference or notes"
                  data-testid="settlement-notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSettleDialog}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleExchanger}
                  className="bg-green-500 text-slate-800 hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-settle-vendor-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {settlementMode === 'custom' ? 'Submit Custom Settlement' : 'Confirm Settlement'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Statement Dialog */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-3xl bg-white text-[#1a1a1a] border-0 p-0 max-h-[90vh] overflow-hidden">
          {statementLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statementData ? (() => {
            const s = statementData.settlement;
            const txs = statementData.transactions;
            const ieEntries = statementData.ie_entries || [];
            const loanEntries = statementData.loan_entries || [];
            const v = statementData.vendor;
            const cur = s.source_currency || 'USD';
            const dCur = s.destination_currency || cur;
            const deposits = txs.filter(t => t.transaction_type === 'deposit');
            const withdrawals = txs.filter(t => t.transaction_type === 'withdrawal');
            const ieIn = ieEntries.filter(e => e.entry_type === 'income');
            const ieOut = ieEntries.filter(e => e.entry_type === 'expense');
            const loanIn = loanEntries.filter(l => l.credit_to_vendor_id);
            const loanOut = loanEntries.filter(l => l.source_vendor_id);
            return (
              <>
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-200">
                  <h2 className="font-bold text-[#0B3D91] text-lg">Settlement Statement</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={printStatement} className="text-[#0B3D91] border-[#0B3D91] hover:bg-[#0B3D91]/10" data-testid="print-statement-btn">
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStatementOpen(false)} className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="max-h-[calc(90vh-60px)]">
                  <div id="settlement-statement" className="px-8 py-6">
                    {/* Header */}
                    <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0B3D91', paddingBottom: '16px', marginBottom: '20px' }}>
                      <div>
                        <div className="logo" style={{ fontSize: '22px', fontWeight: 800, color: '#0B3D91' }}>MILES CAPITALS</div>
                        <div className="subtitle" style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Foreign Exchange Brokerage</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="stmt-title" style={{ fontSize: '16px', fontWeight: 700, color: '#0B3D91' }}>STATEMENT OF SETTLEMENT</div>
                        <div className="stmt-id mono" style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{s.settlement_id}</div>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '6px' }}>Exchanger</h4>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{v.vendor_name || s.vendor_name}</p>
                        {v.contact_person && <p style={{ fontSize: '12px', color: '#555' }}>{v.contact_person}</p>}
                        {v.email && <p style={{ fontSize: '12px', color: '#555' }}>{v.email}</p>}
                        {v.phone && <p style={{ fontSize: '12px', color: '#555' }}>{v.phone}</p>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '6px' }}>Settlement Details</h4>
                        <p style={{ fontSize: '12px' }}>
                          <strong>Type:</strong> {s.settlement_type?.toUpperCase()}<br />
                          <strong>Destination:</strong> {s.settlement_destination_name}<br />
                          <strong>Status:</strong> <span className={`badge ${s.status === 'approved' ? 'badge-approved' : 'badge-pending'}`} style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 600, background: s.status === 'approved' ? '#d1fae5' : '#fef3c7', color: s.status === 'approved' ? '#065f46' : '#92400e' }}>{s.status?.toUpperCase()}</span><br />
                          <strong>Date:</strong> {s.settled_at ? new Date(s.settled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending'}
                        </p>
                      </div>
                    </div>

                    {/* Transactions Table */}
                    {txs.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px', marginTop: '16px' }}>Transactions ({txs.length})</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 16px 0' }}>
                          <thead>
                            <tr>
                              <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Reference</th>
                              <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Type</th>
                              <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Client</th>
                              <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {txs.map((tx, idx) => (
                              <tr key={tx.transaction_id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace' }}>{tx.reference || tx.transaction_id}</td>
                                <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textTransform: 'capitalize' }}>{tx.transaction_type}</td>
                                <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5' }}>{tx.client_name || '-'}</td>
                                <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textAlign: 'right', fontFamily: 'monospace', color: tx.transaction_type === 'deposit' ? '#16a34a' : '#dc2626' }}>
                                  {tx.transaction_type === 'deposit' ? '+' : '-'}{tx.base_currency && tx.base_currency === cur ? fmtCurrency(tx.base_amount, cur) : fmtCurrency(tx.amount, tx.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* I&E Entries Table */}
                    {ieEntries.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px', marginTop: '16px' }}>Income & Expense Entries ({ieEntries.length})</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 16px 0' }}>
                          <thead>
                            <tr>
                              <th style={{ background: '#b45309', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Reference</th>
                              <th style={{ background: '#b45309', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Type</th>
                              <th style={{ background: '#b45309', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Category</th>
                              <th style={{ background: '#b45309', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ieEntries.map((ie, idx) => {
                              const isIn = ie.entry_type === 'income';
                              const amt = ie.base_amount || ie.amount;
                              return (
                                <tr key={ie.entry_id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace' }}>{ie.entry_id?.slice(-10)?.toUpperCase()}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5' }}>{isIn ? 'I&E IN' : 'I&E OUT'}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textTransform: 'capitalize' }}>{ie.category?.replace('_', ' ') || '-'}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textAlign: 'right', fontFamily: 'monospace', color: isIn ? '#16a34a' : '#dc2626' }}>
                                    {isIn ? '+' : '-'}{fmtCurrency(amt, cur)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Loan Transactions Table */}
                    {loanEntries.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px', marginTop: '16px' }}>Loan Transactions ({loanEntries.length})</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 16px 0' }}>
                          <thead>
                            <tr>
                              <th style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Reference</th>
                              <th style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Type</th>
                              <th style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left' }}>Borrower</th>
                              <th style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanEntries.map((lt, idx) => {
                              const isIn = !!lt.credit_to_vendor_id;
                              return (
                                <tr key={lt.transaction_id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace' }}>{lt.transaction_id?.slice(-10)?.toUpperCase()}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5' }}>{isIn ? 'Loan IN' : 'Loan OUT'}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5' }}>{lt.borrower_name || '-'}</td>
                                  <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textAlign: 'right', fontFamily: 'monospace', color: isIn ? '#16a34a' : '#dc2626' }}>
                                    {isIn ? '+' : '-'}{fmtCurrency(lt.amount, lt.currency || cur)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Summary Box */}
                    <div className="summary" style={{ background: '#f0f4fa', border: '1px solid #d0d8e8', borderRadius: '4px', padding: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#16a34a' }}>
                        <span>Money In ({deposits.length} deposits{ieIn.length ? ` + ${ieIn.length} I&E` : ''}{loanIn.length ? ` + ${loanIn.length} loans` : ''})</span>
                        <span style={{ fontFamily: 'monospace' }}>+{fmtCurrency(
                          deposits.reduce((sum, t) => sum + (t.base_currency === cur ? (t.base_amount || t.amount) : t.amount), 0) +
                          ieIn.reduce((sum, e) => sum + (e.base_amount || e.amount || 0), 0) +
                          loanIn.reduce((sum, l) => sum + (l.amount || 0), 0)
                        , cur)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#dc2626' }}>
                        <span>Money Out ({withdrawals.length} withdrawals{ieOut.length ? ` + ${ieOut.length} I&E` : ''}{loanOut.length ? ` + ${loanOut.length} loans` : ''})</span>
                        <span style={{ fontFamily: 'monospace' }}>-{fmtCurrency(
                          withdrawals.reduce((sum, t) => sum + (t.base_currency === cur ? (t.base_amount || t.amount) : t.amount), 0) +
                          ieOut.reduce((sum, e) => sum + (e.base_amount || e.amount || 0), 0) +
                          loanOut.reduce((sum, l) => sum + (l.amount || 0), 0)
                        , cur)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                        <span>Gross Amount (Net)</span>
                        <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(s.gross_amount, cur)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#dc2626' }}>
                        <span>Commission</span>
                        <span style={{ fontFamily: 'monospace' }}>-{fmtCurrency(s.commission_amount, cur)}</span>
                      </div>
                      {s.charges_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#dc2626' }}>
                          <span>Additional Charges {s.charges_description ? `(${s.charges_description})` : ''}</span>
                          <span style={{ fontFamily: 'monospace' }}>-{fmtCurrency(s.charges_amount, cur)}</span>
                        </div>
                      )}
                      {cur !== dCur && s.exchange_rate !== 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#555' }}>
                          <span>Exchange Rate ({cur} to {dCur})</span>
                          <span style={{ fontFamily: 'monospace' }}>{s.exchange_rate}</span>
                        </div>
                      )}
                      <div className="total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0B3D91', marginTop: '8px', paddingTop: '8px', fontWeight: 700, fontSize: '15px', color: '#0B3D91' }}>
                        <span>Net Settlement</span>
                        <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(s.settlement_amount, dCur)}</span>
                      </div>
                    </div>

                    {/* Approval Info */}
                    {s.approved_by_name && (
                      <div style={{ marginTop: '24px', fontSize: '12px', color: '#555' }}>
                        <strong>Approved by:</strong> {s.approved_by_name} on {s.approved_at ? new Date(s.approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="footer" style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#888', textAlign: 'center' }}>
                      This is a system-generated statement from Miles Capitals Back Office. Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })() : (
            <div className="py-10 text-center text-gray-400">No data available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Images Gallery Modal */}
      <Dialog open={!!proofGallery} onOpenChange={() => setProofGallery(null)}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-sm font-bold uppercase">
              <ImageIcon className="w-4 h-4 inline mr-2 text-blue-500" />
              Proof Images — {proofGallery?.label} ({proofGallery?.images?.length})
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {proofGallery?.images?.map((url, i) => {
              const src = url?.startsWith('http') ? url : `data:image/png;base64,${url}`;
              return <img key={i} src={src} alt={`Proof ${i+1}`} className="w-full rounded border border-slate-200 cursor-pointer hover:opacity-80" onClick={() => window.open(src, '_blank')} />;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
