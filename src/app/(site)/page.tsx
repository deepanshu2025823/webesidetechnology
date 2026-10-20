import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
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
import { VideoCarousel } from "@/components/sections/VideoCarousel";
import { JsonLd } from "@/components/JsonLd";
import {
  getClientLogos,
  getFaqs,
  getHeroSlides,
  getHighlights,
  getHomeSections,
  getPosts,
  getProcessSteps,
  getProjects,
  getServices,
  getSettings,
  getStats,
  getTestimonials,
  getVideoSlides,
} from "@/lib/queries";
import { SPACING_CLASS, resolveSections, type HomeSectionKey } from "@/lib/home-sections";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return buildMetadata({ path: "/" });
}

/**
 * A band on the page.
 *
 * `self` marks the sections that draw their own full-width container — the hero,
 * the logo strip, the showreel, the closing band. Everything else hands over
 * just its contents and is wrapped here, which is what lets one place decide
 * order, spacing and the alternating background.
 */
type Band = { node: ReactNode; self?: boolean; tone?: "navy" };

export default async function HomePage() {
  const [
    settings,
    slides,
    logos,
    services,
    stats,
    steps,
    projects,
    testimonials,
    posts,
    faqs,
    videos,
    highlights,
    sectionRows,
  ] = await Promise.all([
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
    getVideoSlides(),
    getHighlights(),
    getHomeSections(),
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

  const bands: Partial<Record<HomeSectionKey, Band>> = {
    hero: {
      self: true,
      node: (
        <Hero
          slides={heroSlides}
          stats={stats.map((s) => ({ label: s.label, value: s.value, suffix: s.suffix }))}
        />
      ),
    },

    logos: { self: true, node: <LogoMarquee logos={logos} title="Trusted by growing brands" /> },

    brand: { self: true, node: <BrandPhilosophy /> },

    videos:
      settings.videoEnabled && videos.length
        ? {
            self: true,
            node: (
              <VideoCarousel
                items={videos.map((v) => ({
                  id: v.id,
                  title: v.title,
                  description: v.description,
                  url: v.url,
                  thumbnail: v.thumbnail,
                }))}
                title={settings.videoTitle}
                subtitle={settings.videoSubtitle}
                perRow={settings.videoPerRow}
                aspect={settings.videoAspect}
              />
            ),
          }
        : undefined,

    services: services.length
      ? {
          node: (
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
          ),
        }
      : undefined,

    why: {
      node: (
        <Container size="wide">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-navy-900/10 bg-navy-950 p-10 shadow-brand">
                {/* An uploaded picture fills the panel; the brand lockup is the
                    fallback and keeps its own breathing room inside it. */}
                {settings.whyImage ? (
                  <Image
                    src={settings.whyImage}
                    alt={settings.whyTitle || settings.siteName}
                    width={1024}
                    height={768}
                    className="-m-10 h-auto w-[calc(100%+5rem)] max-w-none"
                  />
                ) : (
                  <Image
                    src={settings.logoDark}
                    alt={settings.siteName}
                    width={1024}
                    height={512}
                    className="mx-auto h-auto w-full max-w-xs"
                  />
                )}
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
                eyebrow={settings.whyEyebrow}
                title={settings.whyTitle}
                description={settings.whyBody}
              />

              {highlights.length ? (
                <ul className="mt-10 grid gap-6 sm:grid-cols-2">
                  {highlights.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-700">
                        <Icon name={item.icon} className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-navy-900">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {settings.whyCtaLabel ? (
                <Link href={settings.whyCtaUrl || "/about"} className={buttonClass("outline", "md", "mt-10")}>
                  {settings.whyCtaLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </Container>
      ),
    },

    process: steps.length
      ? {
          node: (
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
          ),
        }
      : undefined,

    portfolio: projects.length
      ? {
          node: (
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
          ),
        }
      : undefined,

    testimonials: testimonials.length
      ? {
          tone: "navy",
          node: (
            <Container>
              <SectionHeading eyebrow="Client voices" title="What our clients say" align="center" tone="dark" />
              <div className="mt-14">
                <Testimonials items={testimonials} />
              </div>
            </Container>
          ),
        }
      : undefined,

    blog: posts.length
      ? {
          node: (
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
          ),
        }
      : undefined,

    faq: faqs.length
      ? {
          node: (
            <Container>
              <SectionHeading eyebrow="Questions" title="Things clients ask before starting" align="center" />
              <div className="mt-12">
                <FaqAccordion items={faqs} />
              </div>
            </Container>
          ),
        }
      : undefined,

    cta: {
      self: true,
      node: (
        <CtaBand
          title={settings.ctaTitle}
          subtitle={settings.ctaSubtitle}
          buttonLabel={settings.ctaButton}
          buttonUrl={settings.ctaUrl}
          phone={settings.phone}
        />
      ),
    },
  };

  /*
   * The cream/white alternation is computed from the final order rather than
   * written onto each section, so reordering in admin cannot leave two cream
   * bands touching. The dark band sits outside the count — it reads as a break
   * in the rhythm either way, and letting it consume a turn would flip every
   * section after it.
   */
  let plainBands = 0;

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

      {resolveSections(sectionRows).map((section) => {
        if (!section.isActive) return null;
        const band = bands[section.key];
        if (!band) return null;

        if (band.self) return <Fragment key={section.key}>{band.node}</Fragment>;

        const navy = band.tone === "navy";
        const shaded = !navy && plainBands++ % 2 === 1;

        return (
          <section
            key={section.key}
            className={cn(
              navy && "relative isolate overflow-hidden bg-navy-950",
              shaded && "bg-cream",
              SPACING_CLASS[section.spacing],
            )}
          >
            {navy ? (
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(181,135,38,0.20), transparent 65%)" }}
              />
            ) : null}
            {band.node}
          </section>
        );
      })}
    </>
  );
}
