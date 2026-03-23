import { dbConnect } from "./mongodb";
import bcrypt from "bcryptjs";

export async function initializeSystem(): Promise<void> {
  try {
    await dbConnect();

    // Import models after connecting
    const { default: User } = await import("@/models/User");

    const adminExists = await User.findOne({ role: "ADMIN" });

    if (!adminExists) {
      console.log("🔧 Inicializando sistema con usuarios por defecto...");

      await User.create([
        {
          email: "admin@demo.com",
          password: bcrypt.hashSync("admin123", 12),
          name: "Administrador",
          role: "ADMIN",
        },
        {
          email: "empresa@demo.com",
          password: bcrypt.hashSync("empresa123", 12),
          name: "Empresa Demo",
          role: "EMPRESA",
        },
      ]);

      console.log("✅ Usuarios por defecto creados:");
      console.log("   admin@demo.com / admin123");
      console.log("   empresa@demo.com / empresa123");
    }
  } catch (error) {
    console.error("❌ Error al inicializar el sistema:", error);
    // No lanzar error — el sistema puede seguir funcionando
  }
}
