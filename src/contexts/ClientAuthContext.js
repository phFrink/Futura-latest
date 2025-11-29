'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'futura-client-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

const ClientAuthContext = createContext();

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
};

export const ClientAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session and listen for auth changes
    const initializeAuth = async () => {
      let timeout;
      try {
        // Set a timeout to prevent loading from staying true indefinitely
        timeout = setTimeout(() => {
          console.warn('⚠️ Auth initialization timeout, enabling form');
          setLoading(false);
        }, 5000); // 5 second timeout

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
        } else if (session?.user) {
          // Check if user's account is still active
          console.log('🔍 Checking if restored session user is still active...');

          // First check user_metadata.status (undefined = active)
          const userMetadataStatus = session.user?.user_metadata?.status;

          if (userMetadataStatus === "inactive") {
            console.log("❌ Session user status is inactive - signing out");
            await supabase.auth.signOut();
            setUser(null);
          } else {
            // Fallback: check profiles table
            const { data: profileData } = await supabase
              .from("profiles")
              .select("status")
              .eq("id", session.user.id)
              .single();

            const profileStatus = profileData?.status;

            if (profileStatus === "inactive") {
              console.log("❌ Session user profile is inactive, signing out");
              await supabase.auth.signOut();
              setUser(null);
            } else {
              setUser(session.user);
              console.log('Session restored:', session.user.email);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            // Check if user is active when session is restored
            console.log('🔍 Verifying user status on token refresh...');

            // First check user_metadata.status (undefined = active)
            const userMetadataStatus = session.user?.user_metadata?.status;

            if (userMetadataStatus === "inactive") {
              console.log("❌ User status is inactive - signing out");
              await supabase.auth.signOut();
              setUser(null);
              toast.error('Your account has been deactivated');
            } else {
              // Fallback: check profiles table
              const { data: profileData } = await supabase
                .from("profiles")
                .select("status")
                .eq("id", session.user.id)
                .single();

              const profileStatus = profileData?.status;

              if (profileStatus === "inactive") {
                console.log("❌ User profile became inactive, signing out");
                await supabase.auth.signOut();
                setUser(null);
                toast.error('Your account has been deactivated');
              } else {
                setUser(session.user);
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signup = async (firstName, middleName = '', lastName, email, password, phone = '', address = '') => {
    try {
      // Call server-side API to create user with Admin API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          email,
          password,
          phone,
          address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      if (data.success) {
        // Now login the user with the credentials
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (loginError) throw loginError;

        if (loginData.user) {
          setUser(loginData.user);
          toast.success('Account created successfully!');
          return { data: loginData.user };
        }
      }

      return { data: data.user };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
      return { error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // First, check user_metadata.status - HIGHEST PRIORITY CHECK
      const userMetadataStatus = data.user?.user_metadata?.status;

      console.log("🔍 Checking user_metadata.status:", userMetadataStatus);

      // Only block login if status is explicitly "inactive" (undefined = active)
      if (userMetadataStatus === "inactive") {
        console.log("❌ Login denied: User status is inactive");
        await supabase.auth.signOut();

        const errorMessage = 'Your account has been deactivated. Please contact the administrator.';

        toast.error(errorMessage);
        return { error: errorMessage };
      }

      // Second, check if user's account is active/inactive in profiles table (fallback)
      console.log("🔍 Checking user status in profiles table...");
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .single();

      // Check user status from profiles table
      const profileStatus = profileData?.status;

      console.log("📊 User status check:", {
        userId: data.user.id,
        email: data.user.email,
        userMetadataStatus: userMetadataStatus,
        profileStatus: profileStatus,
        profileError: profileError?.message
      });

      // If profile status is inactive, deny login immediately
      if (profileStatus === "inactive") {
        console.log("❌ Login denied: Profile status is inactive");
        await supabase.auth.signOut();
        toast.error('Your account has been deactivated. Please contact the administrator.');
        return { error: 'Your account has been deactivated. Please contact the administrator.' };
      }

      setUser(data.user);
      toast.success('Login successful!');
      return { data: data.user };
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      return { error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) return { error: 'Not authenticated' };

      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...updates
        }
      });

      if (error) throw error;

      setUser(data.user);
      toast.success('Profile updated successfully');
      return { data: true };
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
      return { error: error.message };
    }
  };

  const value = {
    user,
    profile: user?.user_metadata || null,  // Profile is now from user_metadata
    loading,
    signup,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
};
