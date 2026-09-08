import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Home, LogOut, Search, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: uid, _role: "admin" })
      .then(({ data }) => setIsAdmin(data === true));
  }, [session?.user?.id]);


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Home className="h-6 w-6 text-[color:var(--brand)]" />
            <span>Homely</span>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link to="/search" search={{ listing: "sale" }} className="text-foreground/80 hover:text-foreground">
              Buy
            </Link>
            <Link to="/search" search={{ listing: "rent" }} className="text-foreground/80 hover:text-foreground">
              Rent
            </Link>
            <Link to="/search" search={{}} className="text-foreground/80 hover:text-foreground">
              All homes
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/search"
            search={{}}
            className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent md:inline-flex"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
          <Link
            to="/favorites"
            className="inline-flex items-center gap-1 rounded-md p-2 text-sm hover:bg-accent"
            aria-label="Favorites"
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Saved</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 rounded-md p-2 text-sm hover:bg-accent"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {session ? (

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="inline-flex items-center gap-1 rounded-md p-2 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-medium text-[color:var(--brand-foreground)] hover:opacity-90"
            >
              <User className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
