import { MessageCircle } from "lucide-react";

// Creator's public number (listed on kamanzi-tony-portfolio.vercel.app).
const WHATSAPP_URL = "https://wa.me/250780924626";

export default function WhatsAppLink() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Vugana na Kamanzi Tony kuri WhatsApp (Chat on WhatsApp)"
      title="Vugana na Kamanzi Tony kuri WhatsApp"
      className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-rwanda-green shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue active:scale-95 dark:text-emerald-300"
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">WhatsApp</span>
      <span className="sr-only sm:hidden">WhatsApp</span>
    </a>
  );
}
