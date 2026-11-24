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
  Target,
} from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import DocumentThumb from "@/components/templates/DocumentThumb.vue";
import ScoreRing from "@/components/quality/ScoreRing.vue";
import { SAMPLE_ESSAY, SAMPLE_LETTER, SAMPLE_RESUME } from "@/components/templates/themes";
import { DOC_TYPE_STYLES } from "@/utils/docTypes";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";

const features = [
  { icon: MessageSquare, title: "Questions, not forms", text: "FirstDraft asks one thing at a time. Most answers are a sentence or a tap." },
  { icon: MousePointerClick, title: "See it as you go", text: "The page fills in while you chat. Click any line to change it yourself." },
  { icon: Gauge, title: "A score out of 100", text: "See what a recruiter would notice first, and fix it in one click." },
  { icon: Target, title: "Tailor it to a job", text: "Paste a job ad and get a matching version plus a cover letter." },
  { icon: FileUp, title: "Bring your old CV", text: "Upload a PDF or Word file. We'll rebuild it and show you how to improve it." },
  { icon: Palette, title: "Seven designs", text: "Pick a layout and a colour. You can switch whenever you like." },
  { icon: Download, title: "PDF or Word", text: "Files that applicant tracking systems can actually read." },
  { icon: Share2, title: "Share a link", text: "Send a read-only web version, and turn the link off later if you want." },
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
  { title: "Choose a document", text: "Resume, CV, cover letter or essay. Or upload one you already have." },
  { title: "Answer the questions", text: "Short answers are fine. FirstDraft turns them into clear, specific lines." },
  { title: "Check it and download", text: "Look at your score, pick a design, then save it as PDF or Word." },
];
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <!-- Nav -->
    <header class="sticky top-0 z-30 border-b border-line/60 bg-surface/70 backdrop-blur-xl">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <RouterLink to="/" aria-label="FirstDraft home"><BrandMark /></RouterLink>
        <div class="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          <a href="#features" class="hover:text-ink">Features</a>
          <a href="#designs" class="hover:text-ink">Designs</a>
          <a href="#how" class="hover:text-ink">How it works</a>
        </div>
        <div class="flex items-center gap-1.5">
          <ThemeToggle />
          <RouterLink to="/login" class="btn-ghost px-3">Sign in</RouterLink>
          <RouterLink to="/signup" class="btn-primary px-4">Sign up free</RouterLink>
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <section class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
      <div class="animate-fade-up">
        <p class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-200">
          For resumes, CVs, cover letters and essays
        </p>
        <h1 class="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Write a CV people <span class="text-gradient">actually read.</span>
        </h1>
        <p class="mt-5 max-w-lg text-lg text-ink-2">
          Answer a few questions and FirstDraft writes it up properly: strong verbs, real numbers, the right length.
          Then it tells you how good it is and what to fix.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <RouterLink to="/signup" class="btn-primary px-6 py-3.5 text-base">
            Start writing <ArrowRight :size="18" />
          </RouterLink>
          <RouterLink to="/login" class="btn-secondary px-6 py-3.5 text-base">I have an account</RouterLink>
        </div>
        <ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <li v-for="t in ['Free', 'No card needed', 'Nothing made up']" :key="t" class="flex items-center gap-1.5">
            <Check :size="15" class="text-emerald-600" /> {{ t }}
          </li>
        </ul>
      </div>

      <!-- Product picture -->
      <div class="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
        <div class="absolute -inset-6 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-3xl" />
        <div class="relative">
          <div class="ml-auto w-fit rotate-2 overflow-hidden rounded-xl shadow-paper ring-1 ring-black/5">
            <DocumentThumb class="sm:hidden" :document="SAMPLE_RESUME" design="sidebar:violet" :width="230" />
            <DocumentThumb class="hidden sm:block" :document="SAMPLE_RESUME" design="sidebar:violet" :width="360" />
          </div>
          <div class="absolute -left-2 top-10 w-60 space-y-2 sm:-left-6">
            <p class="w-fit rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[13px] text-ink-2 shadow-pop ring-1 ring-line">
              Roughly how much did retention go up after the redesign?
            </p>
            <p class="ml-auto w-fit rounded-2xl rounded-br-md bg-brand-gradient px-3.5 py-2.5 text-[13px] text-white shadow-glow">
              About 18%
            </p>
          </div>
          <div class="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-surface p-3 pr-5 shadow-pop ring-1 ring-line sm:left-10">
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
        <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What you get</h2>
        <p class="mt-3 text-lg text-ink-2">Help with the writing, not just a template to fill in.</p>
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
    <section id="designs" class="scroll-mt-20 bg-surface/60 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Pick a look</h2>
          <p class="mt-3 text-lg text-ink-2">Every design works with screening software. Change it any time.</p>
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
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-emerald-600 shadow-sm"><ShieldCheck :size="22" /></span>
        <p class="text-emerald-900">
          <span class="font-bold">We don't make things up.</span> If a line would be stronger with a number, FirstDraft asks you
          for it instead of guessing. Everything on your CV is something you can talk about in an interview.
        </p>
      </div>
    </section>

    <!-- Final call to action -->
    <section class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div class="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-pop">
        <div class="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
        <h2 class="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Got ten minutes?</h2>
        <p class="relative mx-auto mt-3 max-w-md text-white/85">That's usually all it takes to get a first draft you're happy to send.</p>
        <RouterLink
          to="/signup"
          class="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-[#5a2fd6] shadow-lg transition hover:-translate-y-0.5"
        >
          Start writing <ArrowRight :size="18" />
        </RouterLink>
      </div>
    </section>

    <footer class="border-t border-line/70 py-8">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted sm:flex-row sm:px-6">
        <BrandMark />
        <p>© {{ new Date().getFullYear() }} FirstDraft</p>
      </div>
    </footer>
  </div>
</template>
