// Instant, rule-based quality check (no AI request). Encodes the standards
// recruiters and admissions readers use, and returns a 0–100 score with a
// checklist of what passes, what needs work, and how to fix it.

import { toLines } from "@/services/documentBuilder";

// ---------- word lists ----------
const ACTION_VERBS = new Set(
  `accelerated achieved acquired adapted addressed administered advanced advised advocated analysed analyzed
  architected arranged assembled assessed audited authored automated balanced boosted briefed budgeted built
  calculated campaigned captured catalogued chaired championed clarified coached collaborated compiled completed
  composed computed conceived conceptualized conducted consolidated constructed consulted contributed controlled
  converted coordinated counselled counseled created cultivated cut debugged decreased defined delegated delivered
  demonstrated deployed designed developed devised diagnosed directed discovered doubled drafted drove earned edited
  educated eliminated enabled engineered enhanced established evaluated exceeded executed expanded expedited
  experimented facilitated forecasted formulated founded generated grew guided halved handled headed identified
  implemented improved increased influenced initiated innovated inspected installed instituted instructed integrated
  interviewed introduced invented investigated launched lectured led leveraged lifted maintained managed mapped
  marketed maximized measured mentored migrated minimized mobilized modelled modeled modernized monitored motivated
  navigated negotiated onboarded opened operated optimized orchestrated organised organized oversaw partnered
  performed piloted pioneered planned prepared presented prioritized produced programmed promoted proposed
  prototyped provided published raised ran rebuilt recommended reconciled recruited redesigned reduced refactored
  refined regulated rehabilitated reorganized repaired reported represented researched resolved restored
  restructured revamped reviewed revised revitalized saved scaled scheduled secured selected served shaped shipped
  simplified sold solved spearheaded standardized steered streamlined strengthened structured succeeded supervised
  supported surpassed surveyed sustained synthesized taught tested trained transformed translated tripled
  troubleshot unified upgraded utilized validated volunteered won wrote`.split(/\s+/),
);

// Present-tense forms are fine for a current role.
const IRREGULAR = ["lead", "build", "run", "write", "teach", "sell", "drive", "grow", "cut", "win", "oversee", "shape"];
const isActionVerb = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return false;
  // Past tense ("Led", "Built") or present tense for a current role ("Leads", "Builds").
  const bases = [w, w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/ies$/, "y")];
  return bases.some(
    (b) =>
      ACTION_VERBS.has(b) ||
      ACTION_VERBS.has(`${b}ed`) ||
      ACTION_VERBS.has(`${b}d`) ||
      ACTION_VERBS.has(b.replace(/y$/, "ied")) ||
      IRREGULAR.includes(b),
  );
};

const WEAK_PHRASES = [
  "responsible for",
  "duties included",
  "duties include",
  "helped with",
  "helped to",
  "assisted with",
  "worked on",
  "was involved in",
  "involved in",
  "tasked with",
  "in charge of",
  "participated in",
];

const CLICHES = [
  "hard-working",
  "hardworking",
  "team player",
  "go-getter",
  "self-starter",
  "results-driven",
  "results-oriented",
  "detail-oriented",
  "think outside the box",
  "dynamic",
  "synergy",
  "passionate",
  "highly motivated",
  "proven track record",
  "best of breed",
  "excellent communication skills",
];

const ESSAY_CLICHES = [
  "since the dawn of time",
  "since the beginning of time",
  "webster",
  "dictionary defines",
  "in today's society",
  "ever since i was a child",
  "ever since i was young",
  "i have always been passionate",
  "for as long as i can remember",
  "at the end of the day",
  "everything happens for a reason",
  "this experience changed my life",
];

const SOFT_SKILLS = ["communication", "teamwork", "leadership", "hard-working", "motivated", "team player", "punctual", "reliable", "fast learner", "problem solving", "time management", "interpersonal"];

const NUMBER_RE = /(\d|%|\$|£|€|\b(one|two|three|four|five|six|seven|eight|nine|ten|twice|double|doubled|tripled|half|halved|dozens?|hundreds?|thousands?|millions?)\b)/i;
const PRONOUN_RE = /\b(i|me|my|mine|myself)\b/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- helpers ----------
const words = (text = "") => (text.match(/[A-Za-zÀ-ÿ0-9'’%$£€-]+/g) || []);
const wordCount = (text = "") => words(text).length;
const lower = (text = "") => text.toLowerCase();
const found = (text, list) => list.filter((p) => lower(text).includes(p));
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const sentences = (text = "") => text.split(/(?<=[.!?])\s+/).filter((s) => wordCount(s) > 0);
// Capitalised words that aren't the first word of a sentence (names, places…).
const properNouns = (text = "") =>
  sentences(text).reduce(
    (n, sn) => n + words(sn).slice(1).filter((w) => /^[A-Z][a-z]{2,}/.test(w)).length,
    0,
  );

// `weight` lets the standards that matter most (results, action verbs…) count more.
function check(id, status, title, tip, fix, weight = 1) {
  return { id, status, title, tip, fix, weight };
}
const pass = (id, title, weight = 1) => check(id, "pass", title, "", undefined, weight);
const warn = (id, title, tip, fix, weight = 1) => check(id, "warn", title, tip, fix, weight);
const fail = (id, title, tip, fix, weight = 1) => check(id, "fail", title, tip, fix, weight);

function category(id, label, weight, checks) {
  const points = checks.reduce((sum, c) => sum + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  return { id, label, weight, checks, score: total ? Math.round((points / total) * 100) : null };
}

function finish(allCategories) {
  // Categories with nothing to check yet don't count either way.
  const categories = allCategories.filter((c) => c.score !== null);
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const score = totalWeight
    ? Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight)
    : 0;
  const issues = categories.flatMap((c) => c.checks.filter((k) => k.status !== "pass"));
  return { score, ...gradeFor(score), categories, issues };
}

export function gradeFor(score) {
  if (score >= 90) return { label: "Excellent", tone: "emerald" };
  if (score >= 75) return { label: "Strong", tone: "green" };
  if (score >= 60) return { label: "Good start", tone: "amber" };
  if (score >= 40) return { label: "Needs work", tone: "orange" };
  return { label: "Early draft", tone: "rose" };
}

// ---------- resume / CV ----------
function analyzeResume(doc) {
  const isCv = doc.documentType === "cv";
  const info = doc.personalInfo || {};
  const jobs = doc.experience || [];
  const bullets = jobs.flatMap((j) => toLines(j.description));
  const research = (doc.research || []).flatMap((r) => toLines(r.description));
  const allBullets = [...bullets, ...research];
  const allText = [
    doc.summary,
    ...allBullets,
    ...(doc.projects || []).map((p) => p.description),
  ].join(" ");
  const totalWords = wordCount(
    [allText, ...(doc.skills || []), ...(doc.education || []).map((e) => `${e.degree} ${e.school} ${e.details}`)].join(" "),
  );

  // Contact
  const contact = [];
  contact.push(info.name ? pass("name", "Full name") : fail("name", "Add your full name", "Recruiters need to know whose resume this is.", "My full name is "));
  contact.push(
    !info.email
      ? fail("email", "Add a professional email", "Every resume needs an email address.", "Please add my email address: ")
      : EMAIL_RE.test(info.email)
        ? pass("email", "Email address")
        : warn("email", "Check your email address", "It doesn't look like a valid email."),
  );
  contact.push(info.phone ? pass("phone", "Phone number") : warn("phone", "Add a phone number", "Many recruiters call before they email."));
  contact.push(info.location ? pass("location", "Location") : warn("location", "Add your city and country", "Recruiters filter by location. City and country is enough."));
  contact.push(
    info.linkedin || info.website
      ? pass("links", "LinkedIn or portfolio link")
      : warn("links", "Add LinkedIn or a portfolio", "A profile link lets recruiters see more of your work."),
  );

  // Summary
  const summary = [];
  const sw = wordCount(doc.summary);
  if (!doc.summary) {
    summary.push(fail("summary", "Add a professional summary", "2 to 4 lines: your title, years of experience, specialties and a signature achievement.", "Please write a strong professional summary for me."));
  } else {
    summary.push(
      sw < 20
        ? warn("summary-length", "Summary is very short", "Aim for 2 to 4 lines (about 30 to 80 words).", "Please expand my summary to 2 to 4 strong lines.")
        : sw > 90
          ? warn("summary-length", "Summary is too long", "Keep it to 2 to 4 lines so it's read in 6 seconds.", "Please tighten my summary to 2 to 4 lines.")
          : pass("summary-length", "Summary length is right"),
    );
    const summaryCliches = found(doc.summary, CLICHES);
    summary.push(
      summaryCliches.length
        ? fail("summary-cliches", `Summary relies on clichés (“${summaryCliches[0]}”)`, "Replace adjectives with your title, years of experience and a real achievement.", "Please rewrite my summary without clichés. Lead with my title, experience and best result.", 2)
        : pass("summary-cliches", "Summary avoids clichés", 2),
    );
    summary.push(
      NUMBER_RE.test(doc.summary)
        ? pass("summary-proof", "Summary includes concrete proof")
        : warn("summary-proof", "Add a concrete highlight to your summary", "Years of experience or a headline achievement makes it credible.", "Please add my years of experience or a key achievement to my summary."),
    );
  }

  // Experience
  const exp = [];
  if (!jobs.length) {
    exp.push(
      fail(
        "experience",
        isCv ? "Add your experience" : "Add work experience",
        "Include jobs, internships, volunteering or major projects. Most recent first.",
        "Let's add my work experience.",
      ),
    );
  } else {
    const missingDetails = jobs.filter((j) => !j.position || !j.company || !j.date).length;
    exp.push(
      missingDetails
        ? warn("job-details", `Complete title, company and dates for ${missingDetails} role${missingDetails > 1 ? "s" : ""}`, "Every role needs a job title, organisation and dates.", "Please help me fill in the missing job titles, companies or dates.")
        : pass("job-details", "Every role has a title, company and dates"),
    );
    const thin = jobs.filter((j) => toLines(j.description).length < 2).length;
    exp.push(
      thin
        ? warn("bullets", `${thin} role${thin > 1 ? "s have" : " has"} fewer than 2 bullet points`, "Recent roles should have 3 to 5 achievement bullets.", "Please help me add more achievement bullets to my experience.")
        : pass("bullets", "Each role has enough bullet points"),
    );
    if (bullets.length) {
      const actionRate = pct(bullets.filter((b) => isActionVerb(words(b)[0] || "")).length, bullets.length);
      exp.push(
        actionRate >= 80
          ? pass("verbs", "Bullets start with strong action verbs", 3)
          : (actionRate >= 50 ? warn : fail)(
              "verbs",
              `Only ${actionRate}% of bullets start with an action verb`,
              'Start every bullet with a strong verb like "Led", "Built", "Increased", "Reduced".',
              "Please rewrite my experience bullets so each starts with a strong action verb.",
              3,
            ),
      );
      const quantRate = pct(bullets.filter((b) => NUMBER_RE.test(b)).length, bullets.length);
      exp.push(
        quantRate >= 50
          ? pass("numbers", `${quantRate}% of bullets show measurable results`, 3)
          : (quantRate >= 25 ? warn : fail)(
              "numbers",
              `Only ${quantRate}% of bullets include numbers`,
              "Quantify impact: %, money, time saved, users, team size. Aim for at least half your bullets.",
              "Please help me add measurable results to my experience bullets. Ask me for any numbers you need.",
              3,
            ),
      );
      const weak = found(allBullets.join(" "), WEAK_PHRASES);
      exp.push(
        weak.length
          ? (weak.length > 1 ? fail : warn)("weak", `Replace weak phrases: “${weak.slice(0, 2).join("”, “")}”`, "Say what you achieved, not what you were responsible for.", "Please rewrite any bullets that use weak phrases like 'responsible for' or 'helped with'.", 2)
          : pass("weak", "No weak phrases like “responsible for”", 2),
      );
      const long = bullets.filter((b) => wordCount(b) > 32).length;
      exp.push(
        long
          ? warn("bullet-length", `${long} bullet${long > 1 ? "s are" : " is"} too long`, "Keep bullets to 1 to 2 lines (under ~30 words).", "Please shorten my longest experience bullets.")
          : pass("bullet-length", "Bullets are concise"),
      );
      const firstWords = bullets.map((b) => lower(words(b)[0] || ""));
      const repeated = [...new Set(firstWords.filter((w, i) => w && firstWords.indexOf(w) !== i && firstWords.filter((x) => x === w).length > 2))];
      exp.push(
        repeated.length
          ? warn("variety", `“${repeated[0]}” starts too many bullets`, "Vary your verbs so each bullet stands out.", "Please vary the action verbs in my experience bullets.")
          : pass("variety", "Varied verbs"),
      );
    }
  }

  // Education
  const edu = [];
  if (!doc.education?.length) {
    edu.push((isCv ? fail : warn)("education", "Add your education", "Degree, institution and dates.", "Let's add my education."));
  } else {
    const incomplete = doc.education.filter((e) => !e.degree || !e.school || !e.date).length;
    edu.push(
      incomplete
        ? warn("education-details", "Complete degree, school and dates", "Each entry needs all three.", "Please help me complete my education details.")
        : pass("education-details", "Education is complete"),
    );
  }
  if (isCv) {
    edu.push(
      doc.research?.length || doc.publications?.length
        ? pass("research", "Research or publications included")
        : warn("research", "Add research, publications or presentations", "Academic CVs are judged on research output.", "Let's add my research, publications or presentations."),
    );
  }

  // Skills
  const skills = [];
  const count = doc.skills?.length || 0;
  skills.push(
    count === 0
      ? fail("skills", "Add a skills section", "List 6 to 15 hard skills relevant to your target role (tools, languages, methods).", "Please help me build a strong skills section for my target role.")
      : count < 5
        ? warn("skills", `Only ${count} skills listed`, "Aim for 6 to 15 relevant hard skills. They're key ATS keywords.", "Please suggest more relevant skills for my target role (only ones I actually have).")
        : count > 20
          ? warn("skills", `${count} skills is a lot`, "Keep the 10 to 15 most relevant so the important ones stand out.", "Please trim my skills to the most relevant 10 to 15.")
          : pass("skills", `${count} skills listed`),
  );
  const soft = (doc.skills || []).filter((sk) => SOFT_SKILLS.some((s) => lower(sk).includes(s)));
  if (count) {
    skills.push(
      soft.length / count > 0.4
        ? warn("hard-skills", "Too many soft skills", "Show soft skills through achievements; list hard, searchable skills here.", "Please replace generic soft skills with specific hard skills I have.")
        : pass("hard-skills", "Focus on hard, searchable skills"),
    );
  }

  // Polish (only once there is writing to check)
  const polish = [];
  const hasWriting = !!(doc.summary || allBullets.length);
  const pronouns = [doc.summary, ...allBullets].filter((t) => PRONOUN_RE.test(t || "")).length;
  if (hasWriting) polish.push(
    pronouns
      ? warn("pronouns", "Remove “I”, “me” and “my”", "Resumes are written without first-person pronouns.", "Please remove first-person pronouns from my resume.")
      : pass("pronouns", "No first-person pronouns"),
  );
  const cliches = found(allText + " " + (doc.skills || []).join(" "), CLICHES);
  if (hasWriting) polish.push(
    cliches.length
      ? warn("cliches", `Avoid buzzwords: “${cliches.slice(0, 3).join("”, “")}”`, "Recruiters skip clichés. Prove the quality with a result instead.", "Please replace buzzwords in my resume with concrete evidence.", 2)
      : pass("cliches", "No clichés or buzzwords", 2),
  );
  if (!isCv && hasWriting) {
    polish.push(
      totalWords > 850
        ? warn("length", `About ${totalWords} words, probably over 2 pages`, "Most resumes should be 1 page (under ~10 years' experience) or 2 at most.", "Please tighten my resume so it fits on 1 to 2 pages.")
        : totalWords < 150 && jobs.length
          ? warn("length", "Resume is quite short", "Add detail to experience, projects or skills to fill one strong page.", "What else should I add to make my resume stronger?")
          : pass("length", "Good length"),
    );
  }
  const datesWithYear = jobs.filter((j) => /\b(19|20)\d{2}\b/.test(j.date || "")).length;
  if (jobs.length) polish.push(
    datesWithYear < jobs.length
      ? warn("dates", "Use clear dates with years", 'Use a consistent format like "Jan 2023 - Present".', "Please format all my dates consistently, e.g. Jan 2023 - Present.")
      : pass("dates", "Dates are clear"),
  );

  return finish([
    category("contact", "Contact details", 10, contact),
    category("summary", "Summary", 12, summary),
    category("experience", isCv ? "Experience & research" : "Experience & impact", 38, exp),
    category("education", isCv ? "Education & research" : "Education", isCv ? 15 : 8, edu),
    category("skills", "Skills & keywords", 14, skills),
    category("polish", "Language & format", 18, polish),
  ]);
}

// ---------- cover letter ----------
function analyzeCoverLetter(doc) {
  const info = doc.personalInfo || {};
  const body = doc.body || [];
  const text = body.join("\n\n");
  const wc = wordCount(text);
  const opening = body.find((p) => !/^dear\b/i.test(p.trim()) && wordCount(p) > 6) || "";
  const company = (doc.recipient || "").split("\n").map((l) => l.trim()).filter(Boolean).pop() || "";
  const paragraphs = body.filter((p) => wordCount(p) > 12).length;

  const structure = [];
  if (!body.length) {
    structure.push(fail("draft", "No letter yet", "Answer FirstDraft's questions and it will write the first draft.", "Please write the first draft of my cover letter."));
  } else {
    structure.push(
      wc < 200
        ? (wc < 120 ? fail : warn)("length", `Too short (${wc} words)`, "Strong cover letters are 250 to 400 words.", "Please expand my cover letter to about 300 words with more specific evidence.", 2)
        : wc > 450
          ? warn("length", `Too long (${wc} words)`, "Keep it to 250 to 400 words; hiring managers skim.", "Please tighten my cover letter to under 400 words.", 2)
          : pass("length", `Good length (${wc} words)`, 2),
    );
    structure.push(
      paragraphs >= 3 && paragraphs <= 5
        ? pass("paragraphs", `${paragraphs} clear paragraphs`)
        : warn("paragraphs", "Use 3 to 4 body paragraphs", "Open with a hook, then your evidence, then why this company, and finish confidently.", "Please restructure my cover letter into 3 to 4 focused paragraphs."),
    );
    structure.push(
      /^\s*(i am writing|i'm writing|i would like to apply|please accept)/i.test(opening)
        ? fail("hook", "Open with a hook, not “I am writing to apply”", "Lead with your strongest qualification or why this company excites you.", "Please rewrite my opening sentence as a strong, specific hook.", 2)
        : pass("hook", "Strong opening line", 2),
    );
  }

  const content = [];
  if (body.length) {
    content.push(
      NUMBER_RE.test(text)
        ? pass("evidence", "Includes measurable evidence", 3)
        : fail("evidence", "Add a measurable achievement", "One concrete result (%, $, time saved, users) makes your claims believable.", "Please add a measurable achievement to my cover letter. Ask me for the numbers.", 3),
    );
    content.push(
      company && lower(text).includes(lower(company).split(/\s+/)[0])
        ? pass("company", "Mentions the company by name", 2)
        : warn("company", "Name the company in the letter", "Show it's written for them: mention the company and why you want to join.", "Please make my cover letter more specific to the company and why I want to join.", 2),
    );
    const startsWithI = sentences(text).filter((sn) => /^i\b/i.test(sn.trim())).length;
    content.push(
      pct(startsWithI, sentences(text).length) > 40
        ? warn("i-start", "Too many sentences start with “I”", "Vary sentence openings and focus on what you'll do for them.", "Please vary my sentence openings so fewer start with 'I'.")
        : pass("i-start", "Reader-focused sentences"),
    );
    const closing = body[body.length - 1] || "";
    content.push(
      /(interview|discuss|conversation|talk|meet|call|contribute|look forward)/i.test(closing)
        ? pass("cta", "Ends with a confident call to action")
        : warn("cta", "End with a clear next step", "Close by inviting a conversation about how you'll contribute.", "Please give my cover letter a confident closing with a call to action."),
    );
    const cliches = found(text, CLICHES);
    content.push(
      cliches.length
        ? warn("cliches", `Avoid clichés: “${cliches.slice(0, 2).join("”, “")}”`, "Replace with a specific example.", "Please replace clichés in my cover letter with specific examples.", 2)
        : pass("cliches", "No clichés", 2),
    );
  }

  const details = [];
  details.push(info.name ? pass("name", "Your name") : fail("name", "Add your name", "", "My full name is "));
  details.push(info.email || info.phone ? pass("contact", "Contact details") : warn("contact", "Add your email and phone", "So they can reply.", "Please add my contact details: "));
  details.push(
    /to whom it may concern|dear sir or madam/i.test(text)
      ? fail("greeting", "Avoid “To whom it may concern”", "Address a person by name, or “Dear [Company] Hiring Team”.", "Please change my greeting to address a specific person or the hiring team.")
      : doc.recipient
        ? pass("greeting", "Addressed to a specific person or team")
        : warn("greeting", "Add who it's addressed to", "A named hiring manager is best; otherwise the company's hiring team.", "Who should my cover letter be addressed to?"),
  );
  details.push(doc.title ? pass("subject", "Clear subject line") : warn("subject", "Add a subject line", 'e.g. "Application for Product Designer".', "Please add a subject line for the role I'm applying to."));

  return finish([
    category("structure", "Structure & length", 30, structure),
    category("content", "Persuasiveness", 45, content),
    category("details", "Details & format", 25, details),
  ]);
}

// ---------- essay ----------
function analyzeEssay(doc) {
  const body = doc.body || [];
  const text = body.join("\n\n");
  const wc = wordCount(text);
  const sents = sentences(text);
  const avg = sents.length ? wc / sents.length : 0;
  const first = sents[0] || "";

  const structure = [];
  structure.push(doc.title ? pass("title", "Has a title") : warn("title", "Add a compelling title", "A short, intriguing title invites the reader in.", "Please suggest a compelling title for my essay."));
  if (!body.length) {
    structure.push(fail("draft", "No essay yet", "Answer FirstDraft's questions and it will write the first draft.", "Please write the first draft of my essay."));
  } else {
    structure.push(
      wc < 250
        ? (wc < 150 ? fail : warn)("length", `Too short (${wc} words)`, "Most personal statements are 500 to 650 words. Check your required limit.", "Please develop my essay further with more specific detail.", 2)
        : wc > 1000
          ? warn("length", `${wc} words, check your word limit`, "Many applications cap essays at 650 words.", "Please tighten my essay to fit the word limit.")
          : pass("length", `${wc} words`, 2),
    );
    structure.push(
      body.length >= 4
        ? pass("paragraphs", `${body.length} paragraphs`)
        : (body.length < 3 ? fail : warn)("paragraphs", "Use at least 4 paragraphs", "Open with a hook, tell the story, say what it taught you, then look ahead.", "Please restructure my essay into a clear opening, development and conclusion."),
    );
  }

  const voice = [];
  if (body.length) {
    const cliches = found(text, ESSAY_CLICHES);
    voice.push(
      cliches.length
        ? (cliches.length > 1 ? fail : warn)("cliches", `Avoid clichés: “${cliches[0]}”`, "Admissions readers see these constantly. Open with a specific moment instead.", "Please replace the clichés in my essay with specific, personal details.", 2)
        : pass("cliches", "No essay clichés", 2),
    );
    voice.push(
      /^(i have always|ever since|since i was|for as long as)/i.test(first.trim()) || wordCount(first) > 35
        ? fail("hook", "Strengthen your opening line", "Start in a specific moment. A scene, a line of dialogue, a surprising detail.", "Please rewrite the opening of my essay as a vivid, specific hook.", 2)
        : pass("hook", "Engaging opening", 2),
    );
    const tellWords = found(text, ["passionate", "hardworking", "hard-working", "dedicated", "determined", "resilient", "motivated"]);
    voice.push(
      tellWords.length > 2
        ? warn("show", "Show, don't tell", `Words like “${tellWords[0]}” tell the reader. A specific example shows it.`, "Please replace adjectives that tell (like 'passionate') with specific examples that show.", 2)
        : pass("show", "Shows qualities through examples", 2),
    );
    voice.push(
      /(learn|realiz|realis|taught me|understand|now i|grew|changed how|i want to|future|will)/i.test(body[body.length - 1] || "")
        ? pass("reflection", "Ends with reflection and direction")
        : warn("reflection", "End with reflection", "Close on what you learned and where you're heading.", "Please strengthen my conclusion with reflection and where I'm heading next."),
    );
    voice.push(
      avg > 28
        ? warn("sentences", "Sentences are long on average", "Mix short and long sentences for rhythm and clarity.", "Please vary my sentence lengths and break up long sentences.")
        : pass("sentences", "Readable sentence length"),
    );
    voice.push(
      NUMBER_RE.test(text) || properNouns(text) >= 2
        ? pass("specific", "Includes specific details")
        : warn("specific", "Add specific details", "Names, places, numbers and sensory details make your story memorable.", "Please add more specific, concrete details to my essay."),
    );
  }

  return finish([
    category("structure", "Structure & length", 35, structure),
    category("voice", "Storytelling & voice", 65, voice),
  ]);
}

export function analyzeDocument(doc) {
  if (!doc) return finish([]);
  if (doc.documentType === "cover_letter") return analyzeCoverLetter(doc);
  if (doc.documentType === "essay") return analyzeEssay(doc);
  return analyzeResume(doc);
}
