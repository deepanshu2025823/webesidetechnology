import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Headset, Rocket, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClass } from "@/components/ui/Button";
import { Hero, type Slide } from "@/components/sections/Hero";
import { LogoMarquee } from "@/components/sections/LogoMarquee";
import { BrandPhilosophy } from "@/components/sections/BrandPhilosophy";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { ProcessTimeline } from "@/components/sections/ProcessTimeline";
import { Testimonials } from "@/components/sections/Testimonials";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { PostCard } from "@/components/sections/PostCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import {
  getClientLogos,
  getFaqs,
  getHeroSlides,
  getPosts,
  getProcessSteps,
  getProjects,
  getServices,
  getSettings,
  getStats,
  getTestimonials,
} from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildMetadata({ path: "/" });
}

const PROMISES = [
  { icon: Rocket, title: "Launch fast", body: "Sprint-based delivery with weekly demos, so momentum never stalls." },
  { icon: ShieldCheck, title: "Own everything", body: "Source code, domains, hosting and ad accounts stay in your name." },
  { icon: BadgeCheck, title: "Measurable work", body: "Every retainer reports on rankings, leads, spend and pipeline." },
  { icon: Headset, title: "One point of contact", body: "A dedicated account manager across every service you buy." },
];

export default async function HomePage() {
  const [settings, slides, logos, services, stats, steps, projects, testimonials, posts, faqs] = await Promise.all([
    getSettings(),
    getHeroSlides(),
    getClientLogos(),
    getServices({ featuredOnly: true, take: 6 }),
    getStats(),
    getProcessSteps(),
    getProjects({ featuredOnly: true, take: 3 }),
    getTestimonials({ take: 6 }),
    getPosts({ take: 3 }),
    getFaqs("General"),
  ]);

  const heroSlides: Slide[] = slides.length
    ? slides.map((s) => ({
        id: s.id,
        eyebrow: s.eyebrow,
        title: s.title,
        subtitle: s.subtitle,
        image: s.image,
        ctaLabel: s.ctaLabel,
        ctaUrl: s.ctaUrl,
        altLabel: s.altLabel,
        altUrl: s.altUrl,
      }))
    : [
        {
          id: "fallback",
          eyebrow: settings.tagline,
          title: settings.siteName,
          subtitle: settings.description,
          image: null,
          ctaLabel: settings.ctaButton,
          ctaUrl: settings.ctaUrl,
          altLabel: "Our services",
          altUrl: "/services",
        },
      ];

  return (
    <>
      {faqs.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }}
        />
      ) : null}

      <Hero
        slides={heroSlides}
        stats={stats.map((s) => ({ label: s.label, value: s.value, suffix: s.suffix }))}
      />

      <LogoMarquee logos={logos} title="Trusted by growing brands" />

      {/* Brand philosophy --------------------------------------------- */}
      <BrandPhilosophy />

      {/* Services ------------------------------------------------------ */}
      {services.length ? (
        <section className="py-20 sm:py-24">
          <Container size="wide">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="What we do"
                title="Technology and marketing under one roof"
                description="From the website that carries your brand to the campaigns that fill your pipeline — built, run and reported by one accountable team."
              />
              <Link href="/services" className={buttonClass("outline", "md", "shrink-0")}>
                All services
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-12">
              <ServiceGrid services={services} />
            </div>
          </Container>
        </section>
      ) : null}

      {/* Why us -------------------------------------------------------- */}
      <section className="bg-cream py-20 sm:py-24">
        <Container size="wide">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-navy-900/10 bg-navy-950 p-10 shadow-brand">
                <Image
                  src="/brand/logo-light.png"
                  alt={settings.siteName}
                  width={1024}
                  height={390}
                  className="mx-auto h-auto w-full max-w-xs"
                />
              </div>
              {stats.length > 3 ? (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {stats.slice(3, 6).map((stat) => (
                    <div key={stat.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 text-center">
                      <p className="font-display text-2xl text-navy-900">
                        {stat.value}
                        <span className="text-gold-600">{stat.suffix}</span>
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <SectionHeading
                eyebrow="Why Sahab India"
                title="An agency that behaves like your in-house team"
                description="No handoffs between vendors, no finger-pointing when a campaign underperforms. Strategy, build and growth sit in one place, with one plan and one report."
              />

              <ul className="mt-10 grid gap-6 sm:grid-cols-2">
                {PROMISES.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-700">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link href="/about" className={buttonClass("outline", "md", "mt-10")}>
                More about us
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Process ------------------------------------------------------- */}
      {steps.length ? (
        <section className="py-20 sm:py-24">
          <Container size="wide">
            <SectionHeading
              eyebrow="How we work"
              title="A delivery process you can actually follow"
              description="Every engagement runs on the same rhythm — a written scope, a named owner, visible milestones and a report at the end of each cycle."
              align="center"
            />
            <div className="mt-14">
              <ProcessTimeline steps={steps} />
            </div>
          </Container>
        </section>
      ) : null}

      {/* Portfolio ----------------------------------------------------- */}
      {projects.length ? (
        <section className="bg-cream py-20 sm:py-24">
          <Container size="wide">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Selected work"
                title="Results we can point at"
                description="A sample of recent builds and campaigns, with the numbers that mattered to the client."
              />
              <Link href="/portfolio" className={buttonClass("outline", "md", "shrink-0")}>
                View portfolio
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* Testimonials -------------------------------------------------- */}
      {testimonials.length ? (
        <section className="relative isolate overflow-hidden bg-navy-950 py-20 sm:py-24">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(181,135,38,0.20), transparent 65%)" }}
          />
          <Container>
            <SectionHeading eyebrow="Client voices" title="What our clients say" align="center" tone="dark" />
            <div className="mt-14">
              <Testimonials items={testimonials} />
            </div>
          </Container>
        </section>
      ) : null}

      {/* Blog ---------------------------------------------------------- */}
      {posts.length ? (
        <section className="py-20 sm:py-24">
          <Container size="wide">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Insights"
                title="Notes from the workshop"
                description="Practical writing on search, paid media, content and building software that sells."
              />
              <Link href="/blog" className={buttonClass("outline", "md", "shrink-0")}>
                Read the blog
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* FAQ ----------------------------------------------------------- */}
      {faqs.length ? (
        <section className="bg-cream py-20 sm:py-24">
          <Container>
            <SectionHeading
              eyebrow="Questions"
              title="Things clients ask before starting"
              align="center"
            />
            <div className="mt-12">
              <FaqAccordion items={faqs} />
            </div>
          </Container>
        </section>
      ) : null}

      <CtaBand
        title={settings.ctaTitle}
        subtitle={settings.ctaSubtitle}
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}
