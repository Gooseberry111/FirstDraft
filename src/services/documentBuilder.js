export function buildDocument(messages) {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  return `
${userMessages.join("\n\n")}
  `.trim();
}
