/**
 * Genera PDFs de demostración en ./muestras-pdf/ (texto grande + párrafos aleatorios).
 * Ejecutar: npm run muestras:pdf
 *
 * Esos archivos están en .gitignore; súbelos por la UI (Mis archivos / documentos) para probar Azure + MongoDB.
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const OUT = path.join(process.cwd(), "muestras-pdf");

const SYL = [
  "la", "cor", "po", "ra", "ci", "ón", "em", "pre", "sa", "flex", "i", "plas", "doc", "u", "men",
  "to", "vál", "ido", "2026", "qui", "to", "gua", "ya", "l", "ruc", "pro", "vee", "dor", "ún",
];

function randomToken(): string {
  const parts = 2 + Math.floor(Math.random() * 4);
  let s = "";
  for (let i = 0; i < parts; i++) s += SYL[Math.floor(Math.random() * SYL.length)];
  return s;
}

function randomParagraph(): string {
  const words = 18 + Math.floor(Math.random() * 40);
  const w: string[] = [];
  for (let i = 0; i < words; i++) {
    const t = randomToken();
    w.push(i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  }
  return w.join(" ") + ".";
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(" ", maxChars);
    if (cut < maxChars * 0.5) cut = maxChars;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return lines;
}

async function makePdf(opts: {
  fileName: string;
  banner: string;
  subtitle?: string;
  metaLines: string[];
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 48;
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - margin;

  page.drawText(opts.banner, {
    x: margin,
    y,
    size: 42,
    font: fontBold,
    color: rgb(0.07, 0.25, 0.55),
    maxWidth: width - 2 * margin,
  });
  y -= 58;

  if (opts.subtitle) {
    page.drawText(opts.subtitle, {
      x: margin,
      y,
      size: 22,
      font: fontBold,
      color: rgb(0.2, 0.35, 0.55),
      maxWidth: width - 2 * margin,
    });
    y -= 36;
  }

  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    thickness: 1,
    color: rgb(0.75, 0.8, 0.88),
  });
  y -= 20;

  for (const line of opts.metaLines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });
    y -= 16;
  }
  y -= 12;

  const body: string[] = [];
  for (let i = 0; i < 4; i++) body.push(randomParagraph());
  const wrapped = body.flatMap((p) => wrapText(p, 85));

  let sheet = page;
  for (const line of wrapped) {
    if (y < margin + 36) {
      sheet = doc.addPage([595.28, 841.89]);
      y = height - margin;
    }
    sheet.drawText(line, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.15, 0.15, 0.18),
    });
    y -= 16;
  }

  const bytes = await doc.save();
  writeFileSync(path.join(OUT, opts.fileName), bytes);
  console.log("OK", opts.fileName);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  await makePdf({
    fileName: "muestra-ruc-empresa.pdf",
    banner: "RUC — EMPRESA DEMO",
    subtitle: "Documento solo para pruebas visuales",
    metaLines: [
      `ID ref: EMP-RUC-${Math.floor(Math.random() * 90000 + 10000)}`,
      "Uso: subir en Mis archivos o solicitudes de documentos.",
      "Contenido: texto generado aleatoriamente (sin valor legal).",
    ],
  });

  await makePdf({
    fileName: "muestra-ruc-proveedor-1.pdf",
    banner: "RUC PROVEEDOR 1",
    subtitle: "Proveedor Uno — muestra",
    metaLines: [
      "RUC ficticio de prueba: 1234567890001",
      `Lote demo: P1-${Date.now().toString(36).toUpperCase()}`,
    ],
  });

  await makePdf({
    fileName: "muestra-ruc-proveedor-2.pdf",
    banner: "RUC PROVEEDOR 2",
    subtitle: "Proveedor Dos — muestra",
    metaLines: [
      "RUC ficticio de prueba: 0987654321001",
      `Lote demo: P2-${Date.now().toString(36).toUpperCase()}`,
    ],
  });

  await makePdf({
    fileName: "muestra-permiso-bomberos.pdf",
    banner: "PERMISO BOMBEROS",
    subtitle: "Certificado de ejemplo",
    metaLines: [
      `Expediente: BOM-${Math.floor(Math.random() * 900000 + 100000)}`,
      "Válido únicamente como archivo de demostración.",
    ],
  });

  await makePdf({
    fileName: "muestra-patente-municipal.pdf",
    banner: "PATENTE MUNICIPAL",
    subtitle: "Ejemplo para flujo empresa -> proveedor",
    metaLines: [
      `Referencia: PM-${Math.floor(Math.random() * 90000 + 10000)}-2026`,
    ],
  });

  console.log("\nListo. Archivos en:", OUT);
  console.log(
    "Los PDF «proveedor» sirven para pruebas de solicitudes; «Mis archivos» en seed solo carga RUC empresa + permiso + patente (corporativos).\n"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
