import React, { useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { AuthContext, type AuthContextType } from './authContextDef';

export { type AuthContextType } from './authContextDef';

/**
 * Translates Supabase authentication errors into friendly, human-readable messages.
 * Prevents exposing internal database details while giving actionable guidance.
 */
function humanizeAuthError(err: AuthError | Error | null): string {
  if (!err) return '';
  const message = err.message || '';
  
  if (message.includes('Invalid login credentials') || message.includes('invalid_grant')) {
    return 'Incorrect email or password. Please double-check your credentials and try again.';
  }
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (message.includes('rate limit') || message.includes('Too many requests')) {
    return 'Too many login attempts. Please wait a few moments and try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in, or check your spam folder.';
  }
  if (message.includes('Network') || message.includes('fetch')) {
    return 'Unable to connect to the authentication server. Please check your internet connection.';
  }
  return message || 'An unexpected authentication error occurred. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('[DocuSaathi Auth] Could not fetch profile:', profileErr.message);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.warn('[DocuSaathi Auth] Exception fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: ensure loading state never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    // 1. Fetch initial session
    try {
      supabase.auth.getSession().then(({ data: { session: initialSession }, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) {
          console.warn('[DocuSaathi Auth] Session check error:', sessionError.message);
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          fetchProfile(initialSession.user.id);
        }
        setLoading(false);
      }).catch((err) => {
        if (!mounted) return;
        console.warn('[DocuSaathi Auth] Unexpected session error:', err);
        setLoading(false);
      });
    } catch (err) {
      console.warn('[DocuSaathi Auth] Exception invoking getSession:', err);
      setLoading(false);
    }

    // 2. Subscribe to auth state changes (login, logout, token refresh, password recovery)
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const authSub = supabase.auth.onAuthStateChange(
        async (_event, currentSession) => {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setError(null);

          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      );
      subscription = authSub?.data?.subscription ?? null;
    } catch (err) {
      console.warn('[DocuSaathi Auth] Exception in onAuthStateChange:', err);
    }

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        const friendlyMessage = humanizeAuthError(signInErr);
        setError(friendlyMessage);
        return { error: new Error(friendlyMessage), session: null };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return { error: null, session: data.session };
    } catch (err: any) {
      const friendlyMessage = humanizeAuthError(err);
      setError(friendlyMessage);
      return { error: new Error(friendlyMessage), session: null };
    }
  };

  const signUp = async ({ name, email, password }: { name: string; email: string; password: string }) => {
    setError(null);
    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim();

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
          },
        },
      });

      if (signUpErr) {
        const friendlyMessage = humanizeAuthError(signUpErr);
        setError(friendlyMessage);
        return { error: new Error(friendlyMessage), user: null, session: null };
      }

      setSession(data.session);
      setUser(data.user);

      // If user is immediately signed in, ensure the profile record exists
      if (data.user) {
        const profilePayload = {
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
          preferred_language: 'English',
        };

        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(profilePayload as any);

        if (upsertErr) {
          console.warn('[DocuSaathi Auth] Profile upsert note:', upsertErr.message);
        }

        await fetchProfile(data.user.id);
      }

      return { error: null, user: data.user, session: data.session };
    } catch (err: any) {
      const friendlyMessage = humanizeAuthError(err);
      setError(friendlyMessage);
      return { error: new Error(friendlyMessage), user: null, session: null };
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) {
        const friendlyMessage = humanizeAuthError(signOutErr);
        setError(friendlyMessage);
        return { error: new Error(friendlyMessage) };
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (err: any) {
      const friendlyMessage = humanizeAuthError(err);
      setError(friendlyMessage);
      return { error: new Error(friendlyMessage) };
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const cleanEmail = email.trim();
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (resetErr) {
        const friendlyMessage = humanizeAuthError(resetErr);
        setError(friendlyMessage);
        return { error: new Error(friendlyMessage) };
      }
      return { error: null };
    } catch (err: any) {
      const friendlyMessage = humanizeAuthError(err);
      setError(friendlyMessage);
      return { error: new Error(friendlyMessage) };
    }
  };

  const updatePassword = async (password: string) => {
    setError(null);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        const friendlyMessage = humanizeAuthError(updateErr);
        setError(friendlyMessage);
        return { error: new Error(friendlyMessage) };
      }
      return { error: null };
    } catch (err: any) {
      const friendlyMessage = humanizeAuthError(err);
      setError(friendlyMessage);
      return { error: new Error(friendlyMessage) };
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
