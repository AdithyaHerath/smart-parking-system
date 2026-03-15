import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminPenaltiesPage() {
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc('get_admin_penalty_report');
      if (!error && data) {
        setPenalties(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Penalty Records</h2>
        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : penalties.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No penalties recorded.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Vehicle Plate</TableHead>
                      <TableHead className="text-center">Offense #</TableHead>
                      <TableHead className="text-center">Total Violations</TableHead>
                      <TableHead className="text-right">Penalty</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penalties.map(p => (
                      <TableRow key={p.penalty_id}>
                        <TableCell className="font-medium">{p.user_name}</TableCell>
                        <TableCell>{p.student_id}</TableCell>
                        <TableCell>{p.plate_number}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.offense_number >= 3 ? 'destructive' : 'default'}>
                            #{p.offense_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{String(p.violation_count)}</TableCell>
                        <TableCell className="text-right">
                          {p.offense_number >= 3 ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <span>LKR {p.amount_lkr}</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${p.current_balance < 0 ? 'text-destructive' : ''}`}>
                          LKR {p.current_balance}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
