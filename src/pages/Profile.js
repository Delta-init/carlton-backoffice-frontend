import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { UserCircle, Mail, Shield, Bell, BellOff, Smartphone, QrCode } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL+"/api"  || 'http://localhost:8000/api';



export default function Profile() {
  const { user, mfaSetup, mfaConfirm } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Two-factor authentication
  const [mfaMethod, setMfaMethod] = useState('email');
  const [totpConfirmed, setTotpConfirmed] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [enroll, setEnroll] = useState(null); // { qr, secret }
  const [enrollCode, setEnrollCode] = useState('');

  // ── Theme styles ────────────────────────────────────────────────────────────
  const s = {
    page:       isDark ? 'bg-[#0f1117] text-white min-h-screen p-6 md:p-8' : 'bg-gray-50 text-gray-900 min-h-screen p-6 md:p-8',
    card:       isDark ? 'bg-[#1a1d2e] border border-[#2a2d3e] rounded-[12px]' : 'bg-white border border-gray-200 rounded-[12px] shadow-sm',
    label:      isDark ? 'text-[#94a3b8]' : 'text-gray-500',
    value:      isDark ? 'text-white' : 'text-gray-900',
    divider:    isDark ? 'border-[#2a2d3e]' : 'border-gray-100',
    toggleTrack: (on) => on
      ? 'bg-[#4f46e5]'
      : (isDark ? 'bg-[#2a2d3e]' : 'bg-gray-200'),
    toggleThumb: 'bg-white shadow',
    rowHover:   isDark ? 'hover:bg-[#1e2235]' : 'hover:bg-gray-50',
  };

  // ── Load preference ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API}/auth/notification-preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEmailEnabled(data.email_notifications ?? true);
        }
      } catch {
        // default stays true
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMfa = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API}/auth/mfa/status`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          setMfaMethod(d.mfa_method || 'email');
          setTotpConfirmed(!!d.totp_confirmed);
        }
      } catch { /* keep defaults */ }
    };
    loadMfa();
  }, []);

  const switchToEmail = async () => {
    setMfaBusy(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/auth/mfa/method`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });
      if (!res.ok) throw new Error();
      setMfaMethod('email'); setEnroll(null); setEnrollCode('');
      toast.success('Switched to Email OTP');
    } catch { toast.error('Failed to switch method'); }
    finally { setMfaBusy(false); }
  };

  const startAuthenticatorSetup = async () => {
    setMfaBusy(true);
    try {
      const data = await mfaSetup(null);
      setEnroll({ qr: data.qr_image, secret: data.secret }); setEnrollCode('');
    } catch (e) { toast.error(e.message || 'Failed to start setup'); }
    finally { setMfaBusy(false); }
  };

  const confirmAuthenticator = async () => {
    setMfaBusy(true);
    try {
      await mfaConfirm(null, enrollCode);
      setMfaMethod('totp'); setTotpConfirmed(true); setEnroll(null); setEnrollCode('');
      toast.success('Authenticator app enabled');
    } catch (e) { toast.error(e.message || 'Invalid code'); }
    finally { setMfaBusy(false); }
  };

  // ── Toggle handler ──────────────────────────────────────────────────────────
  const handleToggle = async () => {
    const newVal = !emailEnabled;
    setEmailEnabled(newVal);
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/auth/notification-preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_notifications: newVal }),
      });
      if (res.ok) {
        toast.success(
          newVal ? 'Email notifications enabled' : 'Email notifications disabled'
        );
      } else {
        throw new Error('Save failed');
      }
    } catch {
      // revert on error
      setEmailEnabled(!newVal);
      toast.error('Failed to update preference');
    } finally {
      setSaving(false);
    }
  };

  const roleBadgeColor = isDark
    ? 'bg-[#4f46e5]/20 text-[#a5b4fc] border-[#4f46e5]/30'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  return (
    <div className={s.page}>
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className={`text-sm mt-1 ${s.label}`}>Manage your account and notification preferences</p>
        </div>

        {/* Identity card */}
        <div className={s.card}>
          <div className="p-6 flex items-center gap-5">
            <Avatar className="w-16 h-16 border-2 border-[#4f46e5]/40">
              <AvatarImage src={user?.picture} />
              <AvatarFallback className="text-xl font-bold bg-[#4f46e5]/20 text-[#a5b4fc]">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className={`text-lg font-semibold truncate ${s.value}`}>{user?.name || '—'}</p>
              <p className={`text-sm truncate mt-0.5 ${s.label}`}>{user?.email || '—'}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${roleBadgeColor}`}>
                  <Shield className="w-3 h-3" />
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>

          <div className={`border-t ${s.divider}`} />

          {/* Info rows */}
          <div className="p-4 space-y-0">
            <div className={`flex items-center gap-3 px-2 py-3 rounded-[6px] ${s.rowHover}`}>
              <Mail className={`w-4 h-4 flex-shrink-0 ${s.label}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${s.label}`}>Email</p>
                <p className={`text-sm font-medium truncate ${s.value}`}>{user?.email || '—'}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 px-2 py-3 rounded-[6px] ${s.rowHover}`}>
              <UserCircle className={`w-4 h-4 flex-shrink-0 ${s.label}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${s.label}`}>Role</p>
                <p className={`text-sm font-medium ${s.value}`}>{user?.role || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification preferences card */}
        <div className={s.card}>
          <div className="px-6 pt-5 pb-2">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${s.label}`}>
              Notification Preferences
            </h2>
          </div>

          <div className="px-6 pb-6">
            <div
              className={`flex items-center justify-between gap-4 py-4 border-t ${s.divider}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-[6px] ${emailEnabled ? 'bg-[#4f46e5]/15' : (isDark ? 'bg-[#2a2d3e]' : 'bg-gray-100')}`}>
                  {emailEnabled
                    ? <Bell className="w-4 h-4 text-[#4f46e5]" />
                    : <BellOff className={`w-4 h-4 ${s.label}`} />
                  }
                </div>
                <div>
                  <p className={`text-sm font-medium ${s.value}`}>Email Notifications</p>
                  <p className={`text-xs mt-0.5 ${s.label}`}>
                    {emailEnabled
                      ? 'You will receive transaction approvals, assignments and report emails.'
                      : 'You will not receive any system emails. Login OTP and password reset are unaffected.'}
                  </p>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={handleToggle}
                disabled={saving || loading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${s.toggleTrack(emailEnabled)}`}
                role="switch"
                aria-checked={emailEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full transition duration-200 ${s.toggleThumb} ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Status hint */}
            <div className={`mt-1 text-xs px-1 ${s.label}`}>
              {loading
                ? 'Loading preference…'
                : emailEnabled
                  ? '✅ Emails are currently enabled for your account.'
                  : '🔕 Emails are currently disabled for your account.'}
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication card */}
        <div className={s.card}>
          <div className="px-6 pt-5 pb-2">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${s.label}`}>
              Two-Factor Authentication
            </h2>
          </div>
          <div className={`px-6 pb-6 border-t ${s.divider} pt-4 space-y-4`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-[6px] bg-[#4f46e5]/15">
                  {mfaMethod === 'totp'
                    ? <Smartphone className="w-4 h-4 text-[#4f46e5]" />
                    : <Mail className="w-4 h-4 text-[#4f46e5]" />}
                </div>
                <div>
                  <p className={`text-sm font-medium ${s.value}`}>
                    {mfaMethod === 'totp' ? 'Authenticator App' : 'Email OTP'}
                  </p>
                  <p className={`text-xs mt-0.5 ${s.label}`}>
                    {mfaMethod === 'totp'
                      ? 'A 6-digit code from your authenticator app is required at login.'
                      : 'A 6-digit code is emailed to you at login.'}
                  </p>
                </div>
              </div>
              <Badge className={roleBadgeColor}>{mfaMethod === 'totp' ? 'Authenticator' : 'Email'}</Badge>
            </div>

            {!enroll && (
              <div className="flex flex-wrap gap-2">
                {mfaMethod !== 'totp' && (
                  <button onClick={startAuthenticatorSetup} disabled={mfaBusy}
                    className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-[8px] bg-[#4f46e5] text-white hover:bg-[#4338ca] disabled:opacity-50"
                    data-testid="mfa-use-authenticator">
                    <QrCode className="w-4 h-4" /> {totpConfirmed ? 'Re-scan authenticator' : 'Use Authenticator App'}
                  </button>
                )}
                {mfaMethod !== 'email' && (
                  <button onClick={switchToEmail} disabled={mfaBusy}
                    className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-[8px] border ${s.divider} ${s.value} ${s.rowHover} disabled:opacity-50`}
                    data-testid="mfa-use-email">
                    <Mail className="w-4 h-4" /> Switch to Email OTP
                  </button>
                )}
              </div>
            )}

            {enroll && (
              <div className={`rounded-[8px] border ${s.divider} p-4 space-y-3`}>
                <p className={`text-xs ${s.label}`}>Scan with Google Authenticator / Authy, then enter the 6-digit code.</p>
                <div className="flex flex-col items-center gap-2">
                  {enroll.qr && <img src={enroll.qr} alt="Authenticator QR" className="w-40 h-40 rounded-[8px] border border-gray-200 bg-white p-2" />}
                  <p className={`font-mono text-xs ${s.label} break-all text-center max-w-[16rem]`}>{enroll.secret}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input value={enrollCode} onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6}
                    className={`flex-1 text-center font-mono tracking-[0.3em] h-10 rounded-[8px] border ${s.divider} bg-transparent ${s.value} px-3`}
                    data-testid="mfa-enroll-input" />
                  <button onClick={confirmAuthenticator} disabled={mfaBusy || enrollCode.length !== 6}
                    className="text-sm font-medium px-3 py-2 rounded-[8px] bg-[#4f46e5] text-white hover:bg-[#4338ca] disabled:opacity-50"
                    data-testid="mfa-enroll-confirm">Verify</button>
                  <button onClick={() => { setEnroll(null); setEnrollCode(''); }} disabled={mfaBusy}
                    className={`text-sm px-3 py-2 rounded-[8px] ${s.label} ${s.rowHover}`}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
