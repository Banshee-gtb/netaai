import { useEffect } from 'react';
import { useAuth } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading } = useAuth();

  useEffect(() => {
    let mounted = true;

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        try {
          // Ensure user profile exists (important for OAuth users)
          await ensureUserProfile(session.user);
          login(authService.mapUser(session.user));
        } catch (error) {
          console.error('Failed to setup user profile:', error);
          // Still login but log the error
          login(authService.mapUser(session.user));
        }
      }
      if (mounted) setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Ensure user profile exists for new OAuth users
            await ensureUserProfile(session.user);
            login(authService.mapUser(session.user));
          } catch (error) {
            console.error('Failed to setup user profile:', error);
            login(authService.mapUser(session.user));
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          logout();
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          login(authService.mapUser(session.user));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading]);

  return <>{children}</>;
}

// Ensure user profile exists in database (handles OAuth users)
async function ensureUserProfile(user: User) {
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  // Profile already exists
  if (profile) return;

  // Create profile for new user (shouldn't be needed with triggers, but safety net)
  if (fetchError?.code === 'PGRST116') {
    const username = user.user_metadata?.username || 
                    user.user_metadata?.full_name || 
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] || 
                    'User';

    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email!,
        username,
      });

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      throw insertError;
    }
  }
}
