import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import {
  getProduct,
  getSimilarProducts,
} from "@/lib/data";
import { money } from "@/lib/format";

import { AddToCart } from "@/components/add-to-cart";
import { WishlistButton } from "@/components/wishlist-button";
import ProductGallery from "../../../components/product-gallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);

  if (!p) {
    return {
      title: "Piece Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const source =
    p.source === "surplus"
      ? "Surplus"
      : p.source === "new"
        ? "New"
        : "Vintage";

  const title = `${p.name} | ${source}`;

  const description =
    p.description ||
    `${source} ${p.category} from THRIFTEMIST${
      p.brand
        ? ` by ${p.brand}`
        : ""
    }. Limited availability.`;

  const image =
    p.product_images?.[0]?.url;

  return {
    title,
    description,

    alternates: {
      canonical: `/shop/${p.slug}`,
    },

    openGraph: {
      type: "website",
      title:
        `${p.name} | THRIFTEMIST`,
      description,
      url: `/shop/${p.slug}`,
      ...(image
        ? {
            images: [
              {
                url: image,
                alt: p.name,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: image
        ? "summary_large_image"
        : "summary",
      title:
        `${p.name} | THRIFTEMIST`,
      description,
      ...(image
        ? {
            images: [image],
          }
        : {}),
    },
  };
}


export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const p = await getProduct(slug);

  if (!p) {
    notFound();
  }


  /*
  |--------------------------------------------------------------------------
  | AVAILABLE VARIANT
  |--------------------------------------------------------------------------
  |
  | Used for the initial price/details shown on page load.
  |
  | The AddToCart component handles live variant selection.
  |
  */

  const firstAvailableVariant =
    p.variants?.find(
      (variant) =>
        variant.status ===
          "available" &&
        Number(
          variant.quantity
        ) > 0
    ) ??
    p.variants?.[0] ??
    null;

  const displayPrice =
    firstAvailableVariant
      ? Number(
          firstAvailableVariant.selling_price
        )
      : Number(p.price);

  const displaySize =
    firstAvailableVariant?.size ??
    p.size ??
    null;

  const displayColour =
    firstAvailableVariant?.colour ??
    p.colour ??
    null;


  /*
  |--------------------------------------------------------------------------
  | SIMILAR PRODUCTS
  |--------------------------------------------------------------------------
  */

  const similarProducts =
    await getSimilarProducts(
      p.id,
      p.category,
      4
    );


  /*
  |--------------------------------------------------------------------------
  | PRODUCT IMAGES
  |--------------------------------------------------------------------------
  */

  const imgs = [
    ...(p.product_images || []),
  ].sort(
    (a, b) =>
      a.sort_order -
      b.sort_order
  );


  return (
    <div className="container py-7 md:py-10">

      {/* ================================================================ */}
      {/* BACK TO SHOP                                                     */}
      {/* ================================================================ */}

      <Link
        href="/shop"
        className="text-[9px] uppercase tracking-[0.2em] text-black/45 transition hover:text-[#153726]"
      >
        ← Back to shop
      </Link>


      {/* ================================================================ */}
      {/* PRODUCT                                                           */}
      {/* ================================================================ */}

      <div className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">

        {/* ============================================================ */}
        {/* PRODUCT GALLERY                                               */}
        {/* ============================================================ */}

        <div className="min-w-0">
          <ProductGallery
  images={imgs}
  productName={p.name}
  initialColour={displayColour}
/>
        </div>


        {/* ============================================================ */}
        {/* PRODUCT INFORMATION                                           */}
        {/* ============================================================ */}

        <div className="lg:sticky lg:top-24 lg:h-fit">

          {/* ---------------------------------------------------------- */}
          {/* BRAND / CATEGORY                                           */}
          {/* ---------------------------------------------------------- */}

          <div className="border-b border-black/15 pb-7">

            <div className="flex flex-wrap items-center gap-3">

              <span className="bg-[#EAF1ED] px-2.5 py-1.5 text-[8px] font-medium uppercase tracking-[0.18em] text-[#153726]">
                {p.source ||
                  "vintage"}
              </span>

              <p className="text-[9px] uppercase tracking-[0.28em] text-[#9A7B42]">
                {p.brand ||
                  p.category}
              </p>

            </div>

            <h1 className="serif mt-3 text-5xl leading-[0.92] tracking-[-0.02em] md:text-6xl">
              {p.name}
            </h1>

            <div className="mt-5 text-sm">
              {money(displayPrice)}
            </div>

          </div>


          {/* ---------------------------------------------------------- */}
          {/* QUICK DETAILS                                               */}
          {/* ---------------------------------------------------------- */}

          <div className="grid grid-cols-3 border-b border-black/15 text-[9px] uppercase tracking-[0.12em]">

            <div className="border-r border-black/15 py-4">

              <span className="block text-black/40">
                Size
              </span>

              <span className="mt-1 block">
                {displaySize ||
                  "—"}
              </span>

            </div>


            <div className="border-r border-black/15 px-3 py-4">

              <span className="block text-black/40">
                Condition
              </span>

              <span className="mt-1 block">
                {p.condition}
              </span>

            </div>


            <div className="px-3 py-4">

              <span className="block text-black/40">
                Status
              </span>

              <span className="mt-1 block">
                {p.status ===
                "available"
                  ? "Available"
                  : p.status ===
                      "reserved"
                    ? "Reserved"
                    : "Sold"}
              </span>

            </div>

          </div>


          {/* ---------------------------------------------------------- */}
          {/* DESCRIPTION                                                */}
          {/* ---------------------------------------------------------- */}

          <p className="py-7 text-sm leading-7 text-black/65">
            {p.description}
          </p>


          {/* ---------------------------------------------------------- */}
          {/* PRODUCT DETAILS                                            */}
          {/* ---------------------------------------------------------- */}

          <dl className="border-y border-black/15 text-[10px] uppercase tracking-[0.08em]">

            {[
              [
                "Source",
                p.source ||
                  "vintage",
              ],
              [
                "Brand",
                p.brand,
              ],
              [
                "Category",
                p.category,
              ],
              [
                "Colour",
                displayColour,
              ],
              [
                "Material",
                p.material,
              ],
              [
                "Condition",
                p.condition,
              ],
            ].map(
              ([key, value]) =>
                value ? (
                  <div
                    key={key}
                    className="grid grid-cols-[1fr_1fr] border-b border-black/10 py-3 last:border-b-0"
                  >

                    <dt className="text-black/40">
                      {key}
                    </dt>

                    <dd>
                      {value}
                    </dd>

                  </div>
                ) : null
            )}

          </dl>


          {/* ---------------------------------------------------------- */}
          {/* MEASUREMENTS                                               */}
          {/* ---------------------------------------------------------- */}

          {p.measurements &&
            Object.keys(
              p.measurements
            ).length > 0 && (

              <div className="border-b border-black/15 py-6">

                <p className="mb-4 text-[10px] uppercase tracking-[0.14em] text-black/40">
                  Measurements
                </p>

                <div className="grid grid-cols-2 gap-y-3 text-[10px] uppercase tracking-[0.08em]">

                  {Object.entries(
                    p.measurements
                  ).map(
                    ([
                      key,
                      value,
                    ]) => (

                      <div
                        key={key}
                        className="flex justify-between gap-4 pr-4"
                      >

                        <span className="text-black/40">
                          {key}
                        </span>

                        <span>
                          {String(
                            value
                          )}
                        </span>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}


          {/* ---------------------------------------------------------- */}
          {/* ACTIONS                                                     */}
          {/* ---------------------------------------------------------- */}

          {p.status ===
          "available" ? (

            <div className="mt-7 grid grid-cols-[1fr_auto] gap-2">

              <AddToCart
                product={p}
              />

              <WishlistButton
                productId={p.id}
              />

            </div>

          ) : (

            <div className="mt-7 border border-black/15 px-6 py-4 text-center text-[9px] uppercase tracking-[0.2em] text-black/50">

              {p.status ===
              "reserved"
                ? "This piece is currently reserved"
                : "This piece has been sold"}

            </div>

          )}


          {/* ---------------------------------------------------------- */}
          {/* SIMILAR REQUEST                                             */}
          {/* ---------------------------------------------------------- */}

          {p.status ===
            "sold" && (

            <Link
              href={`/request?product=${encodeURIComponent(
                p.name
              )}`}
              className="mt-2 block border border-black/20 px-6 py-4 text-center text-[9px] uppercase tracking-[0.2em] transition hover:bg-[#153726] hover:text-[#F8F3E0]"
            >
              Request a similar piece
            </Link>

          )}


          {/* ---------------------------------------------------------- */}
          {/* FOOTER NOTE                                                */}
          {/* ---------------------------------------------------------- */}

          <div className="mt-8 border-t border-black/15 pt-5 text-[9px] uppercase tracking-[0.14em] text-black/45">

            <p>
              Selected, inspected and shipped from
              THRIFTEMIST.
            </p>

          </div>

        </div>

      </div>


      {/* ================================================================ */}
      {/* YOU MAY ALSO LIKE                                                */}
      {/* ================================================================ */}

      {similarProducts.length >
        0 && (

        <section className="mt-20 border-t border-black/15 pt-12 md:mt-28 md:pt-16">

          {/* ------------------------------------------------------------ */}
          {/* SECTION HEADER                                                */}
          {/* ------------------------------------------------------------ */}

          <div className="flex items-end justify-between gap-6">

            <div>

              <p className="text-[9px] uppercase tracking-[.28em] text-[#B39A6B]">
                Continue Exploring
              </p>

              <h2 className="serif mt-2 text-4xl leading-none md:text-6xl">
                You May Also Like
              </h2>

            </div>


            <Link
              href={`/shop?category=${encodeURIComponent(
                p.category
              )}`}
              className="hidden items-center gap-2 text-[9px] uppercase tracking-[.2em] text-black/60 transition hover:text-[#153726] md:flex"
            >
              View{" "}
              {p.category}

              <span>
                ↗
              </span>

            </Link>

          </div>


          {/* ------------------------------------------------------------ */}
          {/* SIMILAR PRODUCTS                                              */}
          {/* ------------------------------------------------------------ */}

          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">

            {similarProducts.map(
              (product) => (

                <ProductCard
                  key={product.id}
                  product={product}
                />

              )
            )}

          </div>


          {/* ------------------------------------------------------------ */}
          {/* MOBILE CATEGORY LINK                                         */}
          {/* ------------------------------------------------------------ */}

          <Link
            href={`/shop?category=${encodeURIComponent(
              p.category
            )}`}
            className="mt-8 flex items-center justify-center gap-2 border border-black/20 px-5 py-4 text-[9px] uppercase tracking-[.2em] transition hover:bg-[#153726] hover:text-[#F8F3E0] md:hidden"
          >
            View{" "}
            {p.category}

            <span>
              ↗
            </span>

          </Link>

        </section>

      )}

    </div>
  );
}