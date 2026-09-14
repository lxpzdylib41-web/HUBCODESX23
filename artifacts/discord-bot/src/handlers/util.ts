import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { setConfig } from "../config.js";

function errEmbed(t: string, d: string) { return new EmbedBuilder().setTitle(`❌ ${t}`).setDescription(d).setColor(0xff4444); }
function okEmbed(t: string, d?: string) { return new EmbedBuilder().setTitle(`✅ ${t}`).setDescription(d ?? "").setColor(0x2ecc71).setTimestamp(); }

// ─── /ping ───────────────────────────────────────────────────────────────────
export async function handlePing(i: ChatInputCommandInteraction) {
  const start = Date.now();
  await i.deferReply();
  const latency = Date.now() - start;
  const ws = i.client.ws.ping;
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("📡 Pong!").setColor(latency < 100 ? 0x2ecc71 : latency < 300 ? 0xf39c12 : 0xff4444)
      .addFields(
        { name: "⌛ Latencia API",  value: `\`${latency}ms\``,  inline: true },
        { name: "💓 WebSocket",     value: `\`${ws}ms\``,        inline: true },
      ).setTimestamp()
  ]});
}

// ─── /status ─────────────────────────────────────────────────────────────────
export async function handleStatus(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const start  = Date.now();
  const API_BASE = `http://localhost:${process.env.PORT ?? 80}/api`;
  let apiOk = false;
  let dbOk  = false;
  try {
    const { default: fetch } = await import("node-fetch");
    const r = await fetch(`${API_BASE}/keys/stats`, {
      headers: { "x-bot-secret": process.env.BOT_SECRET! },
    });
    apiOk = r.ok;
    dbOk  = r.ok;
  } catch {}
  const latency = Date.now() - start;

  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);

  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("📊 Estado del Sistema — X23 Hub").setColor(apiOk ? 0x2ecc71 : 0xff4444)
      .addFields(
        { name: "🤖 Bot",          value: "🟢 Online",                              inline: true },
        { name: "⚡ API",           value: apiOk ? "🟢 Online" : "🔴 Offline",      inline: true },
        { name: "🗄️ Base de datos", value: dbOk  ? "🟢 Online" : "🔴 Offline",     inline: true },
        { name: "⌛ Ping API",      value: `\`${latency}ms\``,                       inline: true },
        { name: "💓 WS Ping",       value: `\`${i.client.ws.ping}ms\``,              inline: true },
        { name: "⏱ Uptime bot",    value: `${h}h ${m}min ${s}s`,                    inline: true },
        { name: "🖥️ Node.js",       value: process.version,                          inline: true },
        { name: "📦 Discord.js",    value: `v14`,                                    inline: true },
        { name: "🌐 Servidores",    value: String(i.client.guilds.cache.size),       inline: true },
      ).setTimestamp()
  ]});
}

// ─── /avatar ─────────────────────────────────────────────────────────────────
export async function handleAvatar(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const target  = i.options.getUser("usuario") ?? i.user;
  const member  = i.guild?.members.cache.get(target.id) as GuildMember | undefined;
  const serverAvatar = member?.displayAvatarURL({ size: 1024 });
  const globalAvatar = target.displayAvatarURL({ size: 1024 });

  const embed = new EmbedBuilder()
    .setTitle(`🖼️ Avatar de ${target.tag}`)
    .setImage(serverAvatar ?? globalAvatar)
    .setColor(0x5865f2)
    .setTimestamp();

  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.setDescription(`[Avatar global](${globalAvatar}) · [Avatar del servidor](${serverAvatar})`);
  } else {
    embed.setDescription(`[Descargar](<${globalAvatar}>)`);
  }

  await i.editReply({ embeds: [embed] });
}

// ─── /banner ─────────────────────────────────────────────────────────────────
export async function handleBanner(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const target = (await (i.options.getUser("usuario") ?? i.user).fetch().catch(() => null)) ?? i.user;
  const fetched = await i.client.users.fetch(target.id, { force: true }).catch(() => null);
  const bannerUrl = fetched?.bannerURL({ size: 1024 });

  if (!bannerUrl) {
    await i.editReply({ embeds: [errEmbed("Sin banner", `**${target.tag}** no tiene un banner de perfil.`)] }); return;
  }
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`🖼️ Banner de ${target.tag}`)
      .setImage(bannerUrl).setColor(0x5865f2)
      .setDescription(`[Descargar](<${bannerUrl}>)`).setTimestamp()
  ]});
}

// ─── /coinflip ───────────────────────────────────────────────────────────────
export async function handleCoinflip(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const result = Math.random() < 0.5 ? "🪙 **Cara**" : "🪙 **Cruz**";
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🎲 Lanzamiento de moneda").setDescription(result)
      .setColor(0xf1c40f).setTimestamp()
  ]});
}

// ─── /dado ───────────────────────────────────────────────────────────────────
export async function handleDado(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const caras    = i.options.getInteger("caras") ?? 6;
  const cantidad = i.options.getInteger("cantidad") ?? 1;
  const results  = Array.from({ length: Math.min(cantidad, 20) }, () => Math.ceil(Math.random() * caras));
  const sum      = results.reduce((a, b) => a + b, 0);
  const desc     = results.length === 1
    ? `Resultado: **${results[0]}**`
    : `Dados: ${results.map(n => `\`${n}\``).join(" + ")} = **${sum}**`;
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`🎲 Dado${caras !== 6 ? ` D${caras}` : ""}`)
      .setDescription(desc).setColor(0xe74c3c).setTimestamp()
  ]});
}

// ─── /8ball ──────────────────────────────────────────────────────────────────
const RESPONSES = [
  "✅ Sí, definitivamente.", "✅ Sin duda.", "✅ Puedes contar con ello.",
  "✅ Lo más probable es que sí.", "✅ Las señales apuntan a que sí.",
  "🤔 Es difícil de decir ahora.", "🤔 Pregunta de nuevo más tarde.",
  "🤔 No puedo predecirlo ahora.", "🤔 Concéntrate y pregunta de nuevo.",
  "❌ No cuentes con ello.", "❌ Mi respuesta es no.", "❌ Mis fuentes dicen no.",
  "❌ Las perspectivas no son buenas.", "❌ Muy dudoso.", "🎱 El misterio es profundo...",
];
export async function handle8ball(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const pregunta = i.options.getString("pregunta", true);
  const resp     = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🎱 Magic 8-Ball").setColor(0x2c3e50)
      .addFields(
        { name: "❓ Pregunta",  value: pregunta },
        { name: "🎱 Respuesta", value: resp     },
      ).setTimestamp()
  ]});
}

// ─── /poll ───────────────────────────────────────────────────────────────────
export async function handlePoll(i: ChatInputCommandInteraction) {
  const pregunta = i.options.getString("pregunta", true);
  const opts = [
    i.options.getString("opcion1"),
    i.options.getString("opcion2"),
    i.options.getString("opcion3"),
    i.options.getString("opcion4"),
  ].filter(Boolean) as string[];

  await i.deferReply();
  const EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣"];

  let desc: string;
  let emojisToAdd: string[];

  if (opts.length === 0) {
    desc = "Vota con ✅ (Sí) o ❌ (No)";
    emojisToAdd = ["✅","❌"];
  } else {
    desc = opts.map((o, idx) => `${EMOJIS[idx]} ${o}`).join("\n");
    emojisToAdd = EMOJIS.slice(0, opts.length);
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${pregunta}`)
    .setDescription(desc)
    .setColor(0x3498db)
    .setFooter({ text: `Encuesta creada por @${i.user.username}` })
    .setTimestamp();

  const msg = await i.editReply({ embeds: [embed], fetchReply: true });
  for (const emoji of emojisToAdd) {
    try { await (msg as any).react(emoji); } catch {}
  }
}

// ─── /calc ───────────────────────────────────────────────────────────────────
export async function handleCalc(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const expr = i.options.getString("expresion", true).trim();

  // Validación: solo caracteres matemáticos seguros
  if (!/^[\d\s\+\-\*\/\(\)\.\^\%πe,]+$/i.test(expr.replace(/Math\.\w+/g, ""))) {
    await i.editReply({ embeds: [errEmbed("Expresión inválida", "Solo se permiten operaciones matemáticas básicas.")] }); return;
  }

  try {
    // Reemplazar constantes y funciones comunes
    const safe = expr
      .replace(/π/g, String(Math.PI))
      .replace(/\^/g, "**")
      .replace(/√(\d+(\.\d+)?)/g, (_, n) => String(Math.sqrt(parseFloat(n))));

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${safe})`)();
    if (typeof result !== "number" || isNaN(result)) throw new Error("Resultado inválido");

    await i.editReply({ embeds: [
      new EmbedBuilder().setTitle("🧮 Calculadora").setColor(0x2ecc71)
        .addFields(
          { name: "📥 Expresión", value: `\`${expr}\`` },
          { name: "📤 Resultado", value: `\`${result}\`` },
        ).setTimestamp()
    ]});
  } catch {
    await i.editReply({ embeds: [errEmbed("Error", "No se pudo calcular la expresión.")] });
  }
}

// ─── /timer ──────────────────────────────────────────────────────────────────
export async function handleTimer(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const minutos = i.options.getInteger("minutos", true);
  const mensaje = i.options.getString("mensaje") ?? "¡Tu temporizador terminó!";

  if (minutos < 1 || minutos > 1440) {
    await i.editReply({ embeds: [errEmbed("Fuera de rango", "El temporizador debe ser entre 1 y 1440 minutos (24h).")] }); return;
  }

  const endTime = Math.floor((Date.now() + minutos * 60_000) / 1000);
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("⏱ Temporizador Iniciado").setColor(0x3498db)
      .setDescription(`Te avisaré en **${minutos} minuto${minutos !== 1 ? "s" : ""}** por DM.`)
      .addFields({ name: "⏰ Termina", value: `<t:${endTime}:R>` })
      .setTimestamp()
  ]});

  setTimeout(async () => {
    try {
      await i.user.send({ embeds: [
        new EmbedBuilder().setTitle("⏰ ¡Tiempo!")
          .setDescription(mensaje)
          .setColor(0xe74c3c).setTimestamp()
      ]});
    } catch {
      // Si no puede enviar DM, responde en el canal
      try { await i.followUp({ content: `⏰ <@${i.user.id}> ¡Tiempo! ${mensaje}`, ephemeral: false }); } catch {}
    }
  }, minutos * 60_000);
}

// ─── /embed ──────────────────────────────────────────────────────────────────
export async function handleEmbed(i: ChatInputCommandInteraction) {
  await i.deferReply({ ephemeral: true });
  const titulo   = i.options.getString("titulo", true);
  const desc     = i.options.getString("descripcion", true);
  const colorHex = i.options.getString("color") ?? "#5865F2";
  const imagen   = i.options.getString("imagen");
  const footer   = i.options.getString("footer");

  let color: number;
  try { color = parseInt(colorHex.replace("#", ""), 16); } catch { color = 0x5865f2; }

  const embed = new EmbedBuilder()
    .setTitle(titulo).setDescription(desc).setColor(color).setTimestamp();
  if (imagen) embed.setImage(imagen);
  if (footer) embed.setFooter({ text: footer });

  try {
    await (i.channel as any).send({ embeds: [embed] });
    await i.editReply("✅ Embed publicado.");
  } catch {
    await i.editReply({ embeds: [errEmbed("Error", "No se pudo enviar el embed.")] });
  }
}

// ─── /setauditlog ────────────────────────────────────────────────────────────
export async function handleSetauditlog(i: ChatInputCommandInteraction) {
  await i.deferReply({ ephemeral: true });
  const canal = i.options.getChannel("canal", true);
  setConfig({ auditChannelId: canal.id });
  await i.editReply({ embeds: [okEmbed("Canal de auditoría configurado", `Todas las acciones de keys se registrarán en <#${canal.id}>.`)] });
}

// ─── /setalertchannel ────────────────────────────────────────────────────────
export async function handleSetalertchannel(i: ChatInputCommandInteraction) {
  await i.deferReply({ ephemeral: true });
  const canal = i.options.getChannel("canal", true);
  setConfig({ alertChannelId: canal.id });
  await i.editReply({ embeds: [okEmbed("Canal de alertas configurado", `Las alertas de expiración se enviarán a <#${canal.id}>.`)] });
}

// ─── /help ───────────────────────────────────────────────────────────────────
export async function handleHelp(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const cat = i.options.getString("categoria") ?? "keys";

  const cats: Record<string, { title: string; color: number; cmds: string[] }> = {
    keys: {
      title: "🔑 Comandos de Keys",
      color: 0x00c8ff,
      cmds: [
        "`/genkey` — Generar 1 key",
        "`/genkeys` — Generar varias keys a la vez",
        "`/deletekey` — Eliminar una key",
        "`/revokekey` — Revocar (desactivar) una key",
        "`/renewkey` — Extender tiempo de una key temporal",
        "`/transferkey` — Transferir key a otro usuario",
        "`/assignkey` — Cambiar nombre asignado a una key",
        "`/listkeys` — Listar las últimas 25 keys",
        "`/exportkeys` — Exportar todas las keys como .txt",
        "`/keyinfo` — Info detallada de una key",
        "`/deviceinfo` — Ver IP y datos del dispositivo de una key",
        "`/searchkey` — Buscar keys por nombre de usuario",
        "`/resethwid` — Liberar el HWID de una key",
        "`/history` — Historial de las últimas 15 activaciones",
        "`/stats` — Estadísticas del sistema",
        "`/limpiarexpiradas` — Revocar expiradas",
        "`/purgerevocadas` — Eliminar todas las revocadas",
      ],
    },
    mod: {
      title: "🛡️ Moderación",
      color: 0xff4444,
      cmds: [
        "`/ban` — Banear usuario", "`/unban` — Desbanear por ID",
        "`/kick` — Expulsar usuario", "`/timeout` — Silenciar temporalmente",
        "`/untimeout` — Quitar silencio", "`/warn` — Advertir usuario",
        "`/warnings` — Ver advertencias", "`/clearwarnings` — Borrar advertencias",
        "`/purge` — Eliminar mensajes en masa",
        "`/slowmode` — Activar modo lento", "`/lock` / `/unlock` — Bloquear/desbloquear canal",
        "`/userinfo` — Info de un usuario", "`/serverinfo` — Info del servidor",
      ],
    },
    music: {
      title: "🎵 Música",
      color: 0xe91e63,
      cmds: [
        "`/play` — Reproducir canción (YouTube)",
        "`/skip` — Saltar canción actual",
        "`/stop` — Detener y limpiar la cola",
        "`/pause` / `/resume` — Pausar/reanudar",
        "`/queue` — Ver la cola de reproducción",
        "`/nowplaying` — Ver qué suena ahora",
        "`/volume` — Ajustar volumen (0–200)",
        "`/shuffle` — Mezclar la cola",
        "`/loop` — Repetir canción actual",
        "`/leave` — Desconectar el bot del canal",
      ],
    },
    util: {
      title: "⚡ Utilidades y Diversión",
      color: 0xf39c12,
      cmds: [
        "`/ping` — Latencia del bot",
        "`/status` — Estado del sistema completo",
        "`/avatar` — Ver avatar de un usuario",
        "`/banner` — Ver banner de un usuario",
        "`/coinflip` — Lanzar moneda",
        "`/dado` — Tirar dados personalizados",
        "`/8ball` — Bola mágica 8",
        "`/poll` — Crear una encuesta",
        "`/embed` — Publicar un embed personalizado",
        "`/calc` — Calculadora",
        "`/timer` — Temporizador con aviso por DM",
        "`/ia` — Preguntar a la IA del hub",
      ],
    },
    admin: {
      title: "👥 Administración",
      color: 0x9b59b6,
      cmds: [
        "`/addadmin` — Autorizar para usar comandos de keys",
        "`/removeadmin` — Quitar autorización",
        "`/listadmins` — Ver lista de admins",
        "`/setauditlog` — Configurar canal de auditoría",
        "`/setalertchannel` — Configurar canal de alertas de expiración",
      ],
    },
  };

  const section = cats[cat] ?? cats.keys;
  const embed = new EmbedBuilder()
    .setTitle(section.title)
    .setDescription(section.cmds.join("\n"))
    .setColor(section.color)
    .setFooter({ text: "Categorías: keys · mod · music · util · admin" })
    .setTimestamp();

  await i.editReply({ embeds: [embed] });
}
