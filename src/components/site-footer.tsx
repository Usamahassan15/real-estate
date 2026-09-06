import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-secondary/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <Home className="h-5 w-5 text-[color:var(--brand)]" /> Homely
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            A demo real estate marketplace for buying and renting homes.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Browse</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/search" search={{ listing: "sale" }} className="hover:text-foreground">Homes for sale</Link></li>
            <li><Link to="/search" search={{ listing: "rent" }} className="hover:text-foreground">Homes for rent</Link></li>
            <li><Link to="/search" search={{}} className="hover:text-foreground">All listings</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Account</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/favorites" className="hover:text-foreground">Saved homes</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Popular cities</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {["San Francisco", "New York", "Miami", "Austin"].map((c) => (
              <li key={c}>
                <Link to="/search" search={{ q: c }} className="hover:text-foreground">{c} homes</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Homely. Listings shown are sample data.
      </div>
    </footer>
  );
}
