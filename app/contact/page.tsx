"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      const form = new FormData(e.currentTarget);

      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(form)),
      });

      if (!response.ok) {
        throw new Error("Unable to send enquiry");
      }

      setSent(true);
      e.currentTarget.reset();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="container max-w-3xl py-16">
      <p className="text-xs uppercase tracking-[.25em] text-[#B39A6B]">
        THRIFTEMIST
      </p>

      <h1 className="serif mt-2 text-6xl">Contact THRIFTEMIST</h1>

      <section className="store-contact-card">
        <div>
          <p className="text-[10px] uppercase tracking-[.25em] text-[#B39A6B]">
            Our Store
          </p>
          <h2 className="serif mt-2 text-4xl">
            Visit THRIFTEMIST in person.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-black/65">
            Come visit our physical store and discover our latest vintage,
            surplus and new pieces in person.
          </p>
        </div>

        <a
          href="https://maps.app.goo.gl/LgCBd8C7R1e2ApZq6"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex bg-[#153726] px-6 py-4 text-[10px] uppercase tracking-[.2em] text-[#F8F3E0] transition hover:bg-[#153726]"
        >
          View on Google Maps ↗
        </a>
      </section>

      {sent ? (
        <div className="mt-12 border border-black/10 p-8">
          <h2 className="serif text-3xl">Thank you.</h2>
          <p className="mt-3 text-sm text-black/60">
            We&apos;ve received your message and will get back to you soon.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-10 grid gap-4">
          <input
            name="name"
            required
            placeholder="Name"
            className="border border-black/15 bg-transparent px-4 py-3"
          />

          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="border border-black/15 bg-transparent px-4 py-3"
          />

          <input
            name="phone"
            placeholder="Phone / WhatsApp"
            className="border border-black/15 bg-transparent px-4 py-3"
          />

          <input
            name="subject"
            required
            placeholder="Subject"
            className="border border-black/15 bg-transparent px-4 py-3"
          />

          <textarea
            name="message"
            required
            placeholder="Message"
            rows={7}
            className="border border-black/15 bg-transparent px-4 py-3"
          />

          <button
            type="submit"
            className="mt-4 bg-[#153726] px-6 py-4 text-xs uppercase tracking-widest text-[#F8F3E0]"
          >
            Send Message
          </button>

          {error && (
            <p className="text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}