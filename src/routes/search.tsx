import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SlidersHorizontal, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard, type Property } from "@/components/property-card";
import { PropertyCardSkeleton } from "@/components/property-card-skeleton";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: z.string().optional(),
  listing: z.enum(["sale", "rent"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  beds: z.coerce.number().optional(),
  baths: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  minSqft: z.coerce.number().optional(),
  maxSqft: z.coerce.number().optional(),
  minYear: z.coerce.number().optional(),
  keywords: z.string().optional(),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Search homes — Homely" },
      { name: "description", content: "Search homes for sale and rent by city, price, bedrooms, baths, home type, size, and more." },
    ],
  }),
  component: SearchPage,
});

const PROPERTY_TYPES = ["House", "Condo", "Townhouse", "Apartment", "Multi-family", "Land"];

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", search],
    queryFn: async () => {
      let query = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (search.listing) query = query.eq("listing_type", search.listing);
      if (search.beds) query = query.gte("beds", search.beds);
      if (search.baths) query = query.gte("baths", search.baths);
      if (search.propertyType) query = query.ilike("property_type", search.propertyType);
      if (search.minPrice) query = query.gte("price", search.minPrice);
      if (search.maxPrice) query = query.lte("price", search.maxPrice);
      if (search.minSqft) query = query.gte("sqft", search.minSqft);
      if (search.maxSqft) query = query.lte("sqft", search.maxSqft);
      if (search.minYear) query = query.gte("year_built", search.minYear);
      if (search.keywords) query = query.ilike("description", `%${search.keywords}%`);
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

  function update(patch: Partial<SearchParams>) {
    navigate({ to: "/search", search: { ...search, ...patch } });
  }

  const activeMore =
    (search.baths ? 1 : 0) +
    (search.propertyType ? 1 : 0) +
    (search.minSqft || search.maxSqft ? 1 : 0) +
    (search.minYear ? 1 : 0) +
    (search.keywords ? 1 : 0);

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

          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4" />
            More filters
            {activeMore > 0 && (
              <span className="rounded-full bg-[color:var(--brand)] px-2 py-0.5 text-xs text-white">{activeMore}</span>
            )}
          </button>
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
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <PropertyCardSkeleton key={i} />)
            : data?.map((p) => (
                <PropertyCard key={p.id} property={p} isFavorite={favIds?.has(p.id)} />
              ))}
        </div>
      </div>
      <SiteFooter />

      {showMore && (
        <MoreFiltersPanel
          search={search}
          count={data?.length ?? 0}
          onClose={() => setShowMore(false)}
          onApply={(patch) => { update(patch); setShowMore(false); }}
          onReset={() => {
            navigate({ to: "/search", search: { q: search.q, listing: search.listing } });
            setShowMore(false);
          }}
        />
      )}
    </div>
  );
}

function MoreFiltersPanel({
  search, count, onClose, onApply, onReset,
}: {
  search: SearchParams;
  count: number;
  onClose: () => void;
  onApply: (patch: Partial<SearchParams>) => void;
  onReset: () => void;
}) {
  const [baths, setBaths] = useState<number | undefined>(search.baths);
  const [propertyType, setPropertyType] = useState<string | undefined>(search.propertyType);
  const [minSqft, setMinSqft] = useState<number | undefined>(search.minSqft);
  const [maxSqft, setMaxSqft] = useState<number | undefined>(search.maxSqft);
  const [minYear, setMinYear] = useState<number | undefined>(search.minYear);
  const [keywords, setKeywords] = useState<string>(search.keywords ?? "");

  function apply() {
    onApply({
      baths, propertyType, minSqft, maxSqft, minYear,
      keywords: keywords.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">More filters</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="Bathrooms">
            <div className="flex gap-2">
              {[undefined, 1, 2, 3, 4].map((n) => (
                <button
                  key={String(n)}
                  onClick={() => setBaths(n)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${baths === n ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 font-medium" : "bg-background"}`}
                >
                  {n === undefined ? "Any" : `${n}+`}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Home type">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPropertyType(undefined)}
                className={`rounded-md border px-3 py-2 text-sm ${!propertyType ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 font-medium" : ""}`}
              >
                Any
              </button>
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setPropertyType(t)}
                  className={`rounded-md border px-3 py-2 text-sm ${propertyType?.toLowerCase() === t.toLowerCase() ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 font-medium" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Home size (sqft)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="No min"
                value={minSqft ?? ""}
                onChange={(e) => setMinSqft(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="number"
                placeholder="No max"
                value={maxSqft ?? ""}
                onChange={(e) => setMaxSqft(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </Section>

          <Section title="Year built (min)">
            <input
              type="number"
              placeholder="e.g. 1990"
              value={minYear ?? ""}
              onChange={(e) => setMinYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Section>

          <Section title="Keywords">
            <input
              type="text"
              placeholder="pool, waterfront, hardwood…"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Matches listing descriptions.</p>
          </Section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-5 py-4">
          <button onClick={onReset} className="text-sm font-medium underline">
            Reset all filters
          </button>
          <button
            onClick={apply}
            className="rounded-md bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            See {count} home{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
