import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Wallet, Car, AlertTriangle } from 'lucide-react';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, balance: 0, vehicles: 0, complaints: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [bookingsRes, walletRes, vehiclesRes, complaintsRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['confirmed', 'arrived']),
        supabase.from('wallets').select('balance_lkr').eq('user_id', user.id).single(),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('reporter_id', user.id).eq('status', 'pending'),
      ]);
      setStats({
        bookings: bookingsRes.count || 0,
        balance: walletRes.data?.balance_lkr || 0,
        vehicles: vehiclesRes.count || 0,
        complaints: complaintsRes.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: 'Active Bookings', value: stats.bookings, icon: <CalendarCheck className="h-5 w-5" />, color: 'text-primary' },
    { title: 'Wallet Balance', value: `LKR ${stats.balance}`, icon: <Wallet className="h-5 w-5" />, color: 'text-success' },
    { title: 'My Vehicles', value: stats.vehicles, icon: <Car className="h-5 w-5" />, color: 'text-warning' },
    { title: 'Pending Complaints', value: stats.complaints, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's your parking overview.</p>
        </div>

        {profile?.status === 'suspended' && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
              <div>
                <p className="font-heading font-bold text-destructive">Your account is suspended</p>
                <p className="text-sm text-muted-foreground">
                  Please contact the IT Department or mail{' '}
                  <a href="mailto:admin.parking@nsbm.ac.lk" className="underline font-medium text-foreground">admin.parking@nsbm.ac.lk</a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <span className={card.color}>{card.icon}</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-heading font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
