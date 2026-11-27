import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CarFront } from "lucide-react";

export const metadata: Metadata = {
  title: "Urupapuro ntirubaho | Ikizami",
};

export default function NotFound() {
  return (
    <main className="bg-scene flex min-h-screen items-center justify-center px-4 py-12">
      <section className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border-soft bg-surface p-8 text-center shadow-xl shadow-slate-200/50 dark:shadow-black/30 sm:p-12">
        <div aria-hidden className="imigongo-band absolute inset-x-0 top-0 h-2" />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rwanda-blue to-rwanda-green text-white shadow-md shadow-rwanda-blue/20">
          <CarFront className="h-8 w-8" aria-hidden />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-rwanda-blue dark:text-sky-300">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Urupapuro ntirubaho
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Urupapuro wagerageje gufungura ntirubaho cyangwa rwimuriwe ahandi.
          Subira ku ikizami ugerageze kongera.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-rwanda-blue px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rwanda-blue/30 transition-all duration-200 hover:scale-[1.02] hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-blue active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Subira ku ikizami
        </Link>
      </section>
    </main>
  );
}
