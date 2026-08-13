import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";

import { saveAs } from "file-saver";

function dividerHeading(title) {
  return new Paragraph({
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        color: "D1D5DB",
        size: 6,
      },
    },
    spacing: {
      before: 300,
      after: 180,
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

  // =====================
  // HEADER
  // =====================

  children.push(
    new Paragraph({
      spacing: {
        after: 120,
      },
      children: [
        new TextRun({
          text: document.personalInfo?.name || "Your Name",
          bold: true,
          size: 36,
        }),
      ],
    }),
  );

  const contactInfo = [
    document.personalInfo?.email,
    document.personalInfo?.phone,
    document.personalInfo?.location,
    document.personalInfo?.linkedin,
    document.personalInfo?.website,
  ]
    .filter(Boolean)
    .join(" | ");

  if (contactInfo) {
    children.push(
      new Paragraph({
        spacing: {
          after: 180,
        },
        children: [
          new TextRun({
            text: contactInfo,
            size: 20,
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          color: "D1D5DB",
          size: 6,
        },
      },
      spacing: {
        after: 250,
      },
    }),
  );

  // =====================
  // SUMMARY
  // =====================

  if (document.summary) {
    children.push(dividerHeading("Professional Summary"));

    children.push(
      new Paragraph({
        spacing: {
          after: 200,
        },
        text: document.summary,
      }),
    );
  }

  // =====================
  // EXPERIENCE
  // =====================

  if (document.experience?.length) {
    children.push(dividerHeading("Experience"));

    document.experience.forEach((job) => {
      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {},
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: job.position || "",
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                }),

                new TableCell({
                  borders: {},
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      text: job.date || "",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          spacing: {
            after: 80,
          },
          children: [
            new TextRun({
              text: job.company || "",
              italics: true,
            }),
          ],
        }),
      );

      if (job.description) {
        children.push(
          new Paragraph({
            spacing: {
              after: 250,
            },
            text: job.description,
          }),
        );
      }
    });
  }

  // =====================
  // EDUCATION
  // =====================

  if (document.education?.length) {
    children.push(dividerHeading("Education"));

    document.education.forEach((edu) => {
      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {},
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: edu.degree || "",
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                }),

                new TableCell({
                  borders: {},
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      text: edu.date || "",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          spacing: {
            after: 250,
          },
          text: edu.school || "",
        }),
      );
    });
  }

  // =====================
  // SKILLS
  // =====================

  if (document.skills?.length) {
    children.push(dividerHeading("Skills"));

    children.push(
      new Paragraph({
        spacing: {
          after: 250,
        },
        text: document.skills.join(" • "),
      }),
    );
  }

  // =====================
  // PROJECTS
  // =====================

  if (document.projects?.length) {
    children.push(dividerHeading("Projects"));

    document.projects.forEach((project) => {
      children.push(
        new Paragraph({
          spacing: {
            after: 50,
          },
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
            after: 250,
          },
          text: project.description || "",
        }),
      );
    });
  }

  // =====================
  // CERTIFICATIONS
  // =====================

  if (document.certifications?.length) {
    children.push(dividerHeading("Certifications"));

    document.certifications.forEach((cert) => {
      children.push(
        new Paragraph({
          spacing: {
            after: 100,
          },
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
