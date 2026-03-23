import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/constants';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: any | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Defer profile/role fetch to avoid deadlock
          setTimeout(async () => {
            const [profileRes, roleRes] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', session.user.id).single(),
              supabase.from('user_roles').select('role').eq('user_id', session.user.id).single(),
            ]);
            setState({
              user: session.user,
              session,
              role: (roleRes.data?.role as AppRole) || 'student',
              profile: profileRes.data,
              loading: false,
            });
          }, 0);
        } else {
          setState({ user: null, session: null, role: null, profile: null, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
