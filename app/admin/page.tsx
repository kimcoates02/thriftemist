import { supabaseAdmin } from "@/lib/supabase-admin";
import { money } from "@/lib/format";

export default async function Admin() {
  const s = supabaseAdmin();

  const [
    { count: products },
    { count: orders },
    { count: customers },
    { count: enquiries },
    { count: requests },
    { data: productInventory },
    { data: sales },
  ] = await Promise.all([
    s.from("products").select("*", { count: "exact", head: true }),

    s.from("orders").select("*", { count: "exact", head: true }),

    s
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "CUSTOMER"),

    s
      .from("enquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),

    s
      .from("similar_piece_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),

    s
      .from("products")
      .select("status, quantity"),

    s
      .from("sales_summary")
      .select("*")
      .maybeSingle(),
  ]);

  /*
   * Inventory
   *
   * Available stock is calculated from products whose status
   * is currently "available".
   *
   * Sold is counted from products whose status is "sold".
   * We intentionally do NOT use quantity for sold products because
   * the sold-product API sets quantity to 0.
   */
  const available = (productInventory ?? [])
    .filter((product) => product.status === "available")
    .reduce(
      (total, product) => total + Number(product.quantity || 0),
      0
    );

  const sold = (productInventory ?? []).filter(
    (product) => product.status === "sold"
  ).length;

  const revenue = Number(sales?.product_revenue || 0);

  const cards = [
    ["Products", products ?? 0],
    ["Available", available],
    ["Sold", sold],
    ["Orders", orders ?? 0],
    ["Customers", customers ?? 0],
    ["Sales", money(revenue)],
    ["New Enquiries", enquiries ?? 0],
    ["Similar Requests", requests ?? 0],
  ];

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">
        Overview
      </p>

      <h1 className="serif mt-2 text-5xl">
        Dashboard
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label as string}
            className="border border-black/10 bg-[#F1EBDD] p-6"
          >
            <div className="text-xs uppercase tracking-widest text-black/45">
              {label as string}
            </div>

            <div className="serif mt-3 text-4xl">
              {value as string | number}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}