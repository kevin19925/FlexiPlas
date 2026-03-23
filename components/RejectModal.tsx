"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@nextui-org/react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (observations: string) => void;
};

const MIN = 5;

export function RejectModal({
  open,
  title = "Rechazar documento",
  onClose,
  onConfirm,
}: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const valid = text.trim().length >= MIN;

  return (
    <Modal isOpen={open} onOpenChange={(next) => !next && onClose()} size="md" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
        <ModalBody>
          <p className="mb-2 text-small text-default-500">
            Mínimo {MIN} caracteres. El proveedor verá este mensaje.
          </p>
          <Textarea
            autoFocus
            minRows={4}
            value={text}
            onValueChange={setText}
            placeholder="Observación"
            variant="bordered"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button color="danger" isDisabled={!valid} onPress={() => valid && onConfirm(text.trim())}>
            Rechazar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
