import { REST, Routes } from "discord.js";

const token    = process.env.DISCORD_BOT_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const DURATION_OPTIONS = [
  { name: "Minutos", value: "minutes" },
  { name: "Horas",   value: "hours"   },
  { name: "Días",    value: "days"    },
];

// default_member_permissions → bits de permisos de Discord que el miembro debe tener
// "0" = solo admins con admin perm pueden ver/usar por defecto
const PERM_BAN          = String(1 << 2);          // BAN_MEMBERS
const PERM_KICK         = String(1 << 1);          // KICK_MEMBERS
const PERM_MODERATE     = String(2199023255552);   // MODERATE_MEMBERS (1 << 40)
const PERM_MANAGE_MSG   = String(1 << 13);         // MANAGE_MESSAGES
const PERM_ADMIN        = String(1 << 3);          // ADMINISTRATOR

const commands = [
  // ════════════════════════════════════════════
  //  🔑  KEY MANAGEMENT
  // ════════════════════════════════════════════
  {
    name: "genkey",
    description: "🔑 Genera una key para X23 Hub",
    options: [
      {
        name: "tipo", description: "Tipo de key", type: 3, required: true,
        choices: [
          { name: "Permanente",                      value: "permanent" },
          { name: "Temporal (empieza al activarse)", value: "timed"     },
        ],
      },
      {
        name: "script", description: "Script al que pertenece la key", type: 3, required: false,
        choices: [
          { name: "Legacy (PC + Android)", value: "legacy" },
          { name: "Premium Edition (Android)", value: "premium" },
        ],
      },
      { name: "nombre",   description: "Nombre del usuario al que va dirigida",               type: 3, required: false },
      { name: "duracion", description: "Cantidad de tiempo (solo temporales)",                  type: 4, required: false, min_value: 1, max_value: 9999 },
      { name: "unidad",   description: "Unidad de tiempo",                                     type: 3, required: false, choices: DURATION_OPTIONS },
      { name: "clave",    description: "Clave personalizada exacta (ej: VIP-ACCESO-2025)",     type: 3, required: false },
      { name: "prefijo",  description: "Prefijo personalizado en vez de X23 (ej: VIP, STAFF)", type: 3, required: false },
    ],
  },
  {
    name: "ia",
    description: "🤖 Pregúntale algo a la IA del hub",
    options: [
      { name: "pregunta", description: "Tu pregunta o mensaje", type: 3, required: true },
    ],
  },
  {
    name: "revokekey",
    description: "🚫 Revoca/desactiva una key",
    options: [{ name: "key", description: "La key (X23-XXXX-XXXX-XXXX)", type: 3, required: true }],
  },
  {
    name: "deletekey",
    description: "🗑️ Elimina permanentemente una key",
    options: [{ name: "key", description: "La key a eliminar", type: 3, required: true }],
  },
  {
    name: "renewkey",
    description: "🔄 Extiende el tiempo de una key temporal",
    options: [
      { name: "key",      description: "La key a renovar",       type: 3, required: true },
      { name: "duracion", description: "Tiempo extra a agregar", type: 4, required: true, min_value: 1, max_value: 9999 },
      { name: "unidad",   description: "Unidad de tiempo",       type: 3, required: false, choices: DURATION_OPTIONS },
    ],
  },
  {
    name: "assignkey",
    description: "✏️ Cambia el nombre asignado a una key",
    options: [
      { name: "key",    description: "La key a modificar",              type: 3, required: true },
      { name: "nombre", description: "Nuevo nombre (vacío = quitar)",   type: 3, required: false },
    ],
  },
  {
    name: "listkeys",
    description: "📋 Lista las últimas 25 keys generadas",
    options: [
      {
        name: "script", description: "Qué script quieres consultar", type: 3, required: true,
        choices: [
          { name: "Legacy (PC + Android)", value: "legacy" },
          { name: "Premium Edition (Android)", value: "premium" },
        ],
      },
      {
        name: "filtro", description: "Filtrar por estado", type: 3, required: false,
        choices: [
          { name: "Todas",                    value: "all"      },
          { name: "Solo activas",             value: "active"   },
          { name: "Solo inactivas/expiradas", value: "inactive" },
          { name: "Sin activar aún",          value: "pending"  },
        ],
      },
    ],
  },
  { name: "keyinfo",    description: "🔍 Ver todos los detalles de una key",         options: [{ name: "key",    description: "La key a consultar", type: 3, required: true }] },
  { name: "resethwid",  description: "🔓 Libera una key para que se pueda activar en otro dispositivo", options: [{ name: "key", description: "La key a liberar", type: 3, required: true }] },
  { name: "searchkey",  description: "🔎 Buscar keys por nombre de usuario",         options: [{ name: "nombre", description: "Nombre a buscar",    type: 3, required: true }] },
  { name: "history",    description: "📜 Historial de uso — últimas 15 activaciones" },
  { name: "stats",      description: "📊 Estadísticas generales del sistema de keys" },
  { name: "limpiarexpiradas", description: "🧹 Revocar todas las keys expiradas automáticamente" },
  {
    name: "genkeys",
    description: "🔑 Generar varias keys a la vez (máx 25)",
    options: [
      {
        name: "tipo", description: "Tipo de key", type: 3, required: true,
        choices: [{ name: "Permanente", value: "permanent" }, { name: "Temporal", value: "timed" }],
      },
      { name: "cantidad", description: "Cuántas keys generar (1–25)", type: 4, required: true, min_value: 1, max_value: 25 },
      { name: "duracion", description: "Duración (solo temporales)", type: 4, required: false, min_value: 1, max_value: 9999 },
      { name: "unidad",   description: "Unidad de tiempo",           type: 3, required: false, choices: DURATION_OPTIONS },
      { name: "prefijo",  description: "Prefijo personalizado",       type: 3, required: false },
      {
        name: "script", description: "Script al que pertenecen las keys", type: 3, required: false,
        choices: [
          { name: "Legacy (PC + Android)", value: "legacy" },
          { name: "Premium Edition (Android)", value: "premium" },
        ],
      },
    ],
  },
  {
    name: "exportkeys",
    description: "📄 Exportar todas las keys como archivo .txt",
    options: [{
      name: "filtro", description: "Filtrar keys", type: 3, required: false,
      choices: [
        { name: "Todas",       value: "all"       },
        { name: "Activas",     value: "active"    },
        { name: "Inactivas",   value: "inactive"  },
        { name: "Sin activar", value: "pending"   },
        { name: "Temporales",  value: "timed"     },
        { name: "Permanentes", value: "permanent" },
      ],
    }],
  },
  {
    name: "transferkey",
    description: "🔁 Transferir una key a otro usuario",
    options: [
      { name: "key",            description: "La key a transferir",              type: 3, required: true  },
      { name: "nuevo_usuario",  description: "Nombre del nuevo usuario",         type: 3, required: true  },
      { name: "resetear_hwid",  description: "¿Resetear HWID al transferir?",   type: 5, required: false },
    ],
  },
  {
    name: "deviceinfo",
    description: "🖥️ Ver IP y datos del dispositivo de una key",
    options: [{ name: "key", description: "La key a consultar", type: 3, required: true }],
  },
  {
    name: "purgerevocadas",
    description: "🗑️ Eliminar permanentemente todas las keys revocadas de la base de datos",
    options: [
      {
        name: "confirmar", description: "Escribe Sí para confirmar — esta acción NO se puede deshacer",
        type: 5, required: true,
      },
    ],
  },

  // ════════════════════════════════════════════
  //  🛡️  MODERACIÓN
  // ════════════════════════════════════════════
  {
    name: "ban",
    description: "🔨 Banear a un usuario del servidor",
    default_member_permissions: PERM_BAN,
    options: [
      { name: "usuario",     description: "Usuario a banear",                          type: 6, required: true  },
      { name: "razon",       description: "Motivo del ban",                            type: 3, required: false },
      { name: "eliminar_msgs", description: "Borrar mensajes de los últimos X días (0-7)", type: 4, required: false, min_value: 0, max_value: 7 },
    ],
  },
  {
    name: "unban",
    description: "🔓 Desbanear a un usuario por su ID",
    default_member_permissions: PERM_BAN,
    options: [
      { name: "id",    description: "ID de Discord del usuario a desbanear", type: 3, required: true  },
      { name: "razon", description: "Motivo del desban",                     type: 3, required: false },
    ],
  },
  {
    name: "kick",
    description: "👢 Expulsar a un usuario del servidor",
    default_member_permissions: PERM_KICK,
    options: [
      { name: "usuario", description: "Usuario a expulsar", type: 6, required: true  },
      { name: "razon",   description: "Motivo",             type: 3, required: false },
    ],
  },
  {
    name: "timeout",
    description: "🔇 Silenciar temporalmente a un usuario",
    default_member_permissions: PERM_MODERATE,
    options: [
      { name: "usuario",  description: "Usuario a silenciar",  type: 6, required: true  },
      { name: "duracion", description: "Duración",             type: 4, required: true, min_value: 1, max_value: 9999 },
      { name: "unidad",   description: "Unidad de tiempo",     type: 3, required: true, choices: DURATION_OPTIONS },
      { name: "razon",    description: "Motivo",               type: 3, required: false },
    ],
  },
  {
    name: "untimeout",
    description: "🔊 Quitar silencio a un usuario",
    default_member_permissions: PERM_MODERATE,
    options: [
      { name: "usuario", description: "Usuario",  type: 6, required: true  },
      { name: "razon",   description: "Motivo",   type: 3, required: false },
    ],
  },
  {
    name: "warn",
    description: "⚠️ Advertir a un usuario",
    default_member_permissions: PERM_MODERATE,
    options: [
      { name: "usuario", description: "Usuario a advertir", type: 6, required: true  },
      { name: "razon",   description: "Motivo",             type: 3, required: true  },
    ],
  },
  {
    name: "warnings",
    description: "📋 Ver las advertencias de un usuario",
    default_member_permissions: PERM_MODERATE,
    options: [{ name: "usuario", description: "Usuario", type: 6, required: true }],
  },
  {
    name: "clearwarnings",
    description: "🗑️ Borrar todas las advertencias de un usuario",
    default_member_permissions: PERM_MODERATE,
    options: [{ name: "usuario", description: "Usuario", type: 6, required: true }],
  },
  {
    name: "purge",
    description: "🧹 Eliminar mensajes del canal",
    default_member_permissions: PERM_MANAGE_MSG,
    options: [
      { name: "cantidad", description: "Cantidad de mensajes a borrar (1-100)", type: 4, required: true, min_value: 1, max_value: 100 },
      { name: "usuario",  description: "Filtrar por usuario (opcional)",        type: 6, required: false },
    ],
  },
  {
    name: "slowmode",
    description: "🐌 Cambiar el modo lento del canal",
    default_member_permissions: PERM_MANAGE_MSG,
    options: [
      { name: "segundos", description: "Segundos entre mensajes (0 = desactivar)", type: 4, required: true, min_value: 0, max_value: 21600 },
    ],
  },
  {
    name: "userinfo",
    description: "👤 Ver información de un usuario",
    options: [{ name: "usuario", description: "Usuario (vacío = tú mismo)", type: 6, required: false }],
  },
  {
    name: "serverinfo",
    description: "🏠 Ver información del servidor",
  },
  {
    name: "lock",
    description: "🔒 Bloquear el canal actual (solo pueden hablar los mods)",
    default_member_permissions: PERM_MANAGE_MSG,
  },
  {
    name: "unlock",
    description: "🔓 Desbloquear el canal actual",
    default_member_permissions: PERM_MANAGE_MSG,
  },

  // ════════════════════════════════════════════
  //  👥  ADMINS (solo dueño)
  // ════════════════════════════════════════════
  { name: "addadmin",    description: "➕ Autorizar para usar comandos de keys [solo dueño]", options: [{ name: "usuario", description: "Usuario a autorizar",   type: 6, required: true }] },
  { name: "removeadmin", description: "➖ Quitar autorización [solo dueño]",                  options: [{ name: "usuario", description: "Usuario a desautorizar", type: 6, required: true }] },
  { name: "listadmins",  description: "👥 Ver quién está autorizado [solo dueño]" },
  { name: "setauditlog",      description: "📋 Configurar el canal de auditoría de keys", options: [{ name: "canal", description: "Canal de texto", type: 7, required: true }] },
  { name: "setalertchannel",  description: "⏰ Configurar el canal de alertas de expiración", options: [{ name: "canal", description: "Canal de texto", type: 7, required: true }] },

  // ════════════════════════════════════════════
  //  ⚡  UTILIDADES Y DIVERSIÓN
  // ════════════════════════════════════════════
  { name: "ping",   description: "📡 Ver la latencia del bot" },
  { name: "status", description: "📊 Estado del sistema — bot, API y base de datos" },
  {
    name: "help",
    description: "📖 Lista de todos los comandos por categoría",
    options: [{
      name: "categoria", description: "Categoría", type: 3, required: false,
      choices: [
        { name: "🔑 Keys",     value: "keys"  },
        { name: "🛡️ Moderación", value: "mod" },
        { name: "🎵 Música",   value: "music" },
        { name: "⚡ Utilidades", value: "util" },
        { name: "👥 Admin",    value: "admin" },
      ],
    }],
  },
  {
    name: "avatar",
    description: "🖼️ Ver el avatar de un usuario",
    options: [{ name: "usuario", description: "Usuario (vacío = tú)", type: 6, required: false }],
  },
  {
    name: "banner",
    description: "🖼️ Ver el banner de un usuario",
    options: [{ name: "usuario", description: "Usuario (vacío = tú)", type: 6, required: false }],
  },
  { name: "coinflip", description: "🪙 Lanzar una moneda — cara o cruz" },
  {
    name: "dado",
    description: "🎲 Tirar dados personalizados",
    options: [
      { name: "caras",    description: "Número de caras (por defecto 6)", type: 4, required: false, min_value: 2, max_value: 1000 },
      { name: "cantidad", description: "Cuántos dados (por defecto 1)",   type: 4, required: false, min_value: 1, max_value: 20 },
    ],
  },
  {
    name: "8ball",
    description: "🎱 Pregúntale a la bola mágica",
    options: [{ name: "pregunta", description: "Tu pregunta", type: 3, required: true }],
  },
  {
    name: "poll",
    description: "📊 Crear una encuesta con reacciones",
    options: [
      { name: "pregunta", description: "La pregunta de la encuesta",    type: 3, required: true  },
      { name: "opcion1",  description: "Opción 1",                      type: 3, required: false },
      { name: "opcion2",  description: "Opción 2",                      type: 3, required: false },
      { name: "opcion3",  description: "Opción 3",                      type: 3, required: false },
      { name: "opcion4",  description: "Opción 4",                      type: 3, required: false },
    ],
  },
  {
    name: "embed",
    description: "📢 Publicar un embed personalizado en el canal",
    options: [
      { name: "titulo",      description: "Título del embed",         type: 3, required: true  },
      { name: "descripcion", description: "Contenido del embed",      type: 3, required: true  },
      { name: "color",       description: "Color en hex (ej: #FF0000)", type: 3, required: false },
      { name: "imagen",      description: "URL de imagen",            type: 3, required: false },
      { name: "footer",      description: "Texto de pie de página",   type: 3, required: false },
    ],
  },
  {
    name: "calc",
    description: "🧮 Calculadora — evalúa una expresión matemática",
    options: [{ name: "expresion", description: "Ej: 2+2, (5*3)/2, 10^2", type: 3, required: true }],
  },
  {
    name: "timer",
    description: "⏱ Poner un temporizador — te avisa por DM",
    options: [
      { name: "minutos", description: "Minutos hasta el aviso (1–1440)", type: 4, required: true, min_value: 1, max_value: 1440 },
      { name: "mensaje", description: "Mensaje de recordatorio",          type: 3, required: false },
    ],
  },

  // ════════════════════════════════════════════
  //  🎵  MÚSICA
  // ════════════════════════════════════════════
  {
    name: "play",
    description: "🎵 Reproducir una canción de YouTube",
    options: [{ name: "busqueda", description: "Nombre de la canción o URL de YouTube", type: 3, required: true }],
  },
  { name: "skip",       description: "⏭ Saltar la canción actual" },
  { name: "stop",       description: "⏹ Detener la música y limpiar la cola" },
  { name: "pause",      description: "⏸ Pausar la reproducción" },
  { name: "resume",     description: "▶️ Reanudar la reproducción" },
  { name: "queue",      description: "📋 Ver la cola de reproducción" },
  { name: "nowplaying", description: "🎵 Ver qué canción suena ahora" },
  { name: "leave",      description: "👋 Desconectar el bot del canal de voz" },
  {
    name: "volume",
    description: "🔊 Ajustar el volumen de la música",
    options: [{ name: "nivel", description: "Volumen 0–200", type: 4, required: true, min_value: 0, max_value: 200 }],
  },
  { name: "shuffle", description: "🔀 Mezclar aleatoriamente la cola" },
  { name: "loop",    description: "🔁 Activar/desactivar repetición de la canción actual" },
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  console.log("Registrando slash commands...");
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`✅ ${commands.length} slash commands registrados correctamente.`);
})();
