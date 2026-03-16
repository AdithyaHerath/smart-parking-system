import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PARKING_FEES } from '@/lib/constants';
import { ParkingCircle } from 'lucide-react';

export default function SlotsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'car' | 'motorbike'>('all');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(0);

  const fetchSlots = async () => {
    const { data } = await supabase.from('parking_slots').select('*').order('slot_code');
    setSlots(data || []);
  };

  useEffect(() => {
    fetchSlots();
    if (user) {
      supabase.from('vehicles').select('*').eq('user_id', user.id).then(({ data }) => setVehicles(data || []));
      supabase.from('wallets').select('balance_lkr').eq('user_id', user.id).single().then(({ data }) => setWallet(data?.balance_lkr || 0));
    }

    // Realtime subscription
    const channel = supabase.channel('slots-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, () => fetchSlots())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredSlots = filter === 'all' ? slots : slots.filter(s => s.type === filter);

  const handleBook = async () => {
    if (!user || !selectedSlot || !selectedVehicle || !bookingTime) return;

    if (profile?.status === 'suspended') {
      toast({ title: 'Account Suspended', description: 'Your account is suspended. You cannot book slots. Please contact admin.parking@nsbm.ac.lk', variant: 'destructive' });
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) return;

    const fee = PARKING_FEES[vehicle.type as keyof typeof PARKING_FEES];
    if (wallet < 300) {
      toast({ title: 'Insufficient Balance', description: `Minimum wallet balance of LKR 300 required to book. Please top up.`, variant: 'destructive' });
      return;
    }

    const bookingDate = new Date(bookingTime);
    const now = new Date();
    const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24 || diffHours < 0) {
      toast({ title: 'Invalid Time', description: 'Booking must be within the next 24 hours.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      slot_id: selectedSlot.id,
      vehicle_id: selectedVehicle,
      booking_time: bookingDate.toISOString(),
      fee_lkr: fee,
      status: 'confirmed',
    });

    if (!error) {
      toast({ title: 'Slot Booked!', description: `Slot ${selectedSlot.slot_code} booked for ${bookingDate.toLocaleString()}` });
      setSelectedSlot(null);
      setSelectedVehicle('');
      setBookingTime('');
      fetchSlots();
    } else {
      const isUnavailable = error.message?.toLowerCase().includes('slot unavailable');
      toast({
        title: isUnavailable ? 'Slot Unavailable' : 'Error',
        description: isUnavailable
          ? 'This slot has already been booked by someone else. Please choose another.'
          : error.message,
        variant: 'destructive'
      });
      if (isUnavailable) {
        setSelectedSlot(null);
      }
      fetchSlots();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-bold">Parking Slots</h2>
            <p className="text-muted-foreground">Select a free slot to book</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Balance: <strong className="text-foreground">LKR {wallet}</strong></span>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="car">Cars</SelectItem>
                <SelectItem value="motorbike">Bikes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success" /> Free</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" /> Booked</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Arrived</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {filteredSlots.map(slot => (
            <button
              key={slot.id}
              onClick={() => slot.status === 'free' && setSelectedSlot(slot)}
              disabled={slot.status !== 'free'}
              className={cn(
                "p-2 rounded-lg border-2 text-center text-xs font-medium transition-all",
                slot.status === 'free' && "slot-free hover:scale-105 cursor-pointer",
                slot.status === 'booked' && "slot-booked cursor-not-allowed opacity-70",
                slot.status === 'arrived' && "slot-arrived cursor-not-allowed opacity-70",
                selectedSlot?.id === slot.id && "ring-2 ring-primary scale-105"
              )}
            >
              <ParkingCircle className="h-4 w-4 mx-auto mb-1" />
              {slot.slot_code}
            </button>
          ))}
        </div>

        {selectedSlot && (
          <Card className="animate-fade-in">
            <CardHeader><CardTitle>Book Slot {selectedSlot.slot_code}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger><SelectValue placeholder="Choose vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.type === selectedSlot.type).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number} ({v.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Booking Time</Label>
                <Input type="datetime-local" value={bookingTime} onChange={e => setBookingTime(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                Fee: <strong>LKR {PARKING_FEES[selectedSlot.type as keyof typeof PARKING_FEES]}</strong> (deducted at entry gate)
              </p>
              <div className="flex gap-2">
                <Button onClick={handleBook} disabled={loading || !selectedVehicle || !bookingTime}>
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedSlot(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
