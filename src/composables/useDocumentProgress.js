export function useDocumentProgress(document) {
  let completed = 0;
  let total = 6;

  const hasPersonalInfo =
    document.personalInfo?.name ||
    document.personalInfo?.email ||
    document.personalInfo?.phone;

  if (hasPersonalInfo) completed++;

  if (document.summary) completed++;

  if (document.experience?.length) completed++;

  if (document.education?.length) completed++;

  if (document.skills?.length) completed++;

  if (document.projects?.length) completed++;

  const percentage = Math.round((completed / total) * 100);

  return {
    percentage,
    sections: {
      personalInfo: !!hasPersonalInfo,
      summary: !!document.summary,
      experience: document.experience?.length > 0,
      education: document.education?.length > 0,
      skills: document.skills?.length > 0,
      projects: document.projects?.length > 0,
    },
  };
}
