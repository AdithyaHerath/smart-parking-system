import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Car, User, Phone, CreditCard, ParkingCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  plate_number: string;
  type: string;
  profile: { name: string; student_id: string; phone: string; email: string } | null;
  booking: { slot_code: string; status: string; booking_time: string } | null;
}

export default function AdminSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('plate_number', `%${query.trim()}%`);

    if (!vehicles || vehicles.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(vehicles.map(v => v.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, student_id, phone, email')
      .in('id', userIds);

    const profileMap = new Map<string, any>();
    profiles?.forEach(p => profileMap.set(p.id, p));

    const vehicleIds = vehicles.map(v => v.id);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('vehicle_id, status, booking_time, parking_slots!bookings_slot_id_fkey(slot_code)')
      .in('vehicle_id', vehicleIds)
      .in('status', ['confirmed', 'arrived'])
      .order('created_at', { ascending: false });

    const bookingMap = new Map<string, any>();
    bookings?.forEach(b => {
      if (!bookingMap.has(b.vehicle_id)) {
        bookingMap.set(b.vehicle_id, b);
      }
    });

    const enriched: SearchResult[] = vehicles.map(v => {
      const b = bookingMap.get(v.id);
      const slot = b?.parking_slots as any;
      return {
        id: v.id,
        plate_number: v.plate_number,
        type: v.type,
        profile: profileMap.get(v.user_id) || null,
        booking: b ? {
          slot_code: slot?.slot_code || 'N/A',
          status: b.status,
          booking_time: b.booking_time,
        } : null,
      };
    });

    setResults(enriched);
    setLoading(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'default';
      case 'confirmed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Search Vehicle</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 uppercase"
              placeholder="Enter plate number..."
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {results.map(r => (
          <Card key={r.id} className="overflow-hidden">
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-bold text-lg">{r.plate_number}</p>
                    <Badge variant="outline" className="capitalize">{r.type}</Badge>
                    {r.booking && (
                      <Badge variant={statusColor(r.booking.status) as any} className="capitalize">
                        {r.booking.status}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Name:</strong> {r.profile?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Student ID:</strong> {r.profile?.student_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Phone:</strong> {r.profile?.phone || 'N/A'}</span>
                    </div>
                    {r.booking && (
                      <div className="flex items-center gap-2">
                        <ParkingCircle className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Slot:</strong> {r.booking.slot_code}</span>
                      </div>
                    )}
                  </div>

                  {!r.booking && (
                    <p className="text-xs text-muted-foreground italic">No active booking</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {results.length === 0 && searched && !loading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No vehicles found matching "{query}".
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
