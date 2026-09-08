"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductImage = {
  id: string;
  url: string;
  sort_order: number;
  variant_colour?: string | null;
};

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
  initialColour?: string | null;
};

function normalizeColour(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default function ProductGallery({
  images,
  productName,
  initialColour,
}: ProductGalleryProps) {
  /*
  |--------------------------------------------------------------------------
  | ALL IMAGES
  |--------------------------------------------------------------------------
  */

  const allImages = useMemo(
    () =>
      [...images].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    [images]
  );

  /*
  |--------------------------------------------------------------------------
  | SELECTED COLOUR
  |--------------------------------------------------------------------------
  */

  const [selectedColour, setSelectedColour] = useState(
    normalizeColour(initialColour)
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LISTEN FOR VARIANT CHANGES
  |--------------------------------------------------------------------------
  |
  | AddToCart dispatches this event whenever the customer
  | changes the selected variant.
  |
  */

  useEffect(() => {
    function handleVariantChange(event: Event) {
      const customEvent =
        event as CustomEvent<{
          variantId?: string;
          colour?: string | null;
        }>;

      const colour = normalizeColour(
        customEvent.detail?.colour
      );

      setSelectedColour(colour);

      /*
       * Always start from the first image of the
       * newly selected colour.
       */
      setActiveIndex(0);
    }

    window.addEventListener(
      "thriftemist:variant-change",
      handleVariantChange
    );

    return () => {
      window.removeEventListener(
        "thriftemist:variant-change",
        handleVariantChange
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FILTER IMAGES BY COLOUR
  |--------------------------------------------------------------------------
  |
  | Priority:
  |
  | 1. Images assigned to selected colour
  | 2. General / All Colours images
  | 3. All product images
  |
  | This keeps old products working even if they don't
  | have colour-specific image assignments.
  |
  */

  const sortedImages = useMemo(() => {
    /*
     * No colour selected:
     * show all images normally.
     */
    if (!selectedColour) {
      return allImages;
    }

    /*
     * Find images assigned to the selected colour.
     */
    const colourImages = allImages.filter(
      (image) =>
        normalizeColour(image.variant_colour) ===
        selectedColour
    );

    if (colourImages.length > 0) {
      return colourImages;
    }

    /*
     * If the selected colour has no dedicated images,
     * use General / All Colours images.
     */
    const generalImages = allImages.filter(
      (image) =>
        !normalizeColour(image.variant_colour)
    );

    if (generalImages.length > 0) {
      return generalImages;
    }

    /*
     * Final fallback:
     * show every product image.
     */
    return allImages;
  }, [allImages, selectedColour]);

  /*
  |--------------------------------------------------------------------------
  | KEEP ACTIVE IMAGE VALID
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(
        current,
        Math.max(sortedImages.length - 1, 0)
      )
    );
  }, [sortedImages.length]);

  /*
  |--------------------------------------------------------------------------
  | IMAGE NAVIGATION
  |--------------------------------------------------------------------------
  */

  function previousImage() {
    setActiveIndex((current) =>
      current === 0
        ? sortedImages.length - 1
        : current - 1
    );
  }

  function nextImage() {
    setActiveIndex((current) =>
      current === sortedImages.length - 1
        ? 0
        : current + 1
    );
  }

  /*
  |--------------------------------------------------------------------------
  | KEYBOARD CONTROLS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }

      if (event.key === "ArrowLeft") {
        previousImage();
      }

      if (event.key === "ArrowRight") {
        nextImage();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [lightboxOpen, sortedImages.length]);

  /*
  |--------------------------------------------------------------------------
  | LOCK PAGE SCROLL WHEN LIGHTBOX IS OPEN
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [lightboxOpen]);

  /*
  |--------------------------------------------------------------------------
  | NO IMAGES
  |--------------------------------------------------------------------------
  */

  if (sortedImages.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-[#DED8C8]">
        <span className="text-xs uppercase tracking-[0.2em] text-black/40">
          No image available
        </span>
      </div>
    );
  }

  const activeImage = sortedImages[activeIndex];

  return (
    <>
      {/* ================================================================ */}
      {/* GALLERY                                                          */}
      {/* ================================================================ */}

      <div className="flex gap-3">

        {/* ============================================================ */}
        {/* DESKTOP THUMBNAILS                                           */}
        {/* ============================================================ */}

        <div className="hidden w-[78px] shrink-0 flex-col gap-3 md:flex">

          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() =>
                setActiveIndex(index)
              }
              aria-label={`View image ${index + 1}`}
              aria-current={
                activeIndex === index
              }
              className={`relative aspect-[4/5] overflow-hidden bg-[#DED8C8] transition ${
                activeIndex === index
                  ? "border border-black"
                  : "border border-black/10 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt={`${productName} image ${
                  index + 1
                }`}
                fill
                sizes="78px"
                className="object-cover"
              />

              {/* MAIN IMAGE LABEL */}

              {index === 0 && (
                <span className="absolute bottom-1 left-1 bg-[#F8F3E0]/95 px-1.5 py-1 text-[7px] uppercase tracking-[0.12em]">
                  Main
                </span>
              )}
            </button>
          ))}

        </div>

        {/* ============================================================ */}
        {/* MAIN IMAGE                                                    */}
        {/* ============================================================ */}

        <div className="relative min-w-0 flex-1">

          <button
            type="button"
            onClick={() =>
              setLightboxOpen(true)
            }
            aria-label="Open product image in full size"
            className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-[#DED8C8]"
          >
            <Image
              src={activeImage.url}
              alt={`${productName} image ${
                activeIndex + 1
              }`}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.015]"
            />

            {/* ZOOM LABEL */}

            <span className="absolute bottom-4 right-4 bg-[#F8F3E0]/95 px-3 py-2 text-[8px] uppercase tracking-[0.16em] opacity-0 transition group-hover:opacity-100">
              View full size
            </span>
          </button>

          {/* IMAGE COUNTER */}

          {sortedImages.length > 1 && (
            <div className="absolute left-4 top-4 bg-[#F8F3E0]/95 px-3 py-2 text-[10px] uppercase tracking-widest">
              {activeIndex + 1} /{" "}
              {sortedImages.length}
            </div>
          )}

          {/* PREVIOUS */}

          {sortedImages.length > 1 && (
            <button
              type="button"
              onClick={previousImage}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-xl shadow-sm transition hover:bg-white"
            >
              ←
            </button>
          )}

          {/* NEXT */}

          {sortedImages.length > 1 && (
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-xl shadow-sm transition hover:bg-white"
            >
              →
            </button>
          )}

        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE THUMBNAILS                                                */}
      {/* ================================================================ */}

      {sortedImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">

          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() =>
                setActiveIndex(index)
              }
              aria-label={`View image ${
                index + 1
              }`}
              aria-current={
                activeIndex === index
              }
              className={`relative h-20 w-16 shrink-0 overflow-hidden bg-[#DED8C8] ${
                activeIndex === index
                  ? "border border-black"
                  : "border border-black/10"
              }`}
            >
              <Image
                src={image.url}
                alt={`${productName} thumbnail ${
                  index + 1
                }`}
                fill
                sizes="64px"
                className="object-cover"
              />

              {index === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-[#F8F3E0]/95 py-1 text-[7px] uppercase tracking-[0.1em]">
                  Main
                </span>
              )}
            </button>
          ))}

        </div>
      )}

      {/* ================================================================ */}
      {/* FULL-SIZE LIGHTBOX                                               */}
      {/* ================================================================ */}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image viewer`}
          onClick={() =>
            setLightboxOpen(false)
          }
        >

          {/* ========================================================== */}
          {/* CLOSE                                                       */}
          {/* ========================================================== */}

          <button
            type="button"
            onClick={() =>
              setLightboxOpen(false)
            }
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl leading-none transition hover:bg-[#F1EBDD] md:right-6 md:top-6"
          >
            ×
          </button>

          {/* ========================================================== */}
          {/* LIGHTBOX CONTENT                                            */}
          {/* ========================================================== */}

          <div
            className="relative h-[88vh] w-full max-w-7xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <Image
              src={activeImage.url}
              alt={`${productName} image ${
                activeIndex + 1
              }`}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />

            {/* ====================================================== */}
            {/* LIGHTBOX PREVIOUS                                       */}
            {/* ====================================================== */}

            {sortedImages.length > 1 && (
              <button
                type="button"
                onClick={previousImage}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F8F3E0]/95 text-xl shadow-lg transition hover:bg-white md:left-4"
              >
                ←
              </button>
            )}

            {/* ====================================================== */}
            {/* LIGHTBOX NEXT                                           */}
            {/* ====================================================== */}

            {sortedImages.length > 1 && (
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F8F3E0]/95 text-xl shadow-lg transition hover:bg-white md:right-4"
              >
                →
              </button>
            )}

            {/* ====================================================== */}
            {/* COUNTER                                                  */}
            {/* ====================================================== */}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#F8F3E0]/95 px-4 py-2 text-[9px] uppercase tracking-[0.18em] md:bottom-5">
              {activeIndex + 1} /{" "}
              {sortedImages.length}
            </div>

          </div>
        </div>
      )}
    </>
  );
}