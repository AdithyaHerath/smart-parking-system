import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';
import { MAX_VEHICLES } from '@/lib/constants';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone);
    }
    if (user) {
      supabase.from('vehicles').select('*').eq('user_id', user.id).then(({ data }) => {
        setVehicles(data || []);
      });
    }
  }, [profile, user]);

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ name, phone }).eq('id', user.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Profile Updated' });
    setLoading(false);
  };

  const addVehicle = async () => {
    if (!user || !newPlate || !newType) return;
    if (vehicles.length >= MAX_VEHICLES) {
      toast({ title: 'Limit Reached', description: `Maximum ${MAX_VEHICLES} vehicles allowed.`, variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('vehicles').insert({
      user_id: user.id,
      plate_number: newPlate.toUpperCase(),
      type: newType as 'car' | 'motorbike',
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Vehicle Added' });
      setNewPlate('');
      setNewType('');
      const { data } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
      setVehicles(data || []);
    }
  };

  const removeVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast({ title: 'Vehicle Removed' });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-heading font-bold">Profile</h2>

        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input value={profile?.student_id || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <Button onClick={updateProfile} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My Vehicles ({vehicles.length}/{MAX_VEHICLES})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="font-medium">{v.plate_number}</p>
                  <p className="text-sm text-muted-foreground capitalize">{v.type}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeVehicle(v.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {vehicles.length < MAX_VEHICLES && (
              <div className="flex gap-2">
                <Input placeholder="Plate number" value={newPlate} onChange={e => setNewPlate(e.target.value)} />
                <Select onValueChange={setNewType} value={newType}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="motorbike">Motorbike</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addVehicle}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
