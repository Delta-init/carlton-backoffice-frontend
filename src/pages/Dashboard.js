import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import {
  Users,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  color = "blue",
}) => (
  <Card className="bg-white border-slate-200 shadow-sm card-hover">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-800 font-mono">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 ${trendUp ? "text-green-600" : "text-red-600"}`}
            >
              {trendUp ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span className="text-xs font-mono">{trend}</span>
            </div>
          )}
        </div>
        <div
          className={`p-2 rounded-xl ${color === "blue" ? "bg-blue-100" : color === "green" ? "bg-green-100" : color === "yellow" ? "bg-yellow-100" : "bg-red-100"}`}
        >
          <Icon
            className={`w-5 h-5 ${color === "blue" ? "text-blue-600" : color === "green" ? "text-green-600" : color === "yellow" ? "text-yellow-600" : "text-red-600"}`}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-3">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm font-mono"
            style={{ color: entry.color }}
          >
            {entry.name}: ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState({
    recent_transactions: [],
    recent_clients: [],
  });
  const [kycData, setKycData] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, chartRes, activityRes, analyticsRes] = await Promise.all(
        [
          fetch(`${API_URL}/api/reports/dashboard`, {
            headers: getAuthHeaders(),
            credentials: "include",
          }),
          fetch(`${API_URL}/api/reports/transactions-summary?days=30`, {
            headers: getAuthHeaders(),
            credentials: "include",
          }),
          fetch(`${API_URL}/api/reports/recent-activity?limit=5`, {
            headers: getAuthHeaders(),
            credentials: "include",
          }),
          fetch(`${API_URL}/api/reports/client-analytics`, {
            headers: getAuthHeaders(),
            credentials: "include",
          }),
        ],
      );

      if (statsRes.ok) setStats(await statsRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (activityRes.ok) setRecentActivity(await activityRes.json());
      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setKycData(analytics.kyc_distribution || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useAutoRefresh(fetchData, 30000);

  const getStatusBadge = (status) => {
    const styles = {
      completed: "status-approved",
      approved: "status-approved",
      pending: "status-pending",
      cancelled: "status-rejected",
      rejected: "status-rejected",
      failed: "status-rejected",
    };
    return (
      <Badge
        className={`${styles[status] || "status-pending"} text-xs uppercase`}
      >
        {status}
      </Badge>
    );
  };

  const COLORS = ["#2563EB", "#16A34A", "#CA8A04", "#DC2626"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1
          className="text-4xl font-bold uppercase tracking-tight text-slate-800"
          style={{ fontFamily: "Barlow Condensed" }}
        >
          Dashboard
        </h1>
        <p className="text-slate-500">
          Overview of your FX brokerage operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats?.clients?.total || 0}
          subtitle={`${stats?.clients?.approved || 0} approved`}
          icon={Users}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Treasury Balance"
          value={`$${(stats?.treasury?.total_balance || 0).toLocaleString()}`}
          subtitle={`${stats?.treasury?.active || 0} active accounts`}
          icon={Landmark}
          color="green"
        />
        <StatCard
          title="Total Deposits"
          value={`$${(stats?.transactions?.total_deposits || 0).toLocaleString()}`}
          subtitle="Approved transactions"
          icon={DollarSign}
          trend="+8.5%"
          trendUp
          color="blue"
        />
        <StatCard
          title="Pending Actions"
          value={stats?.transactions?.pending || 0}
          subtitle={`${stats?.clients?.pending || 0} KYC pending`}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transaction Chart */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Transaction Volume (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="depositGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="withdrawalGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    tick={{ fill: "#64748B", fontSize: 10 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: "#64748B", fontSize: 10 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke="#2563EB"
                    fillOpacity={1}
                    fill="url(#depositGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke="#DC2626"
                    fillOpacity={1}
                    fill="url(#withdrawalGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KYC Distribution */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              KYC Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kycData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {kycData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#1E293B" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {kycData.map((item, index) => (
                <div key={item.status} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-slate-500 capitalize">
                    {item.status}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {recentActivity.recent_transactions?.map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${tx.transaction_type === "deposit" ? "bg-green-100" : "bg-red-100"}`}
                      >
                        {tx.transaction_type === "deposit" ? (
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 font-mono">
                          {tx.reference}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tx.client_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-mono ${tx.transaction_type === "deposit" ? "text-green-600" : "text-red-600"}`}
                      >
                        {tx.transaction_type === "deposit" ? "+" : "-"}$
                        {tx.amount?.toLocaleString()}
                      </p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}
                {(!recentActivity.recent_transactions ||
                  recentActivity.recent_transactions.length === 0) && (
                  <p className="text-center text-slate-500 py-8">
                    No recent transactions
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Recent Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {recentActivity.recent_clients?.map((client) => (
                  <div
                    key={client.client_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">
                          {client.first_name?.charAt(0)}
                          {client.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-800">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(client.kyc_status)}
                  </div>
                ))}
                {(!recentActivity.recent_clients ||
                  recentActivity.recent_clients.length === 0) && (
                  <p className="text-center text-slate-500 py-8">
                    No recent clients
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
