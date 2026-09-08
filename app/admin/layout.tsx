import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const nav = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Inventory", "/admin/inventory"],
  ["Drops", "/admin/drops"],
  ["Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Wishlist Activity", "/admin/wishlist-activity"],
  ["Reports", "/admin/reports"],
  ["Enquiries", "/admin/enquiries"],
  ["Similar Requests", "/admin/requests"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    return (
      <div className="min-h-screen bg-[#EEE8D8]">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <h1 className="serif text-5xl">Admin access required</h1>
          <p className="mt-4">Sign in with an authorised admin account.</p>
          <Link href="/login" className="mt-6 inline-block underline">Login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEE8D8]">
      <header className="border-b border-white/10 bg-[#153726] px-4 py-5 text-[#F8F3E0]">
        <div className="container flex items-center justify-between">
          <Link href="/admin" className="serif tracking-[.2em]">THRIFTEMIST ADMIN</Link>
          <Link href="/" className="text-xs uppercase tracking-widest text-[#F8F3E0]/70 hover:text-[#F8F3E0]">View store →</Link>
        </div>
      </header>

      <div className="container grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit border border-black/10 bg-[#F1EBDD]">
          <div className="px-4 py-4 text-[10px] uppercase tracking-[.25em] text-black/40">Store management</div>
          <nav className="grid">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="border-t border-black/10 px-4 py-3 text-xs uppercase tracking-widest text-[#122018] transition-colors duration-200 hover:bg-[#1D4A3A] hover:text-[#F8F3E0] focus:outline-none focus:bg-[#1D4A3A] focus:text-[#F8F3E0]">
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
