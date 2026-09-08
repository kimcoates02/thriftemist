import Image from "next/image";
import {
  ArrowUpRight,
  Instagram,
  Phone,
  MessageCircle,
  MapPin,
} from "lucide-react";

const HERO_IMAGE = "/thriftemist-hero.webp";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F1EBDD] text-[#111111]">

      {/* ================================================================
          HERO
      ================================================================= */}

      <section className="relative min-h-[78vh] overflow-hidden bg-[#153726] text-[#F1EBDD] md:min-h-[82vh]">

        <Image
          src={HERO_IMAGE}
          alt="THRIFTEMIST curated fashion"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-[#153726]/65" />

        <div className="relative z-10 flex min-h-[78vh] flex-col justify-between px-6 py-7 md:min-h-[82vh] md:px-10 md:py-9">

          {/* Top */}

          <div className="flex items-start justify-between">

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#F1EBDD]/70">
                Srinagar · Kashmir
              </p>

              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">
                THRIFTEMIST
              </h1>

              <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-[#F1EBDD]/60">
                Vintage · Surplus · Contemporary
              </p>
            </div>

            <p className="hidden text-right text-[10px] uppercase leading-5 tracking-[0.25em] text-[#F1EBDD]/65 md:block">
              Vintage
              <br />
              Surplus
              <br />
              Contemporary
            </p>

          </div>


          {/* Hero Copy */}

          <div className="max-w-6xl pb-2 md:pb-4">

            <p className="mb-5 text-[10px] uppercase tracking-[0.35em] text-[#F1EBDD]/65">
              Carefully selected clothing
            </p>

            <h2 className="max-w-5xl text-[3.7rem] font-medium leading-[0.88] tracking-[-0.055em] sm:text-6xl md:text-8xl lg:text-[8rem]">
              NEW PIECES.
              <br />
              OLD STORIES.
            </h2>

            <div className="mt-8 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">

              <p className="max-w-md text-sm leading-7 text-[#F1EBDD]/75 md:text-base">
                THRIFTEMIST is a curated fashion store bringing together
                vintage pieces, quality surplus and selected contemporary
                clothing — all under one roof.
              </p>

              <a
                href="#about"
                className="inline-flex w-fit items-center gap-3 border border-[#F1EBDD]/40 px-5 py-3.5 text-[10px] uppercase tracking-[0.22em] transition hover:bg-[#F1EBDD] hover:text-[#153726]"
              >
                Discover THRIFTEMIST
                <ArrowUpRight size={15} strokeWidth={1.4} />
              </a>

            </div>

          </div>

        </div>
      </section>


      {/* ================================================================
          WHAT WE DEAL IN
      ================================================================= */}

      <section className="border-b border-black/10 px-6 py-20 md:px-10 md:py-24">

        <div className="mb-12 md:mb-16">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#153726]/60">
            What we deal in
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl">
            Three worlds.
            <br />
            One point of view.
          </h2>

        </div>


        <div className="grid border-t border-black/15 md:grid-cols-3">

          {/* Vintage */}

          <div className="border-b border-black/15 py-8 md:border-b-0 md:border-r md:pr-8">

            <span className="text-[10px] text-black/40">
              01
            </span>

            <h3 className="mt-12 text-2xl font-medium tracking-[-0.03em]">
              VINTAGE
            </h3>

            <p className="mt-4 max-w-xs text-sm leading-6 text-black/60">
              Older pieces with character, history and a story of their own.
            </p>

          </div>


          {/* Surplus */}

          <div className="border-b border-black/15 py-8 md:border-b-0 md:border-r md:px-8">

            <span className="text-[10px] text-black/40">
              02
            </span>

            <h3 className="mt-12 text-2xl font-medium tracking-[-0.03em]">
              SURPLUS
            </h3>

            <p className="mt-4 max-w-xs text-sm leading-6 text-black/60">
              Quality branded and surplus pieces sourced beyond the ordinary
              retail shelf.
            </p>

          </div>


          {/* Contemporary */}

          <div className="py-8 md:pl-8">

            <span className="text-[10px] text-black/40">
              03
            </span>

            <h3 className="mt-12 text-2xl font-medium tracking-[-0.03em]">
              CONTEMPORARY
            </h3>

            <p className="mt-4 max-w-xs text-sm leading-6 text-black/60">
              Selected new pieces for those who like their wardrobe current
              without being ordinary.
            </p>

          </div>

        </div>

      </section>


      {/* ================================================================
          ABOUT
      ================================================================= */}

      <section
        id="about"
        className="bg-[#153726] px-6 py-20 text-[#F1EBDD] md:px-10 md:py-28"
      >

        <div className="grid gap-12 md:grid-cols-2 md:gap-20">

          <div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-[#F1EBDD]/50">
              About THRIFTEMIST
            </p>

            <h2 className="mt-6 text-4xl font-medium leading-[0.92] tracking-[-0.045em] md:text-6xl">
              NOT JUST
              <br />
              ANOTHER
              <br />
              CLOTHING STORE.
            </h2>

          </div>


          <div className="flex flex-col justify-end">

            <p className="max-w-xl text-base leading-8 text-[#F1EBDD]/75">
              We believe good clothing can come from anywhere. A vintage
              piece with decades behind it, a surplus find that never made
              it to the mainstream shelf, or a new contemporary piece that
              simply deserves attention.
            </p>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#F1EBDD]/75">
              THRIFTEMIST brings them together through a carefully selected
              collection built around individuality, quality and discovery.
            </p>

          </div>

        </div>

      </section>


      {/* ================================================================
          STORE
      ================================================================= */}

      <section className="grid md:grid-cols-2">

        {/* Address */}

        <div className="px-6 py-20 md:px-10 md:py-24">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#153726]/60">
            Visit us
          </p>

          <h2 className="mt-5 text-4xl font-medium leading-[0.92] tracking-[-0.04em] md:text-6xl">
            OUR
            <br />
            STORE.
          </h2>

          <div className="mt-10 flex items-start gap-4">

            <MapPin
              size={18}
              strokeWidth={1.4}
              className="mt-1 shrink-0"
            />

            <div>

              <p className="text-sm leading-6">
                Afzal Complex, MoominAabad
                <br />
                Batamaloo, Srinagar
                <br />
                Jammu & Kashmir
              </p>

              <a
                href="https://maps.app.goo.gl/LgCBd8C7R1e2ApZq6"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 border-b border-black/30 pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60"
              >
                Get Directions
                <ArrowUpRight size={13} strokeWidth={1.4} />
              </a>

            </div>

          </div>

        </div>


        {/* Store CTA */}

        <div className="flex min-h-[400px] flex-col justify-between bg-[#E5DDCC] px-6 py-20 md:px-10 md:py-24">

          <p className="text-[10px] uppercase tracking-[0.3em] text-black/50">
            Come find your next piece.
          </p>

          <div>

            <p className="max-w-md text-2xl leading-8 tracking-[-0.025em] md:text-3xl">
              Explore the collection in person.
              <br />
              Take your time. Find something that's yours.
            </p>

            <a
              href="https://maps.app.goo.gl/LgCBd8C7R1e2ApZq6"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 bg-[#153726] px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-[#F1EBDD] transition hover:bg-[#111111]"
            >
              Visit THRIFTEMIST
              <ArrowUpRight size={15} strokeWidth={1.4} />
            </a>

          </div>

        </div>

      </section>


      {/* ================================================================
          CONTACT
      ================================================================= */}

      <section className="border-t border-black/10 px-6 py-20 md:px-10 md:py-24">

        <div className="grid gap-14 md:grid-cols-2">

          <div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-[#153726]/60">
              Stay connected
            </p>

            <h2 className="mt-5 text-4xl font-medium leading-[0.92] tracking-[-0.04em] md:text-6xl">
              FIND US.
              <br />
              FOLLOW US.
            </h2>

          </div>


          <div className="flex flex-col">

            {/* Instagram */}

            <a
              href="https://www.instagram.com/thriftemist"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow THRIFTEMIST on Instagram"
              className="flex items-center justify-between border-t border-black/15 py-6 transition-opacity hover:opacity-60"
            >

              <span className="flex items-center gap-4">
                <Instagram size={18} strokeWidth={1.4} />
                Instagram
              </span>

              <ArrowUpRight size={17} strokeWidth={1.4} />

            </a>

            {/* X */}

<a
  href="https://x.com/THRIFTEMIST"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Follow THRIFTEMIST on X"
  className="flex items-center justify-between border-t border-black/15 py-6 transition-opacity hover:opacity-60"
>
  <span className="flex items-center gap-4">
    <span className="text-lg font-medium leading-none">𝕏</span>
    X
  </span>

  <ArrowUpRight size={17} strokeWidth={1.4} />
</a>

            {/* Phone 1 */}

<a
  href="tel:+917006322899"
  aria-label="Call THRIFTEMIST on 70063 22899"
  className="flex items-center justify-between border-t border-black/15 py-6 transition-opacity hover:opacity-60"
>
  <span className="flex items-center gap-4">
    <Phone size={18} strokeWidth={1.4} />
    +91 70063 22899
  </span>

  <ArrowUpRight size={17} strokeWidth={1.4} />
</a>


{/* Phone 2 */}

<a
  href="tel:+919796171768"
  aria-label="Call THRIFTEMIST on 97961 71768"
  className="flex items-center justify-between border-t border-black/15 py-6 transition-opacity hover:opacity-60"
>
  <span className="flex items-center gap-4">
    <Phone size={18} strokeWidth={1.4} />
    +91 97961 71768
  </span>

  <ArrowUpRight size={17} strokeWidth={1.4} />
</a>


            {/* WhatsApp */}

            <a
              href="https://wa.me/917006322899"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact THRIFTEMIST on WhatsApp"
              className="flex items-center justify-between border-y border-black/15 py-6 transition-opacity hover:opacity-60"
            >

              <span className="flex items-center gap-4">
                <MessageCircle size={18} strokeWidth={1.4} />
                WhatsApp
              </span>

              <ArrowUpRight size={17} strokeWidth={1.4} />

            </a>

          </div>

        </div>

      </section>


      {/* ================================================================
          FOOTER
      ================================================================= */}

      <footer className="bg-[#111111] px-6 py-8 text-[#F1EBDD] md:px-10">

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-lg font-semibold tracking-[-0.03em]">
              THRIFTEMIST
            </p>

            <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-[#F1EBDD]/45">
              Vintage · Surplus · Contemporary
            </p>

          </div>

          <p className="text-[9px] uppercase tracking-[0.2em] text-[#F1EBDD]/40">
            © {new Date().getFullYear()} THRIFTEMIST
          </p>

        </div>

      </footer>

    </main>
  );
}