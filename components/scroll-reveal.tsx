"use client"; // This tells Next.js these animations happen in the browser

import { motion } from "framer-motion";
import { ReactNode } from "react";

// Creates a smooth upward fade when elements scroll into view
export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Creates a premium slow-zoom out effect for your hero and product images
export function ImageScale({ children, className = "" }: { children: ReactNode, className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}