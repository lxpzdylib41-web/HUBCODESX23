import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { getConfig } from "./config.js";

let _client: Client;
export function initAudit(client: Client) { _client = client; }

export async function sendAudit(embed: EmbedBuilder): Promise<void> {
  const { auditChannelId } = getConfig();
  if (!auditChannelId || !_client) return;
  try {
    const ch = await _client.channels.fetch(auditChannelId);
    if (ch?.isTextBased()) await (ch as TextChannel).send({ embeds: [embed] });
  } catch {}
}
