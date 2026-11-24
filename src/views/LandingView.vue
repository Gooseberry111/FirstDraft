<script setup>
import {
  ArrowRight,
  Check,
  Download,
  FileUp,
  Gauge,
  MessageSquare,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Share2,
  Sparkles,
  Target,
} from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import DocumentThumb from "@/components/templates/DocumentThumb.vue";
import ScoreRing from "@/components/quality/ScoreRing.vue";
import { SAMPLE_ESSAY, SAMPLE_LETTER, SAMPLE_RESUME } from "@/components/templates/themes";
import { DOC_TYPE_STYLES } from "@/utils/docTypes";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";

const features = [
  { icon: MessageSquare, title: "Chat, don't fill in forms", text: "Answer one friendly question at a time — tap suggestions instead of typing." },
  { icon: MousePointerClick, title: "Watch it write itself", text: "Your document fills in live as you talk. Click any line to edit it." },
  { icon: Gauge, title: "Know how strong it is", text: "A strength score checks it against recruiter standards, with one-click fixes." },
  { icon: Target, title: "Tailor to any job", text: "Paste a job posting — get a tailored copy and a matching cover letter." },
  { icon: FileUp, title: "Import your old CV", text: "Upload a PDF or Word file and we'll rebuild, score and improve it." },
  { icon: Palette, title: "Designs that stand out", text: "7 professional styles and 8 accent colours — switch any time." },
  { icon: Download, title: "PDF & Word in one click", text: "Clean, ATS-readable files ready to send." },
  { icon: Share2, title: "Share a link", text: "A private, read-only web page of your CV — turn it off any time." },
];

const showcase = [
  { doc: SAMPLE_RESUME, design: "modern:violet", label: "Modern" },
  { doc: SAMPLE_RESUME, design: "sidebar:ocean", label: "Sidebar" },
  { doc: SAMPLE_RESUME, design: "bold:rose", label: "Bold" },
  { doc: SAMPLE_RESUME, design: "executive:graphite", label: "Executive" },
  { doc: SAMPLE_LETTER, design: "modern:emerald", label: "Cover letter" },
  { doc: SAMPLE_ESSAY, design: "classic:amber", label: "Essay" },
];

const steps = [
  { title: "Pick what you need", text: "Resume, CV, cover letter or essay — or import one you already have." },
  { title: "Answer a few questions", text: "FirstDraft asks the right things and turns your answers into strong, honest lines." },
  { title: "Polish and download", text: "Check your strength score, pick a design, and download PDF or Word." },
];
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <!-- Nav -->
    <header class="sticky top-0 z-30 border-b border-line/60 bg-white/70 backdrop-blur-xl">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <RouterLink to="/" aria-label="FirstDraft home"><BrandMark /></RouterLink>
        <div class="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          <a href="#features" class="hover:text-ink">Features</a>
          <a href="#designs" class="hover:text-ink">Designs</a>
          <a href="#how" class="hover:text-ink">How it works</a>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink to="/login" class="btn-ghost px-3">Sign in</RouterLink>
          <RouterLink to="/signup" class="btn-primary px-4">Start free</RouterLink>
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <section class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
      <div class="animate-fade-up">
        <p class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-200">
          <Sparkles :size="13" /> Your AI career writing coach
        </p>
        <h1 class="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          A CV that gets you <span class="text-gradient">noticed</span> — written with you in minutes.
        </h1>
        <p class="mt-5 max-w-lg text-lg text-ink-2">
          Just chat. FirstDraft turns your answers into a resume, CV, cover letter or essay that meets the standards
          recruiters and admissions readers look for — and shows you exactly how strong it is.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <RouterLink to="/signup" class="btn-primary px-6 py-3.5 text-base">
            Create my CV — free <ArrowRight :size="18" />
          </RouterLink>
          <RouterLink to="/login" class="btn-secondary px-6 py-3.5 text-base">I have an account</RouterLink>
        </div>
        <ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <li v-for="t in ['Free to use', 'No credit card', 'Never invents facts']" :key="t" class="flex items-center gap-1.5">
            <Check :size="15" class="text-emerald-600" /> {{ t }}
          </li>
        </ul>
      </div>

      <!-- Product visual -->
      <div class="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
        <div class="absolute -inset-6 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-3xl" />
        <div class="relative">
          <div class="ml-auto w-fit rotate-2 overflow-hidden rounded-xl shadow-paper ring-1 ring-black/5">
            <DocumentThumb class="sm:hidden" :document="SAMPLE_RESUME" design="sidebar:violet" :width="230" />
            <DocumentThumb class="hidden sm:block" :document="SAMPLE_RESUME" design="sidebar:violet" :width="360" />
          </div>
          <!-- chat bubbles -->
          <div class="absolute -left-2 top-10 w-60 space-y-2 sm:-left-6">
            <div class="flex items-start gap-2">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow"><Sparkles :size="13" /></span>
              <p class="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] text-ink-2 shadow-pop">
                Nice! Roughly how much did retention improve after the redesign?
              </p>
            </div>
            <p class="ml-auto w-fit rounded-2xl rounded-br-md bg-brand-gradient px-3.5 py-2.5 text-[13px] text-white shadow-glow">About 18% 🎉</p>
          </div>
          <!-- strength badge -->
          <div class="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-pop ring-1 ring-line sm:left-10">
            <ScoreRing :score="94" :size="48" :stroke="5" />
            <span>
              <span class="block text-[11px] font-semibold uppercase tracking-wider text-muted">Strength</span>
              <span class="block font-bold text-ink">Excellent</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Document types -->
    <section class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="(style, type) in DOC_TYPE_STYLES" :key="type" class="card flex items-center gap-3 p-4">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :class="style.tile">
            <component :is="style.icon" :size="19" />
          </span>
          <span>
            <span class="block font-bold text-ink">{{ DOCUMENT_TYPES[type] }}</span>
            <span class="block text-xs text-muted">{{ style.text }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Not just a CV maker — a coach</h2>
        <p class="mt-3 text-lg text-ink-2">Everything you need to go from a blank page to an application you're proud of.</p>
      </div>
      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="f in features" :key="f.title" class="card p-5 transition hover:-translate-y-1 hover:shadow-pop">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><component :is="f.icon" :size="19" /></span>
          <h3 class="mt-4 font-bold text-ink">{{ f.title }}</h3>
          <p class="mt-1 text-sm text-muted">{{ f.text }}</p>
        </div>
      </div>
    </section>

    <!-- Designs -->
    <section id="designs" class="scroll-mt-20 bg-white/60 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Designs that look the part</h2>
          <p class="mt-3 text-lg text-ink-2">Professional, ATS-friendly layouts — switch style and colour in one click.</p>
        </div>
        <div class="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <figure v-for="item in showcase" :key="item.label" class="group text-center">
            <div class="desk mx-auto w-fit rounded-xl p-3 transition group-hover:-translate-y-1">
              <div class="overflow-hidden rounded-md shadow-paper ring-1 ring-black/5">
                <DocumentThumb :document="item.doc" :design="item.design" :width="150" />
              </div>
            </div>
            <figcaption class="mt-2 text-sm font-semibold text-ink-2">{{ item.label }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <h2 class="text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">How it works</h2>
      <ol class="mt-12 grid gap-5 md:grid-cols-3">
        <li v-for="(step, i) in steps" :key="step.title" class="card relative p-6">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-lg font-extrabold text-white shadow-glow">{{ i + 1 }}</span>
          <h3 class="mt-4 text-lg font-bold text-ink">{{ step.title }}</h3>
          <p class="mt-1 text-muted">{{ step.text }}</p>
        </li>
      </ol>

      <div class="mt-10 flex items-start gap-4 rounded-3xl bg-emerald-50 p-6 ring-1 ring-emerald-200 sm:items-center">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm"><ShieldCheck :size="22" /></span>
        <p class="text-emerald-900">
          <span class="font-bold">Honest by design.</span> FirstDraft never invents jobs, numbers or skills. When a line would be
          stronger with a number, it asks you for it — so everything in your CV is true and defensible in an interview.
        </p>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div class="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-pop">
        <div class="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
        <h2 class="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Your next application starts here</h2>
        <p class="relative mx-auto mt-3 max-w-md text-white/85">It takes about ten minutes to go from nothing to a document you're proud of.</p>
        <RouterLink to="/signup" class="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-brand-700 shadow-lg transition hover:-translate-y-0.5">
          Start for free <ArrowRight :size="18" />
        </RouterLink>
      </div>
    </section>

    <footer class="border-t border-line/70 py-8">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted sm:flex-row sm:px-6">
        <BrandMark />
        <p>© {{ new Date().getFullYear() }} FirstDraft. Built to help you get hired.</p>
      </div>
    </footer>
  </div>
</template>
