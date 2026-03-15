import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ParkingCircle, Plus, Trash2 } from 'lucide-react';

export default function AdminSlotsPage() {
  const { toast } = useToast();
  const [slots, setSlots] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<string>('car');

  const fetchSlots = async () => {
    const { data } = await supabase.from('parking_slots').select('*').order('slot_code');
    setSlots(data || []);
  };

  useEffect(() => { fetchSlots(); }, []);

  const addSlot = async () => {
    if (!newCode) return;
    const { error } = await supabase.from('parking_slots').insert({ slot_code: newCode.toUpperCase(), type: newType as 'car' | 'motorbike' });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Slot Added' }); setNewCode(''); fetchSlots(); }
  };

  const deleteSlot = async (slotId: string, slotCode: string, status: string) => {
    if (status !== 'free') {
      // Cancel active bookings first, then free the slot
      await supabase.from('bookings').update({ status: 'cancelled' as any }).eq('slot_id', slotId).in('status', ['confirmed', 'arrived']);
      await supabase.from('parking_slots').update({ status: 'free' as any }).eq('id', slotId);
    }
    const { error } = await supabase.from('parking_slots').delete().eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Slot Deleted', description: `${slotCode} has been removed from the system` });
      fetchSlots();
    }
  };

  const carSlots = slots.filter(s => s.type === 'car');
  const bikeSlots = slots.filter(s => s.type === 'motorbike');

  const SlotGrid = ({ items }: { items: any[] }) => (
    <div className="grid grid-cols-5 gap-2">
      {items.map(s => (
        <div key={s.id} className={cn(
          "p-2 rounded-lg border text-center text-xs font-medium relative group",
          s.status === 'free' && "slot-free",
          s.status === 'booked' && "slot-booked",
          s.status === 'arrived' && "slot-arrived"
        )}>
          <ParkingCircle className="h-3 w-3 mx-auto mb-0.5" />
          {s.slot_code}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {s.slot_code}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this parking slot from the system.
                  {s.status !== 'free' && ' The active booking on this slot will be cancelled.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteSlot(s.id, s.slot_code, s.status)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Parking Slot Management</h2>

        <Card>
          <CardHeader><CardTitle>Add New Slot</CardTitle></CardHeader>
          <CardContent className="flex gap-2 items-end">
            <div className="space-y-2">
              <Label>Slot Code</Label>
              <Input placeholder="e.g. C31" value={newCode} onChange={e => setNewCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="motorbike">Motorbike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addSlot}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Car Slots ({carSlots.length})</CardTitle></CardHeader>
            <CardContent><SlotGrid items={carSlots} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Motorbike Slots ({bikeSlots.length})</CardTitle></CardHeader>
            <CardContent><SlotGrid items={bikeSlots} /></CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
