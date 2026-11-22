import { ArrowUpRight } from "lucide-react";

const creatorLinks = [
  { label: "Portfolio", href: "https://kamanzi-tony-portfolio.vercel.app" },
  { label: "GitHub", href: "https://github.com/TonyKamanzi" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/kamanzi-tony-me" },
  { label: "X", href: "https://x.com/tony_kamanzi" },
  { label: "Instagram", href: "https://www.instagram.com/t.on.y.x/" },
  {
    label: "Facebook",
    href: "https://web.facebook.com/profile.php?id=100070135903692",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-soft/70 bg-background/60 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 sm:px-6">
        <p className="text-center text-xs leading-relaxed text-muted">
          Kwitegura ikizami cy&rsquo;umutekano mu muhanda &mdash; ibibazo
          n&rsquo;ibibazo ni ibigitegwa gusa. Menya amategeko y&rsquo;umu Rwanda
          mu gitabo cya Leta.
        </p>

        <div className="flex w-full flex-col items-center gap-3 border-t border-border-soft/60 pt-4">
          <p className="text-xs font-medium text-foreground/80">
            Yubatswe na Kamanzi Tony
          </p>
          <nav
            aria-label="Kamanzi Tony links"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          >
            {creatorLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
              >
                {label}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
                <span className="sr-only">(gufungura mu mwigabanya)</span>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
