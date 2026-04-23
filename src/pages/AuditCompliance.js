import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  RefreshCw,
  Clock,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
  Settings2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const SEVERITY_CONFIG = {
  critical: {
    color: "bg-red-500/10 text-red-400 border-red-500/30",
    icon: ShieldAlert,
    label: "Critical",
  },
  warning: {
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    icon: Info,
    label: "Info",
  },
};

const CATEGORY_LABELS = {
  transaction_integrity: "Transaction Integrity",
  fx_rate_verification: "FX Rate Verification",
  psp_settlement: "PSP Settlement",
  anomaly_detection: "Anomaly Detection",
  treasury_balance: "Treasury Balance",
};

function HealthScoreRing({ score }) {
  const r = 54,
    circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto" data-testid="health-score-ring">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#141414"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-[#8B8D91] uppercase tracking-wider">
          Score
        </span>
      </div>
    </div>
  );
}

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <div
      className={`border rounded-xl p-3 mb-2 ${cfg.color}`}
      data-testid={`finding-${finding.transaction_id || finding.account_id || "item"}`}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium text-sm flex-1">{finding.title}</span>
        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
          {cfg.label}
        </Badge>
        {open ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
      {open && (
        <div className="mt-2 pl-6 text-xs text-[#8B8D91] space-y-1">
          <p>{finding.description}</p>
          {finding.transaction_id && (
            <p className="text-[#1FA21B]/70">
              Transaction: {finding.transaction_id}
            </p>
          )}
          {finding.reference && (
            <p className="text-[#1FA21B]/70">Reference: {finding.reference}</p>
          )}
          {finding.account_id && (
            <p className="text-[#1FA21B]/70">Account: {finding.account_id}</p>
          )}
          {finding.deviation_percent && (
            <p>Rate Deviation: {finding.deviation_percent}%</p>
          )}
          {finding.difference !== undefined && (
            <p>Balance Difference: {finding.difference}</p>
          )}
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
  const [filterSev, setFilterSev] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [tab, setTab] = useState("dashboard");

  const getHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
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
    } catch {
      toast.error("Failed to load audit data");
    }
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/audit/settings`, {
        headers: getHeaders(),
      });
      setSettings(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchSettings();
  }, [fetchLatest, fetchSettings]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API}/api/audit/run-scan`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      setScan(data);
      toast.success(`Audit complete. Health score: ${data.health_score}/100`);
      fetchLatest();
    } catch {
      toast.error("Scan failed");
    }
    setScanning(false);
  };

  const saveSettings = async () => {
    try {
      await fetch(`${API}/api/audit/settings`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });
      toast.success("Audit settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const findings = scan?.findings || [];
  const filtered = findings.filter(
    (f) =>
      (filterSev === "all" || f.severity === filterSev) &&
      (filterCat === "all" || f.category === filterCat),
  );
  const stats = scan?.stats || {};

  return (
    <div className="space-y-6" data-testid="audit-compliance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-white"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Audit & Compliance
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Monitor transaction integrity, FX rates, and financial anomalies
          </p>
        </div>
        <Button
          onClick={runScan}
          disabled={scanning}
          data-testid="run-scan-btn"
          className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-semibold"
        >
          {scanning ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          {scanning ? "Scanning..." : "Run Audit Scan"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#0F172A] border border-[#1F2833]">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-[#1FA21B]/10 data-[state=active]:text-[#1FA21B]"
          >
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="findings"
            className="data-[state=active]:bg-[#1FA21B]/10 data-[state=active]:text-[#1FA21B]"
          >
            Findings{" "}
            {findings.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {findings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-[#1FA21B]/10 data-[state=active]:text-[#1FA21B]"
          >
            History
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-[#1FA21B]/10 data-[state=active]:text-[#1FA21B]"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {!scan?.scan_id ? (
            <Card className="bg-[#1F2833] border-[#1F2833]">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="w-12 h-12 text-[#8B8D91] mx-auto mb-3" />
                <p className="text-[#8B8D91]">
                  No audit scan found. Click "Run Audit Scan" to start.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Health Score */}
                <Card className="bg-[#1F2833] border-[#1F2833]">
                  <CardContent className="pt-6 pb-4">
                    <HealthScoreRing score={scan.health_score} />
                    <p className="text-center text-xs text-[#8B8D91] mt-2">
                      Last scan: {new Date(scan.scanned_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <Card className="bg-[#1F2833] border-[#1F2833]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8B8D91]">
                      Issue Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-[#C5C6C7]">Critical</span>
                      </div>
                      <span
                        className="text-lg font-bold text-red-400"
                        data-testid="critical-count"
                      >
                        {stats.critical || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-[#C5C6C7]">Warnings</span>
                      </div>
                      <span
                        className="text-lg font-bold text-amber-400"
                        data-testid="warning-count"
                      >
                        {stats.warning || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-[#C5C6C7]">Info</span>
                      </div>
                      <span
                        className="text-lg font-bold text-blue-400"
                        data-testid="info-count"
                      >
                        {stats.info || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-[#1F2833] border-[#1F2833]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8B8D91]">
                      Scan Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#8B8D91]">
                        Transactions Scanned
                      </span>
                      <span className="text-[#C5C6C7] font-medium">
                        {scan.summary?.total_transactions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B8D91]">PSP Transactions</span>
                      <span className="text-[#C5C6C7] font-medium">
                        {scan.summary?.psp_transactions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B8D91]">Treasury Accounts</span>
                      <span className="text-[#C5C6C7] font-medium">
                        {scan.summary?.treasury_accounts || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B8D91]">Categories Checked</span>
                      <span className="text-[#C5C6C7] font-medium">
                        {scan.summary?.categories_checked || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card className="bg-[#1F2833] border-[#1F2833]">
                <CardHeader>
                  <CardTitle className="text-sm text-[#8B8D91]">
                    Findings by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                      const catFindings = findings.filter(
                        (f) => f.category === key,
                      );
                      const critCount = catFindings.filter(
                        (f) => f.severity === "critical",
                      ).length;
                      const warnCount = catFindings.filter(
                        (f) => f.severity === "warning",
                      ).length;
                      const infoCount = catFindings.filter(
                        (f) => f.severity === "info",
                      ).length;
                      const hasIssues = catFindings.length > 0;
                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-xl border cursor-pointer transition-all hover:border-[#1FA21B]/50 ${hasIssues ? "border-amber-500/30 bg-amber-500/10" : "border-green-500/30 bg-green-500/10"}`}
                          onClick={() => {
                            setFilterCat(key);
                            setFilterSev("all");
                            setTab("findings");
                          }}
                          data-testid={`category-${key}`}
                        >
                          <p className="text-xs text-[#8B8D91] font-medium mb-2">
                            {label}
                          </p>
                          {hasIssues ? (
                            <div className="flex gap-2 text-xs">
                              {critCount > 0 && (
                                <span className="text-red-400">
                                  {critCount} critical
                                </span>
                              )}
                              {warnCount > 0 && (
                                <span className="text-amber-400">
                                  {warnCount} warn
                                </span>
                              )}
                              {infoCount > 0 && (
                                <span className="text-blue-400">
                                  {infoCount} info
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-green-400">
                              All clear
                            </span>
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
          <div
            className="flex flex-wrap gap-2 items-center"
            data-testid="findings-filters"
          >
            <span className="text-xs text-[#8B8D91] mr-1">
              <Filter className="w-3 h-3 inline mr-1" />
              Severity:
            </span>
            {["all", "critical", "warning", "info"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterSev === s ? "default" : "outline"}
                className={
                  filterSev === s
                    ? "bg-[#1FA21B] text-[#0B0C10] h-7 text-xs"
                    : "border-[#2A3A4A] text-[#8B8D91] h-7 text-xs"
                }
                onClick={() => setFilterSev(s)}
                data-testid={`filter-sev-${s}`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <span className="text-xs text-[#8B8D91] ml-3 mr-1">Category:</span>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="bg-[#0F172A] border border-[#1F2833] text-white text-xs rounded px-2 py-1"
              data-testid="filter-category-select"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[#8B8D91]">
            {filtered.length} finding{filtered.length !== 1 ? "s" : ""} shown
          </p>

          <div
            className="max-h-[65vh] overflow-y-auto space-y-1 pr-1"
            data-testid="findings-list"
          >
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-[#8B8D91]">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">No findings match your filters</p>
              </div>
            ) : (
              filtered.map((f, i) => (
                <FindingCard
                  key={`${f.transaction_id || f.account_id}-${i}`}
                  finding={f}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-[#1F2833] border-[#1F2833]">
            <CardContent className="pt-4">
              {history.length === 0 ? (
                <p className="text-center py-8 text-[#8B8D91] text-sm">
                  No audit history yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    data-testid="audit-history-table"
                  >
                    <thead>
                      <tr className="text-[#8B8D91] text-xs border-b border-[#2A3A4A]">
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
                        const scoreColor =
                          h.health_score >= 80
                            ? "text-green-400"
                            : h.health_score >= 50
                              ? "text-amber-400"
                              : "text-red-400";
                        return (
                          <tr
                            key={h.scan_id || i}
                            className="border-b border-[#2A3A4A]/50 hover:bg-[#2A3A4A]/20"
                          >
                            <td className="py-2 px-3 text-[#C5C6C7]">
                              {new Date(h.scanned_at).toLocaleString()}
                            </td>
                            <td
                              className={`py-2 px-3 text-center font-bold ${scoreColor}`}
                            >
                              {h.health_score}
                            </td>
                            <td className="py-2 px-3 text-center text-red-400">
                              {h.stats?.critical || 0}
                            </td>
                            <td className="py-2 px-3 text-center text-amber-400">
                              {h.stats?.warning || 0}
                            </td>
                            <td className="py-2 px-3 text-center text-blue-400">
                              {h.stats?.info || 0}
                            </td>
                            <td className="py-2 px-3 text-center text-[#8B8D91]">
                              {h.summary?.total_transactions || "-"}
                            </td>
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
            <Card className="bg-[#1F2833] border-[#1F2833]">
              <CardHeader>
                <CardTitle className="text-sm text-[#C5C6C7] flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Audit Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[#8B8D91] text-xs">
                      Large Transaction Threshold (USD)
                    </Label>
                    <Input
                      type="number"
                      value={settings.large_transaction_threshold || 50000}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          large_transaction_threshold: Number(e.target.value),
                        })
                      }
                      className="bg-[#0F172A] border-[#1F2833] text-white"
                      data-testid="threshold-input"
                    />
                    <p className="text-[10px] text-[#8B8D91]">
                      Transactions above this amount will be flagged as info
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#8B8D91] text-xs">
                      FX Rate Deviation Threshold (%)
                    </Label>
                    <Input
                      type="number"
                      value={settings.fx_deviation_threshold || 5}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          fx_deviation_threshold: Number(e.target.value),
                        })
                      }
                      className="bg-[#0F172A] border-[#1F2833] text-white"
                      data-testid="fx-deviation-input"
                    />
                    <p className="text-[10px] text-[#8B8D91]">
                      FX rate deviations above this % are flagged
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#2A3A4A] pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-[#C5C6C7]">
                    Automated Daily Scan
                  </h3>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={settings.auto_scan_enabled || false}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, auto_scan_enabled: v })
                      }
                      data-testid="auto-scan-toggle"
                    />
                    <span className="text-sm text-[#8B8D91]">
                      Enable daily automated audit scan
                    </span>
                  </div>
                  {settings.auto_scan_enabled && (
                    <div className="space-y-2 pl-8">
                      <Label className="text-[#8B8D91] text-xs">
                        Scan Time (UTC)
                      </Label>
                      <Input
                        type="time"
                        value={settings.auto_scan_time || "02:00"}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            auto_scan_time: e.target.value,
                          })
                        }
                        className="bg-[#0F172A] border-[#1F2833] text-white w-40"
                        data-testid="scan-time-input"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2A3A4A] pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-[#C5C6C7]">
                    Alert Email Recipients
                  </h3>
                  <p className="text-[10px] text-[#8B8D91]">
                    Comma-separated emails to receive audit alerts when issues
                    are found
                  </p>
                  <Input
                    value={(settings.alert_emails || []).join(", ")}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alert_emails: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="admin@company.com, cfo@company.com"
                    className="bg-[#0F172A] border-[#1F2833] text-white"
                    data-testid="alert-emails-input"
                  />
                </div>

                <Button
                  onClick={saveSettings}
                  className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-semibold"
                  data-testid="save-audit-settings-btn"
                >
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
