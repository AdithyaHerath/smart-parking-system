import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMinutes } from 'date-fns';

export default function BookingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, parking_slots(slot_code, type), vehicles(plate_number, type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const cancelBooking = async (booking: any) => {
    const minutesUntil = differenceInMinutes(new Date(booking.booking_time), new Date());
    if (minutesUntil < 60) {
      toast({ title: 'Cannot Cancel', description: 'Cancellation is only allowed 1+ hour before booking time.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    if (!error) {
      toast({ title: 'Booking Cancelled' });
      fetchBookings();
    }
  };

  const statusColors: Record<string, string> = {
    confirmed: 'bg-primary text-primary-foreground',
    arrived: 'bg-success text-success-foreground',
    completed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive text-destructive-foreground',
    expired: 'bg-warning text-warning-foreground',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">My Bookings</h2>

        {bookings.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No bookings yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <Card key={b.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-lg">{b.parking_slots?.slot_code}</span>
                      <Badge className={statusColors[b.status] || ''}>{b.status}</Badge>
                      {b.is_walkin && <Badge variant="outline">Walk-in</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b.vehicles?.plate_number} • {format(new Date(b.booking_time), 'PPp')}
                    </p>
                    <p className="text-sm text-muted-foreground">Fee: LKR {b.fee_lkr}</p>
                  </div>
                  {b.status === 'confirmed' && differenceInMinutes(new Date(b.booking_time), new Date()) >= 60 && (
                    <Button variant="destructive" size="sm" onClick={() => cancelBooking(b)}>Cancel</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
