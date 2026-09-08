"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";

type ProductImage = {
  id: string;
  url: string;
  sort_order: number;
};

type Drop = {
  id: string;
  name: string | null;
  drop_number: number | null;
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  source: "vintage" | "surplus" | "new" | null;
  sku: string | null;
  status: string;
  quantity: number;
  price: number;
  cost_price?: number | null;
  sold_price?: number | null;
  sold_via?: string | null;
  sold_at?: string | null;
  drop_id: string | null;
  product_images?: ProductImage[];
  drops?: Drop | null;
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load products."
        );
      }

      setProducts(data.products || []);
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" permanently?\n\nThis will also delete its uploaded images.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(product.id);

    try {
      const response = await fetch(
        `/api/admin/products/${product.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete product."
        );
      }

      setProducts((current) =>
        current.filter(
          (item) => item.id !== product.id
        )
      );
    } catch (error) {
      console.error("DELETE PRODUCT ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete product."
      );
    } finally {
      setDeleting(null);
    }
  }

  function getMainImage(product: Product) {
    const images = [
      ...(product.product_images || []),
    ].sort(
      (a, b) => a.sort_order - b.sort_order
    );

    return images[0]?.url || "/placeholder.svg";
  }

  return (
    <div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-xs uppercase tracking-widest text-[#B39A6B]">
            Catalogue
          </p>

          <h1 className="serif mt-2 text-5xl">
            Products
          </h1>

          <p className="mt-3 text-xs text-black/45">
            {products.length}{" "}
            {products.length === 1
              ? "product"
              : "products"}{" "}
            in inventory
          </p>

        </div>

        <Link
          href="/admin/products/new"
          className="admin-primary-action inline-flex w-fit px-5 py-3 text-xs uppercase tracking-widest transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#B39A6B] focus:ring-offset-2"
        >
          + Add Product
        </Link>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="mt-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">

          <strong>
            Unable to load products
          </strong>

          <p className="mt-1">
            {error}
          </p>

          <button
            onClick={loadProducts}
            className="mt-3 underline"
          >
            Try again
          </button>

        </div>
      )}


      {/* =====================================================
          PRODUCT TABLE
          ===================================================== */}

      <div className="mt-8 overflow-x-auto border border-black/10 bg-[#FAF6E9]">

        {loading ? (

          <div className="p-10 text-center text-sm text-black/50">
            Loading products...
          </div>

        ) : products.length > 0 ? (

          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="border-b border-black/10 text-[9px] uppercase tracking-widest text-black/45">

              <tr>

                <th className="p-4">
                  Product
                </th>

                <th>
                  SKU
                </th>

                <th>
                  Source
                </th>

                <th>
                  Category
                </th>

                <th>
                  Drop
                </th>

                <th>
                  Status
                </th>

                <th>
                  Sold Via
                </th>

                <th>
                  Stock
                </th>

                <th>
                  Price
                </th>

                <th className="pr-4">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {products.map((product) => (

                <tr
                  key={product.id}
                  className="border-b border-black/10 last:border-b-0"
                >

                  {/* PRODUCT */}

                  <td className="p-4">

                    <div className="flex items-center gap-4">

                      <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-[#DED8C8]">

                        <Image
                          src={getMainImage(product)}
                          alt={product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />

                      </div>


                      <div>

                        <div className="font-medium">
                          {product.name}
                        </div>

                        {product.brand && (
                          <div className="mt-1 text-xs text-black/40">
                            {product.brand}
                          </div>
                        )}

                      </div>

                    </div>

                  </td>


                  {/* SKU */}

                  <td className="text-xs">
                    {product.sku || "—"}
                  </td>


                  {/* SOURCE */}

                  <td className="text-xs">
                    <span className="inline-block bg-[#EAF1ED] px-2 py-1 text-[9px] uppercase tracking-widest text-[#153726]">
                      {product.source || "vintage"}
                    </span>
                  </td>

                  {/* CATEGORY */}

                  <td className="text-xs">
                    {product.category || "—"}
                  </td>


                  {/* DROP */}

                  <td className="text-xs">

                    {product.drops?.drop_number
                      ? `DROP ${String(
                          product.drops.drop_number
                        ).padStart(2, "0")}`
                      : "—"}

                  </td>


                  {/* STATUS */}

                  <td>

                    <span
                      className={`inline-block px-2 py-1 text-[9px] uppercase tracking-widest ${
                        product.status === "available"
                          ? "bg-[#dfe9df] text-[#153726]"
                          : product.status === "reserved"
                            ? "bg-[#e9e2cf] text-[#80652D]"
                            : product.status === "sold"
                              ? "bg-[#f4dddd] text-[#9b3931]"
                              : "bg-[#eee1c9] text-[#80652D]"
                      }`}
                    >
                      {product.status}
                    </span>

                  </td>


                  {/* SOLD VIA */}

                  <td className="text-xs">
                    {product.status === "sold" && product.sold_via
                      ? product.sold_via === "offline_store"
                        ? "Offline Store"
                        : product.sold_via === "instagram"
                          ? "Instagram"
                          : product.sold_via === "whatsapp"
                            ? "WhatsApp"
                            : product.sold_via === "website"
                              ? "Website"
                              : "Other"
                      : "—"}
                  </td>

                  {/* STOCK */}

                  <td>
                    {product.quantity ?? 0}
                  </td>


                  {/* PRICE */}

                  <td>
                    {money(product.price)}
                  </td>


                  {/* ACTIONS */}

                  <td className="pr-4">

                    <div className="flex items-center gap-4">

                      <Link
                        href={`/admin/products/${product.id}`}
                        className="admin-edit-action px-3 py-2 text-[9px] uppercase tracking-widest transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#B39A6B] focus:ring-offset-1"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() =>
                          deleteProduct(product)
                        }
                        disabled={
                          deleting === product.id
                        }
                        className="admin-delete-action rounded-sm px-2 py-2 text-[9px] uppercase tracking-widest underline underline-offset-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#B39A6B] disabled:opacity-40"
                      >
                        {deleting === product.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        ) : (

          <div className="p-12 text-center">

            <p className="serif text-4xl">
              No products yet.
            </p>

            <p className="mt-3 text-xs text-black/50">
              Add your first product to start building
              the catalogue.
            </p>

            <Link
              href="/admin/products/new"
              className="mt-6 inline-block bg-[#153726] px-5 py-3 text-[9px] uppercase tracking-widest text-[#F8F3E0] transition-colors duration-200 hover:bg-[#122018] hover:text-[#F8F3E0] focus:outline-none focus:ring-2 focus:ring-[#B39A6B] focus:ring-offset-2"
            >
              Add Product
            </Link>

          </div>

        )}

      </div>

    </div>
  );
}