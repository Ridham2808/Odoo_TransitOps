// lib/userContext.js
// React context that shares the authenticated user + role across
// the dashboard shell (Sidebar, Topbar, page components).
// Populated once in app/(dashboard)/layout.js via Supabase session.

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS } from "@/lib/permissions";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const role        = user?.user_metadata?.role ?? null;
  const name        = user?.user_metadata?.name ?? user?.email ?? "";
  const email       = user?.email ?? "";
  const permissions = PERMISSIONS[role] ?? {};

  return (
    <UserContext.Provider value={{ user, role, name, email, permissions, loading }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook — use inside any dashboard Client Component.
 * @returns {{ user, role, name, email, permissions, loading }}
 */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
