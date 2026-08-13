const emptyDocument = {
  documentType: "resume",

  personalInfo: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  },

  summary: "",

  experience: [],

  education: [],

  skills: [],

  projects: [],

  certifications: [],

  achievements: [],

  research: [],
  publications: [],
};

export function createEmptyDocument(documentType = "resume") {
  return {
    ...structuredClone(emptyDocument),
    documentType,
  };
}

export function buildDocument(messages) {
  const document = createEmptyDocument();

  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");

  if (!userMessages.trim()) {
    return document;
  }

  document.summary = userMessages;

  return document;
}
