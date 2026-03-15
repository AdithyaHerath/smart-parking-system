import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ParkingCircle, AlertTriangle, User } from 'lucide-react';

export default function SecurityComplaintsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchComplaints = async () => {
    const { data: complaintsData } = await supabase.from('complaints')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!complaintsData || complaintsData.length === 0) {
      setComplaints([]);
      return;
    }

    // Get reporter profiles
    const reporterIds = [...new Set(complaintsData.map(c => c.reporter_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, name, student_id, phone').in('id', reporterIds);
    const profileMap = new Map<string, any>();
    profiles?.forEach(p => profileMap.set(p.id, p));

    // Get booking + slot info
    const bookingIds = [...new Set(complaintsData.map(c => c.booking_id))];
    const { data: bookings } = await supabase.from('bookings').select('id, slot_id, parking_slots!bookings_slot_id_fkey(slot_code)').in('id', bookingIds);
    const bookingMap = new Map<string, any>();
    bookings?.forEach(b => bookingMap.set(b.id, b));

    const enriched = complaintsData.map(c => ({
      ...c,
      profiles: profileMap.get(c.reporter_id) || null,
      bookings: bookingMap.get(c.booking_id) || null,
    }));
    setComplaints(enriched);
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleAction = async (complaint: any, action: 'accepted' | 'declined') => {
    if (!user) return;

    const { error } = await supabase.from('complaints').update({
      status: action,
      violation_type: complaint.violation_type,
    }).eq('id', complaint.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Log the action
    await supabase.from('complaint_actions').insert({
      complaint_id: complaint.id,
      acted_by: user.id,
      action,
      notes: notes[complaint.id] || '',
    });

    // If accepted and park_on_my_spot, try to reassign the reporter to the nearest free slot
    if (action === 'accepted' && complaint.violation_type === 'park_on_my_spot' && complaint.reporter_id) {
      const booking = complaint.bookings as any;
      if (booking?.slot_id) {
        const { data: originalSlot } = await supabase
          .from('parking_slots')
          .select('type')
          .eq('id', booking.slot_id)
          .single();

        if (originalSlot) {
          const { data: freeSlots } = await supabase
            .from('parking_slots')
            .select('*')
            .eq('status', 'free')
            .eq('type', originalSlot.type)
            .order('slot_code')
            .limit(1);

          if (freeSlots && freeSlots.length > 0) {
            const newSlot = freeSlots[0];
            await supabase.from('bookings')
              .update({ slot_id: newSlot.id })
              .eq('id', complaint.booking_id);
            await supabase.from('parking_slots')
              .update({ status: 'booked' })
              .eq('id', newSlot.id);

            toast({ title: 'Slot Reassigned', description: `Reporter reassigned to slot ${newSlot.slot_code}` });
          } else {
            toast({ title: 'No Free Slots', description: 'Could not find a free slot to reassign', variant: 'destructive' });
          }
        }
      }
    }

    toast({ title: `Complaint ${action}` });
    fetchComplaints();
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      default: return 'outline';
    }
  };

  const violationLabel = (type: string) => {
    if (type === 'park_on_my_spot') return 'Park on My Spot';
    return 'Other';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Complaint Review</h2>
        {complaints.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No complaints to review.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => {
              const reporter = c.profiles as any;
              const booking = c.bookings as any;
              const slotCode = booking?.parking_slots?.slot_code;

              return (
                <Card key={c.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-heading font-bold">Plate: {c.violation_plate}</span>
                      <Badge variant={statusVariant(c.status) as any} className="capitalize">
                        {c.status}
                      </Badge>
                      <Badge variant="secondary">{violationLabel(c.violation_type)}</Badge>
                    </div>

                    {c.violation_type === 'other' && (
                      <p className="text-sm">{c.description}</p>
                    )}
                    {c.violation_type === 'park_on_my_spot' && (
                      <p className="text-sm text-warning font-medium">⚠ Parked on reporter's spot — penalty will be applied if accepted</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Reported by: {reporter?.name} ({reporter?.student_id})
                      </div>
                      {reporter?.phone && (
                        <div className="flex items-center gap-1">
                          Phone: {reporter.phone}
                        </div>
                      )}
                      {slotCode && (
                        <div className="flex items-center gap-1">
                          <ParkingCircle className="h-3 w-3" />
                          Reported Slot: {slotCode}
                        </div>
                      )}
                      <div>
                        Filed: {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>

                    {c.status === 'pending' && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Textarea
                          placeholder="Verification notes (optional)..."
                          value={notes[c.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAction(c, 'accepted')} className="gap-1">
                            <CheckCircle className="h-4 w-4" />Accept
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(c, 'declined')} className="gap-1">
                            <XCircle className="h-4 w-4" />Decline
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
