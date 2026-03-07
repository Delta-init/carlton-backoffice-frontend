import { useEffect, useState } from "react";
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
import { Switch } from "../components/ui/switch";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  UserCog,
  Mail,
  Clock,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Percent,
  LogIn,
  Calendar,
  Eye,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const { user, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "sub_admin",
    role_id: "",
    deposit_commission: 0,
    withdrawal_commission: 0,
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_email: "",
    smtp_password: "",
    smtp_from_email: "",
    director_emails: [],
    report_enabled: false,
    report_time: "03:00",
    monthly_report_enabled: false,
  });
  const [emailLoading, setEmailLoading] = useState(true);
  const [newDirectorEmail, setNewDirectorEmail] = useState("");
  const [emailLogs, setEmailLogs] = useState([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingMonthlyReport, setSendingMonthlyReport] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setUsers(await response.json());
      } else if (response.status === 403) {
        toast.error("Admin access required");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const rolesData = await response.json();
        setRoles(rolesData.filter((r) => r.is_active !== false));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/email`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEmailSettings({
          smtp_host: data.smtp_host || "smtp.gmail.com",
          smtp_port: data.smtp_port || 587,
          smtp_email: data.smtp_email || "",
          smtp_password: "",
          smtp_password_set: data.smtp_password_set,
          smtp_from_email: data.smtp_from_email || "",
          director_emails: data.director_emails || [],
          report_enabled: data.report_enabled || false,
          report_time: data.report_time || "03:00",
          monthly_report_enabled: data.monthly_report_enabled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching email settings:", error);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/reports/email-logs?limit=10`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (response.ok) {
        setEmailLogs(await response.json());
      }
    } catch (error) {
      console.error("Error fetching email logs:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchEmailSettings();
    fetchEmailLogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedUser
        ? `${API_URL}/api/users/${selectedUser.user_id}`
        : `${API_URL}/api/users`;
      const method = selectedUser ? "PUT" : "POST";

      // Include role_id when saving
      const body = selectedUser
        ? {
            name: formData.name,
            role: formData.role,
            role_id: formData.role_id || formData.role,
            is_active: formData.is_active,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(selectedUser ? "User updated" : "User created");
        setIsDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Operation failed");
      }
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        toast.success("User deleted");
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Delete failed");
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleImpersonate = async (targetUser) => {
    if (
      !window.confirm(
        `Login as ${targetUser.name} (${targetUser.email})? You will be redirected to their dashboard.`,
      )
    )
      return;
    try {
      await startImpersonation(targetUser.user_id);
      toast.success(`Now impersonating ${targetUser.name}`);
      const role = targetUser.role;
      if (role === "vendor") {
        navigate("/vendor-portal");
      } else if (role === "sub_admin") {
        navigate("/clients");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Impersonation failed");
    }
  };

  const handleEdit = (userItem) => {
    setSelectedUser(userItem);
    setFormData({
      email: userItem.email,
      password: "",
      name: userItem.name,
      role: userItem.role,
      role_id: userItem.role_id || userItem.role,
      is_active: userItem.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "sub_admin",
      role_id: "",
      deposit_commission: 0,
      withdrawal_commission: 0,
    });
  };

  // Email Settings Handlers
  const handleSaveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      const payload = {
        smtp_host: emailSettings.smtp_host,
        smtp_port: parseInt(emailSettings.smtp_port) || 587,
        smtp_email: emailSettings.smtp_email,
        smtp_from_email: emailSettings.smtp_from_email,
        director_emails: emailSettings.director_emails,
        report_enabled: emailSettings.report_enabled,
        report_time: emailSettings.report_time,
        monthly_report_enabled: emailSettings.monthly_report_enabled,
      };

      // Only send password if it's been changed
      if (emailSettings.smtp_password) {
        payload.smtp_password = emailSettings.smtp_password;
      }

      const response = await fetch(`${API_URL}/api/settings/email`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Email settings saved");
        setEmailSettings((prev) => ({
          ...prev,
          smtp_password: "",
          smtp_password_set: !!prev.smtp_password || prev.smtp_password_set,
        }));
        fetchEmailSettings();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setSendingTest(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/email/test`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Test email sent! Check your inbox.");
        fetchEmailLogs();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to send test email");
      }
    } catch (error) {
      toast.error("Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendReportNow = async () => {
    setSendingReport(true);
    try {
      const response = await fetch(`${API_URL}/api/reports/send-now`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Daily report sent!");
        fetchEmailLogs();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to send report");
      }
    } catch (error) {
      toast.error("Failed to send report");
    } finally {
      setSendingReport(false);
    }
  };

  const handleSendMonthlyReportNow = async () => {
    setSendingMonthlyReport(true);
    try {
      const response = await fetch(`${API_URL}/api/reports/monthly/send-now`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Monthly report sent!");
        fetchEmailLogs();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to send monthly report");
      }
    } catch (error) {
      toast.error("Failed to send monthly report");
    } finally {
      setSendingMonthlyReport(false);
    }
  };

  const addDirectorEmail = () => {
    if (!newDirectorEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newDirectorEmail)) {
      toast.error("Invalid email address");
      return;
    }
    if (emailSettings.director_emails.includes(newDirectorEmail)) {
      toast.error("Email already added");
      return;
    }
    setEmailSettings((prev) => ({
      ...prev,
      director_emails: [...prev.director_emails, newDirectorEmail],
    }));
    setNewDirectorEmail("");
  };

  const removeDirectorEmail = (email) => {
    setEmailSettings((prev) => ({
      ...prev,
      director_emails: prev.director_emails.filter((e) => e !== email),
    }));
  };

  const getRoleBadge = (role, roleId) => {
    // Try to find from roles list first
    const foundRole = roles.find(
      (r) => r.role_id === roleId || r.name === role,
    );

    const roleStyles = {
      admin: "bg-blue-100 text-blue-700 border border-blue-200",
      super_admin: "bg-red-100 text-red-700 border border-red-200",
      sub_admin: "bg-slate-100 text-slate-600 border border-slate-200",
      accountant: "bg-purple-100 text-purple-700 border border-purple-200",
      vendor: "bg-amber-100 text-amber-700 border border-amber-200",
      exchanger: "bg-amber-100 text-amber-700 border border-amber-200",
      viewer: "bg-green-100 text-green-700 border border-green-200",
    };

    const displayName = foundRole?.display_name || role;
    const styleKey = roleId || role;

    return (
      <Badge
        className={`${roleStyles[styleKey] || "bg-slate-100 text-slate-600 border border-slate-200"} text-xs uppercase`}
      >
        {displayName}
      </Badge>
    );
  };

  const isCurrentUserAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1
          className="text-4xl font-bold uppercase tracking-tight text-white"
          style={{ fontFamily: "Barlow Condensed" }}
        >
          Settings
        </h1>
        <p className="text-[#C5C6C7]">
          System settings, user management, and email reports
        </p>
      </div>

      {/* Current User Info */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#1FA21B]" />
            Your Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#1FA21B]/10 rounded-full flex items-center justify-center">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <span className="text-[#1FA21B] font-bold text-xl">
                  {user?.name?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <div>
              <p className="text-xl text-white font-medium">{user?.name}</p>
              <p className="text-[#C5C6C7] font-mono">{user?.email}</p>
              <div className="mt-2">
                {getRoleBadge(user?.role, user?.role_id)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin-Only Settings with Tabs */}
      {isCurrentUserAdmin ? (
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-slate-50 border border-slate-200 mb-4">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="data-[state=active]:bg-[#1FA21B] data-[state=active]:text-[#0B0C10]"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Reports
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#1FA21B]" />
                    User Management
                  </CardTitle>
                  <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (!open) resetForm();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl text-sm"
                        data-testid="add-user-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 text-white max-w-lg">
                      <DialogHeader>
                        <DialogTitle
                          className="text-2xl font-bold uppercase tracking-tight"
                          style={{ fontFamily: "Barlow Condensed" }}
                        >
                          {selectedUser ? "Edit User" : "Add New User"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                            Name
                          </Label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B]"
                            data-testid="user-name-input"
                            required
                          />
                        </div>
                        {!selectedUser && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                                Email
                              </Label>
                              <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    email: e.target.value,
                                  })
                                }
                                className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono"
                                data-testid="user-email-input"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                                Password
                              </Label>
                              <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    password: e.target.value,
                                  })
                                }
                                className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B]"
                                data-testid="user-password-input"
                                required
                              />
                            </div>
                          </>
                        )}
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">
                            Role
                          </Label>
                          <Select
                            value={formData.role_id || formData.role}
                            onValueChange={(value) => {
                              const selectedRole = roles.find(
                                (r) => r.role_id === value || r.name === value,
                              );
                              setFormData({
                                ...formData,
                                role: selectedRole?.name || value,
                                role_id: selectedRole?.role_id || value,
                              });
                            }}
                          >
                            <SelectTrigger
                              className="bg-slate-50 border-slate-200 text-slate-800"
                              data-testid="user-role-select"
                            >
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              {roles.map((role) => (
                                <SelectItem
                                  key={role.role_id}
                                  value={role.role_id}
                                  className="text-slate-800 hover:bg-slate-100"
                                >
                                  {role.display_name}
                                  {role.is_system_role && (
                                    <span className="ml-2 text-xs text-slate-400">
                                      (System)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Exchanger Commission Fields */}
                        {(formData.role === "vendor" ||
                          formData.role_id === "exchanger") &&
                          !selectedUser && (
                            <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">
                                Exchanger Commission Rates
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-slate-500 text-xs">
                                    Deposit Commission (%)
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={formData.deposit_commission}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        deposit_commission:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="bg-white border-slate-200 text-slate-800"
                                    placeholder="0.0"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-slate-500 text-xs">
                                    Withdrawal Commission (%)
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={formData.withdrawal_commission}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        withdrawal_commission:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="bg-white border-slate-200 text-slate-800"
                                    placeholder="0.0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        {selectedUser && (
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <Label className="text-[#C5C6C7]">Active</Label>
                            <Switch
                              checked={formData.is_active}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, is_active: checked })
                              }
                              data-testid="user-active-switch"
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
                            className="border-slate-200 text-[#C5C6C7] hover:bg-white/5"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                            data-testid="save-user-btn"
                          >
                            {selectedUser ? "Update" : "Create"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">
                          User
                        </TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">
                          Email
                        </TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">
                          Role
                        </TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="w-6 h-6 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-8 text-[#C5C6C7]"
                          >
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((userItem) => (
                          <TableRow
                            key={userItem.user_id}
                            className="border-slate-200 hover:bg-white/5"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#1FA21B]/10 rounded-full flex items-center justify-center">
                                  {userItem.picture ? (
                                    <img
                                      src={userItem.picture}
                                      alt={userItem.name}
                                      className="w-10 h-10 rounded-full"
                                    />
                                  ) : (
                                    <span className="text-[#1FA21B] font-bold text-sm">
                                      {userItem.name?.charAt(0) || "U"}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {userItem.name}
                                  </p>
                                  <p className="text-xs text-[#C5C6C7] font-mono">
                                    {userItem.user_id}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {userItem.email}
                            </TableCell>
                            <TableCell>
                              {getRoleBadge(userItem.role, userItem.role_id)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${userItem.is_active !== false ? "status-approved" : "status-rejected"} text-xs uppercase`}
                              >
                                {userItem.is_active !== false
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[#C5C6C7] hover:text-white hover:bg-white/5"
                                    data-testid={`user-actions-${userItem.user_id}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="bg-white border-slate-200"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(userItem)}
                                    className="text-white hover:bg-white/5 cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  {userItem.role !== "admin" &&
                                    userItem.user_id !== user?.user_id && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleImpersonate(userItem)
                                        }
                                        className="text-amber-500 hover:bg-white/5 cursor-pointer"
                                        data-testid={`impersonate-${userItem.user_id}`}
                                      >
                                        <LogIn className="w-4 h-4 mr-2" /> Login
                                        as User
                                      </DropdownMenuItem>
                                    )}
                                  {userItem.user_id !== user?.user_id && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDelete(userItem.user_id)
                                      }
                                      className="text-red-500 hover:bg-white/5 cursor-pointer"
                                      data-testid={`delete-user-${userItem.user_id}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
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
          </TabsContent>

          {/* Email Reports Tab */}
          <TabsContent value="email">
            <div className="grid gap-6 md:grid-cols-2">
              {/* SMTP Settings Card */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#1FA21B]" />
                    SMTP Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                        SMTP Host
                      </Label>
                      <Input
                        type="text"
                        value={emailSettings.smtp_host}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            smtp_host: e.target.value,
                          }))
                        }
                        className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono text-sm"
                        placeholder="smtp.gmail.com"
                        data-testid="smtp-host"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                        Port
                      </Label>
                      <Input
                        type="number"
                        value={emailSettings.smtp_port}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({
                            ...prev,
                            smtp_port: e.target.value,
                          }))
                        }
                        className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono text-sm"
                        placeholder="587"
                        data-testid="smtp-port"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                      Username (Email)
                    </Label>
                    <Input
                      type="email"
                      value={emailSettings.smtp_email}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtp_email: e.target.value,
                        }))
                      }
                      className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono"
                      placeholder="no-reply@milescapitals.com"
                      data-testid="smtp-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                      Password{" "}
                      {emailSettings.smtp_password_set && (
                        <span className="text-green-400">(Set)</span>
                      )}
                    </Label>
                    <Input
                      type="password"
                      value={emailSettings.smtp_password}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtp_password: e.target.value,
                        }))
                      }
                      className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono"
                      placeholder={
                        emailSettings.smtp_password_set
                          ? "••••••••••••••••"
                          : "Enter SMTP password"
                      }
                      data-testid="smtp-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                      Send From Email
                    </Label>
                    <Input
                      type="email"
                      value={emailSettings.smtp_from_email}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtp_from_email: e.target.value,
                        }))
                      }
                      className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono"
                      placeholder="no-reply@milescapitals.com"
                      data-testid="smtp-from-email"
                    />
                  </div>
                  <Button
                    onClick={handleTestEmail}
                    disabled={
                      sendingTest ||
                      !emailSettings.smtp_email ||
                      (!emailSettings.smtp_password &&
                        !emailSettings.smtp_password_set)
                    }
                    variant="outline"
                    className="w-full border-[#1FA21B]/30 text-[#1FA21B] hover:bg-[#1FA21B]/10"
                    data-testid="test-email-btn"
                  >
                    {sendingTest ? (
                      <div className="w-4 h-4 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Test Email
                  </Button>
                </CardContent>
              </Card>

              {/* Director Emails Card */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#1FA21B]" />
                    Director Emails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newDirectorEmail}
                      onChange={(e) => setNewDirectorEmail(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B] font-mono"
                      placeholder="director@company.com"
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addDirectorEmail())
                      }
                      data-testid="director-email-input"
                    />
                    <Button
                      onClick={addDirectorEmail}
                      className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E]"
                      data-testid="add-director-btn"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {emailSettings.director_emails.length === 0 ? (
                      <p className="text-[#C5C6C7] text-sm text-center py-4">
                        No directors added yet
                      </p>
                    ) : (
                      emailSettings.director_emails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <span className="text-white font-mono text-sm">
                            {email}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDirectorEmail(email)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Schedule Settings Card */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#1FA21B]" />
                    Daily Report Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <Label className="text-white">Enable Daily Reports</Label>
                      <p className="text-xs text-[#C5C6C7]">
                        Auto-send reports to directors
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.report_enabled}
                      onCheckedChange={async (checked) => {
                        setEmailSettings((prev) => ({
                          ...prev,
                          report_enabled: checked,
                        }));
                        // Auto-save the toggle change
                        try {
                          const response = await fetch(
                            `${API_URL}/api/settings/email`,
                            {
                              method: "PUT",
                              headers: getAuthHeaders(),
                              credentials: "include",
                              body: JSON.stringify({ report_enabled: checked }),
                            },
                          );
                          if (response.ok) {
                            toast.success(
                              checked
                                ? "Daily reports enabled"
                                : "Daily reports disabled",
                            );
                          }
                        } catch (error) {
                          toast.error("Failed to update setting");
                          setEmailSettings((prev) => ({
                            ...prev,
                            report_enabled: !checked,
                          }));
                        }
                      }}
                      data-testid="report-enabled-switch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                      Report Time (UTC)
                    </Label>
                    <Input
                      type="time"
                      value={emailSettings.report_time}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          report_time: e.target.value,
                        }))
                      }
                      className="bg-slate-50 border-slate-200 text-white focus:border-[#1FA21B]"
                      data-testid="report-time"
                    />
                    <p className="text-xs text-[#C5C6C7]">
                      Currently set to: {emailSettings.report_time} UTC
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEmailSettings}
                      disabled={savingEmail}
                      className="flex-1 bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase"
                      data-testid="save-email-settings-btn"
                    >
                      {savingEmail ? (
                        <div className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Save Settings
                    </Button>
                    <Button
                      onClick={handleSendReportNow}
                      disabled={
                        sendingReport ||
                        emailSettings.director_emails.length === 0
                      }
                      variant="outline"
                      className="border-[#1FA21B]/30 text-[#1FA21B] hover:bg-[#1FA21B]/10"
                      data-testid="send-report-now-btn"
                    >
                      {sendingReport ? (
                        <div className="w-4 h-4 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Send Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Reports Card */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Monthly Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <Label className="text-white">
                        Enable Monthly Reports
                      </Label>
                      <p className="text-xs text-[#C5C6C7]">
                        Auto-send on the last day of each month
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.monthly_report_enabled}
                      onCheckedChange={async (checked) => {
                        setEmailSettings((prev) => ({
                          ...prev,
                          monthly_report_enabled: checked,
                        }));
                        try {
                          const response = await fetch(
                            `${API_URL}/api/settings/email`,
                            {
                              method: "PUT",
                              headers: getAuthHeaders(),
                              credentials: "include",
                              body: JSON.stringify({
                                monthly_report_enabled: checked,
                              }),
                            },
                          );
                          if (response.ok) {
                            toast.success(
                              checked
                                ? "Monthly reports enabled"
                                : "Monthly reports disabled",
                            );
                          }
                        } catch (error) {
                          toast.error("Failed to update setting");
                          setEmailSettings((prev) => ({
                            ...prev,
                            monthly_report_enabled: !checked,
                          }));
                        }
                      }}
                      data-testid="monthly-report-enabled-switch"
                    />
                  </div>
                  <p className="text-xs text-[#C5C6C7]">
                    Includes: Transaction Summary, Treasury Balances, I&E,
                    Loans, Exchanger Settlements, PSP Summary, Outstanding
                    Accounts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendMonthlyReportNow}
                      disabled={
                        sendingMonthlyReport ||
                        emailSettings.director_emails.length === 0
                      }
                      variant="outline"
                      className="flex-1 border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                      data-testid="send-monthly-report-btn"
                    >
                      {sendingMonthlyReport ? (
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Send Monthly Report Now
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-400/30 text-slate-400 hover:bg-slate-400/10"
                      onClick={() =>
                        window.open(
                          `${API_URL}/api/reports/monthly/preview`,
                          "_blank",
                        )
                      }
                      data-testid="preview-monthly-report-btn"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email Logs Card */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#1FA21B]" />
                    Email History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {emailLogs.length === 0 ? (
                      <p className="text-[#C5C6C7] text-sm text-center py-8">
                        No emails sent yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {emailLogs.map((log, index) => (
                          <div
                            key={index}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#C5C6C7] uppercase">
                                {log.type}
                              </span>
                              {log.status === "sent" ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                  Sent
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                  Failed
                                </Badge>
                              )}
                            </div>
                            <p className="text-white text-sm">
                              {log.recipients?.length > 0
                                ? `To: ${log.recipients.join(", ")}`
                                : "No recipients"}
                            </p>
                            <p className="text-xs text-[#C5C6C7] mt-1">
                              {new Date(
                                log.sent_at || log.attempted_at,
                              ).toLocaleString()}
                            </p>
                            {log.error && (
                              <p className="text-xs text-red-400 mt-1">
                                {log.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="bg-white border-slate-200">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
            <p className="text-[#C5C6C7]">
              Admin access required to manage settings
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
