import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

export default function AdminStaffPage() {
  const { toast } = useToast();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('security');
  const [loading, setLoading] = useState(false);

  const createStaff = async () => {
    if (!password || !name || !staffId) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('create-staff', {
      body: { password, name, role, staff_id: staffId },
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Staff Account Created', description: `${name} added as ${role}. Staff ID: ${staffId}` });
      setStaffId('');
      setPassword('');
      setName('');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Staff Management</h2>
        <Card>
          <CardHeader><CardTitle>Create Staff Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Silva" />
            </div>
            <div className="space-y-2">
              <Label>Staff ID</Label>
              <Input value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="e.g. SEC001" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="security">Security Personnel</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createStaff} disabled={loading || !name || !staffId || !password} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
