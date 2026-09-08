import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const images = [...(product.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const image = images[0]?.url || "/placeholder.svg";
  const second = images[1]?.url;

  return (
    <Link href={`/shop/${product.slug}`} className="editorial-card group">
      <div className="product-media">
        {/* Product number */}
        <span className="product-index">
          {String(product.id).slice(0, 2).toUpperCase()}
        </span>

        {/* Main image */}
        <Image
          src={image}
          alt={product.name}
          fill
          className="product-image"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {/* Second image on hover */}
        {second && (
          <Image
            src={second}
            alt=""
            fill
            className="product-image product-image-second"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        )}

        {/* Product source */}
        <span className="absolute left-3 bottom-3 z-10 bg-[#FAF6E9]/95 px-2.5 py-1.5 text-[8px] font-medium uppercase tracking-[0.16em] text-[#153726]">
          {product.source || "vintage"}
        </span>

        {/* Sold label */}
        {product.status === "sold" && (
          <span className="sold-badge">SOLD</span>
        )}

        {/* View label */}
        <span className="product-view">
          View piece ↗
        </span>
      </div>

      <div className="product-meta">
        <div>
          <div className="product-name">{product.name}</div>

          {product.brand && (
            <div className="product-brand">{product.brand}</div>
          )}
        </div>

        <div className="product-price">
          {money(product.price)}
        </div>
      </div>

      <div className="product-submeta">
        <span>{product.size || "ONE SIZE"}</span>
        <span>{product.condition || "CURATED VINTAGE"}</span>
      </div>
    </Link>
  );
}