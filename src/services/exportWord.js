import { Document, Packer, Paragraph, TextRun } from "docx";

import { saveAs } from "file-saver";

function sectionHeading(title) {
  return new Paragraph({
    spacing: {
      before: 300,
      after: 120,
    },
    border: {
      bottom: {
        color: "D1D5DB",
        size: 6,
        space: 1,
      },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22,
      }),
    ],
  });
}

export async function exportWord(document) {
  const children = [];

  // HEADER
  children.push(
    new Paragraph({
      spacing: {
        after: 100,
      },
      children: [
        new TextRun({
          text: document.personalInfo?.name || "",
          bold: true,
          size: 34,
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      spacing: {
        after: 250,
      },
      children: [
        new TextRun({
          text: [
            document.personalInfo?.email,
            document.personalInfo?.phone,
            document.personalInfo?.location,
            document.personalInfo?.linkedin,
            document.personalInfo?.website,
          ]
            .filter(Boolean)
            .join(" | "),
        }),
      ],
    }),
  );

  // SUMMARY
  if (document.summary) {
    children.push(sectionHeading("Professional Summary"));

    children.push(
      new Paragraph({
        spacing: {
          after: 200,
        },
        text: document.summary,
      }),
    );
  }

  // EXPERIENCE
  if (document.experience?.length) {
    children.push(sectionHeading("Experience"));

    document.experience.forEach((job) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: job.position || "",
              bold: true,
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: job.company || "",
              italics: true,
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          text: job.date || "",
        }),
      );

      if (job.description) {
        children.push(
          new Paragraph({
            spacing: {
              after: 200,
            },
            text: job.description,
          }),
        );
      }
    });
  }

  // EDUCATION
  if (document.education?.length) {
    children.push(sectionHeading("Education"));

    document.education.forEach((edu) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.degree || "",
              bold: true,
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          text: edu.school || "",
        }),
      );

      children.push(
        new Paragraph({
          spacing: {
            after: 200,
          },
          text: edu.date || "",
        }),
      );
    });
  }

  // SKILLS
  if (document.skills?.length) {
    children.push(sectionHeading("Skills"));

    children.push(
      new Paragraph({
        spacing: {
          after: 200,
        },
        text: document.skills.join(" • "),
      }),
    );
  }

  // PROJECTS
  if (document.projects?.length) {
    children.push(sectionHeading("Projects"));

    document.projects.forEach((project) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: project.name || "",
              bold: true,
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          spacing: {
            after: 200,
          },
          text: project.description || "",
        }),
      );
    });
  }

  // CERTIFICATIONS
  if (document.certifications?.length) {
    children.push(sectionHeading("Certifications"));

    document.certifications.forEach((cert) => {
      children.push(
        new Paragraph({
          text: cert,
        }),
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  saveAs(blob, `${document.personalInfo?.name || "FirstDraft"}.docx`);
}
