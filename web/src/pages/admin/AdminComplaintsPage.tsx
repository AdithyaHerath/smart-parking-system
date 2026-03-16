import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: complaintsData } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (!complaintsData || complaintsData.length === 0) { setComplaints([]); return; }
      const reporterIds = [...new Set(complaintsData.map(c => c.reporter_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, name, student_id').in('id', reporterIds);
      const profileMap = new Map<string, any>();
      profiles?.forEach(p => profileMap.set(p.id, p));
      setComplaints(complaintsData.map(c => ({ ...c, profiles: profileMap.get(c.reporter_id) || null })));
    };
    fetch();
  }, []);

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
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">All Complaints</h2>
        {complaints.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No complaints.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => (
              <Card key={c.id}>
                <CardContent className="py-4 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">Violation: {c.violation_plate}</span>
                    <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
                    <Badge variant="secondary">{violationLabel(c.violation_type)}</Badge>
                  </div>
                  {c.violation_type === 'other' && (
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Reported by: {c.profiles?.name} ({c.profiles?.student_id}) • {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
