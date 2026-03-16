import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Car, UserPlus, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EMAIL_REGEX } from '@/lib/constants';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    studentId: '',
    email: '',
    password: '',
    plateNumber: '',
    vehicleType: '' as 'car' | 'motorbike' | '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(form.email)) {
      toast({ title: 'Invalid Email', description: 'Email must end with @students.nsbm.ac.lk', variant: 'destructive' });
      return;
    }
    if (!form.vehicleType) {
      toast({ title: 'Error', description: 'Please select a vehicle type.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-registration-otp', {
        body: { email: form.email },
      });

      if (error || data?.error) {
        toast({ title: 'Failed to Send OTP', description: data?.error || error?.message || 'Something went wrong.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      toast({
        title: 'OTP Sent!',
        description: `A verification code has been sent to ${form.email}`,
      });
      setStep('otp');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-registration-otp', {
        body: {
          email: form.email,
          code: otp,
          name: form.name,
          phone: form.phone,
          studentId: form.studentId,
          password: form.password,
          plateNumber: form.plateNumber,
          vehicleType: form.vehicleType,
        },
      });

      if (error || data?.error) {
        toast({ title: 'Verification Failed', description: data?.error || 'Invalid OTP code. Please try again.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      toast({
        title: 'Account Created Successfully!',
        description: 'Your email has been verified. Please sign in.',
      });
      navigate('/login');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-registration-otp', {
        body: { email: form.email },
      });

      if (error || data?.error) {
        toast({ title: 'Resend Failed', description: data?.error || error?.message, variant: 'destructive' });
      } else {
        toast({ title: 'OTP Resent!', description: `A new code has been sent to ${form.email}` });
        setOtp('');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Car className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-heading font-bold text-foreground">N Park</h1>
        </div>

        {step === 'register' ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-heading">Create Account</CardTitle>
              <CardDescription>Register with your university credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={form.name} onChange={e => handleChange('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input id="studentId" value={form.studentId} onChange={e => handleChange('studentId', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">University Email</Label>
                  <Input id="email" type="email" placeholder="you@students.nsbm.ac.lk" value={form.email} onChange={e => handleChange('email', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Vehicle Plate Number</Label>
                  <Input id="plate" placeholder="e.g. ABC-1234" value={form.plateNumber} onChange={e => handleChange('plateNumber', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select onValueChange={v => handleChange('vehicleType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="motorbike">Motorbike</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? 'Sending OTP...' : 'Register'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-heading">Verify Your Email</CardTitle>
              <CardDescription>
                We sent a 6-digit verification code to<br />
                <span className="font-medium text-foreground">{form.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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

              <Button onClick={handleVerifyOtp} className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
                <Button variant="ghost" size="sm" onClick={handleResendOtp} disabled={resending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Resending...' : 'Resend OTP'}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                <button onClick={() => { setStep('register'); setOtp(''); }} className="text-primary hover:underline font-medium">
                  ← Back to Registration
                </button>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
