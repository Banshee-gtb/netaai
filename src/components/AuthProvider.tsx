import { useEffect, useState } from 'react';
import { useAuth } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading } = useAuth();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        login(authService.mapUser(session.user));
      }
      setLoading(false);
      setInitialCheckDone(true);
    }).catch((error) => {
      console.error('Session check error:', error);
      if (mounted) {
        setLoading(false);
        setInitialCheckDone(true);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted || !initialCheckDone) return;
        
        console.log('Auth state change:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          login(authService.mapUser(session.user));
        } else if (event === 'SIGNED_OUT') {
          logout();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          login(authService.mapUser(session.user));
        } else if (event === 'USER_UPDATED' && session?.user) {
          login(authService.mapUser(session.user));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading, initialCheckDone]);

  return <>{children}</>;
}
