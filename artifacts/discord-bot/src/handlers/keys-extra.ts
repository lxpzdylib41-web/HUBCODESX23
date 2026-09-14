import { ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { sendAudit } from "../audit.js";

const API_BASE = `http://localhost:${process.env.PORT ?? 80}/api`;
const botSecret = process.env.BOT_SECRET!;

async function apiFetch(method: string, path: string, body?: object) {
  const { default: fetch } = await import("node-fetch");
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-bot-secret": botSecret },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const apiPost = (p: string, b: object) => apiFetch("POST", p, b);
const apiGet  = (p: string)            => apiFetch("GET", p);

function formatMinutes(min: number | null | undefined): string {
  if (!min) return "Permanente ♾️";
  if (min < 60) return `${min}min`;
  if (min < 1440) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h ${m}min` : `${h}h`; }
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}
function tsShort(date: any) { if (!date) return "—"; return `<t:${Math.floor(new Date(date).getTime() / 1000)}:f>`; }
function ts(date: any)      { if (!date) return "—"; return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`; }
function statusEmoji(r: any) { if (!r.isActive) return "🔴"; if (r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < new Date()) return "🟡"; if (!r.activatedAt) return "⚪"; return "🟢"; }
function statusText(r: any)  { if (!r.isActive) return "Revocada"; if (r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < new Date()) return "Expirada"; if (!r.activatedAt) return "Sin activar"; return "Activa"; }
function errEmbed(title: string, desc: string) { return new EmbedBuilder().setTitle(`❌ ${title}`).setDescription(desc).setColor(0xff4444); }
function okEmbed(title: string, desc?: string) { return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(desc ?? "").setColor(0x2ecc71).setTimestamp(); }

// ─── /genkeys ────────────────────────────────────────────────────────────────
export async function handleGenkeys(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const tipo     = i.options.getString("tipo", true);
  const cantidad = i.options.getInteger("cantidad", true);
  const duracion = i.options.getInteger("duracion") ?? undefined;
  const unidad   = (i.options.getString("unidad") ?? "days") as "minutes" | "hours" | "days";
  const script   = i.options.getString("script") ?? "legacy";
  const prefijo  = i.options.getString("prefijo")?.trim() || undefined;

  if (tipo === "timed" && !duracion) {
    await i.editReply({ embeds: [errEmbed("Falta duración", "Indica la duración para keys temporales.")] }); return;
  }

  const res = await apiPost("/keys/generate-bulk", {
    count: cantidad, type: tipo, duration: duracion, unit: unidad, productId: script,
    prefix: prefijo, createdBy: i.user.id, createdByName: i.user.username,
  });
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error", "No se pudieron generar las keys.")] }); return; }

  const data = (await res.json()) as { keys: string[]; productId?: string; type: string; durationMinutes: number | null };
  const lines = data.keys.map((k, idx) => `\`${idx + 1}.\` \`${k}\``);

  const embed = new EmbedBuilder()
    .setTitle(`🔑 ${data.keys.length} Keys Generadas — X23 Hub`)
    .setColor(0x00c8ff)
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "📋 Tipo",     value: tipo === "permanent" ? "Permanente ♾️" : `Temporal ⏳ ${formatMinutes(data.durationMinutes)}`, inline: true },
      { name: "📜 Script",   value: data.productId ?? script, inline: true },
      { name: "⚙️ Por",     value: `@${i.user.username}`, inline: true },
    )
    .setTimestamp();

  await i.editReply({ embeds: [embed] });

  await sendAudit(new EmbedBuilder()
    .setTitle("🔑 Keys generadas en masa").setColor(0x00c8ff)
    .addFields(
      { name: "Cantidad", value: String(data.keys.length), inline: true },
      { name: "Tipo",     value: tipo,                    inline: true },
      { name: "Por",      value: `@${i.user.username}`,  inline: true },
    ).setTimestamp()
  );
}

// ─── /exportkeys ─────────────────────────────────────────────────────────────
export async function handleExportkeys(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const filtro = i.options.getString("filtro") ?? "all";
  const res = await apiGet("/keys/export");
  if (!res.ok) { await i.editReply({ embeds: [errEmbed("Error", "No se pudo exportar.")] }); return; }

  const now = new Date();
  let rows = (await res.json()) as any[];

  if (filtro === "active")   rows = rows.filter(r => r.isActive && !(r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < now));
  if (filtro === "inactive") rows = rows.filter(r => !r.isActive || (r.type === "timed" && r.expiresAt && new Date(r.expiresAt) < now));
  if (filtro === "pending")  rows = rows.filter(r => !r.activatedAt && r.isActive);
  if (filtro === "timed")    rows = rows.filter(r => r.type === "timed");
  if (filtro === "permanent") rows = rows.filter(r => r.type === "permanent");

  if (rows.length === 0) { await i.editReply("📭 No hay keys con ese filtro."); return; }

  const lines = [
    `X23 Hub — Exportación de Keys`,
    `Fecha: ${new Date().toISOString()}`,
    `Filtro: ${filtro} | Total: ${rows.length}`,
    "─".repeat(60),
    "",
    ...rows.map(r => [
      `KEY:       ${r.key}`,
      `SCRIPT:    ${r.productId ?? "legacy"}`,
      `TIPO:      ${r.type === "permanent" ? "Permanente" : "Temporal"}`,
      `DURACIÓN:  ${formatMinutes(r.durationMinutes)}`,
      `USUARIO:   ${r.assignedTo ?? "Sin asignar"}`,
      `ESTADO:    ${statusText(r)}`,
      `HWID:      ${r.hwid ?? "—"}`,
      `IP:        ${r.ipAddress ?? "—"}`,
      `PLATAFORMA:${r.platform ?? "—"}`,
      `DISPOSITIVO:${r.deviceModel ?? "—"}`,
      `ROBLOX:    ${r.robloxVersion ?? "—"}`,
      `CREADA:    ${r.createdAt ? new Date(r.createdAt).toISOString() : "—"}`,
      `ACTIVADA:  ${r.activatedAt ? new Date(r.activatedAt).toISOString() : "Nunca"}`,
      `ÚLT. USO:  ${r.lastUsedAt ? new Date(r.lastUsedAt).toISOString() : "—"}`,
      `USOS:      ${r.usageCount ?? 0}`,
      "─".repeat(60),
    ].join("\n")),
  ].join("\n");

  const buffer = Buffer.from(lines, "utf8");
  const attachment = new AttachmentBuilder(buffer, { name: `keys-${filtro}-${Date.now()}.txt` });
  await i.editReply({ content: `📄 **${rows.length} keys** exportadas (filtro: \`${filtro}\`)`, files: [attachment] });
}

// ─── /transferkey ────────────────────────────────────────────────────────────
export async function handleTransferkey(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const key      = i.options.getString("key", true).trim().toUpperCase();
  const newUser  = i.options.getString("nuevo_usuario", true).trim();
  const resetHwid = i.options.getBoolean("resetear_hwid") ?? false;

  const res = await apiPost("/keys/transfer", { key, newUser, resetHwid });
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada", `La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error", "No se pudo transferir.")] }); return; }

  const data = (await res.json()) as any;
  const embed = new EmbedBuilder()
    .setTitle("🔁 Key Transferida").setColor(0x9b59b6)
    .addFields(
      { name: "🔐 Key",         value: `\`${key}\``,                               inline: true },
      { name: "👤 Ahora de",    value: newUser,                                    inline: true },
      { name: "🔓 HWID",        value: resetHwid ? "Reiniciado ✅" : "Sin cambio", inline: true },
    ).setTimestamp();

  await i.editReply({ embeds: [embed] });
  await sendAudit(new EmbedBuilder()
    .setTitle("🔁 Key transferida").setColor(0x9b59b6)
    .addFields(
      { name: "Key",    value: `\`${key}\``, inline: true },
      { name: "A",      value: newUser,      inline: true },
      { name: "Por",    value: `@${i.user.username}`, inline: true },
    ).setTimestamp()
  );
}

// ─── /deviceinfo ─────────────────────────────────────────────────────────────
export async function handleDeviceinfo(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const key = i.options.getString("key", true).trim().toUpperCase();
  const res = await apiGet(`/keys/info/${key}`);
  if (res.status === 404) { await i.editReply({ embeds: [errEmbed("No encontrada", `La key \`${key}\` no existe.`)] }); return; }
  if (!res.ok)            { await i.editReply({ embeds: [errEmbed("Error", "No se pudo obtener la info.")] }); return; }

  const r = (await res.json()) as any;
  const embed = new EmbedBuilder()
    .setTitle("🖥️ Info del dispositivo — X23 Hub").setColor(0x00bcd4)
    .addFields(
      { name: "🔐 Key",          value: `\`${r.key}\``,                                      inline: false },
      { name: "👤 Usuario",      value: r.assignedTo ?? "*(sin asignar)*",                    inline: true  },
      { name: "📊 Estado",       value: r.isActive ? (r.activatedAt ? "🟢 Activa" : "⚪ Sin activar") : "🔴 Revocada", inline: true },
      { name: "🌐 Última IP",    value: r.ipAddress   ? `\`${r.ipAddress}\``   : "—",         inline: true  },
      { name: "📱 Plataforma",   value: r.platform    ?? "—",                                 inline: true  },
      { name: "💻 Dispositivo",  value: r.deviceModel ?? "—",                                 inline: true  },
      { name: "🎮 Roblox v.",    value: r.robloxVersion ?? "—",                               inline: true  },
      { name: "🔑 HWID",        value: r.hwid ? `\`${r.hwid}\`` : "*(no vinculado)*",        inline: false },
      { name: "🕐 Último uso",   value: r.lastUsedAt ? `<t:${Math.floor(new Date(r.lastUsedAt).getTime()/1000)}:f>` : "Nunca", inline: true },
      { name: "🔢 Usos totales", value: String(r.usageCount ?? 0),                            inline: true  },
    )
    .setTimestamp();

  await i.editReply({ embeds: [embed] });
}
