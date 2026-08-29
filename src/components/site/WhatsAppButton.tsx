import { WhatsappIcon } from "@/components/ui/SocialIcons";

/** Floating WhatsApp shortcut; the number is configured in admin settings. */
export function WhatsAppButton({ number, siteName }: { number: string; siteName: string }) {
  const digits = number.replace(/[^\d]/g, "");
  const text = encodeURIComponent(`Hi ${siteName}, I'd like to discuss a project.`);

  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 hidden size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 lg:grid"
    >
      <WhatsappIcon className="size-7" aria-hidden />
    </a>
  );
}
