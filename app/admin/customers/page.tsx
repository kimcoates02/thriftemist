import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function CustomersPage() {
  const supabase = supabaseAdmin();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, phone, role, created_at")
    .order("created_at", { ascending: false });

  const { data: orders } = await supabase
    .from("orders")
    .select("user_id, total, payment_status, status");

  const byUser = new Map<string, { orders: number; spent: number }>();
  for (const order of orders ?? []) {
    if (!order.user_id || order.payment_status !== "paid" || ["cancelled", "refunded"].includes(order.status)) continue;
    const current = byUser.get(order.user_id) ?? { orders: 0, spent: 0 };
    current.orders += 1;
    current.spent += Number(order.total || 0);
    byUser.set(order.user_id, current);
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">Customers</p>
      <h1 className="serif mt-2 text-5xl">Customer Accounts</h1>
      <div className="mt-8 overflow-x-auto border border-black/10 bg-[#F1EBDD]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-widest text-black/45">
            <tr><th className="p-4">Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => {
              const summary = byUser.get(profile.id) ?? { orders: 0, spent: 0 };
              return (
                <tr key={profile.id} className="border-b border-black/10">
                  <td className="p-4">{profile.name || "Unnamed"}</td>
                  <td>{profile.phone || "—"}</td>
                  <td>{summary.orders}</td>
                  <td>₹{summary.spent.toLocaleString("en-IN")}</td>
                  <td>{new Date(profile.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
