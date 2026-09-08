"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function SiteChrome() {
  const pathname = usePathname();

  // The root page is our temporary THRIFTEMIST brand landing page.
  // It has its own header/footer treatment.
  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <Header />
      <Footer />
    </>
  );
}