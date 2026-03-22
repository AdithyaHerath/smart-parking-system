import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, Users, CalendarIcon, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CashierDashboard() {
  const [stats, setStats] = useState({ todayTopups: 0, totalAmount: 0 });
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [generating, setGenerating] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase.rpc('get_cashier_topup_stats', {
      _since: today.toISOString(),
    });

    if (error) return;

    const statsRow = Array.isArray(data) ? data[0] : data;
    setStats({
      todayTopups: Number(statsRow?.today_topups || 0),
      totalAmount: Number(statsRow?.total_amount || 0),
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [location.key, fetchStats]);

  useEffect(() => {
    const onFocus = () => fetchStats();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStats]);

  const generateReport = async () => {
    if (!reportDate) return;
    setGenerating(true);

    try {
      const dateStr = format(reportDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.rpc('get_cashier_topup_report', {
        _date: dateStr,
      });

      if (error) throw error;

      const rows = (data || []) as Array<{
        user_name: string;
        student_id: string;
        amount_lkr: number;
        created_at: string;
      }>;

      if (rows.length === 0) {
        toast({ title: 'No Data', description: `No top-ups found for ${format(reportDate, 'PPP')}`, variant: 'destructive' });
        setGenerating(false);
        return;
      }

      const totalSum = rows.reduce((s, r) => s + Number(r.amount_lkr), 0);

      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text('Revenue Report', 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Date: ${format(reportDate, 'PPP')}`, 14, 28);
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 34);

      // Table
      autoTable(doc, {
        startY: 42,
        head: [['#', 'Student ID', 'User Name', 'Top-Up Amount (LKR)', 'Time']],
        body: rows.map((r, i) => [
          i + 1,
          r.student_id,
          r.user_name,
          `LKR ${Number(r.amount_lkr).toLocaleString()}`,
          format(new Date(r.created_at), 'hh:mm a'),
        ]),
        foot: [['', '', 'Total', `LKR ${totalSum.toLocaleString()}`, '']],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        footStyles: { fillColor: [236, 240, 241], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10 },
      });

      doc.save(`Revenue_Report_${dateStr}.pdf`);
      toast({ title: 'Report Generated', description: `PDF downloaded for ${format(reportDate, 'PPP')}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setGenerating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Cashier Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today's Top-ups</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold">{stats.todayTopups}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Collected</CardTitle>
              <DollarSign className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent><p className="text-2xl font-heading font-bold">LKR {stats.totalAmount}</p></CardContent>
          </Card>
        </div>

        {/* Revenue Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Revenue Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Select Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !reportDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportDate ? format(reportDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reportDate}
                      onSelect={(d) => d && setReportDate(d)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={generateReport} disabled={generating}>
                <FileDown className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
