import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

export default function AdminSuspendedPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);

  const fetch = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'suspended');
    setUsers(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const reactivate = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Account Reactivated' }); fetch(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Suspended Accounts</h2>
        {users.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No suspended accounts.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.student_id} • {u.email}</p>
                  </div>
                  <Button size="sm" onClick={() => reactivate(u.id)}>
                    <RefreshCw className="h-4 w-4 mr-1" />Reactivate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
