# SisArchivos — Sistema de Gestión de Documentos

Sistema completo de gestión de documentos para empresas y proveedores, construido con **Next.js 14+**, **MongoDB Atlas** y **Azure Blob Storage**.

---

## Stack tecnológico

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Estilos**: Tailwind CSS + Framer Motion
- **Base de datos**: MongoDB Atlas (Mongoose)
- **Almacenamiento**: Azure Blob Storage (privado con SAS tokens)
- **Autenticación**: JWT con `jose` en cookies httpOnly
- **Deploy**: Vercel

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Acceso completo: CRUD de proveedores, usuarios y documentos |
| `EMPRESA` | Crea solicitudes de documentos, revisa y aprueba/rechaza |
| `PROVEEDOR` | Sube los archivos solicitados por la empresa |

---

## Deploy en Vercel — Guía Paso a Paso

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/sisarchivos.git
cd sisarchivos
npm install
```

### 2. Crear variables de entorno locales

Crea el archivo `.env.local` en la raíz del proyecto:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/
MONGODB_DB_NAME=sis_archivos
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=archivos
JWT_SECRET=tu-secreto-largo-y-seguro-minimo-32-caracteres
```

### 3. Requisitos previos

- **MongoDB Atlas**: Crear un cluster gratuito en [mongodb.com/atlas](https://mongodb.com/atlas)
  - Crear usuario de base de datos
  - Permitir acceso desde `0.0.0.0/0` (IPs de Vercel)
  - Copiar la connection string

- **Azure Blob Storage**:
  - Crear un Storage Account en [portal.azure.com](https://portal.azure.com)
  - Crear un contenedor llamado `archivos` con acceso **privado**
  - Copiar la cadena de conexión desde: Storage Account → Access keys → Connection string

### 4. Probar localmente

```bash
npm run dev
```

Ir a [http://localhost:3000](http://localhost:3000)

### 5. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/sisarchivos.git
git push -u origin main
```

### 6. Importar en Vercel

1. Ir a [vercel.com](https://vercel.com) → **New Project**
2. Importar el repositorio de GitHub
3. **Framework Preset**: Next.js (detectado automáticamente)

### 7. Agregar Variables de Entorno en Vercel

En Vercel → tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `MONGODB_URI` | Tu connection string de MongoDB Atlas |
| `MONGODB_DB_NAME` | `sis_archivos` |
| `AZURE_STORAGE_CONNECTION_STRING` | Tu connection string de Azure |
| `AZURE_STORAGE_CONTAINER` | `archivos` |
| `JWT_SECRET` | Un string aleatorio de mínimo 32 caracteres |

### 8. Deploy

Click en **Deploy**. Vercel construirá y desplegará automáticamente.

---

## Primer acceso

Al acceder por primera vez, el sistema crea automáticamente dos usuarios:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@demo.com` | `admin123` | ADMIN |
| `empresa@demo.com` | `empresa123` | EMPRESA |

> ⚠️ **Cambia estas contraseñas en producción** desde el panel de administración.

---

## Funcionalidades principales

### Gestión de documentos
- Solicitudes de documentos con fecha límite (deadline)
- Indicador visual de urgencia (URGENTE parpadeante cuando quedan ≤3 días)
- Colores semafóricos según días restantes

### Flujo de trabajo
```
EMPRESA crea solicitud (PENDING)
    ↓
PROVEEDOR sube archivo (UPLOADED)  
    ↓
EMPRESA revisa y aprueba/rechaza
    ↓
APPROVED ✅  o  REJECTED ❌
    ↓ (si rechazado)
PROVEEDOR vuelve a subir → UPLOADED
```

### Seguridad de archivos
- Todos los archivos en Azure son **privados**
- Las descargas/visualizaciones se hacen con **SAS tokens** de 60 minutos
- Las credenciales de Azure nunca se exponen al cliente

### Trazabilidad
- Vista de tabla histórica: filas = tipos de documentos, columnas = años
- Click en celda para ver detalles del documento

---

## Estructura del proyecto

```
/app
  /api/           → API routes (auth, users, providers, documents, upload, notifications)
  /(auth)/login/  → Página de login
  /(dashboard)/   → Panel por rol (admin, empresa, proveedor)
/components
  /ui/            → Componentes base (Button, Input, Modal, etc.)
  /layout/        → Sidebar, Navbar, NotificationBell
  /documents/     → DocumentCard, UploadForm, TraceabilityTable, etc.
  /providers/     → ProviderCard, ProviderForm
  /users/         → UserForm
/lib              → Utilidades (mongodb, azure, auth, init, types)
/models           → Schemas Mongoose (User, Provider, Document, Notification)
/middleware.ts    → Protección de rutas /dashboard/*
```

---

## Desarrollo local

```bash
npm run dev      # Servidor de desarrollo en :3000
npm run build    # Build de producción
npm run lint     # Lint con ESLint
```

---

## Soporte

Para soporte técnico contacta al equipo de CONWARE.

© 2026 SisArchivos — CONWARE. Todos los derechos reservados.
