import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { getApiError } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Plus,
  Edit,
  Users,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  FileEdit,
  FilePlus,
  FileCheck,
  Download,
  List,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACTION_ICONS = {
  view: Eye,
  listing: List,
  create: FilePlus,
  edit: FileEdit,
  approve: FileCheck,
  export: Download,
};

const ACTION_COLORS = {
  view: "bg-blue-100 text-blue-600 border-blue-200",
  listing: "bg-cyan-100 text-cyan-600 border-cyan-200",
  create: "bg-green-100 text-green-600 border-green-200",
  edit: "bg-yellow-100 text-yellow-600 border-yellow-200",
  approve: "bg-purple-100 text-purple-600 border-purple-200",
  export: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function RolesPermissions() {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState("roles");

  // Dialogs
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Form
  const [roleForm, setRoleForm] = useState({
    name: "",
    display_name: "",
    description: "",
    hierarchy_level: 50,
    permissions: {},
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setRoles(await response.json());
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  }, []);

  const fetchModulesAndActions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/permissions/modules`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchModulesAndActions();
  }, [fetchRoles, fetchModulesAndActions]);

  const handleCreateRole = async () => {
    if (!roleForm.name || !roleForm.display_name) {
      toast.error("Name and Display Name are required");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(roleForm),
      });

      if (response.ok) {
        toast.success("Role created successfully");
        setIsAddRoleOpen(false);
        resetForm();
        fetchRoles();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(
        `${API_URL}/api/roles/${selectedRole.role_id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            display_name: roleForm.display_name,
            description: roleForm.description,
            permissions: roleForm.permissions,
            hierarchy_level: roleForm.hierarchy_level,
          }),
        },
      );

      if (response.ok) {
        toast.success("Role updated successfully");
        setIsEditRoleOpen(false);
        fetchRoles();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name || "",
      display_name: role.display_name || "",
      description: role.description || "",
      hierarchy_level: role.hierarchy_level || 50,
      permissions: role.permissions || {},
    });
    setIsEditRoleOpen(true);
  };

  const resetForm = () => {
    setRoleForm({
      name: "",
      display_name: "",
      description: "",
      hierarchy_level: 50,
      permissions: {},
    });
  };

  const togglePermission = (moduleId, action) => {
    setRoleForm((prev) => {
      const newPermissions = { ...prev.permissions };
      if (!newPermissions[moduleId]) {
        newPermissions[moduleId] = [];
      }

      const idx = newPermissions[moduleId].indexOf(action);
      if (idx > -1) {
        newPermissions[moduleId] = newPermissions[moduleId].filter(
          (a) => a !== action,
        );
        if (newPermissions[moduleId].length === 0) {
          delete newPermissions[moduleId];
        }
      } else {
        newPermissions[moduleId] = [...newPermissions[moduleId], action];
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const toggleAllModulePermissions = (moduleId) => {
    setRoleForm((prev) => {
      const newPermissions = { ...prev.permissions };
      const currentActions = newPermissions[moduleId] || [];

      if (currentActions.length === actions.length) {
        delete newPermissions[moduleId];
      } else {
        newPermissions[moduleId] = [...actions];
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const toggleAllPermissions = () => {
    setRoleForm((prev) => {
      const totalPermissions = Object.keys(prev.permissions).length;
      if (totalPermissions === modules.length) {
        return { ...prev, permissions: {} };
      } else {
        const allPermissions = {};
        modules.forEach((m) => {
          allPermissions[m.id] = [...actions];
        });
        return { ...prev, permissions: allPermissions };
      }
    });
  };

  const hasPermission = (moduleId, action) => {
    return roleForm.permissions[moduleId]?.includes(action) || false;
  };

  const getPermissionCount = (role) => {
    let count = 0;
    Object.values(role.permissions || {}).forEach((acts) => {
      count += acts.length;
    });
    return count;
  };

  const renderPermissionMatrix = () => (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
          Permission Matrix
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllPermissions}
          className="text-xs"
        >
          Toggle All
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50">
              <TableHead className="text-slate-500 font-bold text-xs sticky left-0 bg-slate-50 min-w-[180px]">
                MODULE
              </TableHead>
              {actions.map((action) => (
                <TableHead
                  key={action}
                  className="text-slate-500 font-bold text-xs text-center w-24"
                >
                  {action.toUpperCase()}
                </TableHead>
              ))}
              <TableHead className="text-slate-500 font-bold text-xs text-center w-20">
                ALL
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <TableRow
                key={module.id}
                className="border-slate-200 hover:bg-slate-50"
              >
                <TableCell className="font-medium text-slate-700 sticky left-0 bg-white">
                  {module.name}
                </TableCell>
                {actions.map((action) => {
                  const Icon = ACTION_ICONS[action] || CheckCircle;
                  const isChecked = hasPermission(module.id, action);
                  return (
                    <TableCell key={action} className="text-center">
                      <button
                        onClick={() => togglePermission(module.id, action)}
                        className={`p-2 rounded-xl transition-all ${
                          isChecked
                            ? ACTION_COLORS[action]
                            : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <Checkbox
                    checked={
                      (roleForm.permissions[module.id]?.length || 0) ===
                      actions.length
                    }
                    onCheckedChange={() =>
                      toggleAllModulePermissions(module.id)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );

  return (
    <div
      className="space-y-6 animate-fade-in"
      data-testid="roles-permissions-page"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-tight text-slate-800"
            style={{ fontFamily: "Barlow Condensed" }}
          >
            Roles & Permissions
          </h1>
          <p className="text-slate-500">
            Manage user roles and granular access control
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddRoleOpen(true);
          }}
          className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-xl glow-cyan"
          data-testid="add-role-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 mb-4">
          <TabsTrigger
            value="roles"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <Shield className="w-4 h-4 mr-2" /> Roles
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
          >
            <Lock className="w-4 h-4 mr-2" /> Permission Overview
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#1FA21B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {roles.map((role) => (
                <Card
                  key={role.role_id}
                  className="bg-white border-slate-200 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl ${role.is_system_role ? "bg-blue-100" : "bg-slate-100"}`}
                        >
                          <Shield
                            className={`w-6 h-6 ${role.is_system_role ? "text-blue-600" : "text-slate-600"}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800">
                              {role.display_name}
                            </h3>
                            {role.is_system_role && (
                              <Badge className="bg-blue-100 text-blue-600 border-blue-200 text-xs">
                                System
                              </Badge>
                            )}
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                              Level {role.hierarchy_level}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {role.description || "No description"}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-slate-400">
                              <Users className="w-3 h-3 inline mr-1" />
                              {getPermissionCount(role)} permissions
                            </span>
                            <span className="text-xs text-slate-400">
                              Modules:{" "}
                              {Object.keys(role.permissions || {}).length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditRole(role)}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>

                    {/* Permission preview */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                        Modules with access:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(role.permissions || {})
                          .slice(0, 8)
                          .map(([moduleId, acts]) => (
                            <Badge
                              key={moduleId}
                              variant="outline"
                              className="text-xs bg-slate-50"
                            >
                              {modules.find((m) => m.id === moduleId)?.name ||
                                moduleId}
                              <span className="ml-1 text-slate-400">
                                ({acts.length})
                              </span>
                            </Badge>
                          ))}
                        {Object.keys(role.permissions || {}).length > 8 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50"
                          >
                            +{Object.keys(role.permissions).length - 8} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Permission Overview Tab */}
        <TabsContent value="overview">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-700">
                  Permission Matrix by Role
                </h3>
                <p className="text-sm text-slate-500">
                  Overview of all permissions across roles
                </p>
              </div>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50">
                      <TableHead className="text-slate-500 font-bold text-xs sticky left-0 bg-slate-50 min-w-[180px]">
                        MODULE
                      </TableHead>
                      {roles.map((role) => (
                        <TableHead
                          key={role.role_id}
                          className="text-slate-500 font-bold text-xs text-center min-w-[100px]"
                        >
                          {role.display_name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.id} className="border-slate-200">
                        <TableCell className="font-medium text-slate-700 sticky left-0 bg-white">
                          {module.name}
                        </TableCell>
                        {roles.map((role) => {
                          const modulePerms =
                            role.permissions?.[module.id] || [];
                          const permCount = modulePerms.length;
                          return (
                            <TableCell
                              key={role.role_id}
                              className="text-center"
                            >
                              {permCount > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-xs text-slate-500">
                                    {permCount}
                                  </span>
                                </div>
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Create New Role
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Role Name (ID) *
                </Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  className="border-slate-200 mt-1"
                  placeholder="e.g., finance_manager"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Display Name *
                </Label>
                <Input
                  value={roleForm.display_name}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, display_name: e.target.value })
                  }
                  className="border-slate-200 mt-1"
                  placeholder="e.g., Finance Manager"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Hierarchy Level
                </Label>
                <Input
                  type="number"
                  value={roleForm.hierarchy_level}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      hierarchy_level: parseInt(e.target.value) || 0,
                    })
                  }
                  className="border-slate-200 mt-1"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Higher = more access (0-100)
                </p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Description
                </Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, description: e.target.value })
                  }
                  className="border-slate-200 mt-1"
                  placeholder="Describe this role's purpose..."
                  rows={2}
                />
              </div>
            </div>

            {renderPermissionMatrix()}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setIsAddRoleOpen(false)}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRole}
                className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E]"
              >
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              Edit Role: {selectedRole?.display_name}
              {selectedRole?.is_system_role && (
                <Badge className="ml-2 bg-blue-100 text-blue-600">
                  System Role
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Role Name (ID)
                </Label>
                <Input
                  value={roleForm.name}
                  disabled
                  className="border-slate-200 mt-1 bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Display Name *
                </Label>
                <Input
                  value={roleForm.display_name}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, display_name: e.target.value })
                  }
                  className="border-slate-200 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Hierarchy Level
                </Label>
                <Input
                  type="number"
                  value={roleForm.hierarchy_level}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      hierarchy_level: parseInt(e.target.value) || 0,
                    })
                  }
                  className="border-slate-200 mt-1"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">
                  Description
                </Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, description: e.target.value })
                  }
                  className="border-slate-200 mt-1"
                  rows={2}
                />
              </div>
            </div>

            {renderPermissionMatrix()}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setIsEditRoleOpen(false)}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                className="bg-[#1FA21B] text-[#0B0C10] hover:bg-[#45A29E]"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
