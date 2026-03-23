"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatFileSize } from "@/lib/utils";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface UploadFormProps {
  documentId: string;
  onSuccess: (data: { fileUrl: string; fileName: string; blobName: string }) => void;
}

export default function UploadForm({ documentId, onSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  function validateFile(f: File): boolean {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Tipo no permitido. Use PDF, JPG, PNG o WEBP");
      return false;
    }
    if (f.size > MAX_SIZE) {
      toast.error("El archivo supera el límite de 10MB");
      return false;
    }
    return true;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (validateFile(f)) setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 20, 85));
      }, 200);

      // 1. Subir archivo a Azure
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Error al subir el archivo");
      }

      const { url, blobName, fileName } = await uploadRes.json();
      setProgress(95);

      // 2. Actualizar el documento
      const patchRes = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          fileUrl: url,
          fileName,
          blobName,
        }),
      });

      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || "Error al actualizar el documento");
      }

      setProgress(100);
      toast.success("Archivo subido correctamente");
      onSuccess({ fileUrl: url, fileName, blobName });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(msg);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  const isImage = file && ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn("upload-zone", dragOver && "dragover")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">
          Arrastra un archivo o <span className="text-indigo-600">haz click para seleccionar</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WEBP — máximo 10MB</p>
      </div>

      {/* File preview */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5 text-blue-500" />
              ) : (
                <FileText className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
            {!uploading && (
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                aria-label="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <AnimatePresence>
        {uploading && progress > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            <div className="flex justify-between text-xs text-slate-600">
              <span>{progress < 100 ? "Subiendo..." : "Completado"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      {file && (
        <Button
          fullWidth
          onClick={handleUpload}
          loading={uploading}
          disabled={uploading}
        >
          {uploading ? "Subiendo archivo..." : "Subir Archivo"}
        </Button>
      )}
    </div>
  );
}
