import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('wallets').select('balance_lkr').eq('user_id', user.id).single()
      .then(({ data }) => setBalance(data?.balance_lkr || 0));
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setTransactions(data || []));
  }, [user]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Wallet</h2>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-8 flex items-center gap-4">
            <Wallet className="h-12 w-12 opacity-80" />
            <div>
              <p className="text-sm opacity-80">Available Balance</p>
              <p className="text-4xl font-heading font-bold">LKR {balance}</p>
              <p className="text-xs opacity-60 mt-1">Min: LKR 300 • Max: LKR 2,000</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {t.amount_lkr > 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-success" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium capitalize">{t.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${t.amount_lkr > 0 ? 'text-success' : 'text-destructive'}`}>
                        {t.amount_lkr > 0 ? '+' : ''}LKR {t.amount_lkr}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              To top up your wallet, visit the <strong>Cashier counter</strong> with your Student ID and make a cash payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
