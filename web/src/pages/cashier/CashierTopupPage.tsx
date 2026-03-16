import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { WALLET_MAX } from '@/lib/constants';
import { Search, DollarSign, Wallet } from 'lucide-react';

export default function CashierTopupPage() {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const lookupStudent = async () => {
    if (!studentId) return;
    const { data: prof } = await supabase.from('profiles').select('*').eq('student_id', studentId).single();
    if (!prof) { toast({ title: 'Not Found', variant: 'destructive' }); return; }
    if (prof.status === 'suspended') {
      toast({ title: 'Account Suspended', description: 'This account is suspended. Top-up is not allowed.', variant: 'destructive' });
      setProfile(null);
      setWallet(null);
      return;
    }
    setProfile(prof);
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', prof.id).single();
    setWallet(w);
  };

  const handleTopup = async () => {
    if (!profile || !wallet || !amount) return;
    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
    const newBalance = wallet.balance_lkr + amt;
    if (newBalance > WALLET_MAX) {
      toast({ title: 'Exceeds Limit', description: `Max balance is LKR ${WALLET_MAX}. Can add max LKR ${WALLET_MAX - wallet.balance_lkr}.`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('wallets').update({ balance_lkr: newBalance }).eq('user_id', profile.id);
    if (!error) {
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount_lkr: amt,
        type: 'topup' as const,
        description: `Cash top-up by cashier`,
      });
      toast({ title: 'Top-up Successful', description: `LKR ${amt} added. New balance: LKR ${newBalance}` });
      setWallet({ ...wallet, balance_lkr: newBalance });
      setAmount('');
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Wallet Top-Up</h2>

        <Card>
          <CardHeader><CardTitle>Find Student</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Enter Student ID..." value={studentId} onChange={e => setStudentId(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupStudent()} />
              </div>
              <Button onClick={lookupStudent}>Search</Button>
            </div>

            {profile && wallet && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-lg bg-secondary">
                  <p className="font-heading font-bold text-lg">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">{profile.student_id} • {profile.email}</p>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10">
                  <Wallet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-heading font-bold text-primary">LKR {wallet.balance_lkr}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Top-up Amount (LKR)</Label>
                  <Input type="number" min="1" max={WALLET_MAX - wallet.balance_lkr} value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Max: ${WALLET_MAX - wallet.balance_lkr}`} />
                </div>

                <Button onClick={handleTopup} disabled={loading} className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Confirm Top-Up'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
