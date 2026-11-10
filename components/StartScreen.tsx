"use client";

import {
  Award,
  Car,
  CheckCircle2,
  Clock3,
  ListChecks,
  Play,
  ShieldCheck,
} from "lucide-react";
import { PASS_MARK, TOTAL_QUESTIONS, TOTAL_BANK } from "@/lib/quiz";

type StartScreenProps = {
  onStart: () => void;
};

const rules = [
  {
    icon: ListChecks,
    title: "Ibibazo 20",
    body: `Buri gisomo kizatoranywa mu rutonde rw'ibibazo ${TOTAL_BANK}, mu buryo butunganye.`,
  },
  {
    icon: Clock3,
    title: "Iminota 20",
    body: "Ufite iminota 20 yo kumikora. Iyo igihe cyarangiye, ikizami kirangira ako kanya.",
  },
  {
    icon: Award,
    title: "Gutsinda: 12/20",
    body: `Ugomba gutsindira ${PASS_MARK}/20 (60%) cyangawa more ngo utsinde ikizami.`,
  },
];

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="animate-slide-up">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border-soft bg-surface shadow-xl shadow-slate-200/50 dark:shadow-black/30">
        <div
          aria-hidden
          className="h-2 w-full bg-gradient-to-r from-rwanda-blue via-rwanda-yellow to-rwanda-green"
        />
        <div className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rwanda-blue/10 ring-1 ring-rwanda-blue/25 dark:bg-rwanda-blue/15">
            <Car className="h-10 w-10 text-rwanda-blue" aria-hidden />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rwanda-blue">
            Umujyi wa Kigali &middot; Ikizami cyemewe
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Ikizami cy&rsquo;Umutekano mu&nbsp;Muhanda
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Kwitegura ikizami cy&rsquo;agaciro ka porogaramu y&rsquo;imyitozo ngora
            mu muhanda. Menya amategeko, ibimenyetso, n&rsquo;umutekano wa muhanda
            mu Kinyarwanda.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-rwanda-green/25 bg-rwanda-green/10 px-4 py-2 text-sm font-medium text-rwanda-green dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Ibyo ukora hano ni igitegwa gusa &mdash; nta mafaranga yimoka
          </div>
        </div>
      </section>

      {/* Rules */}
      <section aria-labelledby="rules-heading" className="mt-8">
        <h2 id="rules-heading" className="sr-only">
          Amategeko y&rsquo;ikizami
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {rules.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border-soft bg-surface p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rwanda-yellow/15 text-amber-600 dark:text-amber-400">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Extra guidance */}
      <section className="mt-6 rounded-2xl border border-border-soft bg-surface p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CheckCircle2 className="h-5 w-5 text-rwanda-blue" aria-hidden />
          Icyo ugomba kwitondera
        </h2>
        <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-muted sm:grid-cols-2">
          <li className="flex gap-2">
            <span aria-hidden>&#9702;</span>
            Ku buri kibazo, igihe uhawe igisubizo, uzabona neza ko ari cyo cyo cyangwa
            kitari cyo, hamwe n&rsquo;ibisobanuro.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>&#9702;</span>
            Ushobora guhindura icyo ugiye gukora cyangwa kurata ku bware. Iyo
            uhawe igisubizo, ntihashobora kuhinduka.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>&#9702;</span>
            Menya amakuru adashobora kuvugwa mu rutonde rw&rsquo;ibibazo 1&ndash;20
            mu ntoki zawe.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>&#9702;</span>
            Iyo umutekano urangiye, uzabona icyo watoye neza cyangwa cyari
            ikosa hamwe n&rsquo;ibisobanuro by&rsquo;amategeko.
          </li>
        </ul>
      </section>

      {/* Start button */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="group inline-flex items-center gap-3 rounded-full bg-rwanda-blue px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-rwanda-blue/30 transition-all duration-200 hover:scale-[1.03] hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-blue active:scale-95"
        >
          <Play
            className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
          Tangira Ikizami
        </button>
        <p className="text-xs text-muted">
          Iminota 20 &middot; Ibibazo {TOTAL_QUESTIONS} &middot; Gutsinda kuri{" "}
          {PASS_MARK}/{TOTAL_QUESTIONS}
        </p>
      </div>
    </div>
  );
}
