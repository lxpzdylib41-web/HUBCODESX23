import {
  Client,
  GatewayIntentBits,
  Events,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { initAuth, isAuthorized } from "./auth";
import { initAudit, sendAudit } from "./audit.js";
import { initExpiry } from "./expiry.js";
import { handleGenkeys, handleExportkeys, handleTransferkey, handleDeviceinfo } from "./handlers/keys-extra.js";
import {
  handlePing, handleStatus, handleAvatar, handleBanner,
  handleCoinflip, handleDado, handle8ball, handlePoll,
  handleEmbed, handleCalc, handleTimer, handleHelp,
  handleSetauditlog, handleSetalertchannel,
} from "./handlers/util.js";
import {
  handlePlay, handleSkip, handleStop, handlePause, handleResume,
  handleQueue, handleNowplaying, handleLeave, handleVolume,
  handleShuffle, handleLoop,
} from "./handlers/music.js";
import { isBotEnabled, touchBotHeartbeat } from "./runtime-control.js";

const token        = process.env.DISCORD_BOT_TOKEN!;
const botSecret    = process.env.BOT_SECRET!;
const allowedGuildId = process.env.GUILD_ID ?? null;

if (!token)     throw new Error("DISCORD_BOT_TOKEN no configurado");
if (!botSecret) throw new Error("BOT_SECRET no configurado");
if (!allowedGuildId) console.warn("⚠️  GUILD_ID no configurado");

initAuth(botSecret);

const API_BASE = `http://localhost:${process.env.PORT ?? 80}/api`;
const client   = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ── HTTP helpers ──────────────────────────────────────────────
async function apiFetch(method: string, path: string, body?: object) {
  const { default: fetch } = await import("node-fetch");
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-bot-secret": botSecret },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const apiPost   = (p: string, b: object) => apiFetch("POST",   p, b);
const apiGet    = (p: string)            => apiFetch("GET",    p);
const apiDelete = (p: string, b: object) => apiFetch("DELETE", p, b);

// ── Auth / helpers ────────────────────────────────────────────
function getOwnerId(i: ChatInputCommandInteraction) {
  return (i.guild as Guild | null)?.ownerId ?? null;
}
async function checkKeyAuth(i: ChatInputCommandInteraction): Promise<boolean> {
  const ok = await isAuthorized(i.user.id, getOwnerId(i));
  if (!ok) {
    await i.editReply({ embeds: [errEmbed("Sin autorización", "No puedes usar comandos de keys.\nPide al dueño que te agregue con `/addadmin`.")] });
  }
  return ok;
}
function isOwner(i: ChatInputCommandInteraction) {
  return i.user.id === getOwnerId(i);
}
function hasPerm(member: GuildMember, perm: bigint) {
  return (member as GuildMember).permissions.has(perm);
}

// ── Embed factories ───────────────────────────────────────────
function errEmbed(title: string, desc: string) {
  return new EmbedBuilder().setTitle(`❌ ${title}`).setDescription(desc).setColor(0xff4444);
}
function okEmbed(title: string, desc?: string) {
  return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(desc ?? "").setColor(0x2ecc71).setTimestamp();
}
function infoEmbed(title: string) {
  return new EmbedBuilder().setTitle(title).setColor(0x5865f2).setTimestamp();
}
function warnEmbed(title: string, desc?: string) {
  return new EmbedBuilder().setTitle(`⚠️ ${title}`).setDescription(desc ?? "").setColor(0xf39c12).setTimestamp();
}
function modEmbed(title: string, color: number) {
  return new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();
}

// ── Formatting ────────────────────────────────────────────────
function formatMinutes(min: number | null | undefined): string {
  if (!min) return "Permanente ♾️";
  if (min < 60) return `${min}min`;
  if (min < 1440) { const h = Math.floor(min/60), m = min%60; return m ? `${h}h ${m}min` : `${h}h`; }
  const d = Math.floor(min/1440), h = Math.floor((min%1440)/60);
  return h ? `${d}d ${h}h` : `${d}d`;
}
function statusEmoji(r: any) {
  if (!r.isActive) return "🔴";
  if (r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < new Date()) return "🟡";
  if (!r.activatedAt) return "⚪";
  return "🟢";
}
function statusText(r: any) {
  if (!r.isActive) return "Revocada";
  if (r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < new Date()) return "Expirada";
  if (!r.activatedAt) return "Sin activar";
  return "Activa";
}
function ts(date: any)      { if (!date) return "—"; return `<t:${Math.floor(new Date(date).getTime()/1000)}:R>`; }
function tsShort(date: any) { if (!date) return "—"; return `<t:${Math.floor(new Date(date).getTime()/1000)}:f>`; }

function minutesToMs(n: number, unit: string): number {
  if (unit === "minutes") return n * 60_000;
  if (unit === "hours")   return n * 3_600_000;
  return n * 86_400_000;
}
function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}min`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

// ══════════════════════════════════════════════════════════════
//  🔑  KEY COMMANDS
// ══════════════════════════════════════════════════════════════

async function handleGenkey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const tipo     = i.options.getString("tipo", true);
  const duracion = i.options.getInteger("duracion") ?? undefined;
  const unidad   = (i.options.getString("unidad") ?? "days") as "minutes"|"hours"|"days";
  const script   = i.options.getString("script") ?? "legacy";
  const nombre   = i.options.getString("nombre")?.trim() || undefined;
  const clave    = i.options.getString("clave")?.trim()  || undefined;
  const prefijo  = i.options.getString("prefijo")?.trim()|| undefined;
  if (tipo === "timed" && !duracion) { await i.editReply({ embeds: [errEmbed("Falta duración","Indica la duración para una key temporal.")] }); return; }
  const res  = await apiPost("/keys/generate", {
    type: tipo, duration: duracion, unit: unidad, productId: script,
    createdBy: i.user.id, createdByName: i.user.username,
    assignedTo: nombre,
    customKey: clave,
    prefix: prefijo,
  });
  if (res.status === 409) { await i.editReply({ embeds: [errEmbed("Clave duplicada","Esa clave personalizada ya existe. Elige otra.")] }); return; }
  if (res.status === 400) { const e = (await res.json()) as any; await i.editReply({ embeds: [errEmbed("Formato inválido", e.error)] }); return; }
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo generar la key.")] }); return; }
  const data = (await res.json()) as any;
  const isCustom = !!clave;
  const embed = new EmbedBuilder()
    .setTitle("🔑 Key Generada — X23 Hub").setColor(isCustom ? 0xf1c40f : 0x00c8ff)
    .addFields(
      { name: isCustom ? "🔐 Clave personalizada" : "🔐 Key", value: `\`\`\`${data.key}\`\`\`` },
      { name: "👤 Para",         value: nombre ?? "*(sin asignar)*",                                                                       inline: true },
      { name: "📋 Tipo",         value: data.type === "permanent" ? "Permanente ♾️" : `Temporal ⏳ ${formatMinutes(data.durationMinutes)}`, inline: true },
      { name: "📜 Script",        value: data.productId ?? script,                                                                       inline: true },
      { name: "⚙️ Creada por",   value: `@${i.user.username}`,                                                                             inline: true },
      { name: "⏰ Expira",       value: data.type === "timed" ? `**${formatMinutes(data.durationMinutes)}** desde la primera activación` : "Nunca" },
    )
    .setFooter({ text: isCustom ? "Clave personalizada ✏️" : "El contador empieza cuando el usuario activa la key en Roblox" })
    .setTimestamp();
  await i.editReply({ embeds: [embed] });
  await sendAudit(new EmbedBuilder().setTitle("🔑 Key generada").setColor(0x00c8ff)
    .addFields({ name: "Key", value: `\`${data.key}\``, inline: true }, { name: "Tipo", value: data.type, inline: true }, { name: "Por", value: `@${i.user.username}`, inline: true })
    .setTimestamp());
}

async function handleIa(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const pregunta = i.options.getString("pregunta", true).trim();
  const apiKey   = process.env.OPENAI_API_KEY;
  const baseUrl  = process.env.OPENAI_API_BASE_URL;
  if (!apiKey) {
    await i.editReply({ embeds: [errEmbed("IA no configurada","El administrador aún no ha configurado la API key de OpenAI.")] });
    return;
  }
  try {
    const { default: fetch } = await import("node-fetch");
    const body = {
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        { role: "system", content: "Eres un asistente del hub X23 para Roblox. Responde en español de forma concisa y útil. Si te preguntan sobre keys, HWID o el sistema del hub, explícalo claramente." },
        { role: "user",   content: pregunta },
      ],
    };
    const endpoint = baseUrl ? `${baseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = (await response.json()) as any;
      await i.editReply({ embeds: [errEmbed("Error de IA", err?.error?.message ?? "Respuesta inválida de OpenAI.")] });
      return;
    }
    const data = (await response.json()) as any;
    const respuesta: string = data.choices?.[0]?.message?.content ?? "Sin respuesta.";
    const embed = new EmbedBuilder()
      .setTitle("🤖 X23 IA").setColor(0x9b59b6)
      .addFields(
        { name: "💬 Pregunta", value: pregunta.length > 1024 ? pregunta.slice(0, 1021) + "..." : pregunta },
        { name: "🧠 Respuesta", value: respuesta.length > 1024 ? respuesta.slice(0, 1021) + "..." : respuesta },
      )
      .setFooter({ text: `Preguntado por @${i.user.username}` })
      .setTimestamp();
    await i.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Error IA:", err);
    await i.editReply({ embeds: [errEmbed("Error","No se pudo conectar con la IA.")] });
  }
}

async function handleRevokekey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key = i.options.getString("key", true).trim().toUpperCase();
  const res = await apiPost("/keys/revoke", { key });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo revocar.")] }); return; }
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🚫 Key Revocada").setColor(0xff6600)
      .setDescription(`La key \`${key}\` fue desactivada.\nUsa \`/deletekey\` si quieres eliminarla permanentemente.`)
      .setTimestamp()
  ]});
  await sendAudit(new EmbedBuilder().setTitle("🚫 Key revocada").setColor(0xff6600)
    .addFields({ name: "Key", value: `\`${key}\``, inline: true }, { name: "Por", value: `@${i.user.username}`, inline: true }).setTimestamp());
}

async function handleDeletekey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key = i.options.getString("key", true).trim().toUpperCase();
  const res = await apiDelete("/keys/delete", { key });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo eliminar.")] }); return; }
  await i.editReply({ embeds: [okEmbed("Key Eliminada", `La key \`${key}\` fue eliminada permanentemente.`)] });
  await sendAudit(new EmbedBuilder().setTitle("🗑️ Key eliminada").setColor(0xff2222)
    .addFields({ name: "Key", value: `\`${key}\``, inline: true }, { name: "Por", value: `@${i.user.username}`, inline: true }).setTimestamp());
}

async function handleRenewkey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key      = i.options.getString("key", true).trim().toUpperCase();
  const duracion = i.options.getInteger("duracion", true);
  const unidad   = (i.options.getString("unidad") ?? "days") as "minutes"|"hours"|"days";
  const res = await apiPost("/keys/renew", { key, duration: duracion, unit: unidad });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (res.status === 400) { const e = (await res.json()) as any; await i.editReply({ embeds: [errEmbed("No se puede renovar", e.error)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo renovar.")] }); return; }
  const data = (await res.json()) as any;
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🔄 Key Renovada").setColor(0x00ff88)
      .addFields(
        { name: "🔐 Key",             value: `\`${key}\``,                                          inline: true },
        { name: "⏰ Nueva expiración", value: data.expiresAt ? tsShort(data.expiresAt) : "Al activarse", inline: true },
        { name: "📅 Duración total",   value: formatMinutes(data.durationMinutes),                   inline: true },
      ).setTimestamp()
  ]});
}

async function handleAssignkey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key    = i.options.getString("key", true).trim().toUpperCase();
  const nombre = i.options.getString("nombre")?.trim() || "";
  const res = await apiPost("/keys/assign", { key, assignedTo: nombre || null });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo actualizar.")] }); return; }
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("✏️ Key Actualizada").setColor(0x9b59b6)
      .addFields(
        { name: "🔐 Key",       value: `\`${key}\``,         inline: true },
        { name: "👤 Asignada a", value: nombre || "*(ninguno)*", inline: true },
      ).setTimestamp()
  ]});
}

async function handleListkeys(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const script = i.options.getString("script", true);
  const filtro = i.options.getString("filtro") ?? "all";
  const res = await apiGet(`/keys/list?productId=${encodeURIComponent(script)}`);
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudieron obtener las keys.")] }); return; }
  const now = new Date();
  let rows = (await res.json()) as any[];
  if (filtro === "active")   rows = rows.filter(r => r.isActive && !(r.type==="timed" && r.expiresAt && new Date(r.expiresAt)<now));
  if (filtro === "inactive") rows = rows.filter(r => !r.isActive || (r.type==="timed" && r.expiresAt && new Date(r.expiresAt)<now));
  if (filtro === "pending")  rows = rows.filter(r => !r.activatedAt && r.isActive);
  if (rows.length === 0) { await i.editReply("📭 No hay keys con ese filtro."); return; }
  const lines = rows.map(r => {
    const who = r.assignedTo ? ` · 👤 **${r.assignedTo}**` : "";
    return `${statusEmoji(r)} \`${r.key}\` **${formatMinutes(r.durationMinutes)}** — ${statusText(r)}${who}`;
  });
  await i.editReply({ embeds: [
     new EmbedBuilder()
       .setTitle(`📋 Keys — ${script === "premium" ? "Premium Edition" : "Legacy"}`)
       .setColor(script === "premium" ? 0x9b59b6 : 0x5865f2)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "🟢 Activa  ⚪ Sin activar  🟡 Expirada  🔴 Revocada" })
      .setTimestamp()
  ]});
}

async function handleKeyinfo(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key = i.options.getString("key", true).trim().toUpperCase();
  const res = await apiGet(`/keys/info/${key}`);
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo obtener info.")] }); return; }
  const r = (await res.json()) as any;
  const exp = r.type === "timed"
    ? (r.expiresAt ? `${tsShort(r.expiresAt)} · ${ts(r.expiresAt)}` : `${formatMinutes(r.durationMinutes)} desde la primera activación`)
    : "Nunca ♾️";
  const col = !r.isActive ? 0xff4444 : (r.type==="timed"&&r.expiresAt&&new Date(r.expiresAt)<new Date()) ? 0xffaa00 : 0x00ff88;
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🔍 Info de Key — X23 Hub").setColor(col)
      .addFields(
        { name: "🔐 Key",           value: `\`${r.key}\``,                                                   inline: false },
        { name: "👤 Asignada a",    value: r.assignedTo ?? "*(sin asignar)*",                                 inline: true  },
        { name: "🔐 HWID",          value: r.hwid ? `\`${r.hwid.slice(0, 16)}${r.hwid.length > 16 ? "…" : ""}\`` : "*(sin vincular)*", inline: true  },
        { name: "📊 Estado",        value: `${statusEmoji(r)} ${statusText(r)}`,                              inline: true  },
        { name: "📋 Tipo",          value: r.type === "permanent" ? "Permanente ♾️" : "Temporal ⏳",         inline: true  },
        { name: "⏱ Duración",       value: formatMinutes(r.durationMinutes),                                  inline: true  },
        { name: "🔢 Usos",          value: String(r.usageCount ?? 0),                                         inline: true  },
        { name: "📅 Creada",        value: tsShort(r.createdAt),                                              inline: true  },
        { name: "🚀 Activada",      value: r.activatedAt ? tsShort(r.activatedAt) : "Nunca",                 inline: true  },
        { name: "🕐 Último uso",    value: r.lastUsedAt ? ts(r.lastUsedAt) : "—",                            inline: true  },
        { name: "⏰ Expira",        value: exp,                                                                inline: false },
        { name: "⚙️ Creada por",   value: r.createdByName ? `@${r.createdByName}` : "—",                    inline: true  },
      ).setTimestamp()
  ]});
}

async function handleResethwid(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const key = i.options.getString("key", true).trim().toUpperCase();
  const res = await apiPost("/keys/resethwid", { key });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada",`La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo reiniciar el HWID.")] }); return; }
  await i.editReply({ embeds: [
    okEmbed("🔓 HWID Reiniciado", `La key \`${key}\` quedó libre para activarse en un nuevo dispositivo.`)
  ]});
}

async function handleSearchkey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const nombre = i.options.getString("nombre", true).trim();
  const res = await apiGet(`/keys/search?q=${encodeURIComponent(nombre)}`);
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo buscar.")] }); return; }
  const rows = (await res.json()) as any[];
  if (rows.length === 0) { await i.editReply(`🔎 No hay keys asignadas a **${nombre}**.`); return; }
  const lines = rows.map(r => `${statusEmoji(r)} \`${r.key}\` — **${r.assignedTo}** — ${formatMinutes(r.durationMinutes)} — ${statusText(r)}`);
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`🔎 Resultados para "${nombre}"`).setColor(0x9b59b6)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${rows.length} resultado${rows.length!==1?"s":""}` })
      .setTimestamp()
  ]});
}

async function handleHistory(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const res = await apiGet("/keys/history");
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo obtener historial.")] }); return; }
  const rows = (await res.json()) as any[];
  if (rows.length === 0) { await i.editReply("📭 Ninguna key ha sido activada todavía."); return; }
  const lines = rows.map((r, idx) => {
    const who = r.assignedTo ? ` · 👤 ${r.assignedTo}` : "";
    return `**${idx+1}.** \`${r.key}\`${who}\n⏱ **${formatMinutes(r.durationMinutes)}** — ${statusEmoji(r)} ${statusText(r)} — usado ${ts(r.lastUsedAt)} — **${r.usageCount}x**`;
  });
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("📜 Historial de uso — X23 Hub").setColor(0xff9900)
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: "Últimas 15 keys · más recientes primero" })
      .setTimestamp()
  ]});
}

async function handleStats(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const res = await apiGet("/keys/stats");
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudieron obtener estadísticas.")] }); return; }
  const s = (await res.json()) as any;
  const bar = (n: number, t: number, len=10) => { const f=t>0?Math.round(n/t*len):0; return "█".repeat(f)+"░".repeat(len-f); };
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("📊 Estadísticas — X23 Hub").setColor(0x5865f2)
      .addFields(
        { name: "📦 Total",         value: String(s.total),     inline: true },
        { name: "🟢 Activas",       value: String(s.active),    inline: true },
        { name: "🔴 Revocadas",     value: String(s.revoked),   inline: true },
        { name: "🟡 Expiradas",     value: String(s.expired),   inline: true },
        { name: "⚪ Sin activar",    value: String(s.pending),   inline: true },
        { name: "🔢 Usos totales",  value: String(s.totalUses), inline: true },
        { name: "♾️ Permanentes",   value: String(s.permanent), inline: true },
        { name: "⏳ Temporales",    value: String(s.timed),     inline: true },
        { name: "✅ Usadas alguna vez", value: String(s.activated), inline: true },
        { name: "📈 Actividad",     value: `\`Activas   ${bar(s.active,s.total)} ${s.active}/${s.total}\`\n\`Usadas    ${bar(s.activated,s.total)} ${s.activated}/${s.total}\`\n\`Expiradas ${bar(s.expired,s.total)} ${s.expired}/${s.total}\`` },
      ).setTimestamp()
  ]});
}

async function handleLimpiarExpiradas(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const res = await apiPost("/keys/bulkrevoke", {});
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo limpiar.")] }); return; }
  const data = (await res.json()) as any;
  if (data.revoked === 0) { await i.editReply("✅ No hay keys expiradas pendientes."); return; }
  await i.editReply({ embeds: [okEmbed("Limpieza completada", `Se revocaron **${data.revoked}** key${data.revoked!==1?"s":""} expirada${data.revoked!==1?"s":""}.`)] });
}

async function handlePurgeRevocadas(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!await checkKeyAuth(i)) return;
  const confirmar = i.options.getBoolean("confirmar", true);
  if (!confirmar) {
    await i.editReply({ embeds: [warnEmbed("Operación cancelada", "Debes confirmar con **Sí** para eliminar las keys revocadas.")] });
    return;
  }
  const res = await apiFetch("DELETE", "/keys/purgerevoked");
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo completar la purga.")] }); return; }
  const data = (await res.json()) as any;
  if (data.deleted === 0) {
    await i.editReply({ embeds: [infoEmbed("🧹 Sin keys revocadas").setDescription("No había keys revocadas para eliminar.").setColor(0x95a5a6)] });
    return;
  }
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🗑️ Purga completada").setColor(0xff4444)
      .setDescription(`Se eliminaron permanentemente **${data.deleted}** key${data.deleted!==1?"s":""} revocada${data.deleted!==1?"s":""}.\n\n⚠️ Esta acción **no se puede deshacer**.`)
      .setTimestamp()
  ]});
}

// ══════════════════════════════════════════════════════════════
//  🛡️  MODERATION COMMANDS
// ══════════════════════════════════════════════════════════════

async function handleBan(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.BanMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Banear Miembros**.")] }); return;
  }
  const target   = i.options.getUser("usuario", true);
  const razon    = i.options.getString("razon") ?? "Sin motivo especificado";
  const delDays  = i.options.getInteger("eliminar_msgs") ?? 0;
  const tMember  = await i.guild?.members.fetch(target.id).catch(() => null);
  if (tMember && !tMember.bannable) {
    await i.editReply({ embeds: [errEmbed("No se puede banear","No tengo permisos para banear a ese usuario (puede que tenga un rol más alto).")] }); return;
  }
  try {
    // DM antes del ban
    await target.send({
      embeds: [new EmbedBuilder().setTitle("🔨 Has sido baneado")
        .setDescription(`Fuiste baneado del servidor **${i.guild?.name}**.\n**Motivo:** ${razon}`)
        .setColor(0xff2222).setTimestamp()]
    }).catch(() => {});
    await i.guild?.members.ban(target.id, { reason: `${i.user.tag}: ${razon}`, deleteMessageSeconds: delDays * 86400 });
    await i.editReply({ embeds: [
      modEmbed("🔨 Usuario Baneado", 0xff2222)
        .addFields(
          { name: "👤 Usuario",     value: `${target.tag} (${target.id})`, inline: true },
          { name: "📋 Motivo",      value: razon,                          inline: true },
          { name: "🗑️ Msgs borrados", value: delDays > 0 ? `Últimos ${delDays} día${delDays!==1?"s":""}` : "Ninguno", inline: true },
          { name: "👮 Moderador",   value: `${i.user.tag}`,                inline: true },
        )
    ]});
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error al banear", e?.message ?? "Error desconocido.")] });
  }
}

async function handleUnban(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.BanMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Banear Miembros**.")] }); return;
  }
  const userId = i.options.getString("id", true).trim();
  const razon  = i.options.getString("razon") ?? "Sin motivo";
  try {
    await i.guild?.members.unban(userId, `${i.user.tag}: ${razon}`);
    await i.editReply({ embeds: [
      modEmbed("🔓 Usuario Desbaneado", 0x2ecc71)
        .addFields(
          { name: "🆔 ID",         value: userId,         inline: true },
          { name: "📋 Motivo",     value: razon,          inline: true },
          { name: "👮 Moderador",  value: i.user.tag,     inline: true },
        )
    ]});
  } catch {
    await i.editReply({ embeds: [errEmbed("No se pudo desbanear","El ID puede ser incorrecto o el usuario no estaba baneado.")] });
  }
}

async function handleKick(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.KickMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Expulsar Miembros**.")] }); return;
  }
  const target  = i.options.getUser("usuario", true);
  const razon   = i.options.getString("razon") ?? "Sin motivo especificado";
  const tMember = await i.guild?.members.fetch(target.id).catch(() => null);
  if (!tMember) { await i.editReply({ embeds: [errEmbed("No encontrado","El usuario no está en el servidor.")] }); return; }
  if (!tMember.kickable) { await i.editReply({ embeds: [errEmbed("No se puede expulsar","No tengo permisos para expulsar a ese usuario.")] }); return; }
  try {
    await target.send({
      embeds: [new EmbedBuilder().setTitle("👢 Fuiste expulsado")
        .setDescription(`Fuiste expulsado de **${i.guild?.name}**.\n**Motivo:** ${razon}`)
        .setColor(0xff8800).setTimestamp()]
    }).catch(() => {});
    await tMember.kick(`${i.user.tag}: ${razon}`);
    await i.editReply({ embeds: [
      modEmbed("👢 Usuario Expulsado", 0xff8800)
        .addFields(
          { name: "👤 Usuario",   value: `${target.tag}`, inline: true },
          { name: "📋 Motivo",    value: razon,            inline: true },
          { name: "👮 Moderador", value: i.user.tag,       inline: true },
        )
    ]});
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error al expulsar", e?.message ?? "Error desconocido.")] });
  }
}

async function handleTimeout(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Silenciar Miembros**.")] }); return;
  }
  const target   = i.options.getUser("usuario", true);
  const duracion = i.options.getInteger("duracion", true);
  const unidad   = i.options.getString("unidad", true);
  const razon    = i.options.getString("razon") ?? "Sin motivo";
  const ms       = minutesToMs(duracion, unidad);
  if (ms > 2_419_200_000) { await i.editReply({ embeds: [errEmbed("Límite","El timeout máximo de Discord es 28 días.")] }); return; }
  const tMember = await i.guild?.members.fetch(target.id).catch(() => null);
  if (!tMember) { await i.editReply({ embeds: [errEmbed("No encontrado","El usuario no está en el servidor.")] }); return; }
  try {
    await tMember.timeout(ms, `${i.user.tag}: ${razon}`);
    await i.editReply({ embeds: [
      modEmbed("🔇 Usuario Silenciado", 0xf39c12)
        .addFields(
          { name: "👤 Usuario",   value: `${target.tag}`,  inline: true },
          { name: "⏱ Duración",   value: formatMs(ms),     inline: true },
          { name: "📋 Motivo",    value: razon,             inline: true },
          { name: "👮 Moderador", value: i.user.tag,        inline: true },
        )
    ]});
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudo silenciar.")] });
  }
}

async function handleUntimeout(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Silenciar Miembros**.")] }); return;
  }
  const target  = i.options.getUser("usuario", true);
  const razon   = i.options.getString("razon") ?? "Sin motivo";
  const tMember = await i.guild?.members.fetch(target.id).catch(() => null);
  if (!tMember) { await i.editReply({ embeds: [errEmbed("No encontrado","El usuario no está en el servidor.")] }); return; }
  try {
    await tMember.timeout(null, `${i.user.tag}: ${razon}`);
    await i.editReply({ embeds: [
      modEmbed("🔊 Silencio Eliminado", 0x2ecc71)
        .addFields(
          { name: "👤 Usuario",   value: `${target.tag}`, inline: true },
          { name: "📋 Motivo",    value: razon,            inline: true },
          { name: "👮 Moderador", value: i.user.tag,       inline: true },
        )
    ]});
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudo quitar el silencio.")] });
  }
}

async function handleWarn(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Silenciar Miembros**.")] }); return;
  }
  const target = i.options.getUser("usuario", true);
  const razon  = i.options.getString("razon", true);
  const res = await apiPost("/warnings/add", {
    userId: target.id, username: target.username, reason: razon,
    warnedBy: i.user.id, warnedByName: i.user.username,
    guildId: i.guildId!,
  });
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo registrar la advertencia.")] }); return; }
  const warn = (await res.json()) as any;

  // Contar advertencias totales
  const totalRes = await apiGet(`/warnings/${target.id}`);
  const total = totalRes.ok ? ((await totalRes.json()) as any[]).length : "?";

  await target.send({
    embeds: [new EmbedBuilder().setTitle("⚠️ Has recibido una advertencia")
      .setDescription(`**Servidor:** ${i.guild?.name}\n**Motivo:** ${razon}\n**Moderador:** ${i.user.tag}`)
      .setColor(0xf39c12).setTimestamp()]
  }).catch(() => {});

  await i.editReply({ embeds: [
    modEmbed("⚠️ Advertencia Registrada", 0xf39c12)
      .addFields(
        { name: "👤 Usuario",          value: `${target.tag}`,       inline: true },
        { name: "📋 Motivo",           value: razon,                  inline: true },
        { name: "🔢 Total advertencias", value: String(total),        inline: true },
        { name: "👮 Moderador",        value: i.user.tag,             inline: true },
        { name: "🆔 Warn ID",          value: `#${warn.id}`,          inline: true },
      )
  ]});
}

async function handleWarnings(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const target = i.options.getUser("usuario", true);
  const res = await apiGet(`/warnings/${target.id}`);
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudieron obtener las advertencias.")] }); return; }
  const rows = (await res.json()) as any[];
  if (rows.length === 0) {
    await i.editReply({ embeds: [okEmbed(`Sin advertencias`, `**${target.tag}** no tiene advertencias registradas.`)] }); return;
  }
  const lines = rows.map((w, idx) =>
    `**${idx+1}.** \`#${w.id}\` — ${w.reason}\n👮 @${w.warnedByName} · ${ts(w.createdAt)}`
  );
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`⚠️ Advertencias de ${target.tag}`).setColor(0xf39c12)
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: `${rows.length} advertencia${rows.length!==1?"s":""}` })
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp()
  ]});
}

async function handleClearWarnings(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Silenciar Miembros**.")] }); return;
  }
  const target = i.options.getUser("usuario", true);
  const res = await apiDelete(`/warnings/clear/${target.id}`, {});
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudieron borrar.")] }); return; }
  const data = (await res.json()) as any;
  await i.editReply({ embeds: [okEmbed("Advertencias borradas", `Se eliminaron **${data.cleared}** advertencia${data.cleared!==1?"s":""} de **${target.tag}**.`)] });
}

async function handlePurge(i: ChatInputCommandInteraction) {
  await i.deferReply({ ephemeral: true });
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ManageMessages)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Gestionar Mensajes**.")] }); return;
  }
  const cantidad = i.options.getInteger("cantidad", true);
  const target   = i.options.getUser("usuario");
  const channel  = i.channel as TextChannel;
  if (!channel || !channel.bulkDelete) { await i.editReply({ embeds: [errEmbed("Error","No puedo borrar mensajes aquí.")] }); return; }
  try {
    const msgs = await channel.messages.fetch({ limit: Math.min(cantidad + 5, 100) });
    const toDelete = target
      ? [...msgs.values()].filter(m => m.author.id === target.id).slice(0, cantidad)
      : [...msgs.values()].slice(0, cantidad);
    const deleted = await channel.bulkDelete(toDelete.slice(0, 100), true);
    await i.editReply({ embeds: [okEmbed("Mensajes eliminados", `Se borraron **${deleted.size}** mensajes${target ? ` de **${target.tag}**` : ""}.`)] });
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudieron borrar. Los mensajes +14 días no se pueden borrar en masa.")] });
  }
}

async function handleSlowmode(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ManageMessages)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Gestionar Mensajes**.")] }); return;
  }
  const segundos = i.options.getInteger("segundos", true);
  const channel  = i.channel as TextChannel;
  try {
    await channel.setRateLimitPerUser(segundos, `${i.user.tag} estableció slowmode`);
    await i.editReply({ embeds: [
      segundos === 0
        ? okEmbed("Modo lento desactivado", `El canal ${channel} volvió a velocidad normal.`)
        : modEmbed("🐌 Modo Lento Activado", 0x3498db)
            .setDescription(`El canal ${channel} ahora tiene un delay de **${formatMs(segundos*1000)}** entre mensajes.`)
    ]});
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudo configurar.")] });
  }
}

async function handleUserinfo(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const target  = i.options.getUser("usuario") ?? i.user;
  const tMember = await i.guild?.members.fetch(target.id).catch(() => null);
  const roles   = tMember?.roles.cache
    .filter(r => r.id !== i.guildId)
    .sort((a,b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .slice(0, 10)
    .join(" ") || "Ninguno";

  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`👤 ${target.tag}`)
      .setColor(tMember?.displayHexColor ? parseInt(tMember.displayHexColor.replace("#",""), 16) : 0x5865f2)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "🆔 ID",           value: target.id,                                                          inline: true },
        { name: "🤖 Bot",          value: target.bot ? "Sí" : "No",                                           inline: true },
        { name: "📅 Cuenta creada", value: ts(target.createdAt),                                               inline: true },
        { name: "📥 Entró al server", value: tMember ? ts(tMember.joinedAt) : "—",                            inline: true },
        { name: "🎭 Apodo",        value: tMember?.nickname ?? "*(ninguno)*",                                  inline: true },
        { name: "💬 Estado",       value: tMember?.communicationDisabledUntil ? `🔇 Silenciado hasta ${ts(tMember.communicationDisabledUntil)}` : "✅ Normal", inline: true },
        { name: `🏷️ Roles (${tMember?.roles.cache.size ? tMember.roles.cache.size - 1 : 0})`, value: roles },
      ).setTimestamp()
  ]});
}

async function handleServerinfo(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const g = i.guild!;
  await g.fetch();
  const channels = g.channels.cache;
  const text  = channels.filter(c => c.type === 0).size;
  const voice = channels.filter(c => c.type === 2).size;

  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle(`🏠 ${g.name}`).setColor(0x5865f2)
      .setThumbnail(g.iconURL({ size: 256 }) ?? null)
      .addFields(
        { name: "🆔 ID",          value: g.id,                                     inline: true },
        { name: "👑 Dueño",       value: `<@${g.ownerId}>`,                        inline: true },
        { name: "📅 Creado",      value: ts(g.createdAt),                          inline: true },
        { name: "👥 Miembros",    value: String(g.memberCount),                    inline: true },
        { name: "💬 Canales",     value: `📝 ${text} texto · 🔊 ${voice} voz`,    inline: true },
        { name: "🏷️ Roles",      value: String(g.roles.cache.size - 1),           inline: true },
        { name: "😀 Emojis",      value: String(g.emojis.cache.size),              inline: true },
        { name: "💎 Boosts",      value: `${g.premiumSubscriptionCount ?? 0} (Nivel ${g.premiumTier})`, inline: true },
        { name: "🔒 Verificación", value: ["Ninguna","Baja","Media","Alta","Máxima"][g.verificationLevel] ?? "—", inline: true },
      ).setTimestamp()
  ]});
}

async function handleLock(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ManageMessages)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Gestionar Mensajes**.")] }); return;
  }
  const channel = i.channel as TextChannel;
  try {
    await channel.permissionOverwrites.edit(i.guildId!, { SendMessages: false });
    await i.editReply({ embeds: [modEmbed("🔒 Canal Bloqueado", 0xff4444).setDescription(`${channel} está ahora bloqueado. Los miembros no pueden enviar mensajes.`)] });
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudo bloquear.")] });
  }
}

async function handleUnlock(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  if (!hasPerm(member, PermissionFlagsBits.ManageMessages)) {
    await i.editReply({ embeds: [errEmbed("Sin permiso","Necesitas el permiso **Gestionar Mensajes**.")] }); return;
  }
  const channel = i.channel as TextChannel;
  try {
    await channel.permissionOverwrites.edit(i.guildId!, { SendMessages: null });
    await i.editReply({ embeds: [okEmbed("Canal Desbloqueado", `${channel} está abierto de nuevo.`)] });
  } catch (e: any) {
    await i.editReply({ embeds: [errEmbed("Error", e?.message ?? "No se pudo desbloquear.")] });
  }
}

// ══════════════════════════════════════════════════════════════
//  👥  ADMIN COMMANDS
// ══════════════════════════════════════════════════════════════

async function handleAddAdmin(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!isOwner(i)) { await i.editReply({ embeds: [errEmbed("Solo el dueño","Solo el dueño del servidor puede agregar admins.")] }); return; }
  const target = i.options.getUser("usuario", true);
  if (target.id === i.user.id) { await i.editReply({ embeds: [warnEmbed("Ya eres dueño","No necesitas agregarte.")] }); return; }
  const res = await apiPost("/admins/add", { discordId: target.id, discordName: target.username, addedBy: i.user.id, addedByName: i.user.username });
  if (res.status === 409) { await i.editReply({ embeds: [warnEmbed("Ya es admin",`@${target.username} ya está autorizado.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo agregar.")] }); return; }
  await i.editReply({ embeds: [okEmbed("Admin agregado", `**@${target.username}** puede usar todos los comandos de keys.`)] });
}

async function handleRemoveAdmin(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!isOwner(i)) { await i.editReply({ embeds: [errEmbed("Solo el dueño","Solo el dueño puede quitar admins.")] }); return; }
  const target = i.options.getUser("usuario", true);
  const res = await apiPost("/admins/remove", { discordId: target.id });
  if (res.status === 404) { await i.editReply({ embeds: [warnEmbed("No era admin",`@${target.username} no estaba en la lista.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error","No se pudo quitar.")] }); return; }
  await i.editReply({ embeds: [okEmbed("Admin removido", `**@${target.username}** ya no puede usar comandos de keys.`)] });
}

async function handleListAdmins(i: ChatInputCommandInteraction) {
  await i.deferReply();
  if (!isOwner(i)) { await i.editReply({ embeds: [errEmbed("Solo el dueño","Solo el dueño puede ver la lista.")] }); return; }
  const res = await apiGet("/admins");
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error","No se pudo obtener la lista.")] }); return; }
  const rows = (await res.json()) as any[];
  const ownerId = getOwnerId(i);
  const lines = [
    `👑 <@${ownerId}> — **Dueño** (siempre autorizado)`,
    ...rows.map(r => `✅ <@${r.discordId}> (@${r.discordName}) — agregado ${ts(r.addedAt)} por @${r.addedByName}`),
  ];
  if (rows.length === 0) lines.push("\n*Usa `/addadmin` para autorizar a alguien.*");
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("👥 Admins — X23 Hub").setColor(0x5865f2)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${rows.length+1} persona${rows.length+1!==1?"s":""} autorizada${rows.length+1!==1?"s":""}` })
      .setTimestamp()
  ]});
}

// ── Gateway ────────────────────────────────────────────────────
client.once(Events.ClientReady, c => {
  console.log(`✅ Bot conectado como ${c.user.tag}`);
  if (allowedGuildId) console.log(`🔒 Bloqueado al servidor: ${allowedGuildId}`);
  initAudit(c);
  initExpiry(c, apiFetch);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (allowedGuildId && interaction.guildId !== allowedGuildId) {
    await interaction.reply({ content: "❌ Este bot no está autorizado en este servidor.", flags: 64 });
    return;
  }
  try {
    switch (interaction.commandName) {
      // Keys
      case "genkey":           await handleGenkey(interaction);           break;
      case "revokekey":        await handleRevokekey(interaction);        break;
      case "deletekey":        await handleDeletekey(interaction);        break;
      case "renewkey":         await handleRenewkey(interaction);         break;
      case "assignkey":        await handleAssignkey(interaction);        break;
      case "listkeys":         await handleListkeys(interaction);         break;
      case "keyinfo":          await handleKeyinfo(interaction);          break;
      case "searchkey":        await handleSearchkey(interaction);        break;
      case "resethwid":        await handleResethwid(interaction);        break;
      case "history":          await handleHistory(interaction);          break;
      case "stats":            await handleStats(interaction);            break;
      case "limpiarexpiradas": await handleLimpiarExpiradas(interaction); break;
      case "purgerevocadas":   await handlePurgeRevocadas(interaction);   break;
      // Moderación
      case "ban":              await handleBan(interaction);              break;
      case "unban":            await handleUnban(interaction);            break;
      case "kick":             await handleKick(interaction);             break;
      case "timeout":          await handleTimeout(interaction);          break;
      case "untimeout":        await handleUntimeout(interaction);        break;
      case "warn":             await handleWarn(interaction);             break;
      case "warnings":         await handleWarnings(interaction);         break;
      case "clearwarnings":    await handleClearWarnings(interaction);    break;
      case "purge":            await handlePurge(interaction);            break;
      case "slowmode":         await handleSlowmode(interaction);         break;
      case "userinfo":         await handleUserinfo(interaction);         break;
      case "serverinfo":       await handleServerinfo(interaction);       break;
      case "lock":             await handleLock(interaction);             break;
      case "unlock":           await handleUnlock(interaction);           break;
      // Admins
      case "addadmin":         await handleAddAdmin(interaction);         break;
      case "removeadmin":      await handleRemoveAdmin(interaction);      break;
      case "listadmins":       await handleListAdmins(interaction);       break;
      case "ia":               await handleIa(interaction);               break;
      // Keys extra
      case "genkeys":          await handleGenkeys(interaction);          break;
      case "exportkeys":       await handleExportkeys(interaction);       break;
      case "transferkey":      await handleTransferkey(interaction);      break;
      case "deviceinfo":       await handleDeviceinfo(interaction);       break;
      // Sistema / Utilidades
      case "ping":             await handlePing(interaction);             break;
      case "status":           await handleStatus(interaction);           break;
      case "avatar":           await handleAvatar(interaction);           break;
      case "banner":           await handleBanner(interaction);           break;
      case "coinflip":         await handleCoinflip(interaction);         break;
      case "dado":             await handleDado(interaction);             break;
      case "8ball":            await handle8ball(interaction);            break;
      case "poll":             await handlePoll(interaction);             break;
      case "embed":            await handleEmbed(interaction);            break;
      case "calc":             await handleCalc(interaction);             break;
      case "timer":            await handleTimer(interaction);            break;
      case "help":             await handleHelp(interaction);             break;
      case "setauditlog":      await handleSetauditlog(interaction);      break;
      case "setalertchannel":  await handleSetalertchannel(interaction);  break;
      // Música
      case "play":             await handlePlay(interaction);             break;
      case "skip":             await handleSkip(interaction);             break;
      case "stop":             await handleStop(interaction);             break;
      case "pause":            await handlePause(interaction);            break;
      case "resume":           await handleResume(interaction);           break;
      case "queue":            await handleQueue(interaction);            break;
      case "nowplaying":       await handleNowplaying(interaction);       break;
      case "leave":            await handleLeave(interaction);            break;
      case "volume":           await handleVolume(interaction);           break;
      case "shuffle":          await handleShuffle(interaction);          break;
      case "loop":             await handleLoop(interaction);             break;
    }
  } catch (err) {
    console.error("Error en comando:", err);
    const m = interaction.deferred ? "editReply" : "reply";
    await interaction[m]({ embeds: [errEmbed("Error inesperado","Intenta de nuevo.")] });
  }
});

let loginInFlight = false;

async function reconcileBotState() {
  if (!isBotEnabled()) {
    if (client.isReady()) {
      console.log("[runtime-control] Bot desconectado desde el panel administrativo.");
      client.destroy();
    }
    return;
  }

  if (!client.isReady() && !loginInFlight) {
    loginInFlight = true;
    try {
      await client.login(token);
    } catch (error) {
      console.error("[runtime-control] No se pudo conectar el bot:", error);
    } finally {
      loginInFlight = false;
    }
  }

  if (client.isReady()) touchBotHeartbeat();
}

client.on(Events.ClientReady, () => {
  touchBotHeartbeat();
  console.log("[runtime-control] Heartbeat del bot activo.");
});

void reconcileBotState();
const controlInterval = setInterval(() => void reconcileBotState(), 20_000);
controlInterval.unref();
