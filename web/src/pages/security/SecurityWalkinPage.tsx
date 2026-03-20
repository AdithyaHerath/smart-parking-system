import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PARKING_FEES, WALKIN_SURCHARGE } from '@/lib/constants';
import { UserCheck, AlertCircle } from 'lucide-react';

export default function SecurityWalkinPage() {
  const { toast } = useToast();
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [lookupError, setLookupError] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [looking, setLooking] = useState(false);

  const lookupStudent = async () => {
    if (!studentIdInput.trim()) return;
    setLooking(true);
    setLookupError('');
    setStudentProfile(null);
    setVehicles([]);
    setSelectedVehicle('');
    setSelectedSlot('');

    const normalizedId = studentIdInput.trim().toUpperCase();

    // Find profile by student_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('student_id', normalizedId)
      .single();

    if (!profile) {
      setLookupError('No registered student found with this ID. Entry denied.');
      setLooking(false);
      return;
    }

    if (profile.status === 'suspended') {
      setLookupError('This student account is suspended. Entry denied.');
      setLooking(false);
      return;
    }

    setStudentProfile(profile);

    // Get vehicles and wallet
    const [vehRes, walletRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('user_id', profile.id),
      supabase.from('wallets').select('balance_lkr').eq('user_id', profile.id).single(),
    ]);

    setVehicles(vehRes.data || []);
    setWalletBalance(walletRes.data?.balance_lkr || 0);
    setLooking(false);
  };

  useEffect(() => {
    supabase.from('parking_slots').select('*').eq('status', 'free').order('slot_code')
      .then(({ data }) => setSlots(data || []));
  }, []);

  const selectedVehicleObj = vehicles.find(v => v.id === selectedVehicle);
  const fee = selectedVehicleObj
    ? PARKING_FEES[selectedVehicleObj.type as keyof typeof PARKING_FEES] + WALKIN_SURCHARGE
    : 0;

  const handleWalkin = async () => {
    if (!studentProfile || !selectedVehicle || !selectedSlot) return;
    setLoading(true);

    if (walletBalance < fee) {
      toast({ title: 'Insufficient Balance', description: `Student needs LKR ${fee} but only has LKR ${walletBalance}. Please top up first.`, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Re-check slot availability before inserting
    const { data: freshSlot } = await supabase
      .from('parking_slots')
      .select('status')
      .eq('id', selectedSlot)
      .maybeSingle();

    if (!freshSlot || freshSlot.status !== 'free') {
      toast({ title: 'Slot Unavailable', description: 'This slot has already been taken. Please select another slot.', variant: 'destructive' });
      const { data } = await supabase.from('parking_slots').select('*').eq('status', 'free').order('slot_code');
      setSlots(data || []);
      setSelectedSlot('');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      user_id: studentProfile.id,
      slot_id: selectedSlot,
      vehicle_id: selectedVehicle,
      booking_time: new Date().toISOString(),
      fee_lkr: fee,
      is_walkin: true,
      status: 'arrived',
    });

    if (!error) {
      await Promise.all([
        supabase.from('parking_slots').update({ status: 'arrived' }).eq('id', selectedSlot),
        supabase.from('wallets').update({ balance_lkr: walletBalance - fee }).eq('user_id', studentProfile.id),
        supabase.from('transactions').insert({
          user_id: studentProfile.id,
          amount_lkr: -fee,
          type: 'walkin_surcharge' as const,
          description: `Walk-in parking fee (LKR ${fee}) inc. surcharge`,
        }),
      ]);
      toast({ title: 'Slot Assigned', description: `${studentProfile.name} assigned to slot successfully` });
      setStudentProfile(null);
      setStudentIdInput('');
      setSelectedVehicle('');
      setSelectedSlot('');
      setLookupError('');
      const { data } = await supabase.from('parking_slots').select('*').eq('status', 'free').order('slot_code');
      setSlots(data || []);
    } else {
      // Provide meaningful error messages
      const msg = error.message.includes('Slot unavailable')
        ? 'This slot was just taken by someone else. Please choose another.'
        : error.message.includes('row-level security')
        ? 'Permission denied. Please ensure you are logged in as security staff.'
        : error.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      // Refresh slots on error
      const { data } = await supabase.from('parking_slots').select('*').eq('status', 'free').order('slot_code');
      setSlots(data || []);
      setSelectedSlot('');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Walk-in Slot Assignment</h2>

        <Card>
          <CardHeader><CardTitle>Find Student by ID</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Student ID (e.g. STU001)"
                value={studentIdInput}
                onChange={e => setStudentIdInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && lookupStudent()}
              />
              <Button onClick={lookupStudent} disabled={looking}>
                {looking ? 'Looking...' : 'Look Up'}
              </Button>
            </div>

            {lookupError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {lookupError}
              </div>
            )}

            {studentProfile && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-lg bg-secondary flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {studentProfile.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-bold">{studentProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{studentProfile.student_id} · {studentProfile.phone}</p>
                  </div>
                  <Badge variant="outline">LKR {walletBalance}</Badge>
                </div>

                {vehicles.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-3">
                    No vehicles registered for this student.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Vehicle</Label>
                      <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                        <SelectTrigger><SelectValue placeholder="Choose a vehicle" /></SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.plate_number} ({v.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Available Slot</Label>
                      <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                        <SelectTrigger><SelectValue placeholder="Choose a slot" /></SelectTrigger>
                        <SelectContent>
                          {slots.filter(s => {
                            if (!selectedVehicleObj) return true;
                            return s.type === selectedVehicleObj.type;
                          }).map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.slot_code} ({s.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedVehicle && (
                      <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                        <p>Parking Fee: <strong>LKR {PARKING_FEES[selectedVehicleObj?.type as keyof typeof PARKING_FEES] || 0}</strong></p>
                        <p>Walk-in Surcharge: <strong>LKR {WALKIN_SURCHARGE}</strong></p>
                        <p className="font-heading font-bold pt-1 border-t border-border">Total: LKR {fee}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleWalkin}
                      disabled={loading || !selectedVehicle || !selectedSlot}
                      className="w-full"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {loading ? 'Processing...' : 'Assign Slot & Deduct Fee'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
