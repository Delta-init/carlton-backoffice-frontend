import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/permissions/my`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || {});
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = useCallback((module, action) => {
    if (!permissions[module]) return false;
    return permissions[module].includes(action) || permissions[module].includes('*');
  }, [permissions]);

  const canView = useCallback((module) => hasPermission(module, 'view'), [hasPermission]);
  const canCreate = useCallback((module) => hasPermission(module, 'create'), [hasPermission]);
  const canEdit = useCallback((module) => hasPermission(module, 'edit'), [hasPermission]);
  const canDelete = useCallback((module) => hasPermission(module, 'delete'), [hasPermission]);
  const canApprove = useCallback((module) => hasPermission(module, 'approve'), [hasPermission]);
  const canExport = useCallback((module) => hasPermission(module, 'export'), [hasPermission]);

  return { permissions, loading, hasPermission, canView, canCreate, canEdit, canDelete, canApprove, canExport };
}
