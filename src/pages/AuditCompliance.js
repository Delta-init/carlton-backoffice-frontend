import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Info, RefreshCw, Clock,
  ArrowRight, Filter, ChevronDown, ChevronUp, Settings2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';

const API = process.env.REACT_APP_BACKEND_URL;

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert, label: 'Critical' },
  warning: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, label: 'Warning' },
  info: { color: 'bg-primary/10 text-primary border-primary/30', icon: Info, label: 'Info' },
};

const CATEGORY_LABELS = {
  transaction_integrity: 'Transaction Integrity',
  fx_rate_verification: 'FX Rate Verification',
  psp_settlement: 'PSP Settlement',
  anomaly_detection: 'Anomaly Detection',
  treasury_balance: 'Treasury Balance',
};

function HealthScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-36 h-36 mx-auto" data-testid="health-score-ring">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <div className={`border rounded-lg p-3 mb-2 ${cfg.color}`} data-testid={`finding-${finding.transaction_id || finding.account_id || 'item'}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium text-sm flex-1">{finding.title}</span>
        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      {open && (
        <div className="mt-2 pl-6 text-xs text-muted-foreground space-y-1">
          <p>{finding.description}</p>
          {finding.transaction_id && <p className="text-indigo-600/70">Transaction: {finding.transaction_id}</p>}
          {finding.reference && <p className="text-indigo-600/70">Reference: {finding.reference}</p>}
          {finding.account_id && <p className="text-indigo-600/70">Account: {finding.account_id}</p>}
          {finding.deviation_percent && <p>Rate Deviation: {finding.deviation_percent}%</p>}
          {finding.difference !== undefined && <p>Balance Difference: {finding.difference}</p>}
        </div>
      )}
    </div>
  );
}

export default function AuditCompliance() {
  const { user } = useAuth();
  const [scan, setScan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [settings, setSettings] = useState(null);
  const [filterSev, setFilterSev] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [tab, setTab] = useState('dashboard');

  const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    try {
      const [scanRes, histRes] = await Promise.all([
        fetch(`${API}/api/audit/latest`, { headers: getHeaders() }),
        fetch(`${API}/api/audit/history`, { headers: getHeaders() }),
      ]);
      const scanData = await scanRes.json();
      const histData = await histRes.json();
      if (scanData.scan_id) setScan(scanData);
      setHistory(Array.isArray(histData) ? histData : []);
    } catch (err) { toast.error(err?.message || 'Failed to load audit data'); }
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/audit/settings`, { headers: getHeaders() });
      setSettings(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLatest(); fetchSettings(); }, [fetchLatest, fetchSettings]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API}/api/audit/run-scan`, { method: 'POST', headers: getHeaders() });
      const data = await res.json();
      setScan(data);
      toast.success(`Audit complete. Health score: ${data.health_score}/100`);
      fetchLatest();
    } catch (err) { toast.error(err?.message || "Something went wrong. Please try again."); }
    setScanning(false);
  };

  const saveSettings = async () => {
    try {
      await fetch(`${API}/api/audit/settings`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(settings) });
      toast.success('Audit settings saved');
    } catch (err) { toast.error(err?.message || 'Failed to save settings'); }
  };

  const findings = scan?.findings || [];
  const filtered = findings.filter(f =>
    (filterSev === 'all' || f.severity === filterSev) &&
    (filterCat === 'all' || f.category === filterCat)
  );
  const stats = scan?.stats || {};

  return (
    <div className="space-y-6" data-testid="audit-compliance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit & Compliance</h1>
          <p className="text-sm text-muted-foreground">Monitor transaction integrity, FX rates, and financial anomalies</p>
        </div>
        <Button onClick={runScan} disabled={scanning} data-testid="run-scan-btn"
          className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">
          {scanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          {scanning ? 'Scanning...' : 'Run Audit Scan'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted border border">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">Dashboard</TabsTrigger>
          <TabsTrigger value="findings" className="data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
            Findings {findings.length > 0 && <Badge variant="outline" className="ml-1 text-[10px]">{findings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">History</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">Settings</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {!scan?.scan_id ? (
            <Card className="bg-card border">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No audit scan found. Click "Run Audit Scan" to start.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Health Score */}
                <Card className="bg-card border">
                  <CardContent className="pt-6 pb-4">
                    <HealthScoreRing score={scan.health_score} />
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      Last scan: {new Date(scan.scanned_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <Card className="bg-card border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Issue Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400" /><span className="text-sm text-card-foreground">Critical</span></div>
                      <span className="text-lg font-bold text-red-400" data-testid="critical-count">{stats.critical || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-sm text-card-foreground">Warnings</span></div>
                      <span className="text-lg font-bold text-amber-400" data-testid="warning-count">{stats.warning || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Info className="w-4 h-4 text-primary/60" /><span className="text-sm text-card-foreground">Info</span></div>
                      <span className="text-lg font-bold text-primary/60" data-testid="info-count">{stats.info || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-card border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scan Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Transactions Scanned</span><span className="text-card-foreground font-medium">{scan.summary?.total_transactions || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">PSP Transactions</span><span className="text-card-foreground font-medium">{scan.summary?.psp_transactions || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Treasury Accounts</span><span className="text-card-foreground font-medium">{scan.summary?.treasury_accounts || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Categories Checked</span><span className="text-card-foreground font-medium">{scan.summary?.categories_checked || 0}</span></div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card className="bg-card border">
                <CardHeader><CardTitle className="text-sm text-muted-foreground">Findings by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                      const catFindings = findings.filter(f => f.category === key);
                      const critCount = catFindings.filter(f => f.severity === 'critical').length;
                      const warnCount = catFindings.filter(f => f.severity === 'warning').length;
                      const infoCount = catFindings.filter(f => f.severity === 'info').length;
                      const hasIssues = catFindings.length > 0;
                      return (
                        <div key={key} className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-indigo-300 ${hasIssues ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}
                          onClick={() => { setFilterCat(key); setFilterSev('all'); setTab('findings'); }}
                          data-testid={`category-${key}`}>
                          <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
                          {hasIssues ? (
                            <div className="flex gap-2 text-xs">
                              {critCount > 0 && <span className="text-red-400">{critCount} critical</span>}
                              {warnCount > 0 && <span className="text-amber-400">{warnCount} warn</span>}
                              {infoCount > 0 && <span className="text-primary/60">{infoCount} info</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-green-400">All clear</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* FINDINGS TAB */}
        <TabsContent value="findings" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center" data-testid="findings-filters">
            <span className="text-xs text-muted-foreground mr-1"><Filter className="w-3 h-3 inline mr-1" />Severity:</span>
            {['all', 'critical', 'warning', 'info'].map(s => (
              <Button key={s} size="sm" variant={filterSev === s ? 'default' : 'outline'}
                className={filterSev === s ? 'bg-indigo-600 text-white h-7 text-xs' : 'border text-card-foreground h-7 text-xs'}
                onClick={() => setFilterSev(s)} data-testid={`filter-sev-${s}`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-3 mr-1">Category:</span>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="bg-card border border text-card-foreground text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-400"
              data-testid="filter-category-select">
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <p className="text-xs text-muted-foreground">{filtered.length} finding{filtered.length !== 1 ? 's' : ''} shown</p>

          <div className="max-h-[65vh] overflow-y-auto space-y-1 pr-1" data-testid="findings-list">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">No findings match your filters</p>
              </div>
            ) : (
              filtered.map((f, i) => <FindingCard key={`${f.transaction_id || f.account_id}-${i}`} finding={f} />)
            )}
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-card border">
            <CardContent className="pt-4">
              {history.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No audit history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="audit-history-table">
                    <thead>
                      <tr className="text-muted-foreground text-xs border-b border">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-center py-2 px-3">Score</th>
                        <th className="text-center py-2 px-3">Critical</th>
                        <th className="text-center py-2 px-3">Warnings</th>
                        <th className="text-center py-2 px-3">Info</th>
                        <th className="text-center py-2 px-3">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => {
                        const scoreColor = h.health_score >= 80 ? 'text-green-400' : h.health_score >= 50 ? 'text-amber-400' : 'text-red-400';
                        return (
                          <tr key={h.scan_id || i} className="border-b border/50 hover:bg-muted/50">
                            <td className="py-2 px-3 text-card-foreground">{new Date(h.scanned_at).toLocaleString()}</td>
                            <td className={`py-2 px-3 text-center font-bold ${scoreColor}`}>{h.health_score}</td>
                            <td className="py-2 px-3 text-center text-red-400">{h.stats?.critical || 0}</td>
                            <td className="py-2 px-3 text-center text-amber-400">{h.stats?.warning || 0}</td>
                            <td className="py-2 px-3 text-center text-primary/60">{h.stats?.info || 0}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground">{h.summary?.total_transactions || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="mt-4">
          {settings && (
            <Card className="bg-card border">
              <CardHeader><CardTitle className="text-sm text-card-foreground flex items-center gap-2"><Settings2 className="w-4 h-4" /> Audit Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Large Transaction Threshold (USD)</Label>
                    <Input type="number" value={settings.large_transaction_threshold || 50000}
                      onChange={e => setSettings({ ...settings, large_transaction_threshold: Number(e.target.value) })}
                      className="bg-muted/50 border text-foreground"
                      data-testid="threshold-input" />
                    <p className="text-[10px] text-muted-foreground">Transactions above this amount will be flagged as info</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">FX Rate Deviation Threshold (%)</Label>
                    <Input type="number" value={settings.fx_deviation_threshold || 5}
                      onChange={e => setSettings({ ...settings, fx_deviation_threshold: Number(e.target.value) })}
                      className="bg-muted/50 border text-foreground"
                      data-testid="fx-deviation-input" />
                    <p className="text-[10px] text-muted-foreground">FX rate deviations above this % are flagged</p>
                  </div>
                </div>

                <div className="border-t border pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-card-foreground">Automated Daily Scan</h3>
                  <div className="flex items-center gap-3">
                    <Switch checked={settings.auto_scan_enabled || false}
                      onCheckedChange={v => setSettings({ ...settings, auto_scan_enabled: v })}
                      data-testid="auto-scan-toggle" />
                    <span className="text-sm text-muted-foreground">Enable daily automated audit scan</span>
                  </div>
                  {settings.auto_scan_enabled && (
                    <div className="space-y-2 pl-8">
                      <Label className="text-muted-foreground text-xs">Scan Time (UTC)</Label>
                      <Input type="time" value={settings.auto_scan_time || '02:00'}
                        onChange={e => setSettings({ ...settings, auto_scan_time: e.target.value })}
                        className="bg-muted/50 border text-card-foreground w-40"
                        data-testid="scan-time-input" />
                    </div>
                  )}
                </div>

                <div className="border-t border pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-card-foreground">Alert Email Recipients</h3>
                  <p className="text-[10px] text-muted-foreground">Comma-separated emails to receive audit alerts when issues are found</p>
                  <Input value={(settings.alert_emails || []).join(', ')}
                    onChange={e => setSettings({ ...settings, alert_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="admin@company.com, cfo@company.com"
                    className="bg-muted/50 border text-foreground"
                    data-testid="alert-emails-input" />
                </div>

                <Button onClick={saveSettings} className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
                  data-testid="save-audit-settings-btn">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
