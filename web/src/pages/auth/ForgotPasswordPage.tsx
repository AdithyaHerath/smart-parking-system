import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Car, Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Step = 'student-id' | 'otp' | 'new-password';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('student-id');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1: Look up email by Student ID and send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedId = studentId.trim().toUpperCase();
    if (!normalizedId) {
      toast({ title: 'Error', description: 'Please enter your Student ID.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    // Look up email from student ID
    const { data: emailResult, error: lookupError } = await supabase.rpc('get_email_by_student_id', {
      _student_id: normalizedId,
    });

    if (lookupError || !emailResult) {
      toast({ title: 'Not Found', description: 'No account found with this Student ID.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setEmail(emailResult);

    // Send OTP to the email
    const { data, error } = await supabase.functions.invoke('send-registration-otp', {
      body: { email: emailResult, purpose: 'reset' },
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message || 'Failed to send OTP.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    toast({ title: 'OTP Sent', description: `A verification code has been sent to ${maskEmail(emailResult)}` });
    setStep('otp');
    setLoading(false);
  };

  // Step 2: Verify OTP (just validate locally that 6 digits entered, actual verification happens in step 3)
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast({ title: 'Error', description: 'Please enter the full 6-digit code.', variant: 'destructive' });
      return;
    }
    setStep('new-password');
  };

  // Step 3: Submit new password + OTP to edge function
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('verify-reset-otp', {
      body: { email, code: otpCode, newPassword: password },
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message || 'Failed to reset password.', variant: 'destructive' });
      // If OTP was invalid, go back to OTP step
      if (data?.error?.includes('Invalid or expired OTP')) {
        setOtpCode('');
        setStep('otp');
      }
      setLoading(false);
      return;
    }

    toast({ title: 'Password Changed Successfully!', description: 'You can now sign in with your new password.' });
    navigate('/login');
    setLoading(false);
  };

  const maskEmail = (em: string) => {
    const [local, domain] = em.split('@');
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 3)}***@${domain}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Car className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-heading font-bold text-foreground">N Park</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">
              {step === 'student-id' && 'Forgot Password'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'new-password' && 'New Password'}
            </CardTitle>
            <CardDescription>
              {step === 'student-id' && 'Enter your Student ID to receive a verification code'}
              {step === 'otp' && `Enter the 6-digit code sent to ${maskEmail(email)}`}
              {step === 'new-password' && 'Set your new password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {['student-id', 'otp', 'new-password'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s ? 'bg-primary text-primary-foreground' :
                    ['student-id', 'otp', 'new-password'].indexOf(step) > i ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 ${['student-id', 'otp', 'new-password'].indexOf(step) > i ? 'bg-primary' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Student ID */}
            {step === 'student-id' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    placeholder="e.g. 34556"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</> : <><Mail className="mr-2 h-4 w-4" /> Send Verification Code</>}
                </Button>
                <Link to="/login" className="block text-center text-sm text-primary hover:underline">
                  <ArrowLeft className="inline h-4 w-4 mr-1" />Back to Login
                </Link>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={otpCode.length !== 6}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Verify Code
                </Button>
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={() => { setStep('student-id'); setOtpCode(''); }} className="text-primary hover:underline">
                    <ArrowLeft className="inline h-4 w-4 mr-1" />Back
                  </button>
                  <button type="button" onClick={() => { setOtpCode(''); handleResendOTP(); }} className="text-primary hover:underline">
                    Resend Code
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 'new-password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : <><KeyRound className="mr-2 h-4 w-4" /> Update Password</>}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  async function handleResendOTP() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('send-registration-otp', {
      body: { email, purpose: 'reset' },
    });
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message || 'Failed to resend.', variant: 'destructive' });
    } else {
      toast({ title: 'Code Resent', description: 'A new verification code has been sent.' });
    }
    setLoading(false);
  }
}
