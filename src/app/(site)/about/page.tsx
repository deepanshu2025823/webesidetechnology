import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/site/PageHero";
import { ProcessTimeline } from "@/components/sections/ProcessTimeline";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { getPageBySlug, getProcessSteps, getSettings, getStats, getTeam } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { Mail } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/SocialIcons";

export async function generateMetadata() {
  const [page, settings] = await Promise.all([getPageBySlug("about"), getSettings()]);
  return buildMetadata({
    title: page?.metaTitle || "About Us",
    description:
      page?.metaDescription ||
      `${settings.siteName} is a full-service IT and digital marketing agency. Meet the team and the way we work.`,
    keywords: page?.metaKeywords,
    path: "/about",
  });
}

export default async function AboutPage() {
  const [page, settings, team, stats, steps] = await Promise.all([
    getPageBySlug("about"),
    getSettings(),
    getTeam(),
    getStats(),
    getProcessSteps(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "About", path: "/about" }])} />
      <PageHero
        eyebrow="About us"
        title={page?.heroTitle || "One team for technology and growth"}
        description={
          page?.heroSubtitle ||
          "We started Sahab India because businesses were stitching together a web developer, an SEO freelancer and an ads agency who never spoke to each other. We put all of it under one roof, with one plan."
        }
        crumbs={[{ name: "About", path: "/about" }]}
        image={page?.heroImage}
      />

      {stats.length ? (
        <section className="border-b border-navy-900/10 bg-cream py-10">
          <Container size="wide">
            <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.slice(0, 4).map((stat) => (
                <div key={stat.id} className="text-center">
                  <dd className="font-display text-3xl text-navy-900 sm:text-4xl">
                    {stat.value}
                    <span className="text-gold-600">{stat.suffix}</span>
                  </dd>
                  <dt className="mt-2 text-xs uppercase tracking-wider text-slate-500">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </Container>
        </section>
      ) : null}

      <section className="py-16 sm:py-20">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {page?.content ? (
                <div className="prose prose-brand max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <div className="prose prose-brand max-w-none">
                  <h2>Who we are</h2>
                  <p>
                    {settings.siteName} is a full-service IT and digital marketing agency. We design and build
                    websites, web portals and mobile apps, then run the search, social and paid campaigns that
                    bring people to them.
                  </p>
                  <h2>How we&apos;re different</h2>
                  <p>
                    Most agencies sell you a deliverable. We sell you an outcome and show our working: a written
                    scope, named owners, milestone dates and a report at the end of every cycle. If a channel is
                    not paying for itself, we will tell you before you ask.
                  </p>
                </div>
              )}
            </div>

            <aside className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-navy-900/10 bg-navy-950 p-10">
                <Image
                  src="/brand/logo-light.png"
                  alt={settings.siteName}
                  width={1024}
                  height={1043}
                  className="mx-auto h-auto w-full max-w-[260px]"
                />
                <p className="mt-8 text-center font-display text-lg leading-relaxed text-gold-200">
                  &ldquo;{settings.tagline}&rdquo;
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {steps.length ? (
        <section className="bg-cream py-16 sm:py-20">
          <Container size="wide">
            <SectionHeading eyebrow="Our process" title="The way every project runs" align="center" />
            <div className="mt-14">
              <ProcessTimeline steps={steps} />
            </div>
          </Container>
        </section>
      ) : null}

      {team.length ? (
        <section className="py-16 sm:py-20">
          <Container size="wide">
            <SectionHeading
              eyebrow="The team"
              title="People you'll actually work with"
              description="Small, senior and directly reachable — no account layers between you and the work."
              align="center"
            />

            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <li
                  key={member.id}
                  className="group overflow-hidden rounded-2xl border border-navy-900/10 bg-white text-center transition-all hover:-translate-y-1 hover:shadow-brand"
                >
                  <div className="relative aspect-square overflow-hidden bg-navy-100">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 280px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-navy-900">
                        <Icon name="User" className="size-14 text-gold-500/60" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-navy-900">{member.name}</h3>
                    <p className="mt-0.5 text-sm text-gold-700">{member.role}</p>
                    {member.bio ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{member.bio}</p> : null}

                    {member.linkedin || member.email ? (
                      <div className="mt-4 flex justify-center gap-2">
                        {member.linkedin ? (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on LinkedIn`}
                            className="grid size-9 place-items-center rounded-full border border-navy-900/15 text-navy-700 transition-colors hover:border-gold-500 hover:text-gold-700"
                          >
                            <LinkedinIcon className="size-4" />
                          </a>
                        ) : null}
                        {member.email ? (
                          <a
                            href={`mailto:${member.email}`}
                            aria-label={`Email ${member.name}`}
                            className="grid size-9 place-items-center rounded-full border border-navy-900/15 text-navy-700 transition-colors hover:border-gold-500 hover:text-gold-700"
                          >
                            <Mail className="size-4" />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
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
