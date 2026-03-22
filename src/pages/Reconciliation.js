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
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
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
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  CalendarDays,
  Building2,
  CreditCard,
  Store,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Link2,
  Flag,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Download,
  Eye,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Big Calendar Component
function BigCalendarView({
  selectedDate,
  onSelectDate,
  datesWithTx,
  reconStatus,
  dailySummary,
  formatDate,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getDateStatus = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split("T")[0];
    return reconStatus[dateStr];
  };

  const hasTransactions = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split("T")[0];
    return datesWithTx.includes(dateStr);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // Get status by type for a specific date
  const getStatusByType = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split("T")[0];
    const statusData = reconStatus[dateStr];

    // If it's the new detailed format with type breakdown
    if (statusData && typeof statusData === "object" && statusData.byType) {
      return statusData.byType;
    }

    // Legacy format - return null to show generic status
    return null;
  };

  // Type icons and colors
  const typeConfig = {
    treasury: { icon: Building2, label: "Treasury", color: "blue" },
    psp: { icon: CreditCard, label: "PSP", color: "purple" },
    exchanger: { icon: Store, label: "Exchanger", color: "orange" },
  };

  const statusColors = {
    completed: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: CheckCircle2,
    },
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
    flagged: { bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-6">
      {/* Summary Cards at Top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Reconciled</p>
                <p className="text-3xl font-bold text-green-600">
                  {dailySummary?.reconciled || 0}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {dailySummary?.pending || 0}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Flagged</p>
                <p className="text-3xl font-bold text-red-600">
                  {dailySummary?.flagged || 0}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dailySummary?.total || 0}
                </p>
              </div>
              <CalendarDays className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Big Calendar */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary text-white py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h2 className="text-2xl font-bold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-slate-100 border-b">
            {dayNames.map((day) => (
              <div
                key={day}
                className="py-3 text-center font-semibold text-slate-600 text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {days.map((date, index) => {
              const status = getDateStatus(date);
              const statusByType = getStatusByType(date);
              const hasTx = hasTransactions(date);
              const today = isToday(date);
              const selected = isSelected(date);

              return (
                <div
                  key={index}
                  onClick={() => date && onSelectDate(date)}
                  className={`
                    min-h-[100px] p-2 border-b border-r relative
                    ${!date ? "bg-slate-50" : "bg-white hover:bg-slate-50 cursor-pointer"}
                    ${selected ? "ring-2 ring-blue-500 ring-inset bg-blue-50" : ""}
                    transition-all duration-150
                  `}
                >
                  {date && (
                    <>
                      {/* Date Number */}
                      <div
                        className={`
                        w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                        ${today ? "bg-blue-600 text-white" : ""}
                        ${hasTx && !today ? "bg-blue-100 text-blue-700 font-bold" : ""}
                      `}
                      >
                        {date.getDate()}
                      </div>

                      {/* Status Indicators by Type */}
                      <div className="mt-1 space-y-1">
                        {statusByType ? (
                          // Show status breakdown by type
                          <>
                            {statusByType.treasury && (
                              <div
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                  statusByType.treasury === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : statusByType.treasury === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                <Building2 className="w-3 h-3" />
                                <span className="truncate">Treasury</span>
                              </div>
                            )}
                            {statusByType.psp && (
                              <div
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                  statusByType.psp === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : statusByType.psp === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                <CreditCard className="w-3 h-3" />
                                <span className="truncate">PSP</span>
                              </div>
                            )}
                            {statusByType.exchanger && (
                              <div
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                  statusByType.exchanger === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : statusByType.exchanger === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                <Store className="w-3 h-3" />
                                <span className="truncate">Exchanger</span>
                              </div>
                            )}
                          </>
                        ) : (
                          // Fallback to legacy status display
                          <>
                            {status === "completed" && (
                              <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Done</span>
                              </div>
                            )}
                            {status === "pending" && (
                              <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </div>
                            )}
                            {status === "flagged" && (
                              <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Flagged</span>
                              </div>
                            )}
                            {hasTx && !status && (
                              <div className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                <CalendarDays className="w-3 h-3" />
                                <span>Transactions</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
            15
          </div>
          <span className="text-slate-600">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
            15
          </div>
          <span className="text-slate-600">Has Transactions</span>
        </div>
        <div className="border-l border-slate-300 pl-4 flex items-center gap-4">
          <span className="text-slate-500 font-medium">Types:</span>
          <div className="flex items-center gap-1">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-slate-600">Treasury</span>
          </div>
          <div className="flex items-center gap-1">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span className="text-slate-600">PSP</span>
          </div>
          <div className="flex items-center gap-1">
            <Store className="w-4 h-4 text-orange-600" />
            <span className="text-slate-600">Exchanger</span>
          </div>
        </div>
        <div className="border-l border-slate-300 pl-4 flex items-center gap-4">
          <span className="text-slate-500 font-medium">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-600">Reconciled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-600">Flagged</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reconciliation() {
  const { user, getAuthHeaders } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [datesWithTx, setDatesWithTx] = useState([]);
  const [reconStatus, setReconStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedType, setSelectedType] = useState(null); // treasury, psp, exchanger

  // Account selection
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [exchangers, setExchangers] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");

  // Transaction history for selected account/date
  const [accountHistory, setAccountHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Statement upload
  const [uploading, setUploading] = useState(false);
  const [statementFile, setStatementFile] = useState(null);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [showParsed, setShowParsed] = useState(false);

  // Matching
  const [selectedSystemTx, setSelectedSystemTx] = useState(null);
  const [selectedStatementEntry, setSelectedStatementEntry] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [flaggedEntries, setFlaggedEntries] = useState([]);
  const [flagDialog, setFlagDialog] = useState({
    open: false,
    entry: null,
    reason: "",
  });

  // Approval
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // History
  const [reconHistory, setReconHistory] = useState([]);
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    item: null,
  });
  const [historyFilters, setHistoryFilters] = useState({
    dateFrom: "",
    dateTo: "",
    type: "all",
    account: "all",
    matched: "all",
    flagged: "all",
    status: "all",
  });
  const [exporting, setExporting] = useState(false);

  // Daily summary
  const [dailySummary, setDailySummary] = useState(null);

  // Pending reconciliation
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSummary, setPendingSummary] = useState({ total: 0, dates: 0 });
  const [pendingFilters, setPendingFilters] = useState({
    dateFrom: "",
    dateTo: "",
    accountType: "all",
  });

  // Fetch dates with transactions
  const fetchDatesWithTransactions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/reconciliation/dates-with-transactions`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setDatesWithTx(data.dates || []);
        setReconStatus(data.status || {});
      } else {
        console.error("Error fetching dates:", response.status);
      }
    } catch (error) {
      console.error("Error fetching dates:", error);
    }
  }, [getAuthHeaders]);

 // Fetch accounts
   // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const [treasuryRes, pspRes, exchangerRes] = await Promise.all([
        fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/psp`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/vendors?page_size=100`, { headers: getAuthHeaders() })
      ]);
      
      if (treasuryRes.ok) {
        const data = await treasuryRes.json();
        setTreasuryAccounts(data.items || (Array.isArray(data) ? data : []));
      } else {
        console.error('Error fetching treasury:', treasuryRes.status);
      }
      if (pspRes.ok) {
        const data = await pspRes.json();
        setPsps(Array.isArray(data) ? data : []);
      } else {
        console.error('Error fetching psps:', pspRes.status);
      }
      if (exchangerRes.ok) {
        const data = await exchangerRes.json();
        setExchangers(data.items || data || []);
      } else {
        console.error('Error fetching exchangers:', exchangerRes.status);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, [getAuthHeaders]);



  // Fetch daily summary
  const fetchDailySummary = useCallback(
    async (date) => {
      if (!date) return;
      try {
        const dateStr = date.toISOString().split("T")[0];
        const response = await fetch(
          `${API_URL}/api/reconciliation/daily-summary?date=${dateStr}`,
          {
            headers: getAuthHeaders(),
          },
        );
        if (response.ok) {
          setDailySummary(await response.json());
        }
      } catch (error) {
        console.error("Error fetching daily summary:", error);
      }
    },
    [getAuthHeaders],
  );

  // Fetch account history for selected date
  const fetchAccountHistory = useCallback(async () => {
    if (!selectedDate || !selectedType || !selectedAccount) return;

    setHistoryLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `${API_URL}/api/reconciliation/account-history?type=${selectedType}&account_id=${selectedAccount}&date=${dateStr}`,
        { headers: getAuthHeaders() },
      );
      if (response.ok) {
        setAccountHistory(await response.json());
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load account history");
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedDate, selectedType, selectedAccount, getAuthHeaders]);

  // Fetch reconciliation history
  const fetchReconHistory = useCallback(async () => {
    try {
      // Build query params with filters
      const params = new URLSearchParams();
      params.append("limit", "100");

      if (historyFilters.dateFrom)
        params.append("date_from", historyFilters.dateFrom);
      if (historyFilters.dateTo)
        params.append("date_to", historyFilters.dateTo);
      if (historyFilters.type !== "all")
        params.append("account_type", historyFilters.type);
      if (historyFilters.account !== "all")
        params.append("account_id", historyFilters.account);
      if (historyFilters.status !== "all")
        params.append("status", historyFilters.status);
      if (historyFilters.matched !== "all")
        params.append(
          "has_matched",
          historyFilters.matched === "yes" ? "true" : "false",
        );
      if (historyFilters.flagged !== "all")
        params.append(
          "has_flagged",
          historyFilters.flagged === "yes" ? "true" : "false",
        );

      const response = await fetch(
        `${API_URL}/api/reconciliation/history?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setReconHistory(Array.isArray(data) ? data : []);
      } else {
        console.error("Error fetching recon history:", response.status);
      }
    } catch (error) {
      console.error("Error fetching recon history:", error);
    }
  }, [getAuthHeaders, historyFilters]);

  // Export history to PDF or Excel
  const handleExportHistory = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("format", format);

      if (historyFilters.dateFrom)
        params.append("date_from", historyFilters.dateFrom);
      if (historyFilters.dateTo)
        params.append("date_to", historyFilters.dateTo);
      if (historyFilters.type !== "all")
        params.append("account_type", historyFilters.type);
      if (historyFilters.account !== "all")
        params.append("account_id", historyFilters.account);
      if (historyFilters.status !== "all")
        params.append("status", historyFilters.status);

      const response = await fetch(
        `${API_URL}/api/reconciliation/history/export?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reconciliation_history_${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported to ${format.toUpperCase()}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Export failed");
      }
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Reset history filters
  const resetHistoryFilters = () => {
    setHistoryFilters({
      dateFrom: "",
      dateTo: "",
      type: "all",
      account: "all",
      matched: "all",
      flagged: "all",
      status: "all",
    });
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDatesWithTransactions(),
        fetchAccounts(),
        fetchReconHistory(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchDatesWithTransactions, fetchAccounts, fetchReconHistory]);

  // Fetch pending when tab changes or filters change
  const fetchPendingReconciliation = useCallback(async () => {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams();
      if (pendingFilters.dateFrom)
        params.append("date_from", pendingFilters.dateFrom);
      if (pendingFilters.dateTo)
        params.append("date_to", pendingFilters.dateTo);
      if (pendingFilters.accountType !== "all")
        params.append("account_type", pendingFilters.accountType);
      const response = await fetch(
        `${API_URL}/api/reconciliation/pending?${params.toString()}`,
        { headers: getAuthHeaders() },
      );
      if (response.ok) {
        const data = await response.json();
        setPendingItems(data.items || []);
        setPendingSummary({
          total: data.total_pending_transactions || 0,
          dates: data.unique_dates || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching pending:", error);
    } finally {
      setPendingLoading(false);
    }
  }, [pendingFilters, getAuthHeaders]);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingReconciliation();
    }
  }, [activeTab, fetchPendingReconciliation]);

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountHistory();
    }
  }, [selectedAccount, fetchAccountHistory]);

  useEffect(() => {
    if (selectedDate) {
      fetchDailySummary(selectedDate);
    }
  }, [selectedDate, fetchDailySummary]);

  // Handle statement upload
  const handleStatementUpload = async () => {
    if (!statementFile || !selectedAccount || !selectedDate) {
      toast.error("Please select a file, account, and date");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", statementFile);
    formData.append("account_type", selectedType);
    formData.append("account_id", selectedAccount);
    formData.append("date", selectedDate.toISOString().split("T")[0]);
    formData.append("statement_type", "auto"); // Auto-detect bank or PSP

    try {
      const response = await fetch(
        `${API_URL}/api/reconciliation/upload-statement`,
        {
          method: "POST",
          headers: { Authorization: getAuthHeaders()["Authorization"] },
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        setParsedEntries(data.entries || []);
        setShowParsed(true);

        // Show detected source info (bank or PSP)
        const sourceName =
          data.detected_source?.replace(/_/g, " ").toUpperCase() || "Unknown";
        const sourceType = data.source_type === "psp" ? "PSP" : "Bank";
        toast.success(
          `Parsed ${data.entries?.length || 0} entries from ${sourceName} ${sourceType} statement`,
        );
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to parse statement");
      }
    } catch (error) {
      toast.error("Failed to upload statement");
    } finally {
      setUploading(false);
      setStatementFile(null);
    }
  };

  // Match entry
  const handleMatch = () => {
    if (!selectedSystemTx || !selectedStatementEntry) {
      toast.error(
        "Select both a system transaction and statement entry to match",
      );
      return;
    }

    const pair = {
      system_tx: selectedSystemTx,
      statement_entry: selectedStatementEntry,
      matched_at: new Date().toISOString(),
      matched_by: user?.name,
    };

    setMatchedPairs([...matchedPairs, pair]);

    // Remove from available lists
    setAccountHistory(
      accountHistory.filter(
        (tx) => tx.transaction_id !== selectedSystemTx.transaction_id,
      ),
    );
    setParsedEntries(
      parsedEntries.filter((e) => e.id !== selectedStatementEntry.id),
    );

    setSelectedSystemTx(null);
    setSelectedStatementEntry(null);
    toast.success("Entries matched successfully");
  };

  // Flag entry
  const handleFlag = () => {
    if (!flagDialog.entry || !flagDialog.reason) {
      toast.error("Please provide a reason for flagging");
      return;
    }

    const flagged = {
      entry: flagDialog.entry,
      reason: flagDialog.reason,
      flagged_at: new Date().toISOString(),
      flagged_by: user?.name,
    };

    setFlaggedEntries([...flaggedEntries, flagged]);

    // Remove from parsed entries
    setParsedEntries(parsedEntries.filter((e) => e.id !== flagDialog.entry.id));

    setFlagDialog({ open: false, entry: null, reason: "" });
    toast.success("Entry flagged");
  };

  // Submit reconciliation
  const handleSubmitReconciliation = async () => {
    if (matchedPairs.length === 0 && flaggedEntries.length === 0) {
      toast.error("No matched or flagged entries to submit");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/submit`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate?.toISOString().split("T")[0],
          account_type: selectedType,
          account_id: selectedAccount,
          matched_pairs: matchedPairs,
          flagged_entries: flaggedEntries,
          remarks: remarks,
          unmatched_system: accountHistory.length,
          unmatched_statement: parsedEntries.length,
        }),
      });

      if (response.ok) {
        toast.success("Reconciliation submitted successfully");
        // Reset state
        setMatchedPairs([]);
        setFlaggedEntries([]);
        setParsedEntries([]);
        setShowParsed(false);
        setRemarks("");
        fetchDatesWithTransactions();
        fetchReconHistory();
        fetchDailySummary(selectedDate);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to submit reconciliation");
      }
    } catch (error) {
      toast.error("Failed to submit reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "USD") => {
    return `${currency} ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get selected account currency
  const getSelectedAccountCurrency = () => {
    if (selectedType === "treasury" && selectedAccount) {
      const account = treasuryAccounts.find(
        (a) => a.account_id === selectedAccount,
      );
      return account?.currency || "USD";
    }
    return "USD";
  };

  // Get account name by ID
  const getAccountName = (type, id) => {
    if (type === "treasury") {
      return (
        treasuryAccounts.find((a) => a.account_id === id)?.account_name || id
      );
    } else if (type === "psp") {
      return psps.find((p) => p.psp_id === id)?.psp_name || id;
    } else if (type === "exchanger") {
      return exchangers.find((e) => e.vendor_id === id)?.vendor_name || id;
    }
    return id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reconciliation</h1>
          <p className="text-slate-500 mt-1">
            Match and reconcile transactions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setActiveTab("history")}
          data-testid="history-btn"
        >
          <History className="w-4 h-4 mr-2" /> History
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger
            value="reconcile"
            className="gap-2"
            disabled={!selectedDate}
          >
            <Link2 className="w-4 h-4" /> Reconcile
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> History
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" /> Pending
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <BigCalendarView
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              if (date) setActiveTab("reconcile");
            }}
            datesWithTx={datesWithTx}
            reconStatus={reconStatus}
            dailySummary={dailySummary}
            formatDate={formatDate}
          />
        </TabsContent>

        {/* Reconcile Tab */}
        <TabsContent value="reconcile">
          {selectedDate && (
            <div className="space-y-6">
              {/* Back button and date info */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("calendar")}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Calendar
                </Button>
                <Badge variant="outline" className="text-base px-3 py-1">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {formatDate(selectedDate)}
                </Badge>
              </div>

              {/* Account Type Selection */}
              {!selectedType ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedType("treasury")}
                    data-testid="select-treasury"
                  >
                    <CardContent className="pt-6 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                      <h3 className="font-semibold text-lg">Treasury</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Bank accounts & cash
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer hover:border-purple-500 transition-colors"
                    onClick={() => setSelectedType("psp")}
                    data-testid="select-psp"
                  >
                    <CardContent className="pt-6 text-center">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                      <h3 className="font-semibold text-lg">PSP</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Payment processors
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => setSelectedType("exchanger")}
                    data-testid="select-exchanger"
                  >
                    <CardContent className="pt-6 text-center">
                      <Store className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                      <h3 className="font-semibold text-lg">Exchanger</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Vendor accounts
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Account Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {selectedType === "treasury" && (
                            <Building2 className="w-5 h-5 text-blue-600" />
                          )}
                          {selectedType === "psp" && (
                            <CreditCard className="w-5 h-5 text-purple-600" />
                          )}
                          {selectedType === "exchanger" && (
                            <Store className="w-5 h-5 text-orange-600" />
                          )}
                          Select{" "}
                          {selectedType.charAt(0).toUpperCase() +
                            selectedType.slice(1)}{" "}
                          Account
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedType(null);
                            setSelectedAccount("");
                          }}
                        >
                          Change Type
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={selectedAccount}
                        onValueChange={setSelectedAccount}
                      >
                        <SelectTrigger
                          className="w-full max-w-md"
                          data-testid="account-select"
                        >
                          <SelectValue
                            placeholder={`Select ${selectedType} account...`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedType === "treasury" &&
                            treasuryAccounts.map((acc) => (
                              <SelectItem
                                key={acc.account_id}
                                value={acc.account_id}
                              >
                                {acc.account_name} ({acc.currency})
                              </SelectItem>
                            ))}
                          {selectedType === "psp" &&
                            psps.map((psp) => (
                              <SelectItem key={psp.psp_id} value={psp.psp_id}>
                                {psp.psp_name}
                              </SelectItem>
                            ))}
                          {selectedType === "exchanger" &&
                            exchangers.map((ex) => (
                              <SelectItem
                                key={ex.vendor_id}
                                value={ex.vendor_id}
                              >
                                {ex.vendor_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedAccount && (
                    <>
                      {/* Statement Upload */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Upload className="w-5 h-5" /> Upload Statement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                              <Label>Statement File (XLSX, PDF, CSV)</Label>
                              <Input
                                type="file"
                                accept=".xlsx,.xls,.pdf,.csv"
                                onChange={(e) =>
                                  setStatementFile(e.target.files?.[0])
                                }
                                className="mt-1"
                                data-testid="statement-file-input"
                              />
                            </div>
                            <Button
                              onClick={handleStatementUpload}
                              disabled={!statementFile || uploading}
                              data-testid="upload-statement-btn"
                            >
                              {uploading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              {uploading ? "Parsing..." : "Upload & Parse"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Matching Interface */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* System Transactions */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>
                                System Transactions ({accountHistory.length})
                              </span>
                              {historyLoading && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[300px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">
                                      Amount
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {accountHistory.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={4}
                                        className="text-center text-slate-400 py-8"
                                      >
                                        No transactions found
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    accountHistory.map((tx) => (
                                      <TableRow
                                        key={tx.transaction_id}
                                        className={`cursor-pointer ${selectedSystemTx?.transaction_id === tx.transaction_id ? "bg-blue-50" : ""}`}
                                        onClick={() => setSelectedSystemTx(tx)}
                                      >
                                        <TableCell>
                                          <Checkbox
                                            checked={
                                              selectedSystemTx?.transaction_id ===
                                              tx.transaction_id
                                            }
                                            onCheckedChange={() =>
                                              setSelectedSystemTx(tx)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {formatDate(tx.created_at)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                          {tx.reference || tx.transaction_id}
                                        </TableCell>
                                        <TableCell
                                          className={`text-right font-medium ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                                        >
                                          {formatCurrency(
                                            tx.amount,
                                            tx.currency,
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        {/* Statement Entries */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Statement Entries ({parsedEntries.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[300px]">
                              {!showParsed ? (
                                <div className="text-center py-12 text-slate-400">
                                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p>Upload a statement to see entries</p>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-8"></TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead className="text-right">
                                        Amount
                                      </TableHead>
                                      <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {parsedEntries.length === 0 ? (
                                      <TableRow>
                                        <TableCell
                                          colSpan={5}
                                          className="text-center text-slate-400 py-8"
                                        >
                                          All entries processed
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      parsedEntries.map((entry) => (
                                        <TableRow
                                          key={entry.id}
                                          className={`cursor-pointer ${selectedStatementEntry?.id === entry.id ? "bg-green-50" : ""}`}
                                          onClick={() =>
                                            setSelectedStatementEntry(entry)
                                          }
                                        >
                                          <TableCell>
                                            <Checkbox
                                              checked={
                                                selectedStatementEntry?.id ===
                                                entry.id
                                              }
                                              onCheckedChange={() =>
                                                setSelectedStatementEntry(entry)
                                              }
                                            />
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {formatDate(entry.date)}
                                          </TableCell>
                                          <TableCell
                                            className="text-xs max-w-[150px] truncate"
                                            title={entry.description}
                                          >
                                            {entry.description}
                                          </TableCell>
                                          <TableCell
                                            className={`text-right font-medium ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                                          >
                                            {formatCurrency(
                                              entry.amount,
                                              getSelectedAccountCurrency(),
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-red-500"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFlagDialog({
                                                  open: true,
                                                  entry,
                                                  reason: "",
                                                });
                                              }}
                                            >
                                              <Flag className="w-3 h-3" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              )}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Match Button */}
                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          onClick={handleMatch}
                          disabled={
                            !selectedSystemTx || !selectedStatementEntry
                          }
                          className="gap-2"
                          data-testid="match-btn"
                        >
                          <Link2 className="w-5 h-5" />
                          Match Selected Entries
                        </Button>
                      </div>

                      {/* Matched & Flagged Summary */}
                      {(matchedPairs.length > 0 ||
                        flaggedEntries.length > 0) && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                              Reconciliation Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {matchedPairs.length > 0 && (
                              <div>
                                <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4" /> Matched (
                                  {matchedPairs.length})
                                </h4>
                                <div className="bg-green-50 rounded-xl p-3 space-y-2 max-h-40 overflow-auto">
                                  {matchedPairs.map((pair, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between text-sm"
                                    >
                                      <span>
                                        {pair.system_tx.reference} ↔{" "}
                                        {pair.statement_entry.description?.substring(
                                          0,
                                          30,
                                        )}
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(pair.system_tx.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {flaggedEntries.length > 0 && (
                              <div>
                                <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4" /> Flagged
                                  ({flaggedEntries.length})
                                </h4>
                                <div className="bg-red-50 rounded-xl p-3 space-y-2 max-h-40 overflow-auto">
                                  {flaggedEntries.map((item, i) => (
                                    <div key={i} className="text-sm">
                                      <span className="font-medium">
                                        {item.entry.description?.substring(
                                          0,
                                          40,
                                        )}
                                      </span>
                                      <span className="text-red-600 ml-2">
                                        - {item.reason}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Remarks */}
                            <div>
                              <Label>Remarks</Label>
                              <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any notes or remarks for this reconciliation..."
                                className="mt-1"
                                data-testid="remarks-input"
                              />
                            </div>

                            {/* Submit Button */}
                            <Button
                              className="w-full"
                              onClick={handleSubmitReconciliation}
                              disabled={submitting}
                              data-testid="submit-recon-btn"
                            >
                              {submitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Submit Reconciliation
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" /> Reconciliation History
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportHistory("xlsx")}
                  disabled={exporting || reconHistory.length === 0}
                  data-testid="export-xlsx-btn"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                  )}
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportHistory("pdf")}
                  disabled={exporting || reconHistory.length === 0}
                  data-testid="export-pdf-btn"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-1" />
                  )}
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <Label className="text-xs text-slate-500">Date From</Label>
                  <Input
                    type="date"
                    value={historyFilters.dateFrom}
                    onChange={(e) =>
                      setHistoryFilters((prev) => ({
                        ...prev,
                        dateFrom: e.target.value,
                      }))
                    }
                    className="h-9"
                    data-testid="filter-date-from"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Date To</Label>
                  <Input
                    type="date"
                    value={historyFilters.dateTo}
                    onChange={(e) =>
                      setHistoryFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    className="h-9"
                    data-testid="filter-date-to"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <Select
                    value={historyFilters.type}
                    onValueChange={(v) =>
                      setHistoryFilters((prev) => ({ ...prev, type: v }))
                    }
                  >
                    <SelectTrigger className="h-9" data-testid="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="treasury">Treasury</SelectItem>
                      <SelectItem value="psp">PSP</SelectItem>
                      <SelectItem value="exchanger">Exchanger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Account</Label>
                  <Select
                    value={historyFilters.account}
                    onValueChange={(v) =>
                      setHistoryFilters((prev) => ({ ...prev, account: v }))
                    }
                  >
                    <SelectTrigger className="h-9" data-testid="filter-account">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id}>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                      {psps.map((psp) => (
                        <SelectItem key={psp.psp_id} value={psp.psp_id}>
                          {psp.psp_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Matched</Label>
                  <Select
                    value={historyFilters.matched}
                    onValueChange={(v) =>
                      setHistoryFilters((prev) => ({ ...prev, matched: v }))
                    }
                  >
                    <SelectTrigger className="h-9" data-testid="filter-matched">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Matched</SelectItem>
                      <SelectItem value="no">No Matched</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Flagged</Label>
                  <Select
                    value={historyFilters.flagged}
                    onValueChange={(v) =>
                      setHistoryFilters((prev) => ({ ...prev, flagged: v }))
                    }
                  >
                    <SelectTrigger className="h-9" data-testid="filter-flagged">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Flagged</SelectItem>
                      <SelectItem value="no">No Flagged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Select
                    value={historyFilters.status}
                    onValueChange={(v) =>
                      setHistoryFilters((prev) => ({ ...prev, status: v }))
                    }
                  >
                    <SelectTrigger className="h-9" data-testid="filter-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-500">
                  {reconHistory.length} record(s) found
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetHistoryFilters}
                    data-testid="reset-filters-btn"
                  >
                    <X className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={fetchReconHistory}
                    data-testid="apply-filters-btn"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-center">Matched</TableHead>
                      <TableHead className="text-center">Flagged</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconHistory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-slate-400 py-12"
                        >
                          No reconciliation history yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      reconHistory.map((item) => (
                        <TableRow key={item.recon_id}>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell className="capitalize">
                            {item.account_type}
                          </TableCell>
                          <TableCell>
                            {getAccountName(item.account_type, item.account_id)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700"
                            >
                              {item.matched_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700"
                            >
                              {item.flagged_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                item.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : item.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {item.created_by_name}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setHistoryDialog({ open: true, item })
                              }
                              data-testid={`view-history-${item.recon_id}`}
                                title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 uppercase tracking-wider">
                      Pending Transactions
                    </p>
                    <p className="text-3xl font-bold text-yellow-700">
                      {pendingSummary.total}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-60" />
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 uppercase tracking-wider">
                      Dates with Pending
                    </p>
                    <p className="text-3xl font-bold text-blue-700">
                      {pendingSummary.dates}
                    </p>
                  </div>
                  <CalendarDays className="w-8 h-8 text-blue-500 opacity-60" />
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 uppercase tracking-wider">
                      Accounts
                    </p>
                    <p className="text-3xl font-bold text-purple-700">
                      {pendingItems.length}
                    </p>
                  </div>
                  <Building2 className="w-8 h-8 text-purple-500 opacity-60" />
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[120px]">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                  From
                </label>
                <input
                  type="date"
                  value={pendingFilters.dateFrom}
                  onChange={(e) =>
                    setPendingFilters((p) => ({
                      ...p,
                      dateFrom: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                />
              </div>
              <div className="min-w-[120px]">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                  To
                </label>
                <input
                  type="date"
                  value={pendingFilters.dateTo}
                  onChange={(e) =>
                    setPendingFilters((p) => ({ ...p, dateTo: e.target.value }))
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                />
              </div>
              <div className="min-w-[130px]">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">
                  Account Type
                </label>
                <select
                  value={pendingFilters.accountType}
                  onChange={(e) =>
                    setPendingFilters((p) => ({
                      ...p,
                      accountType: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800"
                >
                  <option value="all">All Types</option>
                  <option value="treasury">Treasury</option>
                  <option value="psp">PSP</option>
                  <option value="exchanger">Exchanger</option>
                </select>
              </div>
              {(pendingFilters.dateFrom ||
                pendingFilters.dateTo ||
                pendingFilters.accountType !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingFilters({
                      dateFrom: "",
                      dateTo: "",
                      accountType: "all",
                    })
                  }
                  className="text-slate-500 hover:text-red-500 text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Pending Items Table */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="py-3">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : pendingItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">No pending reconciliation items</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-500 text-xs font-bold uppercase">
                            Date
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase">
                            Type
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase">
                            Account
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase">
                            Currency
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase text-right">
                            Pending Txns
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase text-right">
                            Total Amount
                          </TableHead>
                          <TableHead className="text-slate-500 text-xs font-bold uppercase text-right">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingItems.map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-slate-200 hover:bg-slate-50"
                          >
                            <TableCell className="font-mono text-sm text-slate-800">
                              {item.date}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  item.account_type === "treasury"
                                    ? "bg-blue-100 text-blue-700 text-xs"
                                    : item.account_type === "psp"
                                      ? "bg-purple-100 text-purple-700 text-xs"
                                      : "bg-orange-100 text-orange-700 text-xs"
                                }
                              >
                                {item.account_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-800 text-sm">
                              {item.account_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.currency}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-yellow-600 font-bold">
                              {item.pending_count}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-800">
                              {item.total_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-7"
                                onClick={() => {
                                  const d = new Date(item.date + "T12:00:00");
                                  setSelectedDate(d);
                                  setSelectedType(item.account_type);
                                  setSelectedAccount(item.account_id);
                                  setActiveTab("reconcile");
                                }}
                              >
                                Reconcile
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Flag Dialog */}
      <Dialog
        open={flagDialog.open}
        onOpenChange={(open) => setFlagDialog({ ...flagDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Flag className="w-5 h-5" /> Flag Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {flagDialog.entry && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm">
                  <strong>Date:</strong> {formatDate(flagDialog.entry.date)}
                </p>
                <p className="text-sm">
                  <strong>Description:</strong> {flagDialog.entry.description}
                </p>
                <p className="text-sm">
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(flagDialog.entry.amount)}
                </p>
              </div>
            )}
            <div>
              <Label>Reason for Flagging *</Label>
              <Textarea
                value={flagDialog.reason}
                onChange={(e) =>
                  setFlagDialog({ ...flagDialog, reason: e.target.value })
                }
                placeholder="Describe why this entry is being flagged..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setFlagDialog({ open: false, entry: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlag}
              disabled={!flagDialog.reason}
            >
              <Flag className="w-4 h-4 mr-2" /> Flag Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Detail Dialog */}
      <Dialog
        open={historyDialog.open}
         onOpenChange={(open) => { if (!open) setHistoryDialog({ open: false, item: null }); }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Reconciliation Details
            </DialogTitle>
          </DialogHeader>
          {historyDialog.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded">
                  <span className="text-slate-500 text-xs">Date</span>
                  <p className="font-medium">
                    {formatDate(historyDialog.item.date)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <span className="text-slate-500 text-xs">Type</span>
                  <p className="font-medium capitalize">
                    {historyDialog.item.account_type}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <span className="text-slate-500 text-xs">Account</span>
                  <p className="font-medium">
                    {getAccountName(
                      historyDialog.item.account_type,
                      historyDialog.item.account_id,
                    )}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <span className="text-slate-500 text-xs">Status</span>
                  <Badge
                    className={
                      historyDialog.item.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : historyDialog.item.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }
                  >
                    {historyDialog.item.status}
                  </Badge>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <span className="text-green-600 text-xs">
                    Matched Entries
                  </span>
                  <p className="font-medium text-green-700 text-lg">
                    {historyDialog.item.matched_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <span className="text-red-600 text-xs">Flagged Entries</span>
                  <p className="font-medium text-red-700 text-lg">
                    {historyDialog.item.flagged_count || 0}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-slate-500">
                  <span className="font-medium">Created by:</span>{" "}
                  {historyDialog.item.created_by_name}
                </div>
                <div className="text-sm text-slate-500">
                  <span className="font-medium">Created at:</span>{" "}
                  {formatDate(historyDialog.item.created_at)}
                </div>
              </div>

              {historyDialog.item.remarks && (
                <div className="border-t pt-4">
                  <span className="text-sm font-medium text-slate-600">
                    Remarks:
                  </span>
                  <p className="mt-2 text-sm bg-slate-50 p-3 rounded">
                    {historyDialog.item.remarks}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHistoryDialog({ open: false, item: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
