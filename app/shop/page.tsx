import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getAvailableCategories, getProducts } from "@/lib/data";

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; source?: "vintage" | "surplus" | "new" }>;
}) {
  const sp = await searchParams;

  // Only categories that currently have AVAILABLE products
  const categories = await getAvailableCategories();

  const products = await getProducts({
    status: "available",
    search: sp.q,
    category: sp.category,
    source: sp.source,
  });

  return (
    <div className="container py-10 md:py-16">
      {/* HEADER */}
      <div className="grid gap-8 border-b border-black/15 pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[.28em] text-[#B39A6B]">
            Catalogue / 2026
          </p>

          <h1 className="serif mt-3 text-6xl leading-none md:text-8xl">
            Shop
          </h1>
        </div>

        <p className="max-w-xs text-right text-xs leading-5 text-black/50">
          Curated vintage pieces. Limited quantities. When they're gone,
          they're gone.
        </p>
      </div>

      {/* SEARCH + CATEGORY FILTER */}
      <form className="my-6 grid border border-black/15 md:grid-cols-[1fr_180px_220px_auto]">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Search pieces, brands, categories..."
          className="border-b border-black/15 bg-transparent px-4 py-4 text-xs outline-none md:border-b-0 md:border-r"
        />

        <select
          name="source"
          defaultValue={sp.source || ""}
          className="border-b border-black/15 bg-transparent px-4 py-4 text-xs outline-none md:border-b-0 md:border-r"
        >
          <option value="">All types</option>
          <option value="vintage">Vintage</option>
          <option value="surplus">Surplus</option>
          <option value="new">New</option>
        </select>

        <select
          name="category"
          defaultValue={sp.category || ""}
          className="border-b border-black/15 bg-transparent px-4 py-4 text-xs outline-none md:border-b-0 md:border-r"
        >
          <option value="">All categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-[#122018] px-6 py-4 text-[9px] uppercase tracking-[.2em] text-[#F8F3E0]"
        >
          Filter catalogue
        </button>
      </form>

      {/* RESULT COUNT */}
      <div className="mb-5 flex items-center justify-between text-[9px] uppercase tracking-[.2em] text-black/45">
        <span>
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </span>

        <Link
          href="/shop"
          className="underline underline-offset-4"
        >
          Reset
        </Link>
      </div>

      {/* PRODUCTS */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5 md:gap-y-14">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>

      {/* EMPTY STATE */}
      {products.length === 0 && (
        <div className="border-y border-black/15 py-32 text-center">
          <p className="serif text-4xl">
            Nothing found.
          </p>

          <p className="mt-3 text-xs text-black/50">
            Try another search or browse the full catalogue.
          </p>
        </div>
      )}
    </div>
  );
}