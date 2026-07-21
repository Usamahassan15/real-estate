import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard, type Property } from "@/components/property-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Saved homes — Homely" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data, refetch } = useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id, properties(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.properties as unknown as Property).filter(Boolean);
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-2xl font-bold">Saved homes</h1>

        {userId === null && (
          <div className="mt-8 rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">Sign in to see your saved homes.</p>
            <Link to="/auth" className="mt-4 inline-block rounded-md bg-[color:var(--brand)] px-4 py-2 font-medium text-[color:var(--brand-foreground)]">
              Sign in
            </Link>
          </div>
        )}

        {userId && (
          <>
            {data && data.length === 0 && (
              <p className="mt-4 text-muted-foreground">You haven't saved any homes yet.</p>
            )}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data?.map((p) => (
                <PropertyCard key={p.id} property={p} isFavorite onToggle={() => refetch()} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
