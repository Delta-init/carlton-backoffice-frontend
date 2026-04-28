import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { TrendingUp, Mail, Lock, ArrowLeft, KeyRound, ShieldCheck, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── 3-D tilt hook ──────────────────────────────────────────────
function useTilt(strength = 10) {
  const [style, setStyle] = useState({});

  const onMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) scale3d(1.01,1.01,1.01)`,
      transition: 'transform 0.08s ease-out',
    });
  }, [strength]);

  const onLeave = useCallback(() => {
    setStyle({ transform: 'perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)', transition: 'transform 0.4s ease-out' });
  }, []);

  return { tiltStyle: style, onMove, onLeave };
}

export default function Login() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpStep, setOtpStep]     = useState(false);
  const [otpCode, setOtpCode]     = useState('');
  const [otpEmail, setOtpEmail]   = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const { login, verifyOtp }      = useAuth();
  const navigate                  = useNavigate();

  const [forgotStep, setForgotStep]           = useState('');
  const [resetEmail, setResetEmail]           = useState('');
  const [resetCode, setResetCode]             = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { tiltStyle, onMove, onLeave } = useTilt(8);

  /* ── handlers ── */
  const handleSubmit = async (e) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires_2fa) {
        setOtpStep(true); setOtpEmail(email);
        setOtpMessage(result.message || 'Verification code sent to your email');
        toast.success(result.message || 'Check your email for the verification code');
      } else {
        toast.success('Login successful');
        navigate(result?.role === 'vendor' ? '/exchanger-portal' : '/dashboard');
      }
    } catch (err) { toast.error(err.message || 'Login failed'); }
    finally { setIsLoading(false); }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const userData = await verifyOtp(otpEmail, otpCode);
      toast.success('Login successful');
      navigate(userData?.role === 'vendor' ? '/exchanger-portal' : '/dashboard');
    } catch (err) { toast.error(err.message || 'Verification failed'); }
    finally { setIsLoading(false); }
  };

  const handleForgotSendCode = async (e) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!res.ok) { toast.error(await getApiError(res)); return; }
      const data = await res.json();
      toast.success(data.message || 'Check your email for the reset code');
      setForgotStep('code');
    } catch (err) { toast.error(err?.message || 'Failed to send reset code'); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6)          { toast.error('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp_code: resetCode, new_password: newPassword }),
      });
      if (!res.ok) { toast.error(await getApiError(res)); return; }
      toast.success('Password reset successfully!');
      setForgotStep('');
      setResetEmail(''); setResetCode(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { toast.error(err?.message || 'Reset failed'); }
    finally { setIsLoading(false); }
  };

  /* ── shared input class ── */
  const inputCls = "pl-10 h-11 bg-card border border text-foreground placeholder:text-muted-foreground " +
    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all " +
    "shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]";

  const btnCls = "w-full h-11 bg-primary hover:bg-primary/70 active:scale-[0.98] active:translate-y-px " +
    "text-white font-semibold rounded-xl transition-all " +
    "shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)]";

  /* ── form content ── */
  const renderForm = () => {
    if (forgotStep === 'email') return (
      <div className="space-y-7">
        <div>
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-5
            shadow-[0_8px_20px_rgba(251,191,36,0.3)] transform-gpu">
            <Mail className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-1">Forgot Password</h2>
          <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset code.</p>
        </div>
        <form onSubmit={handleForgotSendCode} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-card-foreground">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="your@email.com" value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={inputCls} required data-testid="forgot-email-input" />
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className={btnCls}>
            {isLoading ? 'Sending…' : 'Send Reset Code'}
          </Button>
          <Button type="button" variant="ghost"
            className="w-full text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-xl"
            onClick={() => setForgotStep('')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
          </Button>
        </form>
      </div>
    );

    if (forgotStep === 'code') return (
      <div className="space-y-7">
        <div>
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5
            shadow-[0_8px_20px_rgba(99,102,241,0.25)] transform-gpu">
            <KeyRound className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-1">Reset Password</h2>
          <p className="text-muted-foreground text-sm">Code sent to <span className="font-medium text-card-foreground">{resetEmail}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Expires in 10 minutes · 5 attempts max</p>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-card-foreground">Reset Code</Label>
            <Input type="text" placeholder="• • • • • •" value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-card border border
                text-foreground focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all
                shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
              maxLength={6} autoFocus required data-testid="reset-code-input" />
          </div>
          {[
            { label: 'New Password',     id: 'np', val: newPassword,     set: setNewPassword,     ph: 'Min 6 characters',     Icon: Lock },
            { label: 'Confirm Password', id: 'cp', val: confirmPassword, set: setConfirmPassword, ph: 'Confirm new password',  Icon: KeyRound },
          ].map(({ label, id, val, set, ph, Icon }) => (
            <div className="space-y-1.5" key={id}>
              <Label className="text-sm font-medium text-card-foreground">{label}</Label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder={ph} value={val} onChange={(e) => set(e.target.value)}
                  className={inputCls} required data-testid={`${id}-input`} />
              </div>
            </div>
          ))}
          <Button type="submit" disabled={isLoading || resetCode.length !== 6} className={`${btnCls} mt-1`}>
            {isLoading ? 'Resetting…' : 'Reset Password'}
          </Button>
          <Button type="button" variant="ghost"
            className="w-full text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-xl"
            onClick={() => setForgotStep('email')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </form>
      </div>
    );

    if (!otpStep) return (
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-1.5">Sign in to your account</h2>
          <p className="text-muted-foreground text-sm">Enter your credentials to access the dashboard.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-card-foreground">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="admin@carlton.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} font-mono`} data-testid="login-email-input" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm font-medium text-card-foreground">Password</Label>
              <button type="button"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                onClick={() => { setForgotStep('email'); setResetEmail(email); }}
                data-testid="forgot-password-link">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputCls} data-testid="login-password-input" required />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className={`${btnCls} mt-1`}
            data-testid="login-submit-btn">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </Button>
        </form>

        {/* Security note */}
        <div className="flex items-center gap-2.5 bg-muted/50 border border/60 rounded-xl px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-muted-foreground">Protected by 256-bit SSL encryption and 2FA verification</p>
        </div>
      </div>
    );

    /* OTP step */
    return (
      <div className="space-y-7">
        <div>
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5
            shadow-[0_8px_20px_rgba(99,102,241,0.25)] transform-gpu">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-1">Verify Identity</h2>
          <p className="text-muted-foreground text-sm">{otpMessage}</p>
          <p className="text-xs text-muted-foreground mt-1">Expires in 5 minutes · 3 attempts max</p>
        </div>
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-sm font-medium text-card-foreground">Verification Code</Label>
            <Input id="otp" type="text" placeholder="• • • • • •" value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-card border border
                text-foreground focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all
                shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
              data-testid="otp-input" maxLength={6} autoFocus required />
          </div>

          {/* Dot progress */}
          <div className="flex justify-center gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  i < otpCode.length
                    ? 'bg-indigo-600 shadow-[0_0_6px_rgba(99,102,241,0.6)] scale-110'
                    : 'bg-slate-200'
                }`} />
            ))}
          </div>

          <Button type="submit" disabled={isLoading || otpCode.length !== 6} className={btnCls}
            data-testid="otp-submit-btn">
            {isLoading ? 'Verifying…' : 'Verify & Sign In'}
          </Button>
          <Button type="button" variant="ghost"
            className="w-full text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-xl"
            onClick={() => { setOtpStep(false); setOtpCode(''); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
          </Button>
        </form>
      </div>
    );
  };

  /* ── floating brand items scattered around the background ── */
  const floaters = [
    // ── edges / corners ──
    { pos: { top: '4%',  left: '3%'   }, anim: 'float-a', size: 40, rotX: 15,  rotY: -20, delay: '0s',    opacity: 0.45 },
    { pos: { top: '8%',  right: '4%'  }, anim: 'float-b', size: 32, rotX: -12, rotY: 18,  delay: '1.5s',  opacity: 0.38 },
    { pos: { top: '32%', left: '1%'   }, anim: 'float-c', size: 50, rotX: 22,  rotY: 8,   delay: '0.7s',  opacity: 0.35 },
    { pos: { top: '50%', right: '2%'  }, anim: 'float-a', size: 38, rotX: -18, rotY: -12, delay: '2s',    opacity: 0.40 },
    { pos: { top: '68%', left: '3%'   }, anim: 'float-b', size: 30, rotX: 10,  rotY: 22,  delay: '1s',    opacity: 0.36 },
    { pos: { top: '78%', right: '5%'  }, anim: 'float-c', size: 46, rotX: -22, rotY: -16, delay: '2.5s',  opacity: 0.38 },
    { pos: { top: '2%',  left: '28%'  }, anim: 'float-c', size: 36, rotX: 14,  rotY: -10, delay: '0.5s',  opacity: 0.36 },
    { pos: { top: '86%', left: '22%'  }, anim: 'float-a', size: 28, rotX: -20, rotY: 14,  delay: '2.8s',  opacity: 0.34 },
    { pos: { top: '42%', right: '0%'  }, anim: 'float-b', size: 54, rotX: 8,   rotY: -15, delay: '1.8s',  opacity: 0.30 },
    { pos: { top: '91%', left: '55%'  }, anim: 'float-c', size: 30, rotX: -14, rotY: 20,  delay: '0.3s',  opacity: 0.32 },
    { pos: { top: '24%', right: '18%' }, anim: 'float-a', size: 22, rotX: 18,  rotY: -8,  delay: '2.2s',  opacity: 0.28 },
    { pos: { top: '75%', left: '38%'  }, anim: 'float-b', size: 42, rotX: -10, rotY: 16,  delay: '0.9s',  opacity: 0.32 },
    // ── centre band (left: 15% → 85%) ──
    { pos: { top: '6%',  left: '18%'  }, anim: 'float-b', size: 38, rotX: -8,  rotY: 20,  delay: '0.4s',  opacity: 0.40 },
    { pos: { top: '6%',  left: '72%'  }, anim: 'float-a', size: 34, rotX: 12,  rotY: -18, delay: '1.1s',  opacity: 0.38 },
    { pos: { top: '20%', left: '22%'  }, anim: 'float-c', size: 28, rotX: 20,  rotY: 10,  delay: '2.4s',  opacity: 0.34 },
    { pos: { top: '20%', left: '68%'  }, anim: 'float-b', size: 44, rotX: -16, rotY: -22, delay: '0.9s',  opacity: 0.36 },
    { pos: { top: '35%', left: '16%'  }, anim: 'float-a', size: 32, rotX: 10,  rotY: 25,  delay: '3.2s',  opacity: 0.34 },
    { pos: { top: '35%', left: '76%'  }, anim: 'float-c', size: 36, rotX: -20, rotY: -10, delay: '1.6s',  opacity: 0.35 },
    { pos: { top: '48%', left: '18%'  }, anim: 'float-b', size: 48, rotX: 14,  rotY: -18, delay: '0.2s',  opacity: 0.33 },
    { pos: { top: '48%', left: '72%'  }, anim: 'float-a', size: 30, rotX: -10, rotY: 15,  delay: '2.6s',  opacity: 0.36 },
    { pos: { top: '62%', left: '20%'  }, anim: 'float-c', size: 40, rotX: 18,  rotY: -12, delay: '1.4s',  opacity: 0.35 },
    { pos: { top: '62%', left: '70%'  }, anim: 'float-b', size: 26, rotX: -24, rotY: 8,   delay: '3.5s',  opacity: 0.32 },
    { pos: { top: '76%', left: '16%'  }, anim: 'float-a', size: 34, rotX: 8,   rotY: 22,  delay: '0.7s',  opacity: 0.34 },
    { pos: { top: '76%', left: '74%'  }, anim: 'float-c', size: 44, rotX: -14, rotY: -20, delay: '2.0s',  opacity: 0.35 },
    { pos: { top: '88%', left: '68%'  }, anim: 'float-b', size: 32, rotX: 22,  rotY: 12,  delay: '1.2s',  opacity: 0.34 },
    // ── deep centre column ──
    { pos: { top: '13%', left: '42%'  }, anim: 'float-a', size: 30, rotX: -18, rotY: 14,  delay: '1.8s',  opacity: 0.33 },
    { pos: { top: '28%', left: '36%'  }, anim: 'float-c', size: 36, rotX: 12,  rotY: -22, delay: '0.6s',  opacity: 0.35 },
    { pos: { top: '28%', left: '58%'  }, anim: 'float-b', size: 28, rotX: -8,  rotY: 18,  delay: '2.9s',  opacity: 0.32 },
    { pos: { top: '55%', left: '32%'  }, anim: 'float-a', size: 42, rotX: 16,  rotY: -10, delay: '1.0s',  opacity: 0.34 },
    { pos: { top: '55%', left: '60%'  }, anim: 'float-c', size: 32, rotX: -20, rotY: 24,  delay: '3.3s',  opacity: 0.32 },
    { pos: { top: '70%', left: '48%'  }, anim: 'float-b', size: 38, rotX: 10,  rotY: -16, delay: '0.5s',  opacity: 0.34 },
    { pos: { top: '83%', left: '40%'  }, anim: 'float-a', size: 28, rotX: -12, rotY: 20,  delay: '2.1s',  opacity: 0.32 },
  ];

  /* ── floating dollar icons ── */
  const dollarFloaters = [
    { pos: { top: '5%',  left: '10%'  }, anim: 'float-b', size: 44, rotX: -14, rotY: 22,  delay: '0.6s',  opacity: 0.42, color: 'bg-emerald-500' },
    { pos: { top: '5%',  left: '60%'  }, anim: 'float-c', size: 34, rotX: 18,  rotY: -12, delay: '2.0s',  opacity: 0.36, color: 'bg-emerald-500' },
    { pos: { top: '15%', left: '80%'  }, anim: 'float-a', size: 50, rotX: -10, rotY: 18,  delay: '1.2s',  opacity: 0.40, color: 'bg-emerald-600' },
    { pos: { top: '25%', left: '8%'   }, anim: 'float-c', size: 38, rotX: 20,  rotY: -16, delay: '3.1s',  opacity: 0.38, color: 'bg-emerald-500' },
    { pos: { top: '30%', left: '50%'  }, anim: 'float-b', size: 30, rotX: -22, rotY: 10,  delay: '0.4s',  opacity: 0.34, color: 'bg-emerald-600' },
    { pos: { top: '38%', left: '88%'  }, anim: 'float-a', size: 46, rotX: 12,  rotY: -20, delay: '1.9s',  opacity: 0.38, color: 'bg-emerald-500' },
    { pos: { top: '45%', left: '28%'  }, anim: 'float-c', size: 36, rotX: -16, rotY: 24,  delay: '2.7s',  opacity: 0.36, color: 'bg-emerald-600' },
    { pos: { top: '52%', left: '64%'  }, anim: 'float-b', size: 42, rotX: 8,   rotY: -14, delay: '0.8s',  opacity: 0.40, color: 'bg-emerald-500' },
    { pos: { top: '58%', left: '10%'  }, anim: 'float-a', size: 32, rotX: -18, rotY: 16,  delay: '3.4s',  opacity: 0.35, color: 'bg-emerald-600' },
    { pos: { top: '65%', left: '82%'  }, anim: 'float-c', size: 48, rotX: 14,  rotY: -22, delay: '1.5s',  opacity: 0.39, color: 'bg-emerald-500' },
    { pos: { top: '72%', left: '54%'  }, anim: 'float-b', size: 28, rotX: -8,  rotY: 20,  delay: '0.2s',  opacity: 0.34, color: 'bg-emerald-600' },
    { pos: { top: '80%', left: '6%'   }, anim: 'float-a', size: 40, rotX: 22,  rotY: -10, delay: '2.3s',  opacity: 0.37, color: 'bg-emerald-500' },
    { pos: { top: '85%', left: '78%'  }, anim: 'float-c', size: 34, rotX: -12, rotY: 18,  delay: '1.0s',  opacity: 0.36, color: 'bg-emerald-600' },
    { pos: { top: '92%', left: '36%'  }, anim: 'float-b', size: 44, rotX: 16,  rotY: -24, delay: '2.6s',  opacity: 0.38, color: 'bg-emerald-500' },
    { pos: { top: '18%', left: '44%'  }, anim: 'float-a', size: 26, rotX: -20, rotY: 12,  delay: '1.7s',  opacity: 0.33, color: 'bg-emerald-600' },
    { pos: { top: '40%', left: '6%'   }, anim: 'float-c', size: 52, rotX: 10,  rotY: -18, delay: '0.9s',  opacity: 0.41, color: 'bg-emerald-500' },
  ];

  /* ── render ── */
  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes float-a  { 0%,100%{transform:translateY(0px)  rotate(0deg)}  50%{transform:translateY(-16px) rotate(5deg)}  }
        @keyframes float-b  { 0%,100%{transform:translateY(0px)  rotate(0deg)}  50%{transform:translateY(-11px) rotate(-4deg)} }
        @keyframes float-c  { 0%,100%{transform:translateY(0px)  rotate(0deg)}  50%{transform:translateY(-20px) rotate(3deg)}  }
        @keyframes pulse-orb{ 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:.7;transform:scale(1.07)} }
        .float-a { animation: float-a  4.5s ease-in-out infinite; }
        .float-b { animation: float-b  6s   ease-in-out infinite 1.2s; }
        .float-c { animation: float-c  5.4s ease-in-out infinite 0.6s; }
        .pulse-orb{ animation: pulse-orb 5s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex">
        <div className="w-full flex items-center justify-center bg-card relative overflow-hidden">

          {/* ── soft background orbs ── */}
          <div className="pulse-orb absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
          <div className="pulse-orb absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-muted/70 blur-2xl pointer-events-none" style={{ animationDelay: '2.5s' }} />
          <div className="pulse-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-50/30 blur-3xl pointer-events-none" style={{ animationDelay: '1.2s' }} />

          {/* ── floating 3D brand elements ── */}
          {floaters.map((f, i) => (
            <div
              key={i}
              className={`${f.anim} absolute pointer-events-none`}
              style={{ ...f.pos, animationDelay: f.delay, opacity: f.opacity }}
            >
              <div style={{
                transform: `perspective(500px) rotateX(${f.rotX}deg) rotateY(${f.rotY}deg)`,
                transformStyle: 'preserve-3d',
              }}>
                {/* icon box */}
                <div
                  className="bg-indigo-600 rounded-xl flex items-center justify-center mx-auto
                    shadow-[0_8px_24px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]
                    border border-indigo-500"
                  style={{ width: f.size, height: f.size }}
                >
                  <TrendingUp style={{ width: f.size * 0.45, height: f.size * 0.45 }} className="text-white" />
                </div>
                {/* title */}
                <p
                  className="text-center font-bold text-indigo-600 mt-1.5 whitespace-nowrap tracking-tight"
                  style={{ fontSize: Math.max(f.size * 0.22, 9) }}
                >
                 Carlton
                </p>
              </div>
            </div>
          ))}

          {/* ── floating 3D dollar icons ── */}
          {dollarFloaters.map((f, i) => (
            <div
              key={`dollar-${i}`}
              className={`${f.anim} absolute pointer-events-none`}
              style={{ ...f.pos, animationDelay: f.delay, opacity: f.opacity }}
            >
              <div style={{
                transform: `perspective(500px) rotateX(${f.rotX}deg) rotateY(${f.rotY}deg)`,
                transformStyle: 'preserve-3d',
              }}>
                <div
                  className={`${f.color} rounded-xl flex items-center justify-center mx-auto
                    shadow-[0_8px_24px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]
                    border border-emerald-400`}
                  style={{ width: f.size, height: f.size }}
                >
                  <DollarSign style={{ width: f.size * 0.5, height: f.size * 0.5 }} className="text-white" />
                </div>
              </div>
            </div>
          ))}

          {/* ── 3-D tilt form wrapper ── */}
          <div
            className="relative z-10 w-full max-w-md px-8 py-12"
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ ...tiltStyle, transformStyle: 'preserve-3d' }}
          >
            {renderForm()}
          </div>

        </div>
      </div>
    </>
  );
}
