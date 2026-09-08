"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart-provider";
import type {
  Product,
  ProductVariant,
} from "@/lib/types";

export function AddToCart({
  product,
}: {
  product: Product;
}) {
  const { add } = useCart();

  const variants =
    product.variants ?? [];

  /*
  |--------------------------------------------------------------------------
  | Select the first available variant.
  |--------------------------------------------------------------------------
  |
  | This means one-of-one products continue to work
  | without requiring the customer to select anything.
  |
  */

  const firstAvailableVariant =
    variants.find(
      (variant) =>
        variant.status === "available" &&
        Number(variant.quantity) > 0
    ) ?? null;

  const [selectedVariantId, setSelectedVariantId] =
    useState<string | null>(
      firstAvailableVariant?.id ?? null
    );

  const [showAdded, setShowAdded] =
    useState(false);

  const [selectionError, setSelectionError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Keep the selected variant valid if the
  | product data changes.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      selectedVariantId &&
      variants.some(
        (variant) =>
          variant.id ===
          selectedVariantId
      )
    ) {
      return;
    }

    setSelectedVariantId(
      firstAvailableVariant?.id ?? null
    );
  }, [
    selectedVariantId,
    firstAvailableVariant?.id,
    variants,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Current selected variant.
  |--------------------------------------------------------------------------
  */

  const selectedVariant =
    useMemo<ProductVariant | null>(
      () =>
        variants.find(
          (variant) =>
            variant.id ===
            selectedVariantId
        ) ??
        firstAvailableVariant,
      [
        variants,
        selectedVariantId,
        firstAvailableVariant,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | TELL PRODUCT GALLERY ABOUT VARIANT CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "thriftemist:variant-change",
        {
          detail: {
            variantId:
              selectedVariant.id,
            colour:
              selectedVariant.colour ??
              "",
          },
        }
      )
    );
  }, [selectedVariant]);

  /*
  |--------------------------------------------------------------------------
  | Available sizes.
  |--------------------------------------------------------------------------
  */

  const sizes = useMemo(() => {
    return Array.from(
      new Set(
        variants
          .map((variant) =>
            variant.size?.trim()
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );
  }, [variants]);

  /*
  |--------------------------------------------------------------------------
  | Available colours.
  |--------------------------------------------------------------------------
  */

  const colours = useMemo(() => {
    return Array.from(
      new Set(
        variants
          .map((variant) =>
            variant.colour?.trim()
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );
  }, [variants]);

  const hasSizeOptions =
    sizes.length > 0;

  const hasColourOptions =
    colours.length > 0;

  const hasVariants =
    variants.length > 0;

  const hasMultipleVariants =
    variants.length > 1;

  /*
  |--------------------------------------------------------------------------
  | Whether the selected variant is actually
  | available for purchase.
  |--------------------------------------------------------------------------
  */

  const selectedAvailable =
    Boolean(
      selectedVariant &&
        selectedVariant.status ===
          "available" &&
        Number(
          selectedVariant.quantity
        ) > 0
    );

  /*
  |--------------------------------------------------------------------------
  | Product-level fallback for legacy
  | one-of-one products.
  |--------------------------------------------------------------------------
  */

  const legacyAvailable =
    product.status ===
      "available" &&
    Number(product.quantity) > 0;

  const sold =
    hasVariants
      ? !selectedAvailable
      : !legacyAvailable;

  /*
  |--------------------------------------------------------------------------
  | Selected price.
  |--------------------------------------------------------------------------
  */

  const displayPrice =
    selectedVariant
      ? Number(
          selectedVariant.selling_price
        )
      : Number(product.price);

  /*
  |--------------------------------------------------------------------------
  | Selected stock.
  |--------------------------------------------------------------------------
  */

  const displayQuantity =
    selectedVariant
      ? Number(
          selectedVariant.quantity
        )
      : Number(product.quantity);

  /*
  |--------------------------------------------------------------------------
  | Find the variant matching a potential
  | size/colour combination.
  |--------------------------------------------------------------------------
  |
  | Passing null means:
  |
  | "Do not require this property to match."
  |
  */

  function findVariant(
    size?: string | null,
    colour?: string | null
  ) {
    return variants.find(
      (variant) => {
        const sizeMatches =
          size == null ||
          !hasSizeOptions ||
          variant.size === size;

        const colourMatches =
          colour == null ||
          !hasColourOptions ||
          variant.colour === colour;

        return (
          sizeMatches &&
          colourMatches &&
          variant.status ===
            "available" &&
          Number(
            variant.quantity
          ) > 0
        );
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Change size while preserving colour
  | whenever possible.
  |--------------------------------------------------------------------------
  */

  function handleSizeChange(
    size: string
  ) {
    setSelectionError("");

    const currentColour =
      selectedVariant?.colour ??
      null;

    /*
     * First try the exact colour + size.
     */

    const exact =
      variants.find(
        (variant) =>
          variant.size === size &&
          variant.colour ===
            currentColour &&
          variant.status ===
            "available" &&
          Number(
            variant.quantity
          ) > 0
      ) ?? null;

    /*
     * If exact combination is unavailable,
     * find any available variant for the
     * requested size while preserving colour
     * whenever possible.
     */

    const fallback =
      exact ??
      findVariant(
        size,
        currentColour
      ) ??
      findVariant(
        size,
        null
      );

    if (fallback) {
      setSelectedVariantId(
        fallback.id
      );
    } else {
      setSelectedVariantId(null);

      setSelectionError(
        "This combination is currently unavailable."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Change colour while preserving size
  | whenever possible.
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | Current: Brown / L
  | Click:   Green
  |
  | 1. Try Green / L
  | 2. If unavailable, find ANY available
  |    Green size.
  | 3. Select that variant.
  |
  */

  function handleColourChange(
    colour: string
  ) {
    setSelectionError("");

    const currentSize =
      selectedVariant?.size ??
      null;

    /*
     * First try the exact colour + current size.
     */

    const exact =
      variants.find(
        (variant) =>
          variant.colour === colour &&
          variant.size ===
            currentSize &&
          variant.status ===
            "available" &&
          Number(
            variant.quantity
          ) > 0
      ) ?? null;

    /*
     * If the exact combination doesn't
     * exist, use ANY available size of
     * the selected colour.
     */

    const anyAvailableColour =
      variants.find(
        (variant) =>
          variant.colour === colour &&
          variant.status ===
            "available" &&
          Number(
            variant.quantity
          ) > 0
      ) ?? null;

    const fallback =
      exact ??
      anyAvailableColour;

    if (fallback) {
      setSelectedVariantId(
        fallback.id
      );
    } else {
      setSelectedVariantId(null);

      setSelectionError(
        "This colour is currently unavailable."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Whether a particular size is currently
  | purchasable with the selected colour.
  |--------------------------------------------------------------------------
  */

  function isSizeAvailable(
    size: string
  ) {
    return variants.some(
      (variant) => {
        if (
          variant.size !== size
        ) {
          return false;
        }

        if (
          hasColourOptions &&
          selectedVariant?.colour
        ) {
          if (
            variant.colour !==
            selectedVariant.colour
          ) {
            return false;
          }
        }

        return (
          variant.status ===
            "available" &&
          Number(
            variant.quantity
          ) > 0
        );
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Whether a particular colour is currently
  | purchasable.
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | We intentionally do NOT require the
  | currently selected size to match here.
  |
  | If Green / L doesn't exist but Green / M
  | is available, Green must still be clickable.
  |
  */

  function isColourAvailable(
    colour: string
  ) {
    return variants.some(
      (variant) =>
        variant.colour === colour &&
        variant.status ===
          "available" &&
        Number(
          variant.quantity
        ) > 0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Added-to-cart popup.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!showAdded) {
      return;
    }

    const timer =
      setTimeout(() => {
        setShowAdded(false);
      }, 4000);

    return () =>
      clearTimeout(timer);
  }, [showAdded]);

  /*
  |--------------------------------------------------------------------------
  | Add exact variant to cart.
  |--------------------------------------------------------------------------
  */

  function handleAdd() {
    setSelectionError("");

    if (sold) {
      return;
    }

    if (
      hasVariants &&
      !selectedVariant
    ) {
      setSelectionError(
        "Please select an available option."
      );

      return;
    }

    if (
      hasVariants &&
      !selectedAvailable
    ) {
      setSelectionError(
        "This selection is currently unavailable."
      );

      return;
    }

    if (selectedVariant) {
      add(
        product,
        selectedVariant
      );
    } else {
      add(product);
    }

    setShowAdded(true);
  }

  return (
    <>
      {/* ================================================================ */}
      {/* VARIANT SELECTORS                                                 */}
      {/* ================================================================ */}

      {hasMultipleVariants ? (
        <div className="col-span-full mb-3 border border-black/15 bg-[#F8F3E0] p-4">
          <div className="space-y-5">

            {/* ---------------------------------------------------------- */}
            {/* COLOUR                                                      */}
            {/* ---------------------------------------------------------- */}

            {hasColourOptions ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-black/45">
                    Colour
                  </span>

                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#153726]">
                    {selectedVariant?.colour ||
                      "Select"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {colours.map(
                    (colour) => {
                      const active =
                        selectedVariant?.colour ===
                        colour;

                      const available =
                        isColourAvailable(
                          colour
                        );

                      return (
                        <button
                          key={colour}
                          type="button"
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleColourChange(
                              colour
                            )
                          }
                          className={[
                            "border px-4 py-2.5 text-[9px] uppercase tracking-[0.14em] transition",
                            active
                              ? "border-[#153726] bg-[#153726] text-[#F8F3E0]"
                              : "border-black/20 bg-transparent text-[#14251D] hover:border-[#153726]",
                            !available
                              ? "cursor-not-allowed opacity-30 line-through"
                              : "",
                          ].join(" ")}
                        >
                          {colour}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}

            {/* ---------------------------------------------------------- */}
            {/* SIZE                                                         */}
            {/* ---------------------------------------------------------- */}

            {hasSizeOptions ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-black/45">
                    Size
                  </span>

                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#153726]">
                    {selectedVariant?.size ||
                      "Select"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sizes.map(
                    (size) => {
                      const active =
                        selectedVariant?.size ===
                        size;

                      const available =
                        isSizeAvailable(
                          size
                        );

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleSizeChange(
                              size
                            )
                          }
                          className={[
                            "min-w-[52px] border px-4 py-2.5 text-[9px] uppercase tracking-[0.14em] transition",
                            active
                              ? "border-[#153726] bg-[#153726] text-[#F8F3E0]"
                              : "border-black/20 bg-transparent text-[#14251D] hover:border-[#153726]",
                            !available
                              ? "cursor-not-allowed opacity-30 line-through"
                              : "",
                          ].join(" ")}
                        >
                          {size}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}

            {/* ---------------------------------------------------------- */}
            {/* SELECTED VARIANT INFO                                       */}
            {/* ---------------------------------------------------------- */}

            {selectedVariant ? (
              <div className="flex items-end justify-between border-t border-black/10 pt-4">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.18em] text-black/40">
                    Selected
                  </p>

                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#153726]">
                    {[
                      selectedVariant.colour,
                      selectedVariant.size,
                    ]
                      .filter(Boolean)
                      .join(" / ") ||
                      "One of One"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-[#14251D]">
                    ₹
                    {displayPrice.toLocaleString(
                      "en-IN"
                    )}
                  </p>

                  <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-black/40">
                    {displayQuantity}{" "}
                    available
                  </p>
                </div>
              </div>
            ) : null}

            {/* ---------------------------------------------------------- */}
            {/* ERROR                                                        */}
            {/* ---------------------------------------------------------- */}

            {selectionError ? (
              <p className="border border-red-900/15 bg-red-50 px-3 py-2 text-[9px] uppercase tracking-[0.1em] text-red-900">
                {selectionError}
              </p>
            ) : null}

          </div>
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* ADD TO CART BUTTON                                                */}
      {/* ================================================================ */}

      <button
        type="button"
        disabled={sold}
        onClick={handleAdd}
        className="w-full border border-[#153726] bg-[#153726] px-6 py-4 text-xs uppercase tracking-[0.18em] text-[#F8F3E0] transition hover:bg-[#102A20] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/40"
      >
        {sold
          ? "Sold Out"
          : "Add to Cart"}
      </button>

      {/* ================================================================ */}
      {/* ADDED TO CART                                                     */}
      {/* ================================================================ */}

      {showAdded ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[9999] w-[360px] max-w-[calc(100vw-32px)] border border-[#B39A6B] bg-[#F8F3E0] p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#153726]">
                ✓ Added to Cart
              </p>

              <p className="mt-3 text-sm font-medium text-[#14251D]">
                {product.name}
              </p>

              {selectedVariant ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#153726]">
                  {[
                    selectedVariant.colour,
                    selectedVariant.size,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-[#64665F]">
                Your selection has been added to your cart.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAdded(false)
              }
              className="text-xl text-[#555750]"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/cart"
              className="bg-[#153726] px-4 py-3 text-center text-[9px] uppercase tracking-[0.18em] text-[#F8F3E0]"
            >
              View Cart
            </Link>

            <button
              type="button"
              onClick={() =>
                setShowAdded(false)
              }
              className="border border-[#B7AF9E] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#14251D]"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}