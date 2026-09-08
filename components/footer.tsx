import Link from "next/link";

const STORE_MAP_URL = "https://maps.app.goo.gl/LgCBd8C7R1e2ApZq6";

export function Footer() {
  return (
    <footer className="editorial-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">THRIFTEMIST</div>
          <p>Vintage / Curated / One-of-One</p>
        </div>

        <div className="footer-links">
          <div>
            <span>Shop</span>
            <Link href="/shop">Shop</Link>
            <Link href="/latest-drop">Latest Drop</Link>
            <Link href="/drops">Previous Drops</Link>
          </div>

          <div>
            <span>Visit</span>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <a
              href={STORE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Our Store ↗
            </a>
            <Link href="/request">Request a Piece</Link>
          </div>

          <div>
            <span>Connect</span>
            <a
              href="https://www.instagram.com/thriftemist/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a href="mailto:hello@thriftemist.com">Email</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} THRIFTEMIST</span>
        <span>EST. 2024</span>
        <span>PRIVACY / TERMS</span>
      </div>
    </footer>
  );
}
