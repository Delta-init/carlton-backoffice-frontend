import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
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
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

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
  view: 'bg-primary/15 text-primary border-primary/30',
  listing: 'bg-cyan-100 text-cyan-600 border-cyan-200',
  create: 'bg-green-100 text-green-600 border-green-200',
  edit: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  approve: 'bg-purple-100 text-purple-600 border-purple-200',
  export: 'bg-muted text-card-foreground border',
};

export default function RolesPermissions() {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('roles');
  const [borrowerCompanies, setBorrowerCompanies] = useState([]);

  // Dialogs
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Form
  const [roleForm, setRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    hierarchy_level: 50,
    permissions: {},
    borrower_ids: null,         // null = all borrower companies; array = specific only
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        setRoles(await response.json());
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(error?.message || "Something went wrong. Please try again.");
    }
  }, []);

  const fetchModulesAndActions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/permissions/modules`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchModulesAndActions();

    // Fetch all borrower companies (vendors) for the selector
    const fetchBorrowerCompanies = async () => {
      try {
        const res = await fetch(`${API_URL}/api/loans/vendors`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setBorrowerCompanies(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error('Failed to fetch borrower companies', e); }
    };
    fetchBorrowerCompanies();
  }, [fetchRoles, fetchModulesAndActions]);

  const handleCreateRole = async () => {
    if (!roleForm.name || !roleForm.display_name) {
      toast.error('Name and Display Name are required');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(roleForm),
      });
      
      if (response.ok) {
        toast.success('Role created successfully');
        setIsAddRoleOpen(false);
        resetForm();
        fetchRoles();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || "Something went wrong. Please try again.");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    
    try {
      const response = await fetch(`${API_URL}/api/roles/${selectedRole.role_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          display_name: roleForm.display_name,
          description: roleForm.description,
          permissions: roleForm.permissions,
          hierarchy_level: roleForm.hierarchy_level,
          borrower_ids: roleForm.borrower_ids,
        }),
      });
      
      if (response.ok) {
        toast.success('Role updated successfully');
        setIsEditRoleOpen(false);
        fetchRoles();
      } else {
        toast.error(await getApiError(response));
      }
    } catch (error) {
      toast.error(error?.message || "Something went wrong. Please try again.");
    }
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name || '',
      display_name: role.display_name || '',
      description: role.description || '',
      hierarchy_level: role.hierarchy_level || 50,
      permissions: role.permissions || {},
      borrower_ids: role.borrower_ids || null,
    });
    setIsEditRoleOpen(true);
  };

  const resetForm = () => {
    setRoleForm({
      name: '',
      display_name: '',
      description: '',
      hierarchy_level: 50,
      permissions: {},
      borrower_ids: null,
    });
  };

  const togglePermission = (moduleId, action) => {
    setRoleForm(prev => {
      const newPermissions = { ...prev.permissions };
      if (!newPermissions[moduleId]) {
        newPermissions[moduleId] = [];
      }
      
      const idx = newPermissions[moduleId].indexOf(action);
      if (idx > -1) {
        newPermissions[moduleId] = newPermissions[moduleId].filter(a => a !== action);
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
    setRoleForm(prev => {
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
    setRoleForm(prev => {
      const totalPermissions = Object.keys(prev.permissions).length;
      if (totalPermissions === modules.length) {
        return { ...prev, permissions: {} };
      } else {
        const allPermissions = {};
        modules.forEach(m => {
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
    Object.values(role.permissions || {}).forEach(acts => {
      count += acts.length;
    });
    return count;
  };

  const renderPermissionMatrix = () => (
    <div className="border border rounded-lg overflow-hidden">
      <div className="bg-muted/50 p-3 border-b border flex items-center justify-between">
        <span className="text-sm font-bold text-card-foreground uppercase tracking-wider">Permission Matrix</span>
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
            <TableRow className="border bg-muted/50">
              <TableHead className="text-muted-foreground font-bold text-xs sticky left-0 bg-muted/50 min-w-[180px]">MODULE</TableHead>
              {actions.map(action => (
                <TableHead key={action} className="text-muted-foreground font-bold text-xs text-center w-24">
                  {action.toUpperCase()}
                </TableHead>
              ))}
              <TableHead className="text-muted-foreground font-bold text-xs text-center w-20">ALL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map(module => {
              const isLoans = module.id === 'loans';
              const hasLoansPerm = isLoans && (roleForm.permissions['loans']?.length || 0) > 0;
              return (
                <>
                <TableRow key={module.id} className="border hover:bg-muted/50">
                  <TableCell className="font-medium text-card-foreground sticky left-0 bg-card">
                    {module.name}
                  </TableCell>
                  {actions.map(action => {
                    const Icon = ACTION_ICONS[action] || CheckCircle;
                    const isChecked = hasPermission(module.id, action);
                    return (
                      <TableCell key={action} className="text-center">
                        <button
                          onClick={() => togglePermission(module.id, action)}
                          className={`p-2 rounded-md transition-all ${
                            isChecked
                              ? ACTION_COLORS[action]
                              : 'bg-muted text-muted-foreground/60 hover:bg-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <Checkbox
                      checked={(roleForm.permissions[module.id]?.length || 0) === actions.length}
                      onCheckedChange={() => toggleAllModulePermissions(module.id)}
                    />
                  </TableCell>
                </TableRow>

                {/* Loans borrower company selector — shows when loans perms are enabled */}
                {hasLoansPerm && borrowerCompanies.length > 0 && (
                  <TableRow key="loan-borrowers" className="bg-emerald-50/40 border-slate-200">
                    <TableCell colSpan={actions.length + 2} className="py-2 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 shrink-0">Allowed Borrower Companies:</span>
                        <button
                          onClick={() => setRoleForm(prev => ({ ...prev, borrower_ids: null }))}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                            roleForm.borrower_ids === null
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-500 border-slate-300 hover:border-emerald-400'
                          }`}
                        >All</button>
                        {borrowerCompanies.map(company => {
                          const selected = Array.isArray(roleForm.borrower_ids) &&
                            roleForm.borrower_ids.includes(company.vendor_id);
                          return (
                            <button
                              key={company.vendor_id}
                              onClick={() => {
                                setRoleForm(prev => {
                                  const current = Array.isArray(prev.borrower_ids) ? prev.borrower_ids : [];
                                  const next = selected
                                    ? current.filter(id => id !== company.vendor_id)
                                    : [...current, company.vendor_id];
                                  return { ...prev, borrower_ids: next.length ? next : null };
                                });
                              }}
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                selected
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-400'
                                  : 'bg-white text-slate-500 border-slate-300 hover:border-emerald-400 hover:text-emerald-600'
                              }`}
                            >
                              {company.name || company.vendor_name}
                              {company.loan_stats?.active_loans > 0 && (
                                <span className="ml-1 opacity-60">({company.loan_stats.active_loans} loans)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="roles-permissions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground">Manage user roles and granular access control</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsAddRoleOpen(true); }}
          className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
          data-testid="add-role-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-card border border mb-4">
          <TabsTrigger value="roles" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Shield className="w-4 h-4 mr-2" /> Roles
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Lock className="w-4 h-4 mr-2" /> Permission Overview
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {roles.map(role => (
                <Card key={role.role_id} className="bg-card border hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${role.is_system_role ? 'bg-primary/15' : 'bg-muted'}`}>
                          <Shield className={`w-6 h-6 ${role.is_system_role ? 'text-primary' : 'text-card-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground">{role.display_name}</h3>
                            {role.is_system_role && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">System</Badge>
                            )}
                            <Badge className="bg-muted text-card-foreground border text-xs">
                              Level {role.hierarchy_level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{role.description || 'No description'}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-muted-foreground">
                              <Users className="w-3 h-3 inline mr-1" />
                              {getPermissionCount(role)} permissions
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Modules: {Object.keys(role.permissions || {}).length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditRole(role)}
                        className="text-card-foreground hover:text-foreground"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Permission preview */}
                    <div className="mt-4 pt-4 border-t border/60">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Modules with access:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(role.permissions || {}).slice(0, 8).map(([moduleId, acts]) => (
                          <Badge 
                            key={moduleId} 
                            variant="outline" 
                            className="text-xs bg-muted/50"
                          >
                            {modules.find(m => m.id === moduleId)?.name || moduleId}
                            <span className="ml-1 text-muted-foreground">({acts.length})</span>
                          </Badge>
                        ))}
                        {Object.keys(role.permissions || {}).length > 8 && (
                          <Badge variant="outline" className="text-xs bg-muted/50">
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
          <Card className="bg-card border">
            <CardContent className="p-0">
              <div className="p-4 border-b border">
                <h3 className="font-bold text-card-foreground">Permission Matrix by Role</h3>
                <p className="text-sm text-muted-foreground">Overview of all permissions across roles</p>
              </div>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border bg-muted/50">
                      <TableHead className="text-muted-foreground font-bold text-xs sticky left-0 bg-muted/50 min-w-[180px]">MODULE</TableHead>
                      {roles.map(role => (
                        <TableHead key={role.role_id} className="text-muted-foreground font-bold text-xs text-center min-w-[100px]">
                          {role.display_name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map(module => (
                      <TableRow key={module.id} className="border">
                        <TableCell className="font-medium text-card-foreground sticky left-0 bg-card">
                          {module.name}
                        </TableCell>
                        {roles.map(role => {
                          const modulePerms = role.permissions?.[module.id] || [];
                          const permCount = modulePerms.length;
                          return (
                            <TableCell key={role.role_id} className="text-center">
                              {permCount > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">{permCount}</span>
                                </div>
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground/60 mx-auto" />
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
        <DialogContent className="bg-card border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Create New Role
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Role Name (ID) *</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="border mt-1"
                  placeholder="e.g., finance_manager"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Display Name *</Label>
                <Input
                  value={roleForm.display_name}
                  onChange={(e) => setRoleForm({ ...roleForm, display_name: e.target.value })}
                  className="border mt-1"
                  placeholder="e.g., Finance Manager"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Hierarchy Level</Label>
                <Input
                  type="number"
                  value={roleForm.hierarchy_level}
                  onChange={(e) => setRoleForm({ ...roleForm, hierarchy_level: parseInt(e.target.value) || 0 })}
                  className="border mt-1"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">Higher = more access (0-100)</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Description</Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="border mt-1"
                  placeholder="Describe this role's purpose..."
                  rows={2}
                />
              </div>
            </div>

            {renderPermissionMatrix()}

            <div className="flex justify-end gap-2 pt-4 border-t border">
              <Button variant="outline" onClick={() => setIsAddRoleOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleCreateRole} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E]">
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="bg-card border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit Role: {selectedRole?.display_name}
              {selectedRole?.is_system_role && (
                <Badge className="ml-2 bg-primary/15 text-primary">System Role</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Role Name (ID)</Label>
                <Input
                  value={roleForm.name}
                  disabled
                  className="border mt-1 bg-muted/50"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Display Name *</Label>
                <Input
                  value={roleForm.display_name}
                  onChange={(e) => setRoleForm({ ...roleForm, display_name: e.target.value })}
                  className="border mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Hierarchy Level</Label>
                <Input
                  type="number"
                  value={roleForm.hierarchy_level}
                  onChange={(e) => setRoleForm({ ...roleForm, hierarchy_level: parseInt(e.target.value) || 0 })}
                  className="border mt-1"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Description</Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="border mt-1"
                  rows={2}
                />
              </div>
            </div>

            {renderPermissionMatrix()}

            <div className="flex justify-end gap-2 pt-4 border-t border">
              <Button variant="outline" onClick={() => setIsEditRoleOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E]">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
