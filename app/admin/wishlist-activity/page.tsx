import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function WishlistActivityPage() {
  const { data } = await supabaseAdmin()
    .from("wishlist_items")
    .select("product_id, products(name, brand)");

  const counts = new Map<string, { name: string; brand: string | null; count: number }>();
  for (const item of data ?? []) {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    if (!product) continue;
    const existing = counts.get(item.product_id) ?? { name: product.name, brand: product.brand ?? null, count: 0 };
    existing.count += 1;
    counts.set(item.product_id, existing);
  }

  const rows = [...counts.values()].sort((a, b) => b.count - a.count);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">Customer interest</p>
      <h1 className="serif mt-2 text-5xl">Wishlist Activity</h1>
      <div className="mt-8 border border-black/10 bg-[#F1EBDD]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-widest text-black/45">
            <tr>
              <th className="p-4">Product</th>
              <th>Brand</th>
              <th>Customers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-black/10">
                <td className="p-4">{row.name}</td>
                <td>{row.brand || "—"}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
