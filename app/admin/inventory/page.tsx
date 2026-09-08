import { supabaseAdmin } from "@/lib/supabase-admin";
import { money } from "@/lib/format";

type InventoryRow = {
  product_id: string;
  name: string;
  price: number;
  status: string;
  initial_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  added_after_initial: number;
  sell_through_rate: number;
};

export default async function InventoryPage() {
  const { data } = await supabaseAdmin()
    .from("inventory_summary")
    .select("*")
    .order("name");

  const rows = (data ?? []) as InventoryRow[];
  const totalAvailable = rows.reduce((n, r) => n + r.available_quantity, 0);
  const totalSold = rows.reduce((n, r) => n + r.sold_quantity, 0);
  const totalReserved = rows.reduce((n, r) => n + r.reserved_quantity, 0);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">Stock control</p>
      <h1 className="serif mt-2 text-5xl">Inventory</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Available" value={totalAvailable} />
        <Stat label="Sold" value={totalSold} />
        <Stat label="Reserved" value={totalReserved} />
      </div>

      <div className="mt-8 overflow-x-auto border border-black/10 bg-[#F1EBDD]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-widest text-black/45">
            <tr>
              <th className="p-4">Product</th>
              <th>Total Stock</th>
              <th>Sold</th>
              <th>Available</th>
              <th>Sell-through</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalStock = row.initial_quantity + row.added_after_initial;
              return (
                <tr key={row.product_id} className="border-b border-black/10">
                  <td className="p-4">{row.name}</td>
                  <td>{totalStock}</td>
                  <td>{row.sold_quantity}</td>
                  <td>{row.available_quantity}</td>
                  <td>{row.sell_through_rate}%</td>
                  <td>{money(row.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/10 bg-[#F1EBDD] p-6">
      <p className="text-xs uppercase tracking-widest text-black/45">{label}</p>
      <p className="serif mt-2 text-4xl">{value}</p>
    </div>
  );
}
