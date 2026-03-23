/**
 * Crea índices y datos demo. Ejecutar: npm run seed
 * Requiere .env.local con MONGODB_URI y MONGODB_DB_NAME
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { buildEmpresaFileBlobPath, uploadBufferToAzure } from "../lib/azure-storage";
import { mongoColl } from "../lib/mongo-collections";

config({ path: ".env.local" });
config({ path: ".env" });

const DB_NAME = process.env.MONGODB_DB_NAME || "sis_archivos";

const P1 = new ObjectId("64b1b1b1b1b1b1b1b1b1b101");
const P2 = new ObjectId("64b1b1b1b1b1b1b1b1b1b102");

const U_ADMIN = new ObjectId("64b1b1b1b1b1b1b1b1b1b201");
const U_EMPRESA = new ObjectId("64b1b1b1b1b1b1b1b1b1b202");
const U_PROV1 = new ObjectId("64b1b1b1b1b1b1b1b1b1b203");
const U_PROV2 = new ObjectId("64b1b1b1b1b1b1b1b1b1b204");
const U_CLIENTE = new ObjectId("64b1b1b1b1b1b1b1b1b1b205");

const D1 = new ObjectId("64b1b1b1b1b1b1b1b1b1b301");
const D2 = new ObjectId("64b1b1b1b1b1b1b1b1b1b302");
const D3 = new ObjectId("64b1b1b1b1b1b1b1b1b1b303");
const D4 = new ObjectId("64b1b1b1b1b1b1b1b1b1b304");
const D5 = new ObjectId("64b1b1b1b1b1b1b1b1b1b305");

const MUESTRAS_DIR = path.join(process.cwd(), "muestras-pdf");

/**
 * Solo documentos corporativos de la empresa (Mis archivos).
 * Los PDF «proveedor» de muestras-pdf/ sirven para pruebas en solicitudes / proveedor, no se cargan aquí.
 */
const MUESTRA_PDF_ROWS: {
  fileName: string;
  title: string;
  documentType: string;
  description: string;
}[] = [
  {
    fileName: "muestra-ruc-empresa.pdf",
    title: "RUC — empresa demo",
    documentType: "RUC",
    description: "Documento corporativo de muestra",
  },
  {
    fileName: "muestra-permiso-bomberos.pdf",
    title: "Permiso bomberos — instalaciones empresa",
    documentType: "Permiso Bomberos",
    description: "Documento corporativo de muestra",
  },
  {
    fileName: "muestra-patente-municipal.pdf",
    title: "Patente municipal — empresa",
    documentType: "Patente Municipal",
    description: "Documento corporativo de muestra",
  },
];

async function seedMuestraPdfsEmpresa(db: Db, empresaUserId: ObjectId, ts: Date) {
  const azure = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!azure) {
    console.log(
      "\n[Muestras PDF] Sin AZURE_STORAGE_CONNECTION_STRING: no se cargan PDF a «Mis archivos»."
    );
    console.log(
      "  Con Azure configurado: npm run muestras:pdf && npm run seed\n"
    );
    return;
  }

  let cargados = 0;
  for (const row of MUESTRA_PDF_ROWS) {
    const fp = path.join(MUESTRAS_DIR, row.fileName);
    if (!existsSync(fp)) {
      console.log(`[Muestras PDF] No existe ${row.fileName} — ejecuta: npm run muestras:pdf`);
      continue;
    }
    const buf = readFileSync(fp);
    const fileId = new ObjectId();
    const ext = "pdf";
    const blobPath = buildEmpresaFileBlobPath(String(empresaUserId), String(fileId), ext);
    try {
      await uploadBufferToAzure(buf, "application/pdf", blobPath);
    } catch (e) {
      console.error(`[Muestras PDF] Fallo Azure al subir ${row.fileName}:`, e);
      continue;
    }
    await db.collection(mongoColl.empresaFiles).insertOne({
      _id: fileId,
      empresaUserId,
      title: row.title,
      documentType: row.documentType,
      description: row.description,
      fileName: row.fileName,
      mimeType: "application/pdf",
      blobName: blobPath,
      createdAt: ts,
      updatedAt: ts,
    });
    cargados += 1;
    console.log("[Muestras PDF] OK en sistema:", row.fileName);
  }
  if (cargados > 0) {
    console.log(
      `[Muestras PDF] ${cargados} documento(s) corporativo(s) en Mis archivos; los clientes pueden verlos/descargarlos.\n`
    );
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Falta MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  await db.collection(mongoColl.users).deleteMany({});
  await db.collection(mongoColl.providers).deleteMany({});
  await db.collection(mongoColl.documents).deleteMany({});
  await db.collection(mongoColl.notifications).deleteMany({});
  await db.collection(mongoColl.settings).deleteMany({});
  await db.collection(mongoColl.downloadLogs).deleteMany({});
  await db.collection(mongoColl.documentTemplates).deleteMany({});
  await db.collection(mongoColl.empresaFiles).deleteMany({});
  await db.collection(mongoColl.empresaFileDownloads).deleteMany({});

  await db.collection(mongoColl.users).createIndex({ email: 1 }, { unique: true });
  await db.collection(mongoColl.providers).createIndex({ ruc: 1 }, { unique: true });
  await db.collection(mongoColl.documents).createIndex(
    { providerId: 1, documentType: 1, year: 1 },
    { unique: true }
  );
  await db.collection(mongoColl.notifications).createIndex({ userId: 1, createdAt: -1 });
  await db.collection(mongoColl.settings).createIndex({ key: 1 }, { unique: true });
  await db.collection(mongoColl.downloadLogs).createIndex({ userId: 1, documentId: 1 });
  await db.collection(mongoColl.documentTemplates).createIndex({ createdAt: -1 });
  await db.collection(mongoColl.empresaFiles).createIndex({ empresaUserId: 1, createdAt: -1 });
  await db.collection(mongoColl.empresaFileDownloads).createIndex({
    userId: 1,
    empresaFileId: 1,
  });

  const now = new Date();
  const demoDeadline = new Date("2026-12-31T12:00:00.000Z");

  await db.collection(mongoColl.providers).insertMany([
    {
      _id: P1,
      name: "Proveedor Uno",
      ruc: "1234567890001",
      email: "contacto@proveedoruno.demo",
      phone: "0999001001",
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: P2,
      name: "Proveedor Dos",
      ruc: "0987654321001",
      email: "info@proveedordos.demo",
      phone: "0999002002",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  await db.collection(mongoColl.users).insertMany([
    {
      _id: U_ADMIN,
      email: "admin@demo.com",
      passwordHash: hash("admin123"),
      name: "Administrador",
      role: "admin",
      providerId: null,
      createdAt: now,
    },
    {
      _id: U_EMPRESA,
      email: "empresa@demo.com",
      passwordHash: hash("empresa123"),
      name: "Empresa Demo",
      role: "empresa",
      providerId: null,
      createdAt: now,
    },
    {
      _id: U_PROV1,
      email: "prov1@demo.com",
      passwordHash: hash("prov123"),
      name: "Proveedor Uno",
      role: "proveedor",
      providerId: P1,
      createdAt: now,
    },
    {
      _id: U_PROV2,
      email: "prov2@demo.com",
      passwordHash: hash("prov456"),
      name: "Proveedor Dos",
      role: "proveedor",
      providerId: P2,
      createdAt: now,
    },
    {
      _id: U_CLIENTE,
      email: "cliente@demo.com",
      passwordHash: hash("cliente123"),
      name: "Cliente Demo",
      role: "cliente",
      providerId: null,
      empresaUserId: U_EMPRESA,
      createdAt: now,
    },
  ]);

  await db.collection(mongoColl.documents).insertMany([
    {
      _id: D1,
      providerId: P1,
      documentType: "RUC",
      year: 2026,
      description: "RUC actualizado 2026",
      status: "pending",
      blobName: null,
      observations: null,
      deadline: demoDeadline,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: D2,
      providerId: P1,
      documentType: "Permiso Bomberos",
      year: 2026,
      description: "Permiso de bomberos 2026",
      status: "uploaded",
      blobName: null,
      observations: null,
      deadline: demoDeadline,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: D3,
      providerId: P1,
      documentType: "RUC",
      year: 2025,
      description: "RUC 2025 (año anterior)",
      status: "approved",
      blobName: null,
      observations: null,
      deadline: demoDeadline,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: D4,
      providerId: P2,
      documentType: "Patente Municipal",
      year: 2026,
      description: "Patente municipal 2026",
      status: "rejected",
      blobName: null,
      observations:
        "El documento está ilegible, por favor resubir en mejor calidad.",
      deadline: demoDeadline,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: D5,
      providerId: P2,
      documentType: "RUC",
      year: 2026,
      description: "RUC actualizado 2026",
      status: "pending",
      blobName: null,
      observations: null,
      deadline: demoDeadline,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.collection(mongoColl.notifications).insertMany([
    {
      userId: U_PROV1,
      message:
        "Tu documento 'Permiso Bomberos 2026' fue rechazado: El documento está ilegible.",
      read: false,
      kind: "error",
      createdAt: new Date("2026-03-18"),
    },
    {
      userId: U_PROV2,
      message:
        "Tu documento 'Patente Municipal 2026' fue rechazado: El documento está ilegible, por favor resubir en mejor calidad.",
      read: false,
      kind: "error",
      createdAt: new Date("2026-03-19"),
    },
  ]);

  await db.collection(mongoColl.settings).insertMany([
    {
      key: "app",
      value: "flexiplast-documentos",
      updatedAt: now,
    },
    {
      key: "schema_version",
      value: "1",
      updatedAt: now,
    },
    {
      key: "default_max_downloads_per_document",
      value: "10",
      updatedAt: now,
    },
  ]);

  await db.collection(mongoColl.documentTemplates).insertMany([
    {
      label: "RUC",
      defaultDescription: "RUC vigente para el año indicado",
      createdAt: now,
      createdByUserId: U_EMPRESA,
    },
    {
      label: "Permiso Bomberos",
      defaultDescription: "Permiso de cuerpo de bomberos actualizado",
      createdAt: now,
      createdByUserId: U_EMPRESA,
    },
  ]);

  await seedMuestraPdfsEmpresa(db, U_EMPRESA, now);

  await client.close();
  console.log("Seed OK en base:", DB_NAME);
  console.log(
    "Colecciones:",
    mongoColl.users,
    mongoColl.providers,
    mongoColl.documents,
    mongoColl.notifications,
    mongoColl.settings,
    mongoColl.downloadLogs,
    mongoColl.documentTemplates,
    mongoColl.empresaFiles,
    mongoColl.empresaFileDownloads
  );
  console.log(
    "Usuarios: admin@demo.com, empresa@demo.com, cliente@demo.com, prov1@demo.com, prov2@demo.com"
  );
  console.log("\nInicia sesión en el navegador (http://localhost:3000/login), no en la terminal:");
  console.log("  admin@demo.com      / admin123");
  console.log("  empresa@demo.com    / empresa123");
  console.log("  cliente@demo.com    / cliente123");
  console.log("  prov1@demo.com      / prov123");
  console.log("  prov2@demo.com      / prov456");
  console.log(
    "\nCon Azure configurado: npm run seed:demo regenera PDFs y los deja en Mis archivos (empresa demo).\n"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
