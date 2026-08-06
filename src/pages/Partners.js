import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Handshake,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fmtUsd = (n) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
  <Card className="bg-card border shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === 'green' ? 'bg-green-100' : color === 'red' ? 'bg-red-100' : color === 'yellow' ? 'bg-yellow-100' : 'bg-primary/15'}`}>
          <Icon className={`w-5 h-5 ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-yellow-600' : 'text-primary'}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Partners() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [summary, setSummary] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/reports/partner-summary`, {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setPartners(d.partners || []);
        setSummary(d.summary || null);
      } else {
        toast.error('Failed to load partner summary');
      }
    } catch {
      toast.error('Failed to load partner summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partners</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deposits, withdrawals, and transactions by partner (client tag)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Partners" value={summary?.total_partners ?? 0} icon={Users} color="blue" />
        <StatCard title="Total Deposits" value={fmtUsd(summary?.total_deposits_usd)} icon={ArrowUpRight} color="green" />
        <StatCard title="Total Withdrawals" value={fmtUsd(summary?.total_withdrawals_usd)} icon={ArrowDownRight} color="red" />
        <StatCard title="Net" value={fmtUsd(summary?.total_net)} icon={TrendingUp} color="blue" />
      </div>

      {partners.length === 0 ? (
        <Card className="bg-card border">
          <CardContent className="p-10 text-center text-muted-foreground">
            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No partners visible</p>
            <p className="text-sm mt-1">No client tags exist yet, or your role isn't granted access to any.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map((p) => (
            <Card
              key={p.tag_id}
              className="bg-card border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/partners/${p.tag_id}`)}
              data-testid={`partner-card-${p.tag_id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#94a3b8' }} />
                    <span className="font-semibold text-foreground truncate">{p.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{p.transaction_count} txns</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposits</p>
                    <p className="text-sm font-mono font-semibold text-green-600">{fmtUsd(p.total_deposits_usd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawals</p>
                    <p className="text-sm font-mono font-semibold text-red-600">{fmtUsd(p.total_withdrawals_usd)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Net</span>
                  <span className={`text-sm font-mono font-semibold ${p.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtUsd(p.net)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
