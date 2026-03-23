import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.role === "cliente" && session.empresaUserId) {
    const oid = toObjectId(session.empresaUserId);
    if (oid) {
      const db = await getDb();
      const emp = await db
        .collection(mongoColl.users)
        .findOne({ _id: oid }, { projection: { name: 1, email: 1 } });
      if (emp && typeof emp.name === "string") {
        return NextResponse.json({
          ...session,
          linkedEmpresa: {
            name: emp.name,
            email: typeof emp.email === "string" ? emp.email : "",
          },
        });
      }
    }
  }

  return NextResponse.json(session);
}
