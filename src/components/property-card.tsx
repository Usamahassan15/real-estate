import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, Heart, Ruler } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export type Property = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  property_type: string;
  listing_type: string;
  image_url: string | null;
};

export function PropertyCard({ property, isFavorite: initialFav = false, onToggle }: {
  property: Property;
  isFavorite?: boolean;
  onToggle?: (id: string, next: boolean) => void;
}) {
  const [fav, setFav] = useState(initialFav);
  useEffect(() => setFav(initialFav), [initialFav]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.error("Sign in to save homes");
      return;
    }
    const next = !fav;
    setFav(next);
    if (next) {
      const { error } = await supabase.from("favorites").insert({ user_id: data.user.id, property_id: property.id });
      if (error) { setFav(false); toast.error(error.message); return; }
      toast.success("Saved");
    } else {
      const { error } = await supabase.from("favorites").delete().eq("user_id", data.user.id).eq("property_id", property.id);
      if (error) { setFav(true); toast.error(error.message); return; }
      toast.success("Removed");
    }
    onToggle?.(property.id, next);
  }

  return (
    <Link
      to="/property/$id"
      params={{ id: property.id }}
      className="group block overflow-hidden rounded-xl border bg-card transition hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {property.image_url && (
          <img
            src={property.image_url}
            alt={property.address}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <button
          onClick={toggle}
          aria-label={fav ? "Remove from saved" : "Save home"}
          className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-red-500 text-red-500" : "text-foreground"}`} />
        </button>
        <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
          For {property.listing_type}
        </span>
      </div>
      <div className="p-4">
        <div className="text-xl font-bold">{formatPrice(property.price, property.listing_type)}</div>
        <div className="mt-1 flex items-center gap-3 text-sm text-foreground/80">
          <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{property.beds} bd</span>
          <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" />{property.baths} ba</span>
          <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" />{property.sqft.toLocaleString()} sqft</span>
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {property.address}, {property.city}, {property.state} {property.zip}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{property.property_type}</div>
      </div>
    </Link>
  );
}
