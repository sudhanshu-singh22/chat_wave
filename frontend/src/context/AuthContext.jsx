import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { upsertUserProfile } from "../services/api";
import { connectSocket, disconnectSocket } from "../socket/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async (authUser, token) => {
    if (!authUser) return null;
    // Store token so axios interceptor can attach it to API calls
    if (token) localStorage.setItem("sb_token", token);
    try {
      const p = await upsertUserProfile({
        id: authUser.id,
        email: authUser.email,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email.split("@")[0],
        avatar_url: authUser.user_metadata?.avatar_url || null,
      });
      setProfile(p);
      connectSocket(authUser.id);
      return p;
    } catch (err) {
      console.error("syncUserProfile error:", err);
      return null;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await syncUserProfile(session.user, session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await syncUserProfile(session.user, session.access_token);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          localStorage.removeItem("sb_token");
          disconnectSocket();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const updateProfile = (updatedProfile) => { setProfile(updatedProfile); };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
