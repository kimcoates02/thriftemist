"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import type { Product } from "@/lib/types";

function firstImage(product: Product) {
  return [...(product.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0]?.url || "/placeholder.svg";
}

type Props = { products: Product[] };

function groupByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.category?.trim() || "OTHER";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(product);
  }
  return [...groups.entries()];
}

function CategoryRow({
  category,
  items,
  index,
  progress,
}: {
  category: string;
  items: Product[];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const forward = index % 2 === 0;
  const x = useTransform(
    progress,
    [0, 0.22, 0.5, 0.78, 1],
    forward
      ? ["0%", "-10%", "-27%", "-8%", "-34%"]
      : ["-20%", "-5%", "-30%", "-2%", "-24%"],
  );

  return (
    <div className="scroll-category">
      <div className="scroll-category-rule">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{category}</strong>
        <i />
        <small>{items.length} {items.length === 1 ? "PIECE" : "PIECES"}</small>
      </div>

      <div className="scroll-category-viewport">
        <motion.div className="scroll-category-track" style={{ x }}>
          {[...items, ...items].map((product, itemIndex) => (
            <Link
              key={`${product.id}-${itemIndex}`}
              href={`/shop/${product.slug}`}
              className="scroll-product-tile"
            >
              <div className="scroll-product-image">
                <Image
                  src={firstImage(product)}
                  alt={product.name}
                  fill
                  sizes="31vw"
                />
                <span>{String((itemIndex % items.length) + 1).padStart(2, "0")}</span>
              </div>
              <div className="scroll-product-info">
                <span>{product.brand || product.source || "THRIFTEMIST"}</span>
                <strong>{product.name}</strong>
                <small>{product.size || "ONE SIZE"} / {product.condition || "CURATED"}</small>
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function ScrollProductSection({ products }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const groups = groupByCategory(products);

  return (
    <section ref={sectionRef} className="scroll-products" id="available">
      <div className="scroll-products-inner">
        <div className="scroll-products-header">
          <div>
            <span className="campaign-label">THE DROP / AVAILABLE NOW</span>
            <h2>All available<br />pieces.</h2>
          </div>
          <p>Scroll. The collection moves with you.</p>
        </div>

        {groups.length ? (
          <div className="scroll-category-list">
            {groups.map(([category, items], index) => (
              <CategoryRow
                key={category}
                category={category}
                items={items}
                index={index}
                progress={scrollYProgress}
              />
            ))}
          </div>
        ) : (
          <div className="campaign-empty">THE NEXT DROP IS BEING CURATED.</div>
        )}

        <div className="scroll-products-footer">
          <span>{products.length} PIECES / LIVE INVENTORY</span>
          <span>SCROLL TO MOVE / SCROLL TO DISCOVER</span>
        </div>
      </div>
    </section>
  );
}
