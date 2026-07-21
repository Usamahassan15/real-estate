import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard, type Property } from "@/components/property-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homely — Buy, rent, and discover homes" },
      { name: "description", content: "Search homes for sale and rent across the US. Browse listings, save favorites, and find your next place." },
      { property: "og:title", content: "Homely — Real estate marketplace" },
      { property: "og:description", content: "Search millions of listings across the US." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"sale" | "rent">("sale");

  const { data: featured } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("price", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Property[];
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q || undefined, listing: tab } });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section
        className="relative flex min-h-[520px] items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920')",
        }}
      >
        <div className="w-full max-w-3xl px-4 text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find a place you'll love to live
          </h1>
          <p className="mt-3 text-lg text-white/90">Homes for sale and rent across the country</p>

          <div className="mt-8 rounded-xl bg-white p-2 text-foreground shadow-2xl">
            <div className="flex gap-1 border-b p-1 text-sm font-medium">
              <button
                onClick={() => setTab("sale")}
                className={`rounded-md px-3 py-1.5 ${tab === "sale" ? "bg-secondary" : ""}`}
              >Buy</button>
              <button
                onClick={() => setTab("rent")}
                className={`rounded-md px-3 py-1.5 ${tab === "rent" ? "bg-secondary" : ""}`}
              >Rent</button>
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 p-2">
              <Search className="ml-2 h-5 w-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="City, address, ZIP"
                className="w-full bg-transparent px-2 py-2 text-base outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-[color:var(--brand)] px-5 py-2 font-medium text-[color:var(--brand-foreground)] hover:opacity-90"
              >Search</button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured homes</h2>
            <p className="text-sm text-muted-foreground">Hand-picked listings you might love</p>
          </div>
          <Link to="/search" search={{}} className="text-sm font-medium text-[color:var(--brand)] hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured?.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      </section>

      <section className="border-t bg-secondary/40 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-3">
          {[
            { title: "Buy a home", body: "Browse thousands of listings and connect with local agents.", to: "sale" as const },
            { title: "Rent a home", body: "Find rentals with detailed floor plans and photos.", to: "rent" as const },
            { title: "Save your favorites", body: "Sign in to bookmark listings and get updates.", to: null },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              {c.to ? (
                <Link to="/search" search={{ listing: c.to }} className="mt-4 inline-block text-sm font-medium text-[color:var(--brand)] hover:underline">
                  Browse →
                </Link>
              ) : (
                <Link to="/auth" className="mt-4 inline-block text-sm font-medium text-[color:var(--brand)] hover:underline">
                  Sign in →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Homely. A demo real estate marketplace.
      </footer>
    </div>
  );
}
