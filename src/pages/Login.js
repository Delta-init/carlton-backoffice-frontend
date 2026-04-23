import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');  const [otpEmail, setOtpEmail] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(''); // '' | 'email' | 'code' | 'done'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { tiltStyle, onMove, onLeave } = useTilt(8);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires_2fa) {
        setOtpStep(true);
        setOtpEmail(email);
        setOtpMessage(result.message || 'Verification code sent to your email');
        toast.success(result.message || 'Check your email for the verification code');
      } else {
        toast.success('Login successful');
        if (result?.role === 'vendor') {
          navigate('/exchanger-portal');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = await verifyOtp(otpEmail, otpCode);
      toast.success('Login successful');
      if (userData?.role === 'vendor') {
        navigate('/exchanger-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      toast.success(data.message || 'Check your email for the reset code');
      setForgotStep('code');
    } catch { toast.error('Failed to send reset code'); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp_code: resetCode, new_password: newPassword }),
      });
      if (response.ok) {
        toast.success('Password reset successfully!');
        setForgotStep('');
        setResetEmail(''); setResetCode(''); setNewPassword(''); setConfirmPassword('');
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Reset failed');
      }
    } catch { toast.error('Reset failed'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/30766684/pexels-photo-30766684.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-12 h-12 text-white" />
            <span className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
              Calton Fx
            </span>
          </div>
          <h1 className="text-5xl font-bold uppercase tracking-tight text-white mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            Back-Office Portal
          </h1>
          <p className="text-primary text-lg max-w-md">
            Comprehensive account management system for FX brokerage operations
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-card">
        <div
          className="w-full max-w-md"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ ...tiltStyle, transformStyle: 'preserve-3d' }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <TrendingUp className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
              Calton Fx
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            {forgotStep === 'email' ? (
              <>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>Forgot Password</h2>
                <p className="text-slate-500 mb-6">Enter your email to receive a reset code</p>
                <form onSubmit={handleForgotSendCode} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-xs uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input type="email" placeholder="Enter your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 text-slate-800 font-mono" required data-testid="forgot-email-input" />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-wider rounded-xl">
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setForgotStep('')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                  </Button>
                </form>
              </>
            ) : forgotStep === 'code' ? (
              <>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>Reset Password</h2>
                <p className="text-slate-500 mb-2">Enter the code sent to {resetEmail}</p>
                <p className="text-xs text-slate-400 mb-6">Code expires in 10 minutes. 5 attempts max.</p>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-xs uppercase tracking-wider">Reset Code</Label>
                    <Input type="text" placeholder="Enter 6-digit code" value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 border-slate-200 text-slate-800"
                      maxLength={6} autoFocus required data-testid="reset-code-input" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-xs uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 text-slate-800" required data-testid="new-password-input" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-xs uppercase tracking-wider">Confirm Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 text-slate-800" required data-testid="confirm-password-input" />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading || resetCode.length !== 6} className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-wider rounded-xl">
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setForgotStep('email')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                </form>
              </>
            ) : !otpStep ? (
              <>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>Sign In</h2>
                <p className="text-slate-500 mb-8">Access your back-office dashboard</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-600 text-xs uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="email" type="email" placeholder="admin@fxbroker.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-primary font-mono" data-testid="login-email-input" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-slate-600 text-xs uppercase tracking-wider">Password</Label>
                      <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium" onClick={() => { setForgotStep('email'); setResetEmail(email); }} data-testid="forgot-password-link">
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-primary" data-testid="login-password-input" required />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full bg-primary text-white hover:bg-primary/80 font-bold uppercase tracking-wider rounded-xl shadow-sm" data-testid="login-submit-btn">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>Verify Identity</h2>
                <p className="text-slate-500 mb-2">{otpMessage}</p>
                <p className="text-xs text-slate-400 mb-6">Code expires in 5 minutes. 3 attempts max.</p>
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-600 text-xs uppercase tracking-wider">Verification Code</Label>
                    <Input id="otp" type="text" placeholder="Enter 6-digit code" value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="otp-input" maxLength={6} autoFocus required />
                  </div>
                  <Button type="submit" disabled={isLoading || otpCode.length !== 6}
                    className="w-full bg-primary text-white hover:bg-primary/80 font-bold uppercase tracking-wider rounded-xl shadow-sm" data-testid="otp-submit-btn">
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => { setOtpStep(false); setOtpCode(''); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
