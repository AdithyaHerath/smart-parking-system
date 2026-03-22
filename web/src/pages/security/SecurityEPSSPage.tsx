import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ParkingCircle } from 'lucide-react';

export default function SecurityEPSSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [freeSlots, setFreeSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);

  const fetchFreeSlots = async () => {
    const { data } = await supabase
      .from('parking_slots')
      .select('*')
      .eq('status', 'free')
      .order('slot_code');
    setFreeSlots(data || []);
  };

  const fetchRecent = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, slot_id, booking_time, created_at, parking_slots!bookings_slot_id_fkey(slot_code, type)')
      .eq('is_walkin', true)
      .eq('fee_lkr', 0)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentAssignments(data || []);
  };

  useEffect(() => {
    fetchFreeSlots();
    fetchRecent();
  }, []);

  const handleAssign = async () => {
    if (!user || !selectedSlot || !studentId.trim()) return;
    setLoading(true);

    // Find the student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('student_id', studentId.trim())
      .single();

    if (!profile) {
      toast({ title: 'Student Not Found', description: 'No student found with that ID', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Create EPSS booking — no vehicle, no charge
    const { error } = await supabase.from('bookings').insert({
      user_id: profile.id,
      slot_id: selectedSlot,
      vehicle_id: null,
      booking_time: new Date().toISOString(),
      fee_lkr: 0,
      is_walkin: true,
      status: 'arrived' as any,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'EPSS Assignment Complete', description: 'Emergency slot assigned — no charge applied' });
      setSelectedSlot('');
      setStudentId('');
      fetchFreeSlots();
      fetchRecent();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-warning" />
          <h2 className="text-2xl font-heading font-bold">Emergency Parking Spot Assign (EPSS)</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assign Emergency Slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign a temporary parking slot when a user's spot is occupied. No charge will be applied.
            </p>
            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input
                placeholder="Enter student ID"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Select Parking Slot</Label>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger><SelectValue placeholder="Choose a free slot" /></SelectTrigger>
                <SelectContent>
                  {freeSlots.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.slot_code} ({s.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={loading || !selectedSlot || !studentId.trim()} className="w-full gap-2">
              <ParkingCircle className="h-4 w-4" />
              {loading ? 'Assigning...' : 'Assign Emergency Slot (Free)'}
            </Button>
          </CardContent>
        </Card>

        {recentAssignments.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recent EPSS Assignments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentAssignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <ParkingCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{(a as any).parking_slots?.slot_code}</span>
                      <Badge variant="secondary">{(a as any).parking_slots?.type}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
