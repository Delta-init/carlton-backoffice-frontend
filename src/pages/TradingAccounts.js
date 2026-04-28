import { useEffect, useState } from 'react';
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
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import {
  Wallet,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Eye,
  Filter,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const accountTypes = [
  { value: 'MT4', label: 'MetaTrader 4' },
  { value: 'MT5', label: 'MetaTrader 5' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const leverageOptions = [
  { value: 50, label: '1:50' },
  { value: 100, label: '1:100' },
  { value: 200, label: '1:200' },
  { value: 500, label: '1:500' },
];

export default function TradingAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    account_type: 'MT4',
    currency: 'USD',
    leverage: 100,
    status: 'active',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchAccounts = async () => {
    try {
      let url = `${API_URL}/api/trading-accounts`;
      if (statusFilter && statusFilter !== 'all') url += `?status=${statusFilter}`;

      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clients?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setClients(data.items || data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchClients();
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedAccount
        ? `${API_URL}/api/trading-accounts/${selectedAccount.account_id}`
        : `${API_URL}/api/trading-accounts`;
      const method = selectedAccount ? 'PUT' : 'POST';

      const body = selectedAccount
        ? { leverage: formData.leverage, status: formData.status }
        : formData;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(selectedAccount ? 'Account updated' : 'Account created');
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setFormData({
      client_id: account.client_id,
      account_type: account.account_type,
      currency: account.currency,
      leverage: account.leverage,
      status: account.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({
      client_id: '',
      account_type: 'MT4',
      currency: 'USD',
      leverage: 100,
      status: 'active',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-pending',
      suspended: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.client_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : clientId;
  };

  const filteredAccounts = accounts.filter(acc => {
    const clientName = getClientName(acc.client_id).toLowerCase();
    return clientName.includes(searchTerm.toLowerCase()) || 
           acc.account_number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="trading-accounts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Trading Accounts
          </h1>
          <p className="text-[#C5C6C7]">Manage MT4/MT5 trading accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
              data-testid="add-account-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {selectedAccount ? 'Edit Account' : 'Create Trading Account'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!selectedAccount && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger className="bg-muted/50 border text-white" data-testid="select-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {clients.map((client) => (
                        <SelectItem key={client.client_id} value={client.client_id} className="text-white hover:bg-card/5">
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!selectedAccount && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger className="bg-muted/50 border text-white" data-testid="select-account-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border">
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-card/5">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger className="bg-muted/50 border text-white" data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border">
                        <SelectItem value="USD" className="text-white hover:bg-card/5">USD</SelectItem>
                        <SelectItem value="EUR" className="text-white hover:bg-card/5">EUR</SelectItem>
                        <SelectItem value="GBP" className="text-white hover:bg-card/5">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Leverage</Label>
                  <Select
                    value={String(formData.leverage)}
                    onValueChange={(value) => setFormData({ ...formData, leverage: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-muted/50 border text-white" data-testid="select-leverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {leverageOptions.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-white hover:bg-card/5">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccount && (
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-muted/50 border text-white" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border">
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-card/5">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsDialogOpen(false); resetForm(); }}
                  className="border text-[#C5C6C7] hover:bg-card/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                  data-testid="save-account-btn"
                >
                  {selectedAccount ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5C6C7]" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border text-white placeholder:text-white/30 focus:border-[#66FCF1]"
            data-testid="search-accounts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border text-white" data-testid="filter-account-status">
            <Filter className="w-4 h-4 mr-2 text-[#C5C6C7]" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-card border">
            <SelectItem value="all" className="text-white hover:bg-card/5">All Status</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-card/5">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card border">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border hover:bg-transparent">
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Account</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Client</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Balance</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Leverage</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#C5C6C7]">
                      No trading accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.account_id} className="border hover:bg-card/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#66FCF1]/10 rounded-sm flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-[#66FCF1]" />
                          </div>
                          <div>
                            <p className="text-white font-mono font-medium">{account.account_number}</p>
                            <p className="text-xs text-[#C5C6C7]">{account.currency}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{getClientName(account.client_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#66FCF1]/30 text-[#66FCF1]">
                          {account.account_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-mono font-medium">
                        ${account.balance?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-mono">1:{account.leverage}</TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-card/5" data-testid={`account-actions-${account.account_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border">
                            <DropdownMenuItem onClick={() => setViewAccount(account)} className="text-white hover:bg-card/5 cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(account)} className="text-white hover:bg-card/5 cursor-pointer">
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

      {/* View Account Dialog */}
      <Dialog open={!!viewAccount} onOpenChange={() => setViewAccount(null)}>
        <DialogContent className="bg-card border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Account Details
            </DialogTitle>
          </DialogHeader>
          {viewAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#66FCF1]/10 rounded-sm flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-[#66FCF1]" />
                </div>
                <div>
                  <h3 className="text-xl text-white font-mono font-medium">{viewAccount.account_number}</h3>
                  <p className="text-[#C5C6C7]">{getClientName(viewAccount.client_id)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Account Type</p>
                  <Badge variant="outline" className="border-[#66FCF1]/30 text-[#66FCF1]">
                    {viewAccount.account_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Currency</p>
                  <p className="text-white font-mono">{viewAccount.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Balance</p>
                  <p className="text-white font-mono text-lg">${viewAccount.balance?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Equity</p>
                  <p className="text-white font-mono text-lg">${viewAccount.equity?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Leverage</p>
                  <p className="text-white font-mono">1:{viewAccount.leverage}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Status</p>
                  {getStatusBadge(viewAccount.status)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
