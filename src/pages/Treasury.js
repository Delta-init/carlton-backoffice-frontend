import { useEffect, useState, useCallback } from 'react';
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
import {
  Landmark,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Building2,
  DollarSign,
  History,
  Download,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ArrowLeftRight,
  Calculator,
} from 'lucide-react';

import PaginationControls from '../components/PaginationControls';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const accountTypes = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'crypto_wallet', label: 'Crypto Wallet' },
  { value: 'payment_gateway', label: 'Payment Gateway' },
  { value: 'usdt', label: 'USDT Wallet' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Treasury() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [historyAccount, setHistoryAccount] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: '',
  });
  
  // Transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    source_account_id: '',
    destination_account_id: '',
    amount: '',
    exchange_rate: '1',
    notes: '',
  });
  const [transferProcessing, setTransferProcessing] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaNumbers, setCaptchaNumbers] = useState({ n1: 0, n2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'bank',
    bank_name: '',
    account_number: '',
    routing_number: '',
    swift_code: '',
    currency: 'USD',
    description: '',
    status: 'active',
    opening_balance: '',
    // USDT specific fields
    usdt_address: '',
    usdt_network: '',
    usdt_notes: '',
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

  // Generate captcha
  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaNumbers({ n1, n2 });
    setCaptchaAnswer('');
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page=${currentPage}&page_size=${pageSize}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.items || data);
        setTotalPages(data.total_pages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
      toast.error('Failed to load treasury accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountHistory = async (accountId) => {
    setHistoryLoading(true);
    try {
      let url = `${API_URL}/api/treasury/${accountId}/history?limit=100`;
      if (historyFilters.startDate) {
        url += `&start_date=${historyFilters.startDate}`;
      }
      if (historyFilters.endDate) {
        url += `&end_date=${historyFilters.endDate}`;
      }
      if (historyFilters.transactionType) {
        url += `&transaction_type=${historyFilters.transactionType}`;
      }
      
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setHistoryData(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadStatement = () => {
    if (!historyAccount || historyData.length === 0) return;
    
    // Generate CSV content
    const headers = ['Date', 'Type', 'Reference', 'Amount', 'Currency'];
    const rows = historyData.map(tx => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.transaction_type || 'N/A',
      tx.reference || 'N/A',
      tx.amount?.toLocaleString() || '0',
      historyAccount.currency || 'USD'
    ]);
    
    const csvContent = [
      `Treasury Account Statement - ${historyAccount.account_name}`,
      `Currency: ${historyAccount.currency}`,
      `Balance: ${historyAccount.balance?.toLocaleString()}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${historyAccount.account_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Statement downloaded');
  };

  // Transfer functions
  const initiateTransfer = () => {
    setTransferData({
      source_account_id: '',
      destination_account_id: '',
      amount: '',
      exchange_rate: '1',
      notes: '',
    });
    setIsTransferDialogOpen(true);
  };

  const handleTransferSubmit = () => {
    if (!transferData.source_account_id) {
      toast.error('Please select source account');
      return;
    }
    if (!transferData.destination_account_id) {
      toast.error('Please select destination account');
      return;
    }
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const srcAccount = accounts.find(a => a.account_id === transferData.source_account_id);
    if (srcAccount && parseFloat(transferData.amount) > srcAccount.balance) {
      toast.error('Insufficient balance in source account');
      return;
    }
    
    generateCaptcha();
    setShowCaptcha(true);
  };

  const verifyCaptchaAndTransfer = async () => {
    const correctAnswer = captchaNumbers.n1 + captchaNumbers.n2;
    if (parseInt(captchaAnswer) !== correctAnswer) {
      toast.error('Incorrect answer. Please try again.');
      generateCaptcha();
      setCaptchaAnswer('');
      return;
    }
    
    setTransferProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/treasury/transfer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          source_account_id: transferData.source_account_id,
          destination_account_id: transferData.destination_account_id,
          amount: parseFloat(transferData.amount),
          exchange_rate: parseFloat(transferData.exchange_rate) || 1,
          notes: transferData.notes || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Transferred ${result.source_amount} ${result.source_currency} to ${result.destination_account}`);
        setShowCaptcha(false);
        setIsTransferDialogOpen(false);
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Transfer failed');
      }
    } catch (error) {
      toast.error('Transfer failed');
    } finally {
      setTransferProcessing(false);
      setCaptchaAnswer('');
    }
  };

  // Computed values for transfer preview
  const sourceAccount = accounts.find(a => a.account_id === transferData.source_account_id);
  const destAccount = accounts.find(a => a.account_id === transferData.destination_account_id);
  const calculatedDestAmount = transferData.amount && transferData.exchange_rate 
    ? (parseFloat(transferData.amount) * parseFloat(transferData.exchange_rate)).toFixed(2)
    : '0.00';

  useEffect(() => {
    fetchAccounts();
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (historyAccount) {
      fetchAccountHistory(historyAccount.account_id);
    }
  }, [historyAccount, historyFilters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedAccount
        ? `${API_URL}/api/treasury/${selectedAccount.account_id}`
        : `${API_URL}/api/treasury`;
      const method = selectedAccount ? "PUT" : "POST";

      const payload = { ...formData };
      if (!selectedAccount) {
        payload.opening_balance = parseFloat(formData.opening_balance) || 0;
      } else {
        delete payload.opening_balance;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedAccount ? "Account updated" : "Account created");
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Operation failed");
      }
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?"))
      return;
    try {
      const response = await fetch(`${API_URL}/api/treasury/${accountId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Account deleted");
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Delete failed");
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      bank_name: account.bank_name || "",
      account_number: account.account_number || "",
      routing_number: account.routing_number || "",
      swift_code: account.swift_code || "",
      currency: account.currency,
      description: account.description || "",
      status: account.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({
      account_name: "",
      account_type: "bank",
      bank_name: "",
      account_number: "",
      routing_number: "",
      swift_code: "",
      currency: "USD",
      description: "",
      status: "active",
      opening_balance: "",
      usdt_address: "",
      usdt_network: "",
      usdt_notes: "",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "status-approved",
      inactive: "status-rejected",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const labels = {
      bank: "Bank",
      crypto_wallet: "Crypto",
      usdt: "USDT",
      payment_gateway: "Gateway",
    };
    return (
      <Badge
        variant="outline"
        className="border-[#66FCF1]/30 text-blue-600 text-xs uppercase"
      >
        {labels[type] || type}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalBalanceUSD = accounts.reduce(
    (sum, acc) => sum + (acc.balance_usd || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="treasury-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Treasury
          </h1>
          <p className="text-slate-500">Manage bank accounts and treasury</p>
        </div>
        <div className="flex gap-2">
          {isAccountantOrAdmin && accounts.length >= 2 && (
            <Button
              onClick={initiateTransfer}
              variant="outline"
              className="border-[#66FCF1]/50 text-blue-600 hover:bg-blue-100 font-bold uppercase tracking-wider rounded-xl"
              data-testid="transfer-btn"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          )}
          {isAccountantOrAdmin && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl glow-cyan"
                  data-testid="add-treasury-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
                <DialogHeader>
                  <DialogTitle
                    className="text-2xl font-bold uppercase tracking-tight"
                    style={{ fontFamily: "Barlow Condensed" }}
                  >
                    {selectedAccount ? "Edit Account" : "Add Treasury Account"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Account Name *
                    </Label>
                    <Input
                      value={formData.account_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account_name: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                      placeholder="e.g., Main Operating Account"
                      data-testid="treasury-name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Type
                      </Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, account_type: value })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="treasury-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {accountTypes.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Currency
                      </Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          setFormData({ ...formData, currency: value })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="treasury-currency"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem
                            value="USD"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            USD
                          </SelectItem>
                          <SelectItem
                            value="EUR"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            EUR
                          </SelectItem>
                          <SelectItem
                            value="GBP"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            GBP
                          </SelectItem>
                          <SelectItem
                            value="AED"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            AED
                          </SelectItem>
                          <SelectItem
                            value="SAR"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            SAR
                          </SelectItem>
                          <SelectItem
                            value="INR"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            INR
                          </SelectItem>
                          <SelectItem
                            value="JPY"
                            className="text-slate-800 hover:bg-slate-100"
                          >
                            JPY
                          </SelectItem>
                          {formData.account_type === "usdt" && (
                            <SelectItem
                              value="USDT"
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              USDT
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bank-specific fields */}
                  {formData.account_type !== "usdt" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Bank Name
                        </Label>
                        <Input
                          value={formData.bank_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_name: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                          placeholder="e.g., Chase Bank"
                          data-testid="treasury-bank"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Account Number
                          </Label>
                          <Input
                            value={formData.account_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                account_number: e.target.value,
                              })
                            }
                            className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                            placeholder="****1234"
                            data-testid="treasury-account-number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Routing Number
                          </Label>
                          <Input
                            value={formData.routing_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                routing_number: e.target.value,
                              })
                            }
                            className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                            placeholder="Optional"
                            data-testid="treasury-routing"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          SWIFT Code
                        </Label>
                        <Input
                          value={formData.swift_code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              swift_code: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                          placeholder="Optional"
                          data-testid="treasury-swift"
                        />
                      </div>
                    </>
                  )}

                  {/* USDT-specific fields */}
                  {formData.account_type === "usdt" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          USDT Wallet Address *
                        </Label>
                        <Input
                          value={formData.usdt_address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usdt_address: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                          placeholder="Enter USDT wallet address"
                          data-testid="treasury-usdt-address"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Network *
                        </Label>
                        <Select
                          value={formData.usdt_network}
                          onValueChange={(value) =>
                            setFormData({ ...formData, usdt_network: value })
                          }
                        >
                          <SelectTrigger
                            className="bg-slate-50 border-slate-200 text-slate-800"
                            data-testid="treasury-usdt-network"
                          >
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem
                              value="TRC20"
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              TRC20 (Tron)
                            </SelectItem>
                            <SelectItem
                              value="ERC20"
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              ERC20 (Ethereum)
                            </SelectItem>
                            <SelectItem
                              value="BEP20"
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              BEP20 (BSC)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider">
                          Private Notes/Labels
                        </Label>
                        <Textarea
                          value={formData.usdt_notes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usdt_notes: e.target.value,
                            })
                          }
                          className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                          placeholder="Internal notes for this wallet..."
                          rows={2}
                          data-testid="treasury-usdt-notes"
                        />
                      </div>
                    </>
                  )}

                  {selectedAccount && (
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Status
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 text-slate-800"
                          data-testid="treasury-status"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {statusOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-slate-800 hover:bg-slate-100"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Description
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                      rows={2}
                      data-testid="treasury-description"
                    />
                  </div>

                  {!selectedAccount && (
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">
                        Opening Balance
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.opening_balance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opening_balance: e.target.value,
                          })
                        }
                        className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                        placeholder="0.00"
                        data-testid="treasury-opening-balance"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="border-slate-200 text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                      data-testid="save-treasury-btn"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : selectedAccount ? (
                        "Update"
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Total Treasury Balance (USD Equivalent)
              </p>
              <p className="text-4xl font-bold font-mono text-slate-800">
                ${totalBalanceUSD.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Based on manual FX rates (Settings)
              </p>
            </div>
            <div className="p-4 bg-blue-100 rounded-xl">
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Landmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500">No treasury accounts found</p>
            {isAccountantOrAdmin && (
              <p className="text-sm text-slate-500/60 mt-2">
                Click "Add Account" to create one
              </p>
            )}
          </div>
        ) : (
          accounts.map((account) => (
            <Card
              key={account.account_id}
              className="bg-white border-slate-200 card-hover"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-800">
                        {account.account_name}
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        {account.bank_name || "N/A"}
                      </p>
                    </div>
                  </div>
                  {isAccountantOrAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          data-testid={`treasury-actions-${account.account_id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white border-slate-200"
                      >
                        <DropdownMenuItem
                          onClick={() => setViewAccount(account)}
                          className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setHistoryAccount(account)}
                          className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <History className="w-4 h-4 mr-2" /> History
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(account)}
                          className="text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(account.account_id)}
                          className="text-red-600 hover:bg-red-50 cursor-pointer"
                        >
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
                    <span className="text-slate-500 text-sm">
                      Balance ({account.currency})
                    </span>
                    <span className="text-xl font-mono font-bold text-slate-800">
                      {account.currency === "USD" ? "$" : ""}
                      {(account.balance || 0).toLocaleString()}{" "}
                      {account.currency !== "USD" ? account.currency : ""}
                    </span>
                  </div>
                  {account.currency !== "USD" && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm">
                        USD Equivalent
                      </span>
                      <span className="text-lg font-mono text-primary">
                        {account.balance_usd != null ? (
                          `$${account.balance_usd.toLocaleString()}`
                        ) : (
                          <span className="text-xs text-slate-400">
                            Rate not set
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Type</span>
                    {getTypeBadge(account.account_type)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Status</span>
                    {getStatusBadge(account.status)}
                  </div>
                  {account.account_number && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Account:{" "}
                        <span className="font-mono text-slate-800">
                          {account.account_number}
                        </span>
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => setHistoryAccount(account)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-[#66FCF1]/30 text-blue-600 hover:bg-blue-100"
                    data-testid={`view-history-${account.account_id}`}
                  >
                    <History className="w-3 h-3 mr-2" />
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

            <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }} />


      {/* View Account Dialog */}
      <Dialog open={!!viewAccount} onOpenChange={() => setViewAccount(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Account Details
            </DialogTitle>
          </DialogHeader>
          {viewAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl text-slate-800 font-medium">
                    {viewAccount.account_name}
                  </h3>
                  <p className="text-slate-500">
                    {viewAccount.bank_name || "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Balance
                  </p>
                  <p className="text-2xl font-mono font-bold text-slate-800">
                    ${(viewAccount.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Currency
                  </p>
                  <p className="text-slate-800 font-mono">
                    {viewAccount.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Type
                  </p>
                  {getTypeBadge(viewAccount.account_type)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  {getStatusBadge(viewAccount.status)}
                </div>
                {viewAccount.account_number && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Account Number
                    </p>
                    <p className="text-slate-800 font-mono">
                      {viewAccount.account_number}
                    </p>
                  </div>
                )}
                {viewAccount.routing_number && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Routing Number
                    </p>
                    <p className="text-slate-800 font-mono">
                      {viewAccount.routing_number}
                    </p>
                  </div>
                )}
                {viewAccount.swift_code && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      SWIFT Code
                    </p>
                    <p className="text-slate-800 font-mono">
                      {viewAccount.swift_code}
                    </p>
                  </div>
                )}
              </div>
              {viewAccount.description && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-slate-800">{viewAccount.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog
        open={!!historyAccount}
        onOpenChange={() => {
          setHistoryAccount(null);
          setHistoryData([]);
          setHistoryFilters({
            startDate: "",
            endDate: "",
            transactionType: "",
          });
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <History className="w-6 h-6 text-blue-600" />
              Transaction History
            </DialogTitle>
          </DialogHeader>
          {historyAccount && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-slate-800 font-medium">
                      {historyAccount.account_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {historyAccount.bank_name || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Balance
                  </p>
                  <p className="text-xl font-mono font-bold text-slate-800">
                    {historyAccount.currency === "USD" ? "$" : ""}
                    {(historyAccount.balance || 0).toLocaleString()}{" "}
                    {historyAccount.currency !== "USD"
                      ? historyAccount.currency
                      : ""}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) =>
                      setHistoryFilters({
                        ...historyFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    data-testid="history-start-date"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) =>
                      setHistoryFilters({
                        ...historyFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                    data-testid="history-end-date"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Type
                  </Label>
                  <Select
                    value={historyFilters.transactionType}
                    onValueChange={(value) =>
                      setHistoryFilters({
                        ...historyFilters,
                        transactionType: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger
                      className="bg-white border-slate-200 text-slate-800"
                      data-testid="history-type-filter"
                    >
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem
                        value="all"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        All Types
                      </SelectItem>
                      <SelectItem
                        value="deposit"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Deposit
                      </SelectItem>
                      <SelectItem
                        value="withdrawal"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Withdrawal
                      </SelectItem>
                      <SelectItem
                        value="settlement_in"
                        className="text-slate-800 hover:bg-slate-100"
                      >
                        Settlement In
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={downloadStatement}
                  disabled={historyData.length === 0}
                  className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                  data-testid="download-statement-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Statement
                </Button>
              </div>

              {/* Transaction Table */}
              <ScrollArea className="h-[350px]">
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-500">
                      No transaction history found
                    </p>
                    <p className="text-sm text-slate-500/60 mt-2">
                      Transactions will appear here once approved
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Date
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Type
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                          Reference
                        </TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">
                          Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((tx, idx) => {
                        const isIncoming =
                          tx.amount > 0 ||
                          tx.transaction_type === "deposit" ||
                          tx.transaction_type === "settlement_in";
                        return (
                          <TableRow
                            key={tx.treasury_transaction_id || idx}
                            className="border-slate-200 hover:bg-slate-100"
                          >
                            <TableCell className="text-slate-800 text-sm">
                              {formatDate(tx.created_at)}
                            </TableCell>
                            <TableCell>
                              <div
                                className={`flex items-center gap-1 ${isIncoming ? "text-green-400" : "text-red-400"}`}
                              >
                                {isIncoming ? (
                                  <ArrowDownRight className="w-3 h-3" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3" />
                                )}
                                <span className="capitalize text-sm">
                                  {tx.transaction_type || "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-800 text-sm max-w-[200px] truncate">
                              {tx.reference || "-"}
                            </TableCell>
                            <TableCell
                              className={`font-mono text-right ${isIncoming ? "text-green-400" : "text-red-400"}`}
                            >
                              {isIncoming ? "+" : ""}
                              {Math.abs(tx.amount || 0).toLocaleString()}{" "}
                              {historyAccount.currency}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inter-Treasury Transfer Dialog */}
      <Dialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);
          if (!open) {
            setShowCaptcha(false);
            setCaptchaAnswer("");
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              <ArrowLeftRight className="w-6 h-6 text-blue-600" />
              Inter-Treasury Transfer
            </DialogTitle>
          </DialogHeader>

          {!showCaptcha ? (
            <div className="space-y-4" data-testid="transfer-form">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  From Account *
                </Label>
                <Select
                  value={transferData.source_account_id}
                  onValueChange={(value) =>
                    setTransferData({
                      ...transferData,
                      source_account_id: value,
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="transfer-from-account"
                  >
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {accounts
                      .filter(
                        (acc) =>
                          acc.status === "active" &&
                          acc.account_id !==
                            transferData.destination_account_id,
                      )
                      .map((acc) => (
                        <SelectItem
                          key={acc.account_id}
                          value={acc.account_id}
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          {acc.account_name} ({acc.balance?.toLocaleString()}{" "}
                          {acc.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {sourceAccount && (
                  <p className="text-xs text-slate-500">
                    Available:{" "}
                    <span className="text-blue-600 font-mono">
                      {sourceAccount.balance?.toLocaleString()}{" "}
                      {sourceAccount.currency}
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  To Account *
                </Label>
                <Select
                  value={transferData.destination_account_id}
                  onValueChange={(value) =>
                    setTransferData({
                      ...transferData,
                      destination_account_id: value,
                    })
                  }
                >
                  <SelectTrigger
                    className="bg-slate-50 border-slate-200 text-slate-800"
                    data-testid="transfer-to-account"
                  >
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {accounts
                      .filter(
                        (acc) =>
                          acc.status === "active" &&
                          acc.account_id !== transferData.source_account_id,
                      )
                      .map((acc) => (
                        <SelectItem
                          key={acc.account_id}
                          value={acc.account_id}
                          className="text-slate-800 hover:bg-slate-100"
                        >
                          {acc.account_name} ({acc.balance?.toLocaleString()}{" "}
                          {acc.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Amount *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferData.amount}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        amount: e.target.value,
                      })
                    }
                    className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono pr-16"
                    placeholder="0.00"
                    data-testid="transfer-amount"
                  />
                  {sourceAccount && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      {sourceAccount.currency}
                    </span>
                  )}
                </div>
              </div>

              {sourceAccount &&
                destAccount &&
                sourceAccount.currency !== destAccount.currency && (
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Exchange Rate ({sourceAccount.currency} to{" "}
                      {destAccount.currency})
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={transferData.exchange_rate}
                      onChange={(e) =>
                        setTransferData({
                          ...transferData,
                          exchange_rate: e.target.value,
                        })
                      }
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono"
                      placeholder="1.00"
                      data-testid="transfer-exchange-rate"
                    />
                  </div>
                )}

              {transferData.amount && sourceAccount && destAccount && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Transfer Preview
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Deduct:</span>
                    <span className="text-red-400 font-mono">
                      -{parseFloat(transferData.amount).toLocaleString()}{" "}
                      {sourceAccount.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Credit:</span>
                    <span className="text-green-400 font-mono">
                      +{calculatedDestAmount} {destAccount.currency}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">
                  Notes (Optional)
                </Label>
                <Textarea
                  value={transferData.notes}
                  onChange={(e) =>
                    setTransferData({ ...transferData, notes: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  rows={2}
                  placeholder="Add internal notes..."
                  data-testid="transfer-notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTransferDialogOpen(false)}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransferSubmit}
                  className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                  data-testid="transfer-continue-btn"
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6" data-testid="transfer-captcha">
              <div className="p-4 bg-slate-50 rounded-xl border border-[#66FCF1]/30">
                <div className="flex items-center gap-3 mb-4">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-slate-800 font-medium">
                      Security Verification
                    </p>
                    <p className="text-xs text-slate-500">
                      Solve this math problem to confirm
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-center py-4">
                  <span className="text-3xl font-mono text-slate-800">
                    {captchaNumbers.n1}
                  </span>
                  <span className="text-3xl font-mono text-blue-600">+</span>
                  <span className="text-3xl font-mono text-slate-800">
                    {captchaNumbers.n2}
                  </span>
                  <span className="text-3xl font-mono text-slate-500">=</span>
                  <Input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-20 bg-white border-[#66FCF1]/50 text-slate-800 focus:border-[#66FCF1] font-mono text-2xl text-center"
                    placeholder="?"
                    autoFocus
                    data-testid="transfer-captcha-answer"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Transfer Summary
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">From:</span>
                    <span className="text-slate-800">
                      {sourceAccount?.account_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">To:</span>
                    <span className="text-slate-800">
                      {destAccount?.account_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="text-red-400 font-mono">
                      -{parseFloat(transferData.amount || 0).toLocaleString()}{" "}
                      {sourceAccount?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit:</span>
                    <span className="text-green-400 font-mono">
                      +{calculatedDestAmount} {destAccount?.currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCaptcha(false);
                    setCaptchaAnswer("");
                  }}
                  className="border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Back
                </Button>
                <Button
                  onClick={verifyCaptchaAndTransfer}
                  disabled={!captchaAnswer || transferProcessing}
                  className="bg-primary text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                  data-testid="transfer-confirm-btn"
                >
                  {transferProcessing ? "Processing..." : "Confirm Transfer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
