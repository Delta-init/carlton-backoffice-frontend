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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Calendar,
  TrendingDown,
  Upload,
  Loader2,
  Tag,
  X,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Transaction filter states
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');

  // Tags
  const [availableTags, setAvailableTags] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    mt5_number: '',
    crm_customer_id: '',
    notes: '',
    tags: [],
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchAvailableTags = async () => {
    try {
      const res = await fetch(`${API_URL}/api/client-tags`, { headers: getAuthHeaders(), credentials: 'include' });
      if (res.ok) setAvailableTags(await res.json());
    } catch (e) { console.error('Failed to load tags', e); }
  };

  const fetchClients = async (pg) => {
    try {
      const p = pg || currentPage;
      const params = new URLSearchParams({ page: p, page_size: pageSize });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (tagFilter.length > 0) params.append('tags', tagFilter.join(','));
      const url = `${API_URL}/api/clients?${params}`;

      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setClients(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotalClients(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      const res = await fetch(`${API_URL}/api/clients/bulk-upload`, {
        method: 'POST', headers, body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Uploaded: ${data.created} created, ${data.skipped} skipped`);
        if (data.errors?.length) toast.warning(`${data.errors.length} row errors`);
        fetchClients();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) { toast.error(err?.message || 'Something went wrong. Please try again.'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setViewClient(data);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast.error('Failed to load client details');
    }
  };

  useEffect(() => {
    fetchClients();
    fetchAvailableTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, currentPage, pageSize, tagFilter]);

  // Filter clients client-side for balance and transaction type only
  // Tag filter is applied server-side via fetchClients
  const filteredClients = clients.filter(client => {
    // Balance filter
    if (minBalance && client.net_balance < parseFloat(minBalance)) return false;
    if (maxBalance && client.net_balance > parseFloat(maxBalance)) return false;

    // Transaction type filter
    if (txTypeFilter === 'deposits_only' && (client.deposit_count || 0) === 0) return false;
    if (txTypeFilter === 'withdrawals_only' && (client.withdrawal_count || 0) === 0) return false;
    if (txTypeFilter === 'no_transactions' && (client.transaction_count || 0) > 0) return false;

    return true;
  });

  // Update client tags with backfill
  const updateClientTags = async (clientId, newTags) => {
    try {
      const res = await fetch(`${API_URL}/api/clients/${clientId}/tags`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ tags: newTags }),
      });
      if (res.ok) {
        toast.success('Tags updated');
        fetchClients();
      } else {
        toast.error(await getApiError(res));
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    }
  };

  // Download functions
  const downloadCSV = () => {
    const headers = ['Client ID', 'Name', 'Email', 'Phone', 'Country', 'KYC Status', 'Total Deposits', 'Deposit Count', 'Total Withdrawals', 'Withdrawal Count', 'Net Balance'];
    const rows = filteredClients.map(c => [
      c.client_id,
      `${c.first_name} ${c.last_name}`,
      c.email,
      c.phone || '',
      c.country || '',
      c.kyc_status,
      c.total_deposits || 0,
      c.deposit_count || 0,
      c.total_withdrawals || 0,
      c.withdrawal_count || 0,
      c.net_balance || 0
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Clients exported to CSV');
  };

  const downloadTransactionsCSV = async () => {
    try {
      toast.loading('Preparing transactions export...');
      const response = await fetch(`${API_URL}/api/transactions`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const transactions = await response.json();
        const headers = ['Transaction ID', 'Reference', 'Client', 'Type', 'Amount (USD)', 'Base Amount', 'Base Currency', 'Status', 'Exchanger', 'Created At'];
        const rows = transactions.map(tx => [
          tx.transaction_id,
          tx.reference,
          tx.client_name,
          tx.transaction_type,
          tx.amount || 0,
          tx.base_amount || tx.amount || 0,
          tx.base_currency || 'USD',
          tx.status,
          tx.vendor_name || '',
          tx.created_at
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success('Transactions exported to CSV');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export transactions');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedClient
        ? `${API_URL}/api/clients/${selectedClient.client_id}`
        : `${API_URL}/api/clients`;
      const method = selectedClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedClient ? 'Client updated' : 'Client created');
        setIsDialogOpen(false);
        resetForm();
        fetchClients();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Client deleted');
        fetchClients();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || '',
      country: client.country || '',
      mt5_number: client.mt5_number || '',
      crm_customer_id: client.crm_customer_id || '',
      notes: client.notes || '',
      kyc_status: client.kyc_status,
      tags: client.tags || [],
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      country: '',
      mt5_number: '',
      crm_customer_id: '',
      notes: '',
      tags: [],
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'status-approved',
      pending: 'status-pending',
      rejected: 'status-rejected',
      suspended: 'status-suspended',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Clients
          </h1>
          <p className="text-muted-foreground">Manage client accounts and KYC status</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <label className="cursor-pointer">
            <Button
              variant="outline"
              className="border text-card-foreground"
              disabled={uploading}
              asChild
              data-testid="bulk-upload-btn"
            >
              <span>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Bulk Upload'}
              </span>
            </Button>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          <DialogTrigger asChild>
            <Button
              className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
              data-testid="add-client-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border text-foreground max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {selectedClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">First Name</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1]"
                    data-testid="client-first-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1]"
                    data-testid="client-last-name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-muted/50 border text-foreground focus:border-[#66FCF1] font-mono"
                  data-testid="client-email"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1] font-mono"
                    data-testid="client-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1]"
                    data-testid="client-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">MT5 Number</Label>
                  <Input
                    value={formData.mt5_number}
                    onChange={(e) => setFormData({ ...formData, mt5_number: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1] font-mono"
                    placeholder="e.g., 12345678"
                    data-testid="client-mt5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">CRM Customer ID</Label>
                  <Input
                    value={formData.crm_customer_id}
                    onChange={(e) => setFormData({ ...formData, crm_customer_id: e.target.value })}
                    className="bg-muted/50 border text-foreground focus:border-[#66FCF1] font-mono"
                    placeholder="e.g., CRM-001"
                    data-testid="client-crm-id"
                  />
                </div>
              </div>
              {selectedClient && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">KYC Status</Label>
                  <Select
                    value={formData.kyc_status}
                    onValueChange={(value) => setFormData({ ...formData, kyc_status: value })}
                  >
                    <SelectTrigger className="bg-muted/50 border text-foreground" data-testid="client-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-muted">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-muted/50 border text-foreground focus:border-[#66FCF1]"
                  rows={3}
                  data-testid="client-notes"
                />
              </div>
              {/* Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map(tag => {
                      const selected = (formData.tags || []).includes(tag.tag_id);
                      return (
                        <button
                          key={tag.tag_id}
                          type="button"
                          onClick={() => {
                            const curr = formData.tags || [];
                            setFormData({
                              ...formData,
                              tags: selected ? curr.filter(t => t !== tag.tag_id) : [...curr, tag.tag_id],
                            });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            selected ? 'border-transparent text-white shadow-sm' : 'border bg-muted/50 text-muted-foreground hover:border-primary/50'
                          }`}
                          style={selected ? { backgroundColor: tag.color || 'hsl(var(--primary))' } : {}}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsDialogOpen(false); resetForm(); }}
                  className="border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider disabled:opacity-50"
                  data-testid="save-client-btn"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                  ) : (
                    selectedClient ? 'Update' : 'Create'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 bg-muted/50 border text-foreground placeholder:text-foreground/30 focus:border-[#66FCF1]"
                data-testid="search-clients"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-40 bg-muted/50 border text-foreground" data-testid="filter-status">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Status</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-muted">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
              <SelectTrigger className="w-44 bg-muted/50 border text-foreground" data-testid="filter-tx-type">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="all" className="text-foreground hover:bg-muted">All Transactions</SelectItem>
                <SelectItem value="deposits_only" className="text-foreground hover:bg-muted">Deposits Only</SelectItem>
                <SelectItem value="withdrawals_only" className="text-foreground hover:bg-muted">Withdrawals Only</SelectItem>
                <SelectItem value="no_transactions" className="text-foreground hover:bg-muted">No Transactions</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-[#66FCF1]/30 text-primary hover:bg-primary/15 font-bold uppercase tracking-wider rounded-sm"
                    data-testid="download-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border">
                  <DropdownMenuItem onClick={downloadCSV} className="text-foreground hover:bg-muted cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Clients (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTransactionsCSV} className="text-foreground hover:bg-muted cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export All Transactions (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Balance Filter Row */}
          <div className="flex flex-wrap items-end gap-4 mt-3 pt-3 border-t border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Min Balance</Label>
              <Input
                type="number"
                placeholder="0"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                className="w-32 bg-muted/50 border text-foreground font-mono"
                data-testid="min-balance"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Max Balance</Label>
              <Input
                type="number"
                placeholder="Any"
                value={maxBalance}
                onChange={(e) => setMaxBalance(e.target.value)}
                className="w-32 bg-muted/50 border text-foreground font-mono"
                data-testid="max-balance"
              />
            </div>
            {(minBalance || maxBalance || txTypeFilter !== 'all' || tagFilter.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMinBalance(''); setMaxBalance(''); setTxTypeFilter('all'); setTagFilter([]); setCurrentPage(1); }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
            <div className="flex-1 text-right text-sm text-muted-foreground">
              Showing {filteredClients.length} of {totalClients} clients
            </div>
          </div>
          {/* Tag filter chips */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border">
              <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" /> Filter by Tag:
              </span>
              {availableTags.map(tag => {
                const active = tagFilter.includes(tag.tag_id);
                return (
                  <button
                    key={tag.tag_id}
                    onClick={() => setTagFilter(active ? tagFilter.filter(t => t !== tag.tag_id) : [...tagFilter, tag.tag_id])}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? 'border-transparent text-white shadow-sm' : 'border bg-muted/50 text-muted-foreground hover:border-primary/50'
                    }`}
                    style={active ? { backgroundColor: tag.color || 'hsl(var(--primary))' } : {}}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Client</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Contact</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Country</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Tags</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Transactions</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Net Balance</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs">KYC Status</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.client_id} className="border hover:bg-muted">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
                            <span className="text-primary font-bold text-sm">
                              {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">{client.first_name} {client.last_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{client.client_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground font-mono text-sm">{client.email}</p>
                        <p className="text-xs text-muted-foreground font-mono">{client.phone || '-'}</p>
                      </TableCell>
                      <TableCell className="text-foreground">{client.country || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(client.tags || []).map(tagId => {
                            const tag = availableTags.find(t => t.tag_id === tagId);
                            if (!tag) return null;
                            return (
                              <span
                                key={tagId}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                style={{ backgroundColor: tag.color || 'hsl(var(--primary))' }}
                              >
                                {tag.name}
                              </span>
                            );
                          })}
                          {(!client.tags || client.tags.length === 0) && <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-green-400">
                            <ArrowDownRight className="w-3 h-3" />
                            <span className="font-mono">${(client.total_deposits || 0).toLocaleString()}</span>
                            <span className="text-muted-foreground">({client.deposit_count || 0})</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-400">
                            <ArrowUpRight className="w-3 h-3" />
                            <span className="font-mono">${(client.total_withdrawals || 0).toLocaleString()}</span>
                            <span className="text-muted-foreground">({client.withdrawal_count || 0})</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono font-bold ${(client.net_balance || 0) >= 0 ? 'text-primary' : 'text-red-400'}`}>
                          ${(client.net_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.kyc_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted" data-testid={`client-actions-${client.client_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border">
                            <DropdownMenuItem onClick={() => fetchClientDetails(client.client_id)} className="text-foreground hover:bg-muted cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(client)} className="text-foreground hover:bg-muted cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
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

      {/* Classic Pagination */}
      <div className="flex items-center justify-between px-2 py-3" data-testid="pagination-container">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 text-sm border border rounded-md bg-card text-card-foreground"
            data-testid="page-size-select"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">
            {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalClients)} of {totalClients}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="h-8 px-2 text-xs border"
            data-testid="page-first"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="h-8 px-3 text-xs border"
            data-testid="page-prev"
          >
            Prev
          </Button>
          {(() => {
            const pages = [];
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + 4);
            if (end - start < 4) start = Math.max(1, end - 4);
            for (let i = start; i <= end; i++) {
              pages.push(
                <Button
                  key={i}
                  variant={i === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(i)}
                  className={`h-8 w-8 text-xs ${i === currentPage ? 'bg-[#1F2833] text-white hover:bg-[#1F2833]' : 'border'}`}
                  data-testid={`page-${i}`}
                >
                  {i}
                </Button>
              );
            }
            return pages;
          })()}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="h-8 px-3 text-xs border"
            data-testid="page-next"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="h-8 px-2 text-xs border"
            data-testid="page-last"
          >
            Last
          </Button>
        </div>
      </div>

      {/* View Client Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="bg-card border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Client Details
            </DialogTitle>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-xl">
                    {viewClient.first_name?.charAt(0)}{viewClient.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl text-foreground font-medium">{viewClient.first_name} {viewClient.last_name}</h3>
                  <p className="text-muted-foreground font-mono text-sm">{viewClient.client_id}</p>
                </div>
              </div>
              
              {/* Transaction Summary Cards */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border">
                <div className="bg-muted/50 p-3 rounded-sm border-l-2 border-l-green-500">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownRight className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted-foreground uppercase">Deposits</span>
                  </div>
                  <p className="text-lg font-mono text-green-400">${(viewClient.total_deposits || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{viewClient.deposit_count || 0} transactions</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-sm border-l-2 border-l-red-500">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-muted-foreground uppercase">Withdrawals</span>
                  </div>
                  <p className="text-lg font-mono text-red-400">${(viewClient.total_withdrawals || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{viewClient.withdrawal_count || 0} transactions</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-sm border-l-2 border-l-[#66FCF1]">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase">Net Balance</span>
                  </div>
                  <p className={`text-lg font-mono ${(viewClient.net_balance || 0) >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    ${(viewClient.net_balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{viewClient.transaction_count || 0} total</p>
                </div>
              </div>
              
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                  <p className="text-foreground font-mono">{viewClient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-foreground font-mono">{viewClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Country</p>
                  <p className="text-foreground">{viewClient.country || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">KYC Status</p>
                  {getStatusBadge(viewClient.kyc_status)}
                </div>
              </div>
              
              {/* Recent Transactions */}
              {viewClient.recent_transactions && viewClient.recent_transactions.length > 0 && (
                <div className="pt-4 border-t border">
                  <p className="text-xs text-primary uppercase tracking-wider mb-3">Recent Transactions</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewClient.recent_transactions.map((tx) => (
                      <div key={tx.transaction_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          {tx.transaction_type === 'deposit' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <p className="text-foreground text-sm font-mono">{tx.reference}</p>
                            <p className="text-muted-foreground text-xs">{tx.transaction_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.transaction_type === 'deposit' ? '+' : '-'}${tx.amount?.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground text-xs">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tags in view dialog */}
              {availableTags.length > 0 && (
                <div className="pt-4 border-t border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map(tag => {
                      const selected = (viewClient.tags || []).includes(tag.tag_id);
                      return (
                        <button
                          key={tag.tag_id}
                          onClick={async () => {
                            const curr = viewClient.tags || [];
                            const newTags = selected ? curr.filter(t => t !== tag.tag_id) : [...curr, tag.tag_id];
                            await updateClientTags(viewClient.client_id, newTags);
                            setViewClient({ ...viewClient, tags: newTags });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            selected ? 'border-transparent text-white shadow-sm' : 'border bg-muted/50 text-muted-foreground hover:border-primary/50'
                          }`}
                          style={selected ? { backgroundColor: tag.color || 'hsl(var(--primary))' } : {}}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                  {(!viewClient.tags || viewClient.tags.length === 0) && (
                    <p className="text-muted-foreground text-xs italic">No tags assigned — click to add</p>
                  )}
                </div>
              )}

              {viewClient.notes && (
                <div className="pt-4 border-t border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-foreground">{viewClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
