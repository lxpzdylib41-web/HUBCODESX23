/**
 * Gestión de admins autorizados.
 * El dueño del servidor (guild.ownerId) siempre tiene acceso completo.
 * Los demás deben estar en la tabla `admins` de la DB.
 */

const API_BASE = "http://localhost:80/api";

let botSecret: string;

export function initAuth(secret: string) {
  botSecret = secret;
}

async function apiGet(path: string) {
  const { default: fetch } = await import("node-fetch");
  return fetch(`${API_BASE}${path}`, { headers: { "x-bot-secret": botSecret } });
}

/** Devuelve true si el usuario puede usar los comandos del bot */
export async function isAuthorized(
  userId: string,
  guildOwnerId: string | null,
): Promise<boolean> {
  // El dueño del servidor siempre puede
  if (userId === guildOwnerId) return true;

  const res = await apiGet(`/admins/check/${userId}`);
  if (!res.ok) return false;
  const data = (await res.json()) as { authorized: boolean };
  return data.authorized === true;
}
