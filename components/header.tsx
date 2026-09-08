"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  ["Shop", "/shop"],
  ["Drops", "/drops"],
  ["Archive", "/sold"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname();
  const isCampaign = pathname === "/";

  return (
    <header className={`site-header${isCampaign ? " site-header-campaign" : ""}`}>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          <span>VINTAGE / CURATED / ONE-OF-ONE</span><b>•</b>
          <span>NEW PIECES, OLD STORIES</span><b>•</b>
          <span>THRIFTEMIST ARCHIVE</span><b>•</b>
          <span>LIMITED AVAILABILITY</span><b>•</b>
          <span>VINTAGE / CURATED / ONE-OF-ONE</span><b>•</b>
          <span>NEW PIECES, OLD STORIES</span><b>•</b>
        </div>
      </div>

      <div className="nav-shell">
        <div className="nav-side nav-left">
          <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={20} strokeWidth={1.5}/> : <Menu size={20} strokeWidth={1.5}/>} 
          </button>
          <nav className="desktop-nav">
            {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
        </div>

        <Link href="/" className="brand-mark">THRIFTEMIST</Link>

        <div className="nav-side nav-right">
          <Link href="/shop" aria-label="Search"><Search size={21} strokeWidth={1.4}/></Link>
          <ThemeToggle />
          <Link href="/account" aria-label="Account"><UserRound size={20} strokeWidth={1.4}/></Link>
          <Link href="/cart" className="bag-link" aria-label="Cart">
            <ShoppingBag size={21} strokeWidth={1.4}/>
            {count > 0 && <span className="bag-count">{count}</span>}
          </Link>
        </div>
      </div>

      {open && (
        <nav className="mobile-nav">
          {[...links, ["About", "/about"], ["Contact", "/contact"]].map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
