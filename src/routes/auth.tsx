import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Homely" },
      { name: "description", content: "Sign in to Homely to save homes you love and pick up your search where you left off." },
      { property: "og:title", content: "Sign in — Homely" },
      { property: "og:description", content: "Save homes you love and continue your search on Homely." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Home className="h-6 w-6 text-[color:var(--brand)]" /> Homely
        </div>
        <div className="mb-6 flex rounded-md bg-secondary p-1 text-sm font-medium">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md py-2 ${mode === "signin" ? "bg-background shadow" : ""}`}
          >Sign in</button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-2 ${mode === "signup" ? "bg-background shadow" : ""}`}
          >Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            disabled={busy}
            className="w-full rounded-md bg-[color:var(--brand)] px-4 py-2.5 font-medium text-[color:var(--brand-foreground)] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo app. Only your saved homes are personal to you.
        </p>
      </div>
    </div>
  );
}
