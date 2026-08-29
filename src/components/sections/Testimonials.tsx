"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type TestimonialItem = {
  id: string;
  authorName: string;
  authorRole: string;
  company: string;
  avatar: string | null;
  quote: string;
  rating: number;
};

export function Testimonials({ items }: { items: TestimonialItem[] }) {
  const [index, setIndex] = useState(0);
  if (!items.length) return null;

  const item = items[index];
  const move = (delta: number) => setIndex((i) => (i + delta + items.length) % items.length);

  return (
    <div className="relative mx-auto max-w-3xl text-center">
      <Quote className="mx-auto size-10 text-gold-400/60" aria-hidden />

      <div className="mt-2 flex justify-center gap-1" aria-label={`Rated ${item.rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn("size-4", i < item.rating ? "fill-gold-400 text-gold-400" : "text-white/25")}
            aria-hidden
          />
        ))}
      </div>

      <blockquote className="mt-6">
        <p className="font-display text-xl leading-relaxed text-white sm:text-2xl">“{item.quote}”</p>
      </blockquote>

      <figcaption className="mt-8 flex items-center justify-center gap-4">
        {item.avatar ? (
          <Image
            src={item.avatar}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full object-cover ring-2 ring-gold-500/40"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-full bg-gold-500/15 font-display text-lg text-gold-300 ring-2 ring-gold-500/40">
            {item.authorName.charAt(0)}
          </span>
        )}
        <div className="text-left">
          <p className="font-semibold text-white">{item.authorName}</p>
          <p className="text-sm text-navy-300">
            {[item.authorRole, item.company].filter(Boolean).join(", ")}
          </p>
        </div>
      </figcaption>

      {items.length > 1 ? (
        <div className="mt-9 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous testimonial"
            className="grid size-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-gold-400 hover:text-gold-300"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex gap-1.5">
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Testimonial ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-gold-400" : "w-1.5 bg-white/30 hover:bg-white/60",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next testimonial"
            className="grid size-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-gold-400 hover:text-gold-300"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
