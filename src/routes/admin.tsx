import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Pencil, Plus, Shield, Trash2, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import {
  adminStats,
  adminStatus,
  bootstrapAdmin,
  listMembers,
  setMemberRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Homely" },
      {
        name: "description",
        content: "Manage Homely property listings, members and access from one admin dashboard.",
      },
      { property: "og:title", content: "Admin panel — Homely" },
      { property: "og:description", content: "Manage listings, members and access on Homely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type PropertyRow = {
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
  description: string | null;
  image_url: string | null;
  year_built: number | null;
};

const emptyForm = {
  address: "",
  city: "",
  state: "",
  zip: "",
  price: "",
  beds: "",
  baths: "",
  sqft: "",
  property_type: "House",
  listing_type: "sale",
  description: "",
  image_url: "",
  year_built: "",
};

function AdminPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<"listings" | "members">("listings");
  const qc = useQueryClient();

  const status = useServerFn(adminStatus);
  const stats = useServerFn(adminStats);
  const members = useServerFn(listMembers);
  const setRole = useServerFn(setMemberRole);
  const claimAdmin = useServerFn(bootstrapAdmin);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const statusQuery = useQuery({
    queryKey: ["admin-status", userId],
    enabled: !!userId,
    queryFn: () => status(),
  });
  const isAdmin = statusQuery.data?.isAdmin === true;

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: () => stats(),
  });

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PropertyRow[];
    },
  });

  const membersQuery = useQuery({
    queryKey: ["admin-members"],
    enabled: isAdmin && tab === "members",
    queryFn: () => members(),
  });

  if (userId === undefined || (userId && statusQuery.isLoading)) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </Shell>
    );
  }

  if (!userId) {
    return (
      <Shell>
        <Card>
          <p className="text-muted-foreground">Sign in with an administrator account to continue.</p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-md bg-[color:var(--brand)] px-4 py-2 font-medium text-[color:var(--brand-foreground)]"
          >
            Sign in
          </Link>
        </Card>
      </Shell>
    );
  }

  if (!isAdmin) {
    const noAdminsYet = (statusQuery.data?.adminCount ?? 1) === 0;
    return (
      <Shell>
        <Card>
          <p className="text-muted-foreground">
            {noAdminsYet
              ? "No administrator has been set up yet. You can claim admin access for this account."
              : "You do not have access to this area."}
          </p>
          {noAdminsYet && (
            <button
              onClick={async () => {
                try {
                  await claimAdmin();
                  toast.success("You are now an administrator");
                  qc.invalidateQueries({ queryKey: ["admin-status"] });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="mt-4 rounded-md bg-[color:var(--brand)] px-4 py-2 font-medium text-[color:var(--brand-foreground)]"
            >
              Make me an administrator
            </button>
          )}
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={<Building2 className="h-5 w-5" />} label="Listings" value={statsQuery.data?.properties} />
        <Stat icon={<Users className="h-5 w-5" />} label="Members" value={statsQuery.data?.users} />
        <Stat icon={<Shield className="h-5 w-5" />} label="Saved homes" value={statsQuery.data?.favorites} />
      </div>

      <div className="mt-8 flex gap-2 border-b">
        {(["listings", "members"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-[color:var(--brand)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "listings" ? (
        <ListingsTab
          rows={listingsQuery.data ?? []}
          loading={listingsQuery.isLoading}
          onChanged={() => {
            listingsQuery.refetch();
            statsQuery.refetch();
          }}
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3 text-right">Admin access</th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.data?.map((m) => {
                const isMemberAdmin = m.roles.includes("admin");
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-3">{m.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.roles.length ? m.roles.join(", ") : "member"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => {
                          try {
                            await setRole({
                              data: { userId: m.id, role: "admin", grant: !isMemberAdmin },
                            });
                            toast.success(isMemberAdmin ? "Admin access removed" : "Admin access granted");
                            membersQuery.refetch();
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        {isMemberAdmin ? "Revoke" : "Grant"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {membersQuery.isLoading && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                    Loading members…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function ListingsTab({
  rows,
  loading,
  onChanged,
}: {
  rows: PropertyRow[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<PropertyRow | "new" | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.address} ${r.city} ${r.state} ${r.zip}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings by address or city"
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-[color:var(--brand-foreground)]"
        >
          <Plus className="h-4 w-4" /> New listing
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Beds / Baths</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  Loading listings…
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">{r.address}</td>
                <td className="px-4 py-3">
                  {r.city}, {r.state}
                </td>
                <td className="px-4 py-3">${Number(r.price).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.beds} / {r.baths}
                </td>
                <td className="px-4 py-3 capitalize">
                  {r.property_type} · {r.listing_type}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-md border p-1.5 hover:bg-accent"
                      aria-label="Edit listing"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete ${r.address}?`)) return;
                        const { error } = await supabase.from("properties").delete().eq("id", r.id);
                        if (error) toast.error(error.message);
                        else {
                          toast.success("Listing deleted");
                          onChanged();
                        }
                      }}
                      className="rounded-md border p-1.5 text-destructive hover:bg-accent"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ListingDialog
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ListingDialog({
  row,
  onClose,
  onSaved,
}: {
  row: PropertyRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    ...(row
      ? {
          address: row.address,
          city: row.city,
          state: row.state,
          zip: row.zip,
          price: String(row.price),
          beds: String(row.beds),
          baths: String(row.baths),
          sqft: String(row.sqft),
          property_type: row.property_type,
          listing_type: row.listing_type,
          description: row.description ?? "",
          image_url: row.image_url ?? "",
          year_built: row.year_built ? String(row.year_built) : "",
        }
      : {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.address || !form.city || !form.state || !form.zip || !form.price) {
      toast.error("Address, city, state, ZIP and price are required");
      return;
    }
    setSaving(true);
    const payload = {
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      price: Number(form.price),
      beds: Number(form.beds || 0),
      baths: Number(form.baths || 0),
      sqft: Number(form.sqft || 0),
      property_type: form.property_type,
      listing_type: form.listing_type,
      description: form.description || null,
      image_url: form.image_url || null,
      year_built: form.year_built ? Number(form.year_built) : null,
    };
    const { error } = row
      ? await supabase.from("properties").update(payload).eq("id", row.id)
      : await supabase.from("properties").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(row ? "Listing updated" : "Listing created");
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-bold">{row ? "Edit listing" : "New listing"}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
          <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
          <Field label="ZIP" value={form.zip} onChange={(v) => set("zip", v)} />
          <Field label="Price" type="number" value={form.price} onChange={(v) => set("price", v)} />
          <Field label="Square feet" type="number" value={form.sqft} onChange={(v) => set("sqft", v)} />
          <Field label="Beds" type="number" value={form.beds} onChange={(v) => set("beds", v)} />
          <Field label="Baths" type="number" value={form.baths} onChange={(v) => set("baths", v)} />
          <Field
            label="Year built"
            type="number"
            value={form.year_built}
            onChange={(v) => set("year_built", v)}
          />
          <label className="text-sm">
            <span className="mb-1 block font-medium">Home type</span>
            <select
              value={form.property_type}
              onChange={(e) => set("property_type", e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              {["House", "Condo", "Townhouse", "Apartment", "Multi-family", "Land"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Listing type</span>
            <select
              value={form.listing_type}
              onChange={(e) => set("listing_type", e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </label>
          <Field
            label="Image URL"
            value={form.image_url}
            onChange={(v) => set("image_url", v)}
          />
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-[color:var(--brand-foreground)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2"
      />
    </label>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value ?? "—"}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-8 text-center">{children}</div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Admin panel</h1>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
