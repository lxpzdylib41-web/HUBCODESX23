# X23 Hub — guía completa para Render

Esta guía explica cómo subir el proyecto completo a Render como un **Web Service** que ejecuta el API y el bot de Discord juntos.

## 1. Qué incluye el proyecto

- API REST para validar keys.
- Bot de Discord.
- Keys Legacy y Premium separadas.
- Panel administrativo en `/api/admin`.
- Health check en `/api/healthz`.
- Scripts de Roblox:
  - `attached_assets/x23hub_loader.lua` — Legacy PC.
  - `attached_assets/x23hub_key_checker.lua` — Legacy Android.
  - `attached_assets/x23hub_loader_clone.lua` — Premium Edition Android.
- Launcher de producción:
  - `artifacts/api-server/prod-launcher.mjs`
- Configuración de Render:
  - `render.yaml`

Render debe ejecutar el proyecto como **Web Service**. No lo crees como Static Site, porque un Static Site no mantiene ejecutándose el bot de Discord.

## 2. Antes de subirlo

Necesitas:

1. Una cuenta de GitHub.
2. Una cuenta de Render.
3. Un bot de Discord creado en el Discord Developer Portal.
4. Una base de datos PostgreSQL accesible desde Render.

La base de datos no se incluye dentro del ZIP. Las keys viven en PostgreSQL, no en los archivos del proyecto. Si usas una base nueva, tendrás que crear nuevamente tus keys o importar tus datos.

## 3. Subir el proyecto a GitHub

### Opción A: desde GitHub

1. Entra a GitHub.
2. Crea un repositorio nuevo, por ejemplo `x23-hub`.
3. Descomprime el ZIP.
4. Sube todo el contenido del ZIP al repositorio.
5. Verifica que estos archivos estén en la raíz:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
render.yaml
README.md
artifacts/
attached_assets/
lib/
```

No subas archivos `.env`, tokens, contraseñas ni valores privados.

### Opción B: usando Git desde una terminal

Ejecuta estos comandos dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "X23 Hub listo para Render"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` por los tuyos.

## 4. Crear la base de datos PostgreSQL

Puedes usar una PostgreSQL administrada que permita conexiones externas, por ejemplo una base PostgreSQL de Render u otro proveedor compatible.

Necesitas copiar la cadena completa de conexión, normalmente con este formato:

```text
postgresql://USUARIO:CONTRASENA@HOST:5432/NOMBRE_BASE
```

No publiques esa cadena en GitHub ni en este README.

### Crear las tablas

Antes del primer uso, el esquema de PostgreSQL debe existir. Desde una terminal con Node.js y pnpm instalados:

```bash
cd x23-hub
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
```

Define temporalmente `DATABASE_URL` con la conexión de tu base y ejecuta:

```bash
pnpm --filter @workspace/db run push
```

Este comando crea o actualiza las tablas del proyecto. Ejecuta el comando contra la base que usarás en Render, no contra otra base distinta.

## 5. Crear o revisar el bot de Discord

En el Discord Developer Portal:

1. Abre tu aplicación.
2. Entra en **Bot**.
3. Copia el **Bot Token**.
4. Entra en **General Information**.
5. Copia el **Application ID**; ese valor será `DISCORD_CLIENT_ID`.
6. Copia el ID de tu servidor de Discord; ese valor será `GUILD_ID`.

El bot debe estar invitado a tu servidor con permiso para:

- Ver canales.
- Enviar mensajes.
- Insertar enlaces.
- Adjuntar archivos.
- Conectarse a canales de voz si usarás música.

No pegues el token en GitHub, en el README ni en el chat.

## 6. Crear el servicio en Render con `render.yaml`

1. Entra a Render.
2. Selecciona **New**.
3. Selecciona **Blueprint**.
4. Conecta tu cuenta de GitHub.
5. Elige el repositorio donde subiste X23 Hub.
6. Render detectará el archivo `render.yaml`.
7. Confirma la creación del servicio `x23-hub`.
8. Selecciona el plan que quieras usar.

El servicio debe aparecer como:

```text
Web Service
```

No selecciones:

```text
Static Site
```

## 7. Valores exactos de Build y Start

Si Render detecta `render.yaml`, los comandos ya estarán configurados. Si creas el servicio manualmente, pon exactamente lo siguiente.

### Build Command

```bash
corepack enable && corepack prepare pnpm@10.26.1 --activate && pnpm install --frozen-lockfile && pnpm run build:production
```

### Start Command

```bash
node artifacts/api-server/prod-launcher.mjs
```

### Root Directory

Déjalo vacío. El repositorio debe abrir directamente en la carpeta que contiene `package.json` y `render.yaml`.

### Health Check Path

```text
/api/healthz
```

### Node version

Usa Node 20 o superior. El proyecto usa Node 24 en desarrollo y no necesita un comando adicional de inicio.

No pongas `pnpm dev` en Start Command. En Render debe ejecutarse el launcher de producción.

## 8. Variables de entorno de Render

En Render abre:

```text
Service → Environment → Environment Variables
```

Agrega estas variables:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | La conexión PostgreSQL completa |
| `BOT_SECRET` | Un secreto largo inventado por ti |
| `DISCORD_BOT_TOKEN` | Token privado del bot |
| `DISCORD_CLIENT_ID` | Application ID de Discord |
| `GUILD_ID` | ID del servidor de Discord |
| `ADMIN_PANEL_PASSWORD` | Contraseña privada del panel |

### Crear `BOT_SECRET`

Puedes generar un valor seguro desde una terminal:

```bash
openssl rand -hex 32
```

Copia el resultado en `BOT_SECRET`.

No necesitas definir `PORT`: Render proporciona esa variable automáticamente y el API la utiliza.

No agregues estas variables al código:

```text
DISCORD_BOT_TOKEN
DATABASE_URL
BOT_SECRET
ADMIN_PANEL_PASSWORD
```

## 9. Desplegar

Después de guardar las variables:

1. Pulsa **Manual Deploy**.
2. Selecciona **Deploy latest commit**.
3. Espera a que termine el Build.
4. Revisa los logs.

El arranque correcto debe mostrar algo equivalente a:

```text
Server listening
Bot conectado como ...
```

Si el build termina correctamente pero el bot no conecta, revisa primero `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID` y `BOT_SECRET`.

## 10. Comprobar el servicio

Render te dará un dominio parecido a:

```text
https://x23-hub.onrender.com
```

Comprueba estas direcciones:

### Página pública

```text
https://TU-DOMINIO.onrender.com/
```

### Health check

```text
https://TU-DOMINIO.onrender.com/api/healthz
```

Debe responder con un JSON parecido a:

```json
{
  "status": "ok",
  "apiEnabled": true,
  "botEnabled": true,
  "botOnline": true
}
```

### Panel administrativo

```text
https://TU-DOMINIO.onrender.com/api/admin
```

Usa el valor que pusiste en `ADMIN_PANEL_PASSWORD`.

## 11. Registrar los comandos de Discord

Los comandos se registran en Discord una vez. Si el bot ya los tiene registrados, no necesitas repetir este paso.

Si agregas o cambias comandos, ejecuta desde una terminal con las variables privadas cargadas:

```bash
pnpm --filter @workspace/discord-bot run register
```

El registro necesita:

```text
DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID
GUILD_ID
```

Después de modificar comandos, reinicia el servicio de Render.

## 12. Crear keys desde Discord

El contador de una key temporal empieza cuando se usa por primera vez en el loader.

### Crear una key Legacy

Usa:

```text
/genkey
```

Selecciona:

```text
script: Legacy
```

### Crear una key Premium

Usa:

```text
/genkey
```

Selecciona:

```text
script: Premium Edition
```

Una key Legacy no funciona en Premium y una key Premium no funciona en Legacy.

Para listar keys:

```text
/listkeys
```

Selecciona el script que quieres consultar.

La key administrativa global `YERIM` funciona en ambos productos, es permanente y no se ata a un HWID.

## 13. Configurar UptimeRobot

1. Entra en UptimeRobot.
2. Crea un monitor nuevo.
3. Tipo: **HTTP(s)**.
4. Método: **GET**.
5. URL:

```text
https://TU-DOMINIO.onrender.com/api/healthz
```

6. Intervalo recomendado: 5 minutos.
7. Guarda el monitor.

UptimeRobot debe consultar `/api/healthz`, no `/api/keys/validate`.

Render puede suspender servicios gratuitos o aplicar límites del plan. UptimeRobot ayuda con la inactividad, pero no elimina los límites del plan de Render.

## 14. Actualizar el proyecto después

Cuando hagas cambios:

```bash
git add .
git commit -m "Actualizar X23 Hub"
git push
```

Si `Auto Deploy` está activado, Render desplegará el nuevo commit automáticamente. Si no, abre Render y pulsa **Manual Deploy → Deploy latest commit**.

Render volverá a ejecutar:

```bash
corepack enable && corepack prepare pnpm@10.26.1 --activate && pnpm install --frozen-lockfile && pnpm run build:production
```

y después:

```bash
node artifacts/api-server/prod-launcher.mjs
```

## 15. Errores comunes

### `DATABASE_URL` no configurada

Revisa que la variable exista en Render y que incluya `postgresql://`.

### `relation "keys" does not exist`

Ejecuta el push del esquema contra la misma base que pusiste en Render:

```bash
pnpm --filter @workspace/db run push
```

### `BOT_SECRET no configurado`

Agrega `BOT_SECRET` en Render. No lo dejes vacío.

### El bot no inicia

Revisa:

- `DISCORD_BOT_TOKEN`.
- `DISCORD_CLIENT_ID`.
- `GUILD_ID`.
- Que el bot siga invitado al servidor.
- Los logs de Render.

### El health check falla

Comprueba que:

- El servicio sea **Web Service**.
- El Start Command sea `node artifacts/api-server/prod-launcher.mjs`.
- El Health Check Path sea `/api/healthz`.
- El puerto no esté fijado manualmente a otro valor.

### Las keys no aparecen después de migrar

El ZIP no contiene la base de datos. Debes usar la misma PostgreSQL o crear las keys nuevamente desde Discord.

## 16. Seguridad

Nunca publiques:

- `DISCORD_BOT_TOKEN`.
- `DATABASE_URL`.
- `BOT_SECRET`.
- `ADMIN_PANEL_PASSWORD`.
- Archivos `.env`.

Si un token se filtra, revócalo y genera uno nuevo desde el proveedor correspondiente.