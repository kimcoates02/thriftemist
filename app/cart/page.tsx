"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { money } from "@/lib/format";

export default function CartPage() {
  const {
    items,
    count,
    remove,
    clear,
    total,
    increase,
    decrease,
  } = useCart();

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-[#F6F1E3] text-[#14251D]">
      {isEmpty ? (
        <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
          <section className="w-full max-w-2xl text-center">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#9A7B42]">
              Your Selection
            </p>

            <h1 className="serif mt-5 text-6xl leading-none tracking-[-0.03em] md:text-8xl">
              Your Cart
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[#5F625C] md:text-base">
              Your cart is currently empty. Explore our latest vintage pieces
              and find something that belongs with you.
            </p>

            <Link
              href="/shop"
              className="mt-9 inline-flex items-center justify-center bg-[#153726] px-9 py-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[#F8F3E0] transition hover:bg-[#153726]"
            >
              Explore the Collection
            </Link>
          </section>
        </main>
      ) : (
        <main className="container max-w-[1380px] py-12 md:py-16">
          <div className="border-b border-[#D8D0C0] pb-8 md:pb-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#9A7B42]">
                  Your Selection
                </p>

                <h1 className="serif mt-3 text-6xl leading-none tracking-[-0.03em] md:text-8xl">
                  Your Cart
                </h1>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#5F625C]">
                  {count} {count === 1 ? "Piece" : "Pieces"}
                </span>

                <button
                  type="button"
                  onClick={clear}
                  className="border-b border-[#14251D] pb-1 text-[10px] uppercase tracking-[0.22em] text-[#14251D] transition hover:text-[#153726]"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_430px]">
            <section>
              <div className="border-t border-[#D8D0C0]">
                {items.map((item) => {
                  const image =
                    item.product_images?.[0]?.url ||
                    "/placeholder-product.jpg";

                  const variantLabel = [
                    item.variantColour
                      ? `Colour: ${item.variantColour}`
                      : null,
                    item.variantSize
                      ? `Size: ${item.variantSize}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  const itemKey = `${item.id}:${item.variantId}`;

                  return (
                    <article
                      key={itemKey}
                      className="border-b border-[#D8D0C0] py-7 md:py-8"
                    >
                      <div className="grid gap-6 sm:grid-cols-[180px_1fr] md:grid-cols-[200px_1fr_auto] md:gap-7">
                        <Link
                          href={`/shop/${item.slug}`}
                          className="relative block aspect-[4/5] overflow-hidden bg-[#E8E3D8]"
                        >
                          <Image
                            src={image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 200px"
                            className="object-cover transition duration-500 hover:scale-[1.02]"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-col">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.28em] text-[#9A7B42]">
                              {item.brand || item.category}
                            </p>

                            <Link href={`/shop/${item.slug}`}>
                              <h2 className="serif mt-2 text-3xl leading-[1.02] tracking-[-0.02em] transition hover:text-[#153726] md:text-4xl">
                                {item.name}
                              </h2>
                            </Link>

                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[9px] uppercase tracking-[0.14em] text-[#5F625C]">
                              {variantLabel && (
                                <span>
                                  {variantLabel}
                                </span>
                              )}

                              {item.condition && (
                                <span>
                                  Condition:{" "}
                                  <strong className="font-medium text-[#14251D]">
                                    {item.condition}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {item.variantSku && (
                              <p className="mt-3 text-[8px] uppercase tracking-[0.16em] text-[#7B7D76]">
                                SKU: {item.variantSku}
                              </p>
                            )}
                          </div>

                          <div className="mt-7">
                            <div className="inline-flex border border-[#CFC5B3] bg-[#FAF6E9]">
                              <button
                                type="button"
                                onClick={() =>
                                  decrease(item.id, item.variantId)
                                }
                                disabled={item.cartQty <= 1}
                                className="flex h-10 w-10 items-center justify-center text-[#14251D] transition hover:bg-[#EDE6D6] disabled:cursor-not-allowed disabled:text-[#9A9A92]"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>

                              <div className="flex h-10 w-11 items-center justify-center border-x border-[#CFC5B3] text-xs">
                                {item.cartQty}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  increase(item.id, item.variantId)
                                }
                                disabled={
                                  item.cartQty >= item.variantQuantity
                                }
                                className="flex h-10 w-10 items-center justify-center text-[#14251D] transition hover:bg-[#EDE6D6] disabled:cursor-not-allowed disabled:text-[#9A9A92]"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            {item.variantQuantity > 0 && (
                              <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[#7B7D76]">
                                {item.variantQuantity} available
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row items-start justify-between gap-6 md:flex-col md:items-end md:justify-between">
                          <p className="text-base font-medium text-[#14251D]">
                            {money(item.variantPrice * item.cartQty)}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              remove(item.id, item.variantId)
                            }
                            className="border-b border-[#8C8E87] pb-1 text-[10px] uppercase tracking-[0.2em] text-[#5F625C] transition hover:border-[#153726] hover:text-[#153726]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <Link
                href="/shop"
                className="mt-7 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#14251D] transition hover:text-[#153726]"
              >
                <span>←</span>
                Continue Shopping
              </Link>
            </section>

            <aside className="h-fit border border-[#D8D0C0] bg-[#FAF6E9] p-7 md:p-9 lg:sticky lg:top-24">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#9A7B42]">
                Order Summary
              </p>

              <h2 className="serif mt-4 text-4xl leading-none tracking-[-0.02em] md:text-5xl">
                Your Selection
              </h2>

              <div className="mt-9 border-t border-[#D8D0C0]">
                <div className="flex items-center justify-between border-b border-[#D8D0C0] py-5">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#5F625C]">
                    Subtotal
                  </span>

                  <span className="text-sm font-medium text-[#14251D]">
                    {money(total)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#D8D0C0] py-5">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#5F625C]">
                    Shipping
                  </span>

                  <span className="text-right text-[10px] uppercase tracking-[0.15em] text-[#14251D]">
                    Confirmed at checkout
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-5 py-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#14251D]">
                  Total
                </span>

                <span className="serif text-4xl leading-none text-[#14251D] md:text-5xl">
                  {money(total)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="flex w-full items-center justify-center bg-[#153726] px-6 py-5 text-[10px] font-medium uppercase tracking-[0.22em] text-[#F8F3E0] transition hover:bg-[#1D4A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B39A6B] focus-visible:ring-offset-2"
              >
                Proceed to Checkout
              </Link>

              <div className="mt-7 border-t border-[#D8D0C0] pt-7">
                <p className="text-[10px] leading-6 text-[#6D706A]">
                  Your cart is a selection request. Items are not reserved
                  until our sales team confirms your order.
                </p>

                <p className="mt-3 text-[10px] leading-6 text-[#6D706A]">
                  Each vintage piece is individually inspected before dispatch.
                </p>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}