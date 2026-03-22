import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Plus } from 'lucide-react';

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [violationPlate, setViolationPlate] = useState('');
  const [violationType, setViolationType] = useState('');
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComplaints = async () => {
    if (!user) return;
    const { data } = await supabase.from('complaints').select('*').eq('reporter_id', user.id).order('created_at', { ascending: false });
    setComplaints(data || []);
  };

  useEffect(() => {
    fetchComplaints();
    if (user) {
      supabase.from('bookings').select('id, parking_slots(slot_code)').eq('user_id', user.id).in('status', ['confirmed', 'arrived'])
        .then(({ data }) => setBookings(data || []));
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !violationPlate || !violationType || !bookingId) return;
    if (violationType === 'other' && !description.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('complaints').insert({
      reporter_id: user.id,
      booking_id: bookingId,
      violation_plate: violationPlate.toUpperCase(),
      violation_type: violationType,
      description: violationType === 'park_on_my_spot' ? 'Parked on my spot' : description,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Complaint Submitted' });
      setShowForm(false);
      setViolationPlate('');
      setViolationType('');
      setDescription('');
      setBookingId('');
      fetchComplaints();
    }
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-warning text-warning-foreground',
    accepted: 'bg-success text-success-foreground',
    declined: 'bg-destructive text-destructive-foreground',
  };

  const violationLabel = (type: string) => {
    if (type === 'park_on_my_spot') return 'Park on My Spot';
    return 'Other';
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Complaints</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'New Complaint'}
          </Button>
        </div>

        {showForm && (
          <Card className="animate-fade-in">
            <CardHeader><CardTitle>Report a Violation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Booking</Label>
                <select className="w-full rounded-lg border bg-background p-2 text-sm" value={bookingId} onChange={e => setBookingId(e.target.value)}>
                  <option value="">Select booking</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>Slot {(b as any).parking_slots?.slot_code}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Violation Vehicle Plate Number</Label>
                <Input placeholder="e.g. ABC-1234" value={violationPlate} onChange={e => setViolationPlate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Violation Type</Label>
                <Select value={violationType} onValueChange={setViolationType}>
                  <SelectTrigger><SelectValue placeholder="Select violation type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="park_on_my_spot">Park on My Spot</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {violationType === 'other' && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the violation..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              )}
              <Button onClick={handleSubmit} disabled={loading || !violationType || !violationPlate || !bookingId || (violationType === 'other' && !description.trim())}>
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </CardContent>
          </Card>
        )}

        {complaints.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No complaints filed.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="font-medium">Plate: {c.violation_plate}</span>
                        <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Type: {violationLabel(c.violation_type)}</p>
                      {c.violation_type === 'other' && (
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
