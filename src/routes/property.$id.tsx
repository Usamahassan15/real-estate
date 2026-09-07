import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bath, BedDouble, Calendar, Heart, MapPin, Ruler, Trees } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/property/$id")({
  head: () => ({
    meta: [
      { title: "Listing details — Homely" },
      { name: "description", content: "See photos, price, bedrooms, bathrooms, size, and an estimated monthly payment for this home." },
      { property: "og:title", content: "Listing details — Homely" },
      { property: "og:description", content: "Photos, price, size, and estimated monthly payment for this home." },
    ],
  }),
  component: PropertyPage,
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-bold">Listing not found</h1>
      <Link to="/" className="mt-4 inline-block text-[color:var(--brand)] hover:underline">Back home</Link>
    </div>
  ),
});

function PropertyPage() {
  const { id } = Route.useParams();
  const [fav, setFav] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("favorites").select("id").eq("user_id", u.user.id).eq("property_id", id).maybeSingle();
      setFav(!!data);
    })();
  }, [id]);

  async function toggleFav() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in to save homes"); return; }
    if (fav) {
      await supabase.from("favorites").delete().eq("user_id", u.user.id).eq("property_id", id);
      setFav(false); toast.success("Removed");
    } else {
      await supabase.from("favorites").insert({ user_id: u.user.id, property_id: id });
      setFav(true); toast.success("Saved");
    }
  }

  if (isLoading || !property) {
    return (
      <div>
        <SiteHeader />
        <div className="p-16 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl bg-muted">
          {property.image_url && (
            <img src={property.image_url} alt={property.address} className="h-[420px] w-full object-cover" />
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-bold">{formatPrice(Number(property.price), property.listing_type)}</div>
                <div className="mt-1 flex items-center gap-4 text-foreground/80">
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{property.beds} bd</span>
                  <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" />{property.baths} ba</span>
                  <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" />{Number(property.sqft).toLocaleString()} sqft</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {property.address}, {property.city}, {property.state} {property.zip}
                </div>
              </div>
              <button
                onClick={toggleFav}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Heart className={`h-4 w-4 ${fav ? "fill-red-500 text-red-500" : ""}`} />
                {fav ? "Saved" : "Save"}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat icon={<BedDouble className="h-5 w-5" />} label="Bedrooms" value={String(property.beds)} />
              <Stat icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={String(property.baths)} />
              <Stat icon={<Ruler className="h-5 w-5" />} label="Sq. Ft." value={Number(property.sqft).toLocaleString()} />
              <Stat icon={<Calendar className="h-5 w-5" />} label="Year built" value={property.year_built ? String(property.year_built) : "—"} />
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold">About this home</h2>
              <p className="mt-2 leading-relaxed text-foreground/80">
                {property.description ?? "No description provided."}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold">Property details</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Detail k="Type" v={property.property_type} />
                <Detail k="Listing" v={property.listing_type === "rent" ? "For rent" : "For sale"} />
                <Detail k="Lot size" v={property.lot_size ? `${property.lot_size.toLocaleString()} sqft` : "—"} />
                <Detail k="ZIP" v={property.zip} />
                <Detail k="City" v={property.city} />
                <Detail k="State" v={property.state} />
              </dl>
            </div>
          </div>

          <aside className="sticky top-24 h-max rounded-2xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Estimated monthly</div>
            <div className="mt-1 text-2xl font-bold">
              ${estimateMonthly(Number(property.price), property.listing_type).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {property.listing_type === "rent"
                ? "Monthly rent"
                : "Based on 20% down at 7% APR over 30 years. Illustrative only."}
            </p>
            <button className="mt-6 w-full rounded-md bg-[color:var(--brand)] px-4 py-2.5 font-medium text-[color:var(--brand-foreground)] hover:opacity-90">
              Contact agent
            </button>
            <button className="mt-2 w-full rounded-md border px-4 py-2.5 font-medium hover:bg-accent">
              Request a tour
            </button>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Trees className="h-4 w-4" /> Neighborhood insights available
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between rounded-md border bg-card px-3 py-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function estimateMonthly(price: number, type: string) {
  if (type === "rent") return price;
  const principal = price * 0.8;
  const r = 0.07 / 12;
  const n = 360;
  const m = (principal * r) / (1 - Math.pow(1 + r, -n));
  return Math.round(m);
}
