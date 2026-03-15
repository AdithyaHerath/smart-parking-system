import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, ParkingCircle, AlertTriangle, DollarSign, Ban, CalendarCheck, Unlock, CalendarIcon, FileDown, Car, Bike, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SlotWithBooking {
  id: string;
  slot_code: string;
  status: string;
  type: string;
  plate_number?: string;
  student_name?: string;
}

interface RevenueBreakdown {
  parking_fee: number;
  penalty: number;
  walkin_surcharge: number;
  total: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ users: 0, activeBookings: 0, complaints: 0, suspended: 0, slots: 0 });
  const [revenue, setRevenue] = useState<RevenueBreakdown>({ parking_fee: 0, penalty: 0, walkin_surcharge: 0, total: 0 });
  const [slots, setSlots] = useState<SlotWithBooking[]>([]);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [reportDate, setReportDate] = useState<Date>();
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchAll = async () => {
    const [usersRes, bookingsRes, complaintsRes, suspendedRes, slotsRes, revenueRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'arrived']),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
      supabase.from('parking_slots').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount_lkr, type').in('type', ['parking_fee', 'penalty', 'walkin_surcharge']),
    ]);

    const breakdown: RevenueBreakdown = { parking_fee: 0, penalty: 0, walkin_surcharge: 0, total: 0 };
    (revenueRes.data || []).forEach((t: any) => {
      const amt = Math.abs(t.amount_lkr);
      if (t.type === 'parking_fee') breakdown.parking_fee += amt;
      else if (t.type === 'penalty') breakdown.penalty += amt;
      else if (t.type === 'walkin_surcharge') breakdown.walkin_surcharge += amt;
      breakdown.total += amt;
    });
    setRevenue(breakdown);

    setStats({
      users: usersRes.count || 0,
      activeBookings: bookingsRes.count || 0,
      complaints: complaintsRes.count || 0,
      suspended: suspendedRes.count || 0,
      slots: slotsRes.count || 0,
    });

    const { data: allSlots } = await supabase.from('parking_slots').select('*').order('slot_code');
    const { data: activeBookings } = await supabase.from('bookings').select('slot_id, vehicle_id, status').in('status', ['confirmed', 'arrived']);

    if (activeBookings && activeBookings.length > 0) {
      const vehicleIds = [...new Set(activeBookings.filter(b => b.vehicle_id).map(b => b.vehicle_id))];
      const { data: vehicles } = vehicleIds.length > 0
        ? await supabase.from('vehicles').select('id, plate_number, user_id').in('id', vehicleIds)
        : { data: [] };

      const userIds = [...new Set((vehicles || []).map(v => v.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, name').in('id', userIds)
        : { data: [] };

      const vehicleMap = new Map<string, any>();
      vehicles?.forEach(v => vehicleMap.set(v.id, v));
      const profileMap = new Map<string, string>();
      profiles?.forEach(p => profileMap.set(p.id, p.name));

      const bookingBySlot = new Map<string, any>();
      activeBookings.forEach(b => bookingBySlot.set(b.slot_id, b));

      const enriched: SlotWithBooking[] = (allSlots || []).map(s => {
        const booking = bookingBySlot.get(s.id);
        const vehicle = booking?.vehicle_id ? vehicleMap.get(booking.vehicle_id) : null;
        return {
          ...s,
          plate_number: vehicle?.plate_number || (booking && !booking.vehicle_id ? 'EPSS' : undefined),
          student_name: vehicle ? profileMap.get(vehicle.user_id) : (booking && !booking.vehicle_id ? 'Emergency Assignment' : undefined),
        };
      });
      setSlots(enriched);
    } else {
      setSlots((allSlots || []).map(s => ({ ...s })));
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleFreeSlot = async (slotId: string, slotCode: string) => {
    // Cancel active bookings for this slot — the trigger will free the slot
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' as any })
      .eq('slot_id', slotId)
      .in('status', ['confirmed', 'arrived']);

    // Also directly set slot to free as fallback (handles orphaned slot states)
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

  const fetchReport = async (date: Date) => {
    setReportLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase.rpc('get_admin_revenue_report', { _date: dateStr });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setReportData(data || []);
    }
    setReportLoading(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setReportDate(date);
    if (date) fetchReport(date);
  };

  const typeLabel = (type: string) => {
    if (type === 'parking_fee') return 'Parking Fee';
    if (type === 'penalty') return 'Penalty';
    if (type === 'walkin_surcharge') return 'Walk-in Surcharge';
    return type;
  };

  const generatePDF = () => {
    if (!reportDate || reportData.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Revenue Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${format(reportDate, 'PPP')}`, 14, 28);

    const parkingTotal = reportData.filter(r => r.type === 'parking_fee').reduce((s: number, r: any) => s + Math.abs(r.amount_lkr), 0);
    const penaltyTotal = reportData.filter(r => r.type === 'penalty').reduce((s: number, r: any) => s + Math.abs(r.amount_lkr), 0);
    const surchargeTotal = reportData.filter(r => r.type === 'walkin_surcharge').reduce((s: number, r: any) => s + Math.abs(r.amount_lkr), 0);
    const grandTotal = parkingTotal + penaltyTotal + surchargeTotal;

    doc.text(`Parking Fees: LKR ${parkingTotal}  |  Penalties: LKR ${penaltyTotal}  |  Walk-in Surcharges: LKR ${surchargeTotal}  |  Total: LKR ${grandTotal}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [['Time', 'Student', 'ID', 'Category', 'Amount (LKR)', 'Description']],
      body: reportData.map(r => [
        new Date(r.created_at).toLocaleTimeString(),
        r.user_name,
        r.student_id,
        typeLabel(r.type),
        Math.abs(r.amount_lkr),
        r.description || '-',
      ]),
    });

    doc.save(`revenue-report-${format(reportDate, 'yyyy-MM-dd')}.pdf`);
  };

  const cards = [
    { title: 'Total Users', value: stats.users, icon: <Users className="h-5 w-5" />, color: 'text-primary' },
    { title: 'Active Bookings', value: stats.activeBookings, icon: <CalendarCheck className="h-5 w-5" />, color: 'text-success' },
    { title: 'Pending Complaints', value: stats.complaints, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-warning' },
    { title: 'Suspended Accounts', value: stats.suspended, icon: <Ban className="h-5 w-5" />, color: 'text-destructive' },
    { title: 'Total Slots', value: stats.slots, icon: <ParkingCircle className="h-5 w-5" />, color: 'text-info' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-heading font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <span className={card.color}>{card.icon}</span>
              </CardHeader>
              <CardContent><p className="text-2xl font-heading font-bold">{card.value}</p></CardContent>
            </Card>
          ))}

          {/* Revenue Card - clickable */}
          <Dialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  <span className="text-success"><DollarSign className="h-5 w-5" /></span>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-heading font-bold">LKR {revenue.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click for breakdown & reports</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-heading">Revenue Details</DialogTitle>
              </DialogHeader>

              {/* All-time breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-4 text-center">
                    <Car className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Parking Fees</p>
                    <p className="text-lg font-heading font-bold">LKR {revenue.parking_fee}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-destructive" />
                    <p className="text-xs text-muted-foreground">Penalties</p>
                    <p className="text-lg font-heading font-bold">LKR {revenue.penalty}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <Bike className="h-5 w-5 mx-auto mb-1 text-warning" />
                    <p className="text-xs text-muted-foreground">Walk-in Surcharges</p>
                    <p className="text-lg font-heading font-bold">LKR {revenue.walkin_surcharge}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Date picker for report */}
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">Generate Report by Date</p>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal", !reportDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reportDate ? format(reportDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={reportDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button onClick={generatePDF} disabled={!reportDate || reportData.length === 0} className="gap-2">
                    <FileDown className="h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </div>

              {/* Report results */}
              {reportLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
              {!reportLoading && reportDate && reportData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue transactions on this date.</p>
              )}
              {!reportLoading && reportData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium px-1">
                    <span>Transactions for {format(reportDate!, 'PPP')}</span>
                    <span className="text-success font-bold">
                      Total: LKR {reportData.reduce((s: number, r: any) => s + Math.abs(r.amount_lkr), 0)}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="py-2 px-3 text-left">Time</th>
                          <th className="py-2 px-3 text-left">Student</th>
                          <th className="py-2 px-3 text-left">Category</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((r: any) => (
                          <tr key={r.transaction_id} className="border-t">
                            <td className="py-2 px-3 text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</td>
                            <td className="py-2 px-3">{r.user_name} <span className="text-muted-foreground text-xs">({r.student_id})</span></td>
                            <td className="py-2 px-3">
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                r.type === 'parking_fee' && "bg-primary/10 text-primary",
                                r.type === 'penalty' && "bg-destructive/10 text-destructive",
                                r.type === 'walkin_surcharge' && "bg-warning/10 text-warning"
                              )}>
                                {typeLabel(r.type)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-medium">LKR {Math.abs(r.amount_lkr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Slot Map */}
        <Card>
          <CardHeader>
            <CardTitle>Parking Slot Overview</CardTitle>
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
                      "p-2.5 rounded-lg border text-center text-xs font-medium transition-all hover:shadow-md",
                      s.status === 'free' && "slot-free cursor-default",
                      s.status === 'booked' && "slot-booked cursor-pointer",
                      s.status === 'arrived' && "slot-arrived cursor-pointer"
                    )}>
                      <ParkingCircle className="h-4 w-4 mx-auto mb-1" />
                      <p className="font-bold">{s.slot_code}</p>
                      {s.plate_number && (
                        <p className="text-[10px] mt-0.5 truncate opacity-80">{s.plate_number}</p>
                      )}
                    </div>
                  </TooltipTrigger>
                  {s.status !== 'free' && (
                    <TooltipContent side="top" className="text-xs space-y-2">
                      {s.plate_number && <p className="font-bold">{s.plate_number}</p>}
                      {s.student_name && <p>{s.student_name}</p>}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full gap-1 text-xs h-7"
                        onClick={() => handleFreeSlot(s.id, s.slot_code)}
                      >
                        <Unlock className="h-3 w-3" /> Free Slot
                      </Button>
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
