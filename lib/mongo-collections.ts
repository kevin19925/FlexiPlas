/**
 * Nombres de colecciones en MongoDB.
 * Configurables por env (útil si Atlas ya tiene otros nombres o prefijos).
 *
 * Colecciones:
 * - users, providers, documents, notifications (datos de negocio)
 * - settings (metadatos / configuración clave-valor, creada por seed)
 */

function envName(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export const mongoColl = {
  get users() {
    return envName("MONGODB_COLL_USERS", "users");
  },
  get providers() {
    return envName("MONGODB_COLL_PROVIDERS", "providers");
  },
  get documents() {
    return envName("MONGODB_COLL_DOCUMENTS", "documents");
  },
  get notifications() {
    return envName("MONGODB_COLL_NOTIFICATIONS", "notifications");
  },
  /** Nueva: configuración y metadatos de la app (no reemplaza Azure). */
  get settings() {
    return envName("MONGODB_COLL_SETTINGS", "settings");
  },
  get downloadLogs() {
    return envName("MONGODB_COLL_DOWNLOAD_LOGS", "download_logs");
  },
  get documentTemplates() {
    return envName("MONGODB_COLL_DOCUMENT_TEMPLATES", "document_templates");
  },
  get empresaFiles() {
    return envName("MONGODB_COLL_EMPRESA_FILES", "empresa_files");
  },
  get empresaFileDownloads() {
    return envName("MONGODB_COLL_EMPRESA_FILE_DOWNLOADS", "empresa_file_downloads");
  },
};
