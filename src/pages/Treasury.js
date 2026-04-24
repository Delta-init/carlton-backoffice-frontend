import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { getApiError } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
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
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
  ImageIcon,
} from "lucide-react";

import PaginationControls from "../components/PaginationControls";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const accountTypes = [
  { value: "bank", label: "Bank Account" },
  { value: "crypto_wallet", label: "Crypto Wallet" },
  { value: "payment_gateway", label: "Payment Gateway" },
  { value: "usdt", label: "USDT Wallet" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
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
  const [proofGallery, setProofGallery] = useState(null);
  const [historyAccount, setHistoryAccount] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
   const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(100);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: "",
    endDate: "",
    transactionType: "",
    period: "all",
  });

  // Transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [balanceFixAccount, setBalanceFixAccount] = useState(null);
  const [balanceFixForm, setBalanceFixForm] = useState({ actual_balance: '', effective_date: '', reason: '' });
  const [balanceFixSaving, setBalanceFixSaving] = useState(false);
  const [transferData, setTransferData] = useState({
    source_account_id: "",
    destination_account_id: "",
    amount: "",
    exchange_rate: "1",
    notes: "",
     transfer_date: new Date().toISOString().split('T')[0],
  });
  const [transferProcessing, setTransferProcessing] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaNumbers, setCaptchaNumbers] = useState({ n1: 0, n2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const [formData, setFormData] = useState({
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
    // USDT specific fields
    usdt_address: "",
    usdt_network: "",
    usdt_notes: "",
  });

  const isAdmin = user?.role === "admin";
  const isAccountantOrAdmin =
    user?.role === "admin" || user?.role === "accountant";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Generate captcha
  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaNumbers({ n1, n2 });
    setCaptchaAnswer("");
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
      } catch (err) {
        toast.error(err?.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  const fetchAccountHistory = async (accountId, page = historyPage) => {
    setHistoryLoading(true);
    try {
      let url = `${API_URL}/api/treasury/${accountId}/history?page=${page}&page_size=${historyPageSize}`;
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
        setHistoryTotalPages(data.total_pages || 1);
        setHistoryTotal(data.total || 0);
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadStatement = (format = 'csv') => {
    if (!historyAccount || historyData.length === 0) return;
    
    const acctName = historyAccount.account_name;
    const acctCurrency = historyAccount.currency || 'USD';
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance', 'Currency'];

    // Calculate summary from history
    const totalCredit = historyData.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const totalDebit = historyData.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const closingBalance = historyData.length > 0 ? historyData[0].running_balance : historyAccount.balance;
    const openingBalance = historyData.length > 0 ? (historyData[historyData.length - 1].running_balance - (historyData[historyData.length - 1].amount || 0)) : historyAccount.balance;

    const buildRows = () => historyData.map(tx => {
      const isCredit = tx.amount > 0;
      return [
        new Date(tx.created_at).toLocaleDateString(),
        (tx.transaction_type || 'N/A').replace(/_/g, ' '),
        (tx.reference || '-'),
        tx.client_name || tx.notes || '-',
        isCredit ? '' : Math.abs(tx.amount).toLocaleString(),
        isCredit ? tx.amount.toLocaleString() : '',
        (tx.running_balance ?? 0).toLocaleString(),
        acctCurrency,
      ];
    });

    if (format === 'csv') {
      const rows = buildRows();
      const csvContent = [
        `Account Statement - ${acctName}`,
        `Currency: ${acctCurrency}`,
        `Opening Balance: ${openingBalance.toLocaleString()} ${acctCurrency}`,
        `Closing Balance: ${closingBalance.toLocaleString()} ${acctCurrency}`,
        `Total Credits: ${totalCredit.toLocaleString()} ${acctCurrency}`,
        `Total Debits: ${totalDebit.toLocaleString()} ${acctCurrency}`,
        `Period: ${historyFilters.startDate || 'All'} to ${historyFilters.endDate || 'Present'}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `statement_${acctName.replace(/\s+/g, '_')}_${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('CSV statement downloaded');
    } else if (format === 'excel') {
      const rows = buildRows();
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table>
            <tr><td colspan="8" style="font-size:16px;font-weight:bold;">Account Statement - ${acctName}</td></tr>
            <tr><td>Currency:</td><td>${acctCurrency}</td><td></td><td>Opening Balance:</td><td style="font-weight:bold;">${openingBalance.toLocaleString()} ${acctCurrency}</td></tr>
            <tr><td>Total Credits:</td><td style="color:green;">${totalCredit.toLocaleString()}</td><td></td><td>Closing Balance:</td><td style="font-weight:bold;">${closingBalance.toLocaleString()} ${acctCurrency}</td></tr>
            <tr><td>Total Debits:</td><td style="color:red;">${totalDebit.toLocaleString()}</td><td></td><td>Generated:</td><td>${new Date().toLocaleDateString()}</td></tr>
            <tr><td colspan="8"></td></tr>
          </table>
          <table border="1">
            <thead><tr>${headers.map(h => `<th style="background:#1F2833;color:#fff;font-weight:bold;padding:6px 10px;">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${row.map((cell, i) => `<td style="padding:4px 8px;${i === 4 ? 'color:red;' : ''}${i === 5 ? 'color:green;' : ''}">${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `statement_${acctName.replace(/\s+/g, '_')}_${dateStr}.xls`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Excel statement downloaded');
    } else if (format === 'pdf') {
      const rows = buildRows();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>Account Statement - ${acctName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
            h1 { color: #1F2833; border-bottom: 3px solid #66FCF1; padding-bottom: 10px; font-size: 22px; }
            .meta { display: flex; justify-content: space-between; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; }
            .meta-item { text-align: center; }
            .meta-item label { display: block; font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
            .meta-item span { font-size: 18px; font-weight: bold; }
            .credit { color: #22c55e; } .debit { color: #ef4444; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #1F2833; color: white; padding: 8px 10px; text-align: left; }
            td { padding: 6px 10px; border-bottom: 1px solid #eee; }
            tr:hover { background: #f9f9f9; }
            .footer { margin-top: 25px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Account Statement: ${acctName}</h1>
          <p style="color:#666;font-size:12px;">Bank: ${historyAccount.bank_name || '-'} | Account: ${historyAccount.account_number || '-'} | Currency: ${acctCurrency}</p>
          <div class="meta">
            <div class="meta-item"><label>Opening Balance</label><span>${openingBalance.toLocaleString()} ${acctCurrency}</span></div>
            <div class="meta-item"><label>Total Credits</label><span class="credit">+${totalCredit.toLocaleString()} ${acctCurrency}</span></div>
            <div class="meta-item"><label>Total Debits</label><span class="debit">-${totalDebit.toLocaleString()} ${acctCurrency}</span></div>
            <div class="meta-item"><label>Closing Balance</label><span>${closingBalance.toLocaleString()} ${acctCurrency}</span></div>
          </div>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${row.map((cell, i) => `<td style="${i === 4 ? 'color:#ef4444;' : ''}${i === 5 ? 'color:#22c55e;' : ''}">${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          <div class="footer">
            <p>Miles Capitals - Treasury Statement | Generated: ${new Date().toLocaleString()} | ${historyData.length} transactions</p>
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top:15px;padding:8px 20px;background:#1F2833;color:white;border:none;cursor:pointer;border-radius:4px;">Print / Save as PDF</button>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('PDF statement opened');
    }
  };

  // Transfer functions
  const initiateTransfer = () => {
    setTransferData({
      source_account_id: '',
      destination_account_id: '',
      amount: '',
      exchange_rate: '1',
      notes: '',
         transfer_date: new Date().toISOString().split('T')[0],
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
             transfer_date: transferData.transfer_date || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Transferred ${result.source_amount} ${result.source_currency} to ${result.destination_account}`);
        setShowCaptcha(false);
        setIsTransferDialogOpen(false);
        fetchAccounts();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
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
      fetchAccountHistory(historyAccount.account_id, historyPage);
    }
  }, [historyAccount, historyFilters, historyPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedAccount
        ? `${API_URL}/api/treasury/${selectedAccount.account_id}`
        : `${API_URL}/api/treasury`;
      const method = selectedAccount ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (!selectedAccount) {
        payload.opening_balance = parseFloat(formData.opening_balance) || 0;
      } else {
        delete payload.opening_balance;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedAccount ? 'Account updated' : 'Account created');
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      const response = await fetch(`${API_URL}/api/treasury/${accountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Account deleted');
        fetchAccounts();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const openBalanceFix = (account) => {
    setBalanceFixAccount(account);
    setBalanceFixForm({ actual_balance: '', effective_date: new Date().toISOString().split('T')[0], reason: '' });
  };

  const handleBalanceFix = async () => {
    if (!balanceFixAccount || balanceFixForm.actual_balance === '') return;
    setBalanceFixSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/treasury/${balanceFixAccount.account_id}/balance-fix`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actual_balance: parseFloat(balanceFixForm.actual_balance),
          effective_date: balanceFixForm.effective_date ? new Date(balanceFixForm.effective_date).toISOString() : undefined,
          reason: balanceFixForm.reason || undefined,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setBalanceFixAccount(null);
        fetchAccounts();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBalanceFixSaving(false);
    }
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      routing_number: account.routing_number || '',
      swift_code: account.swift_code || '',
      currency: account.currency,
      description: account.description || '',
      status: account.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({
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
      usdt_address: '',
      usdt_network: '',
      usdt_notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const labels = {
      bank: 'Bank',
      crypto_wallet: 'Crypto',
      usdt: 'USDT',
      payment_gateway: 'Gateway',
    };
    return (
      <Badge variant="outline" className="border-[#66FCF1]/30 text-blue-600 text-xs uppercase">
        {labels[type] || type}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalBalanceUSD = accounts.reduce((sum, acc) => sum + (acc.balance_usd || 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'active').length;

  // Group balances by currency
  const balanceByCurrency = accounts.reduce((acc, a) => {
    const cur = a.currency || 'USD';
    if (!acc[cur]) acc[cur] = { balance: 0, count: 0 };
    acc[cur].balance += (a.balance || 0);
    acc[cur].count += 1;
    return acc;
  }, {});


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

       {/* Summary Bar */}
      <div className="flex flex-wrap items-stretch gap-3">
        <Card className="bg-white border-slate-200 flex-1 min-w-[160px]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-sm shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total (USD)</p>
              <p className="text-xl font-bold font-mono text-slate-800" data-testid="total-balance-usd">${totalBalanceUSD.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 min-w-[100px]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-sm shrink-0">
              <Building2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Accounts</p>
              <p className="text-xl font-bold font-mono text-slate-800" data-testid="active-accounts">{activeAccounts}<span className="text-sm text-slate-400 font-normal">/{accounts.length}</span></p>
            </div>
          </CardContent>
        </Card>
        {Object.entries(balanceByCurrency).map(([cur, data]) => (
          <Card key={cur} className="bg-white border-slate-200 min-w-[130px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{cur}</p>
                <span className="text-[10px] text-slate-400">{data.count} acct{data.count > 1 ? 's' : ''}</span>
              </div>
              <p className="text-lg font-bold font-mono text-slate-800" data-testid={`balance-${cur}`}>{data.balance.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                          onClick={() => {setHistoryAccount(account); setHistoryPage(1);}}
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
                        {user?.role === 'admin' && (
                          <DropdownMenuItem onClick={() => openBalanceFix(account)} className="text-amber-600 hover:bg-amber-50 cursor-pointer" data-testid={`fix-balance-${account.account_id}`}>
                            <Calculator className="w-4 h-4 mr-2" /> Fix Balance
                          </DropdownMenuItem>
                        )}
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
                    onClick={() => { setHistoryPage(1);setHistoryAccount(account)}}
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

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
      />

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
             <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-sm">
                <div className="min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Period</Label>
                  <Select
                    value={historyFilters.period || 'all'}
                    onValueChange={(value) => {
                      const today = new Date();
                      const fmt = (d) => d.toISOString().split('T')[0];
                      let start = '', end = '';
                      if (value === 'today') {
                        start = end = fmt(today);
                      } else if (value === 'yesterday') {
                        const y = new Date(today); y.setDate(y.getDate() - 1);
                        start = end = fmt(y);
                      } else if (value === 'this_week') {
                        const d = new Date(today); d.setDate(d.getDate() - d.getDay());
                        start = fmt(d); end = fmt(today);
                      } else if (value === 'last_week') {
                        const d = new Date(today); d.setDate(d.getDate() - d.getDay() - 7);
                        const e = new Date(d); e.setDate(e.getDate() + 6);
                        start = fmt(d); end = fmt(e);
                      } else if (value === 'this_month') {
                        start = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
                        end = fmt(today);
                      } else if (value === 'last_month') {
                        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const e = new Date(today.getFullYear(), today.getMonth(), 0);
                        start = fmt(s); end = fmt(e);
                      } else if (value === 'this_year') {
                        start = fmt(new Date(today.getFullYear(), 0, 1));
                        end = fmt(today);
                      } else if (value === 'last_3_months') {
                        const s = new Date(today); s.setMonth(s.getMonth() - 3);
                        start = fmt(s); end = fmt(today);
                      }
                      setHistoryPage(1);
                      setHistoryFilters({ ...historyFilters, period: value, startDate: start, endDate: end });
                    }}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-800" data-testid="history-period-filter">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800 hover:bg-slate-100">All Time</SelectItem>
                      <SelectItem value="today" className="text-slate-800 hover:bg-slate-100">Today</SelectItem>
                      <SelectItem value="yesterday" className="text-slate-800 hover:bg-slate-100">Yesterday</SelectItem>
                      <SelectItem value="this_week" className="text-slate-800 hover:bg-slate-100">This Week</SelectItem>
                      <SelectItem value="last_week" className="text-slate-800 hover:bg-slate-100">Last Week</SelectItem>
                      <SelectItem value="this_month" className="text-slate-800 hover:bg-slate-100">This Month</SelectItem>
                      <SelectItem value="last_month" className="text-slate-800 hover:bg-slate-100">Last Month</SelectItem>
                      <SelectItem value="last_3_months" className="text-slate-800 hover:bg-slate-100">Last 3 Months</SelectItem>
                      <SelectItem value="this_year" className="text-slate-800 hover:bg-slate-100">This Year</SelectItem>
                      <SelectItem value="custom" className="text-slate-800 hover:bg-slate-100">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Always show date inputs */}
                    <div className="min-w-[140px] space-y-1">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">From</Label>
                      <Input
                        type="date"
                        value={historyFilters.startDate}
                        onChange={(e) => { setHistoryPage(1); setHistoryFilters({ ...historyFilters, startDate: e.target.value, period: 'custom' }); }}
                        className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                        data-testid="history-start-date"
                      />
                    </div>
                    <div className="min-w-[140px] space-y-1">
                      <Label className="text-slate-500 text-xs uppercase tracking-wider">To</Label>
                      <Input
                        type="date"
                        value={historyFilters.endDate}
                        onChange={(e) => { setHistoryPage(1); setHistoryFilters({ ...historyFilters, endDate: e.target.value, period: 'custom' }); }}
                        className="bg-white border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                        data-testid="history-end-date"
                      />
                    </div>
                <div className="min-w-[140px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Type</Label>
                  <Select
                    value={historyFilters.transactionType}
                    onValueChange={(value) => { setHistoryPage(1); setHistoryFilters({ ...historyFilters, transactionType: value === 'all' ? '' : value }); }}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-800" data-testid="history-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800 hover:bg-slate-100">All Types</SelectItem>
                      <SelectItem value="deposit" className="text-slate-800 hover:bg-slate-100">Deposit</SelectItem>
                      <SelectItem value="withdrawal" className="text-slate-800 hover:bg-slate-100">Withdrawal</SelectItem>
                      <SelectItem value="settlement_in" className="text-slate-800 hover:bg-slate-100">Settlement In</SelectItem>
                      <SelectItem value="transfer_in" className="text-slate-800 hover:bg-slate-100">Transfer In</SelectItem>
                      <SelectItem value="transfer_out" className="text-slate-800 hover:bg-slate-100">Transfer Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={historyData.length === 0}
                      className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                      data-testid="export-statement-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Statement
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-slate-200">
                    <DropdownMenuItem onClick={() => downloadStatement('csv')} className="cursor-pointer hover:bg-slate-100">
                      <Download className="w-4 h-4 mr-2" /> Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadStatement('excel')} className="cursor-pointer hover:bg-slate-100">
                      <Download className="w-4 h-4 mr-2" /> Download Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadStatement('pdf')} className="cursor-pointer hover:bg-slate-100">
                      <Download className="w-4 h-4 mr-2" /> Print / PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Statement Summary */}
              {historyData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-sm border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Opening Balance</p>
                    <p className="text-lg font-mono font-bold text-slate-800" data-testid="opening-balance">
                      {(() => {
                        const last = historyData[historyData.length - 1];
                        return ((last?.running_balance || 0) - (last?.amount || 0)).toLocaleString();
                      })()} {historyAccount.currency}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-sm border border-green-200">
                    <p className="text-xs text-green-600 uppercase tracking-wider">Total Credits</p>
                    <p className="text-lg font-mono font-bold text-green-700" data-testid="total-credits">
                      +{historyData.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0).toLocaleString()} {historyAccount.currency}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-sm border border-red-200">
                    <p className="text-xs text-red-600 uppercase tracking-wider">Total Debits</p>
                    <p className="text-lg font-mono font-bold text-red-700" data-testid="total-debits">
                      -{historyData.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0).toLocaleString()} {historyAccount.currency}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-sm border border-blue-200">
                    <p className="text-xs text-blue-600 uppercase tracking-wider">Closing Balance</p>
                    <p className="text-lg font-mono font-bold text-blue-700" data-testid="closing-balance">
                      {(historyData[0]?.running_balance || historyAccount.balance || 0).toLocaleString()} {historyAccount.currency}
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction Table */}
              <ScrollArea className="h-[350px]">
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-500">No transaction history found</p>
                    <p className="text-sm text-slate-500/60 mt-2">Transactions will appear here once approved</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Description</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Debit</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Credit</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((tx, idx) => {
                        const isIncoming = tx.amount > 0;
                        return (
                          <TableRow key={tx.treasury_transaction_id || idx} className="border-slate-200 hover:bg-slate-100">
                            <TableCell className="text-slate-800 text-sm whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${isIncoming ? 'text-green-600' : 'text-red-500'}`}>
                                {isIncoming ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                <span className="capitalize text-xs">{(tx.transaction_type || 'N/A').replace(/_/g, ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-800 text-xs max-w-[160px] font-mono">
                              <div className="flex items-center gap-1">
                                <span className="truncate">{tx.reference || '-'}</span>
                                {(tx.proof_images?.length || tx.proof_image) && (
                                  <button onClick={() => { const imgs = tx.proof_images?.length ? tx.proof_images : [tx.proof_image]; setProofGallery({ images: imgs, label: tx.reference }); }} className="text-blue-500 hover:text-blue-700 flex-shrink-0" title="View proof images">
                                    <ImageIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs max-w-[140px] truncate">{tx.client_name || tx.notes || '-'}</TableCell>
                            <TableCell className="font-mono text-right text-red-500 text-sm">
                              {!isIncoming ? Math.abs(tx.amount || 0).toLocaleString() : ''}
                            </TableCell>
                            <TableCell className="font-mono text-right text-green-600 text-sm">
                              {isIncoming ? tx.amount.toLocaleString() : ''}
                            </TableCell>
                            <TableCell className="font-mono text-right text-slate-800 font-medium text-sm" data-testid={`running-balance-${idx}`}>
                              {(tx.running_balance ?? 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Showing {((historyPage - 1) * historyPageSize) + 1}-{Math.min(historyPage * historyPageSize, historyTotal)} of {historyTotal} transactions
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setHistoryPage(1); }}
                      disabled={historyPage <= 1}
                      className="h-8 px-2 border-slate-200 text-slate-600"
                      data-testid="history-first-page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setHistoryPage(p => Math.max(1, p - 1)); }}
                      disabled={historyPage <= 1}
                      className="h-8 px-2 border-slate-200 text-slate-600"
                      data-testid="history-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600 px-3 font-mono">
                      {historyPage} / {historyTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setHistoryPage(p => Math.min(historyTotalPages, p + 1)); }}
                      disabled={historyPage >= historyTotalPages}
                      className="h-8 px-2 border-slate-200 text-slate-600"
                      data-testid="history-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setHistoryPage(historyTotalPages); }}
                      disabled={historyPage >= historyTotalPages}
                      className="h-8 px-2 border-slate-200 text-slate-600"
                      data-testid="history-last-page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
               <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Transfer Date *</Label>
                <Input
                  type="date"
                  value={transferData.transfer_date}
                  onChange={(e) => setTransferData({ ...transferData, transfer_date: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]"
                  data-testid="transfer-date"
                />
                <p className="text-[10px] text-slate-400">Date of the transfer. This date will appear in treasury records.</p>
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

      {/* Balance Fix Dialog */}
      <Dialog open={!!balanceFixAccount} onOpenChange={(open) => { if (!open) setBalanceFixAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-amber-500" />
              Fix Balance - {balanceFixAccount?.account_name}
            </DialogTitle>
          </DialogHeader>
          {balanceFixAccount && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Current System Balance</p>
                <p className="text-xl font-bold text-slate-800">
                  {balanceFixAccount.currency} {Number(balanceFixAccount.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Correct Running Balance on This Date <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={balanceFixForm.actual_balance}
                  onChange={(e) => setBalanceFixForm({ ...balanceFixForm, actual_balance: e.target.value })}
                  placeholder="Enter the correct balance for this date"
                  data-testid="balance-fix-amount"
                />
                {balanceFixForm.actual_balance !== '' && (
                  <p className="text-xs text-slate-500">
                    The system will insert an adjustment at the start of this date, then recalculate all transactions forward to fix the current balance. Any previous balance fix on the same date will be replaced.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Effective Date</Label>
                <Input
                  type="date"
                  value={balanceFixForm.effective_date}
                  onChange={(e) => setBalanceFixForm({ ...balanceFixForm, effective_date: e.target.value })}
                  data-testid="balance-fix-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Reason / Notes</Label>
                <Textarea
                  value={balanceFixForm.reason}
                  onChange={(e) => setBalanceFixForm({ ...balanceFixForm, reason: e.target.value })}
                  placeholder="e.g., Bank statement reconciliation, Opening balance entry"
                  rows={2}
                  data-testid="balance-fix-reason"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setBalanceFixAccount(null)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleBalanceFix}
                  disabled={balanceFixSaving || balanceFixForm.actual_balance === ''}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="balance-fix-submit"
                >
                  {balanceFixSaving ? 'Fixing...' : 'Fix Balance'}
                </Button>
              </div>
            </div>
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
    </div>
  );
}
