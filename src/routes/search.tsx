import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard, type Property } from "@/components/property-card";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: z.string().optional(),
  listing: z.enum(["sale", "rent"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  beds: z.coerce.number().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Search homes — Homely" },
      { name: "description", content: "Search homes for sale and rent by city, price, and bedrooms." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", search],
    queryFn: async () => {
      let query = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (search.listing) query = query.eq("listing_type", search.listing);
      if (search.beds) query = query.gte("beds", search.beds);
      if (search.minPrice) query = query.gte("price", search.minPrice);
      if (search.maxPrice) query = query.lte("price", search.maxPrice);
      if (search.q) {
        const term = `%${search.q}%`;
        query = query.or(`city.ilike.${term},address.ilike.${term},state.ilike.${term},zip.ilike.${term}`);
      }
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data as Property[];
    },
  });

  const { data: favIds } = useQuery({
    queryKey: ["fav-ids"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set<string>();
      const { data } = await supabase.from("favorites").select("property_id").eq("user_id", u.user.id);
      return new Set((data ?? []).map((r) => r.property_id));
    },
  });

  function update(patch: Partial<typeof search>) {
    navigate({ to: "/search", search: { ...search, ...patch } });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b bg-secondary/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
            className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="City, address, ZIP"
              className="w-full bg-transparent text-sm outline-none"
            />
            <button className="text-sm font-medium text-[color:var(--brand)]">Search</button>
          </form>

          <select
            value={search.listing ?? ""}
            onChange={(e) => update({ listing: (e.target.value || undefined) as "sale" | "rent" | undefined })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Any listing</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>

          <select
            value={search.beds ?? ""}
            onChange={(e) => update({ beds: e.target.value ? Number(e.target.value) : undefined })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Any beds</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>

          <input
            type="number"
            value={search.minPrice ?? ""}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Min $"
            className="w-28 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={search.maxPrice ?? ""}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Max $"
            className="w-28 rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">
          {isLoading ? "Searching…" : `${data?.length ?? 0} home${data?.length === 1 ? "" : "s"}`}
          {search.q ? ` for "${search.q}"` : ""}
        </h1>
        {data && data.length === 0 && (
          <p className="text-muted-foreground">No listings match your filters. Try widening your search.</p>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.map((p) => (
            <PropertyCard key={p.id} property={p} isFavorite={favIds?.has(p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
