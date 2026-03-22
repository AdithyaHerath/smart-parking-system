import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ParkingCircle, AlertTriangle, CalendarCheck, Car, ShieldAlert, Plus, Trash2, Unlock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SlotWithBooking {
  id: string;
  slot_code: string;
  status: string;
  type: string;
  plate_number?: string;
  student_name?: string;
  student_id_number?: string;
}

export default function SecurityDashboard() {
  const { toast } = useToast();
  const [slots, setSlots] = useState<SlotWithBooking[]>([]);
  const [stats, setStats] = useState({ active: 0, complaints: 0, free: 0, total: 0 });
  const [emergencyCode, setEmergencyCode] = useState('');
  const [emergencyType, setEmergencyType] = useState<string>('car');
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchAll = async () => {
    // Get all slots
    const { data: slotsData } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_code');

    // Get active bookings with vehicle info
    const { data: bookings } = await supabase
      .from('bookings')
      .select('slot_id, vehicle_id, status, vehicles!bookings_vehicle_id_fkey(plate_number, user_id), profiles:vehicles!bookings_vehicle_id_fkey(user_id)')
      .in('status', ['confirmed', 'arrived']);

    // Get vehicle details for active bookings
    const activeBookingMap = new Map<string, { plate: string; userId: string }>();
    if (bookings) {
      for (const b of bookings) {
        const vehicle = b.vehicles as any;
        if (vehicle) {
          activeBookingMap.set(b.slot_id, {
            plate: vehicle.plate_number,
            userId: vehicle.user_id,
          });
        }
      }
    }

    // Get profiles for users with active bookings
    const userIds = [...new Set([...activeBookingMap.values()].map(v => v.userId))];
    const profileMap = new Map<string, { name: string; student_id: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, student_id')
        .in('id', userIds);
      profiles?.forEach(p => profileMap.set(p.id, { name: p.name, student_id: p.student_id }));
    }

    const enrichedSlots: SlotWithBooking[] = (slotsData || []).map(s => {
      const booking = s.status !== 'free' ? activeBookingMap.get(s.id) : undefined;
      const profile = booking ? profileMap.get(booking.userId) : undefined;
      return {
        ...s,
        plate_number: booking?.plate,
        student_name: profile?.name,
        student_id_number: profile?.student_id,
      };
    });

    setSlots(enrichedSlots);

    const { count: complaintsCount } = await supabase
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const freeCount = enrichedSlots.filter(s => s.status === 'free').length;
    const activeCount = enrichedSlots.filter(s => s.status !== 'free').length;

    setStats({
      active: activeCount,
      complaints: complaintsCount || 0,
      free: freeCount,
      total: enrichedSlots.length,
    });
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel('security-slots-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateEmergencySlot = async () => {
    if (!emergencyCode.trim()) return;
    setCreating(true);
    const code = `TEMP-${emergencyCode.trim().toUpperCase()}`;
    const { error } = await supabase.from('parking_slots').insert({
      slot_code: code,
      type: emergencyType as any,
      status: 'free' as any,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Emergency Slot Created', description: `Slot ${code} is now available` });
      setEmergencyCode('');
      setEmergencyOpen(false);
      fetchAll();
    }
    setCreating(false);
  };

  const handleDeleteEmergencySlot = async (slotId: string, slotCode: string) => {
    const { error } = await supabase.from('parking_slots').delete().eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Slot Removed', description: `${slotCode} has been removed` });
      fetchAll();
    }
  };

  const handleFreeSlot = async (slotId: string, slotCode: string) => {
    // Cancel active bookings for this slot — trigger should free slot when booking exists
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' as any })
      .eq('slot_id', slotId)
      .in('status', ['confirmed', 'arrived']);

    // Fallback: directly free slot in case booking record is missing/orphaned
    const { error: slotError } = await supabase
      .from('parking_slots')
      .update({ status: 'free' as any })
      .eq('id', slotId);

    if (bookingError || slotError) {
      toast({ title: 'Error', description: (bookingError || slotError)?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Slot Freed', description: `${slotCode} is now free` });
      fetchAll();
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Security Dashboard</h2>
          <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                Emergency Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Temporary Emergency Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Slot Code Suffix</Label>
                  <Input
                    placeholder="e.g. E01"
                    value={emergencyCode}
                    onChange={e => setEmergencyCode(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground">Will be created as TEMP-{emergencyCode || '___'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Slot Type</Label>
                  <Select value={emergencyType} onValueChange={setEmergencyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="motorbike">Motorbike</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateEmergencySlot} disabled={creating || !emergencyCode.trim()} className="w-full">
                  {creating ? 'Creating...' : 'Create Slot'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Slots</CardTitle>
              <ParkingCircle className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold">{stats.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Free Slots</CardTitle>
              <ParkingCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold text-success">{stats.free}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Occupied Slots</CardTitle>
              <CalendarCheck className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold text-warning">{stats.active}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending Complaints</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold text-destructive">{stats.complaints}</p></CardContent>
          </Card>
        </div>

        {/* Live Slot Map */}
        <Card>
          <CardHeader>
            <CardTitle>Live Parking Slot Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-success" /> Free</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-warning" /> Booked</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" /> Arrived</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {slots.map(s => (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-2.5 rounded-lg border text-center text-xs font-medium cursor-default transition-all hover:shadow-md",
                      s.status === 'free' && "slot-free",
                      s.status === 'booked' && "slot-booked",
                      s.status === 'arrived' && "slot-arrived"
                    )}>
                      <ParkingCircle className="h-4 w-4 mx-auto mb-1" />
                      <p className="font-bold">{s.slot_code}</p>
                      {s.plate_number && (
                        <p className="text-[10px] mt-0.5 truncate opacity-80">{s.plate_number}</p>
                      )}
                      {s.status !== 'free' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 mt-1 text-success hover:text-success" onClick={e => e.stopPropagation()}>
                              <Unlock className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Free {s.slot_code}?</AlertDialogTitle>
                              <AlertDialogDescription>This will cancel the active booking and make the slot available.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleFreeSlot(s.id, s.slot_code)}>Free Slot</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {s.slot_code.startsWith('TEMP-') && s.status === 'free' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 mt-1 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {s.slot_code}?</AlertDialogTitle>
                              <AlertDialogDescription>This emergency slot will be permanently removed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEmergencySlot(s.id, s.slot_code)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TooltipTrigger>
                  {(s.status !== 'free' && s.plate_number) && (
                    <TooltipContent side="top" className="text-xs space-y-1">
                      <p className="font-bold">{s.plate_number}</p>
                      <p>{s.student_name}</p>
                      <p className="text-muted-foreground">{s.student_id_number}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
