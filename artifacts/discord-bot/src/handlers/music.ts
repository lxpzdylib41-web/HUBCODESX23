import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { getQueue } from "../music-queue.js";

function errEmbed(t: string, d: string) { return new EmbedBuilder().setTitle(`❌ ${t}`).setDescription(d).setColor(0xff4444); }

function fmtDur(str: string) { return str || "?:??"; }

async function searchTrack(query: string, requestedBy: string) {
  const playdl = await import("play-dl");

  let url = query;
  let title = query;
  let duration = "?:??";
  let thumbnail: string | null = null;

  try {
    // Si no es URL, buscar en YouTube
    if (!query.startsWith("http")) {
      const results = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
      if (!results.length) throw new Error("Sin resultados");
      url = results[0].url;
    }

    const info = await playdl.video_info(url);
    title     = info.video_details.title ?? query;
    duration  = info.video_details.durationRaw ?? "?:??";
    thumbnail = info.video_details.thumbnails?.[0]?.url ?? null;
  } catch {
    // Si falla la info, igual intentamos reproducir
  }

  return { title, url, duration, thumbnail, requestedBy };
}

// ─── /play ───────────────────────────────────────────────────────────────────
export async function handlePlay(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const member = i.member as GuildMember;
  const vc = member.voice?.channel;

  if (!vc) {
    await i.editReply({ embeds: [errEmbed("Sin canal", "Únete a un canal de voz primero.")] }); return;
  }

  const query = i.options.getString("busqueda", true);
  const q = getQueue(i.guildId!);

  try {
    await q.join(vc);
  } catch (err: any) {
    await i.editReply({ embeds: [errEmbed("Error de voz", err.message)] }); return;
  }

  let track;
  try {
    track = await searchTrack(query, i.user.username);
  } catch {
    await i.editReply({ embeds: [errEmbed("No encontrado", "No se encontraron resultados para esa búsqueda.")] }); return;
  }

  const nowPlaying = await q.addAndPlay(track);
  const embed = new EmbedBuilder()
    .setColor(nowPlaying ? 0xe91e63 : 0x9b59b6)
    .setTitle(nowPlaying ? "🎵 Reproduciendo ahora" : "📋 Agregado a la cola")
    .setDescription(`**[${track.title}](${track.url})**`)
    .addFields(
      { name: "⏱ Duración",   value: fmtDur(track.duration), inline: true },
      { name: "🎤 Pedido por", value: `@${i.user.username}`,  inline: true },
      { name: "📋 En cola",    value: String(q.getQueue().length), inline: true },
    )
    .setTimestamp();
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  await i.editReply({ embeds: [embed] });
}

// ─── /skip ───────────────────────────────────────────────────────────────────
export async function handleSkip(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  if (!q.currentTrack && q.getQueue().length === 0) {
    await i.editReply({ embeds: [errEmbed("Cola vacía", "No hay nada en la cola.")] }); return;
  }
  const skipped = q.currentTrack?.title ?? "?";
  q.skip();
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("⏭ Saltada").setDescription(`Saltada: **${skipped}**`).setColor(0xf39c12).setTimestamp()
  ]});
}

// ─── /stop ───────────────────────────────────────────────────────────────────
export async function handleStop(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  q.stop();
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("⏹ Detenido").setDescription("Reproducción detenida y cola limpiada.").setColor(0xff4444).setTimestamp()
  ]});
}

// ─── /pause ──────────────────────────────────────────────────────────────────
export async function handlePause(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  const ok = q.pause();
  if (!ok) { await i.editReply({ embeds: [errEmbed("Sin reproducción", "No hay nada reproduciéndose ahora mismo.")] }); return; }
  await i.editReply({ embeds: [new EmbedBuilder().setTitle("⏸ Pausado").setColor(0xf39c12).setTimestamp()] });
}

// ─── /resume ─────────────────────────────────────────────────────────────────
export async function handleResume(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  const ok = q.resume();
  if (!ok) { await i.editReply({ embeds: [errEmbed("Sin pausa", "La música no está pausada.")] }); return; }
  await i.editReply({ embeds: [new EmbedBuilder().setTitle("▶️ Reanudando").setColor(0x2ecc71).setTimestamp()] });
}

// ─── /queue ──────────────────────────────────────────────────────────────────
export async function handleQueue(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q   = getQueue(i.guildId!);
  const cur = q.currentTrack;
  const tracks = q.getQueue();

  if (!cur && tracks.length === 0) {
    await i.editReply("📭 La cola está vacía."); return;
  }

  const lines = tracks.slice(0, 15).map((t, idx) =>
    `**${idx + 1}.** [${t.title}](${t.url}) — \`${fmtDur(t.duration)}\` · @${t.requestedBy}`
  );
  if (tracks.length > 15) lines.push(`*... y ${tracks.length - 15} más*`);

  const embed = new EmbedBuilder()
    .setTitle("🎵 Cola de reproducción").setColor(0xe91e63)
    .addFields(
      { name: "🎵 Ahora suena", value: cur ? `[${cur.title}](${cur.url})` : "—" },
      ...(lines.length ? [{ name: `📋 Cola (${tracks.length})`, value: lines.join("\n") }] : []),
    )
    .setFooter({ text: `Loop: ${q.looping ? "✅" : "❌"}` })
    .setTimestamp();

  await i.editReply({ embeds: [embed] });
}

// ─── /nowplaying ─────────────────────────────────────────────────────────────
export async function handleNowplaying(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  if (!q.currentTrack) {
    await i.editReply("📭 No hay nada reproduciéndose ahora."); return;
  }
  const t = q.currentTrack;
  const embed = new EmbedBuilder()
    .setTitle("🎵 Reproduciendo ahora").setColor(0xe91e63)
    .setDescription(`**[${t.title}](${t.url})**`)
    .addFields(
      { name: "⏱ Duración",     value: fmtDur(t.duration),              inline: true },
      { name: "🎤 Pedido por",   value: `@${t.requestedBy}`,             inline: true },
      { name: "🔁 Loop",         value: q.looping ? "✅ Activado" : "❌", inline: true },
    )
    .setTimestamp();
  if (t.thumbnail) embed.setThumbnail(t.thumbnail);
  await i.editReply({ embeds: [embed] });
}

// ─── /leave ──────────────────────────────────────────────────────────────────
export async function handleLeave(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  q.destroy();
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("👋 Desconectado").setDescription("El bot salió del canal de voz.").setColor(0x95a5a6).setTimestamp()
  ]});
}

// ─── /volume ─────────────────────────────────────────────────────────────────
export async function handleVolume(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const nivel = i.options.getInteger("nivel", true);
  const q = getQueue(i.guildId!);
  q.setVolume(nivel);
  const bar = "█".repeat(Math.floor(nivel / 10)) + "░".repeat(10 - Math.floor(nivel / 10));
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🔊 Volumen").setDescription(`\`${bar}\` **${nivel}%**`).setColor(0x3498db).setTimestamp()
  ]});
}

// ─── /shuffle ────────────────────────────────────────────────────────────────
export async function handleShuffle(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q = getQueue(i.guildId!);
  if (q.getQueue().length < 2) {
    await i.editReply({ embeds: [errEmbed("Cola muy corta", "Necesitas al menos 2 canciones en la cola para mezclar.")] }); return;
  }
  q.shuffle();
  await i.editReply({ embeds: [
    new EmbedBuilder().setTitle("🔀 Cola mezclada").setDescription(`La cola de **${q.getQueue().length}** canciones fue mezclada aleatoriamente.`).setColor(0x9b59b6).setTimestamp()
  ]});
}

// ─── /loop ───────────────────────────────────────────────────────────────────
export async function handleLoop(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const q  = getQueue(i.guildId!);
  const on = q.toggleLoop();
  await i.editReply({ embeds: [
    new EmbedBuilder()
      .setTitle(on ? "🔁 Loop activado" : "🔁 Loop desactivado")
      .setDescription(on ? "La canción actual se repetirá en bucle." : "La reproducción continuará normalmente.")
      .setColor(on ? 0x2ecc71 : 0x95a5a6).setTimestamp()
  ]});
}
