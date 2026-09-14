import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { getConfig } from "./config.js";

const alerted = new Set<string>();

let _client: Client;
let _apiFetch: (method: string, path: string, body?: object) => Promise<any>;

export function initExpiry(client: Client, apiFetch: typeof _apiFetch) {
  _client = client;
  _apiFetch = apiFetch;
  // Revisar cada 15 minutos
  setInterval(checkExpiring, 15 * 60 * 1000);
  // Primera comprobación al arrancar (esperar 30s para que el API esté listo)
  setTimeout(checkExpiring, 30_000);
}

async function checkExpiring() {
  const { alertChannelId } = getConfig();
  if (!alertChannelId || !_client) return;

  try {
    const res = await _apiFetch("GET", "/keys/expiring-soon?hours=24");
    if (!res.ok) return;
    const keys = (await res.json()) as any[];

    const ch = await _client.channels.fetch(alertChannelId).catch(() => null);
    if (!ch?.isTextBased()) return;

    for (const k of keys) {
      if (alerted.has(k.key)) continue;
      alerted.add(k.key);

      const exp = k.expiresAt ? `<t:${Math.floor(new Date(k.expiresAt).getTime() / 1000)}:R>` : "—";
      const embed = new EmbedBuilder()
        .setTitle("⏰ Key próxima a expirar")
        .setColor(0xf39c12)
        .addFields(
          { name: "🔐 Key",       value: `\`${k.key}\``,           inline: true },
          { name: "👤 Usuario",   value: k.assignedTo ?? "*(sin asignar)*", inline: true },
          { name: "⏰ Expira",    value: exp,                        inline: true },
        )
        .setFooter({ text: "Usa /renewkey para extenderla" })
        .setTimestamp();

      await (ch as TextChannel).send({ embeds: [embed] });
    }
  } catch {}
}
