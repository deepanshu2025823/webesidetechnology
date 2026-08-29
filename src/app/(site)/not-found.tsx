import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="bg-navy-950 py-28">
      <Container size="narrow">
        <div className="text-center">
          <Image
            src="/brand/logo-mark-light.png"
            alt=""
            width={512}
            height={303}
            className="mx-auto h-auto w-32 opacity-70"
          />
          <p className="mt-10 font-display text-6xl text-gold-400">404</p>
          <h1 className="mt-4 text-3xl text-white">This page has moved on</h1>
          <p className="mx-auto mt-4 max-w-md text-navy-200">
            The link is broken or the page was retired. Try the services page, or tell us what you were looking for.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/" className={buttonClass("primary", "md")}>
              Back to home
            </Link>
            <Link href="/contact" className={buttonClass("light", "md")}>
              Contact us
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
