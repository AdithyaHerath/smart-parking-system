import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Ban, RefreshCw, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`student_id.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data } = await query;
    setUsers(data || []);
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `User ${newStatus}` }); fetchUsers(); }
  };

  const deleteUser = async (userId: string, userName: string) => {
    setDeleting(userId);
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Account Deleted', description: `${userName}'s account has been permanently removed` });
      fetchUsers();
    }
    setDeleting(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">User Management</h2>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, ID, or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="space-y-3">
          {users.map(u => (
            <Card key={u.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>{u.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.student_id} • {u.email}</p>
                  <p className="text-sm text-muted-foreground">{u.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant={u.status === 'active' ? 'destructive' : 'default'} size="sm" onClick={() => toggleStatus(u.id, u.status)}>
                    {u.status === 'active' ? <><Ban className="h-4 w-4 mr-1" />Suspend</> : <><RefreshCw className="h-4 w-4 mr-1" />Reactivate</>}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting === u.id}>
                        <Trash2 className="h-4 w-4 mr-1" />{deleting === u.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this account, including all bookings, vehicles, wallet, and transaction history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteUser(u.id, u.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
