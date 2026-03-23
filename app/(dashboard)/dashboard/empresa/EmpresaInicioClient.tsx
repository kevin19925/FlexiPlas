"use client";

import { Card, CardBody } from "@nextui-org/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function EmpresaInicioClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-3xl font-bold text-primary">Panel empresa</h1>
        <p className="text-default-500">
          Usa el menú lateral: crea solicitudes a proveedores o revisa todo en gestión de archivos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card as={Link} href="/dashboard/empresa/solicitudes" isPressable shadow="sm" className="border border-default-200">
          <CardBody>
            <h2 className="text-lg font-semibold">Solicitudes</h2>
            <p className="mt-2 text-sm text-default-500">
                  Pide documentos a uno, varios o todos los proveedores. Una solicitud o varias filas a la vez.
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-bold text-primary">
              <span>Ir</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardBody>
        </Card>
        <Card as={Link} href="/dashboard/empresa/archivos" isPressable shadow="sm" className="border border-default-200">
          <CardBody>
            <h2 className="text-lg font-semibold">Gestión de archivos</h2>
            <p className="mt-2 text-sm text-default-500">
                  Filtra por proveedor, revisa estados, abre archivos y entra a la ficha de cada proveedor.
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-bold text-primary">
              <span>Ir</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card shadow="sm" className="border border-default-200">
        <CardBody>
          <h3 className="mb-2 text-lg font-semibold">Recordatorio</h3>
          <ul className="list-disc space-y-2 pl-6 text-sm text-default-500">
            <li>
              La <strong>vista previa</strong> en la app no cuenta como descarga. El tope de descargas por
              archivo lo define el <strong>administrador</strong> (global o por usuario).
            </li>
            <li>
              Los proveedores ven sus pendientes del año en curso y reciben aviso al crear solicitudes.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
