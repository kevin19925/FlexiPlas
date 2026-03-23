import { ProveedorDetalleClient } from "./ProveedorDetalleClient";

export default function ProveedorDetallePage({
  params,
}: {
  params: { id: string };
}) {
  return <ProveedorDetalleClient providerId={params.id} />;
}
