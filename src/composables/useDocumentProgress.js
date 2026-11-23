export function useDocumentProgress(document) {
  const doc = document || {};
  const info = doc.personalInfo || {};
  const hasContact = !!(info.name || info.email || info.phone);

  let sections;

  if (doc.documentType === "cover_letter") {
    sections = [
      { label: "Your details", done: hasContact },
      { label: "Recipient", done: !!doc.recipient },
      { label: "Letter body", done: doc.body?.length > 0 },
      { label: "Sign-off", done: !!doc.closing },
    ];
  } else if (doc.documentType === "essay") {
    sections = [
      { label: "Title", done: !!doc.title },
      { label: "Draft started", done: doc.body?.length > 0 },
      { label: "Full draft", done: doc.body?.length >= 4 },
    ];
  } else {
    sections = [
      { label: "Personal info", done: hasContact },
      { label: "Summary", done: !!doc.summary },
      { label: "Experience", done: doc.experience?.length > 0 },
      { label: "Education", done: doc.education?.length > 0 },
      { label: "Skills", done: doc.skills?.length > 0 },
      doc.documentType === "cv"
        ? {
            label: "Research & publications",
            done: doc.research?.length > 0 || doc.publications?.length > 0,
          }
        : { label: "Projects", done: doc.projects?.length > 0 },
    ];
  }

  const completed = sections.filter((s) => s.done).length;

  return {
    percentage: Math.round((completed / sections.length) * 100),
    sections,
  };
}
