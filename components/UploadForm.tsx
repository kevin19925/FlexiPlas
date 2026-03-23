"use client";

import { Button, Progress } from "@nextui-org/react";
import { CloudUpload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type Props = {
  documentId: string;
  onDone?: () => void;
};

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export function UploadForm({ documentId, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(0);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("documentId", documentId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setBusy(false);
        setProgress(0);
        try {
          const json = JSON.parse(xhr.responseText || "{}") as {
            error?: string;
            document?: unknown;
          };
          if (xhr.status >= 200 && xhr.status < 300 && json.document) {
            inputRef.current?.form?.reset();
            onDone?.();
          } else {
            setError(json.error || "Error al subir");
          }
        } catch {
          setError("Respuesta inválida del servidor");
        }
      };
      xhr.onerror = () => {
        setBusy(false);
        setProgress(0);
        setError("Error de red");
      };
      xhr.send(fd);
    },
    [documentId, onDone]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current?.files?.[0];
    if (!input) {
      setError("Selecciona un archivo");
      return;
    }
    uploadFile(input);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  const inputId = `file-${documentId}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-small text-default-500">PDF, JPG, PNG o WEBP · máx. 10 MB</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-default-200 bg-default-50"
        }`}
      >
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept={ACCEPT}
          className="hidden"
          id={inputId}
          onChange={() => setError(null)}
        />
        <label htmlFor={inputId}>
          <span className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">
            Elegir archivo
          </span>
        </label>
        <p className="mt-1 text-tiny text-default-500">o suelta aquí</p>
      </div>
      {busy && (
        <div>
          <Progress aria-label="Progreso de subida" value={progress || 8} className="h-2" color="secondary" />
          <p className="mt-1 text-tiny text-default-500">Subiendo… {progress}%</p>
        </div>
      )}
      <Button
        type="submit"
        color="secondary"
        isDisabled={busy}
        startContent={<CloudUpload className="h-4 w-4" />}
      >
        {busy ? "Subiendo…" : "Subir archivo seleccionado"}
      </Button>
      {error && <p className="text-small text-danger">{error}</p>}
    </form>
  );
}
