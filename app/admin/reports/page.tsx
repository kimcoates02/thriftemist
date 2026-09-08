import { supabaseAdmin } from "@/lib/supabase-admin";
import { money } from "@/lib/format";

export default async function ReportsPage() {
  const supabase = supabaseAdmin();
  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase.from("sales_summary").select("*").maybeSingle(),
    supabase.from("product_sales_report").select("*").order("revenue", { ascending: false }),
  ]);

  const itemsSold = sales?.items_sold ?? 0;
  const orderCount = sales?.order_count ?? 0;
  const revenue = Number(sales?.product_revenue ?? 0);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">Business intelligence</p>
      <h1 className="serif mt-2 text-5xl">Reports</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Product revenue" value={money(revenue)} />
        <Stat label="Orders" value={orderCount} />
        <Stat label="Items sold" value={itemsSold} />
      </div>

      <div className="mt-8 overflow-x-auto border border-black/10 bg-[#F1EBDD]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-widest text-black/45">
            <tr>
              <th className="p-4">Product</th>
              <th>Brand</th>
              <th>Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.product_id} className="border-b border-black/10">
                <td className="p-4">{product.name}</td>
                <td>{product.brand || "—"}</td>
                <td>{product.sold_quantity}</td>
                <td>{money(product.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-black/10 bg-[#F1EBDD] p-6">
      <p className="text-xs uppercase tracking-widest text-black/45">{label}</p>
      <p className="serif mt-2 text-4xl">{value}</p>
    </div>
  );
}
