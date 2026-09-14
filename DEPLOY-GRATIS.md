# X23 Hub — mantener el bot 24/7 gratis

## Opción recomendada: Oracle Cloud Always Free

Oracle ofrece máquinas virtuales Always Free que no caducan. Para este proyecto usa una VM Ubuntu y ejecuta el bot con PM2 para que se reinicie solo si se cae.

> Oracle puede pedir una tarjeta para verificar la cuenta y algunas regiones pueden no tener capacidad disponible. No selecciones recursos que no estén marcados como **Always Free**.

### 1. Crear la VM

1. Crea una cuenta en [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. En la consola abre **Compute → Instances → Create instance**.
3. Selecciona Ubuntu 22.04 o 24.04.
4. Selecciona una forma marcada **Always Free Eligible**.
5. Guarda la clave SSH que Oracle te entrega.
6. Crea la instancia.

### 2. Subir el proyecto

Puedes subir este ZIP a GitHub y clonarlo desde la VM:

```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2

git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git x23-hub
cd x23-hub
pnpm install --frozen-lockfile
pnpm run build:production
```

Si no usas GitHub, también puedes descomprimir el ZIP directamente en la VM.

### 3. Configurar variables privadas

No subas tokens al repositorio. En la VM crea el archivo `.env`:

```bash
nano .env
```

Configura estas variables:

```env
DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:5432/BASE_DE_DATOS
BOT_SECRET=crea-un-secreto-largo-y-aleatorio
DISCORD_BOT_TOKEN=token-del-bot
DISCORD_CLIENT_ID=id-de-la-aplicacion
GUILD_ID=id-de-tu-servidor
PORT=8080
NODE_ENV=production
# Opcional:
# OPENAI_API_KEY=...
# ADMIN_PANEL_PASSWORD=una-contraseña-distinta-para-el-panel
```

El proyecto usa PostgreSQL. Puedes usar una base PostgreSQL gratuita externa, pero debes conservar la misma `DATABASE_URL` mientras quieras conservar las keys.

Antes de subir los scripts a otro hosting, reemplaza en los tres archivos `.lua` el valor de `API_URL` por:

`https://TU-DOMINIO/api/keys/validate`

## Keys separadas por script

El sistema distingue dos productos:

- `legacy`: Legacy para PC y Android (`attached_assets/x23hub_loader.lua` y `attached_assets/x23hub_key_checker.lua`)
- `premium`: Premium Edition únicamente para Android (`attached_assets/x23hub_loader_clone.lua`)

En Discord usa el campo **script** al ejecutar `/genkey` o `/genkeys`. Elige `Legacy` o `Premium Edition`. Una key creada para `legacy` responderá como inválida si se intenta usar desde `premium`, y al revés.

En `/listkeys` Discord también te pide el **script** que quieres consultar. La lista queda separada y solo muestra keys Legacy o solo muestra keys Premium Edition, según la opción elegida.

## Ping de UptimeRobot

Configura un monitor HTTP GET con:

`https://TU-DOMINIO/api/healthz`

El endpoint responde HTTP 200 y muestra el estado del API, el bot y el último heartbeat. Un intervalo de 5 minutos es suficiente para mantener despierto el servicio en un hosting que duerme por inactividad. Si el API y el bot se ejecutan en procesos separados, el ping mantiene despierto al API, pero el hosting también debe soportar un proceso persistente para garantizar el bot 24/7.

## Panel administrativo

Abre `https://TU-DOMINIO/api/admin`. Define `ADMIN_PANEL_PASSWORD` en las variables de entorno. El panel permite pausar/activar validaciones y desconectar/reconectar el bot sin mostrar tokens al navegador.

El script también envía el HWID. En la primera activación se guarda y las siguientes activaciones deben coincidir con el mismo dispositivo. `/resethwid` libera la key manualmente.

### 4. Iniciar el API y el bot 24/7

El launcher incluido inicia el API y el bot juntos:

```bash
set -a
source .env
set +a
pm2 start artifacts/api-server/prod-launcher.mjs --name x23-hub
pm2 save
pm2 startup
```

El último comando imprime otro comando. Cópialo y ejecútalo para que PM2 arranque después de reiniciar la VM.

Comandos útiles:

```bash
pm2 status
pm2 logs x23-hub
pm2 restart x23-hub
```

### 5. Registrar los slash commands

Hazlo una sola vez, desde la carpeta del proyecto y con las variables cargadas:

```bash
set -a
source .env
set +a
pnpm --filter @workspace/discord-bot run register
```

## Opción Render + UptimeRobot

El archivo `render.yaml` configura un único Web Service de Render que inicia el API y el bot juntos con `prod-launcher.mjs`. No lo subas como **Static Site**, porque un sitio estático no ejecuta el bot de Discord.

1. Sube el proyecto a GitHub, incluyendo `render.yaml`.
2. En Render selecciona **New → Blueprint** y elige el repositorio.
3. Render detectará `render.yaml` y creará el servicio `x23-hub`.
4. En **Environment** completa las variables marcadas como secretas:
   - `DATABASE_URL`
   - `BOT_SECRET`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `GUILD_ID`
   - `ADMIN_PANEL_PASSWORD`
5. Espera a que termine el deploy y copia el dominio `onrender.com`.
6. Comprueba la página:

   `https://TU-SERVICIO.onrender.com/`

7. En UptimeRobot crea un monitor **HTTP(s)** con esta URL:

   `https://TU-SERVICIO.onrender.com/api/healthz`

   Usa método `GET` y un intervalo de 5 minutos.

Render Free puede suspender servicios después de inactividad y tiene límites mensuales. El ping de UptimeRobot reduce la suspensión por inactividad, pero no elimina los límites del plan. Si el servicio está suspendido, la primera petición puede tardar unos segundos en responder mientras Render lo despierta.

## Alternativa sencilla: Railway

El proyecto ya incluye `railway.json` y `.nixpacks.toml`. En Railway:

1. Sube el proyecto a GitHub.
2. Crea un proyecto nuevo desde ese repositorio.
3. Añade las mismas variables de `.env` en **Variables**.
4. Railway detectará la configuración y ejecutará `prod-launcher.mjs`.

Railway es más fácil, pero su plan gratis puede ser crédito promocional o limitado. Para 24/7 permanente, Oracle Always Free es la opción más adecuada de las alternativas gratuitas.

## Importante

- Nunca publiques `.env`, `DISCORD_BOT_TOKEN`, `BOT_SECRET` ni `DATABASE_URL`.
- Si cambias de base de datos, las keys existentes no aparecen automáticamente: debes migrar/exportar los datos.
- Para hacer cambios después de subirlo:

```bash
cd x23-hub
git pull
pnpm install --frozen-lockfile
pnpm run build:production
pm2 restart x23-hub
```