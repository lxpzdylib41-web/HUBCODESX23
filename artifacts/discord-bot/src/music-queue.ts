import {
  createAudioPlayer, createAudioResource, joinVoiceChannel,
  AudioPlayerStatus, VoiceConnectionStatus, entersState,
  AudioPlayer, VoiceConnection, StreamType,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";

export interface Track {
  title: string;
  url: string;
  duration: string;
  thumbnail: string | null;
  requestedBy: string;
}

export class MusicQueue {
  private tracks: Track[] = [];
  private player: AudioPlayer;
  connection: VoiceConnection | null = null;
  currentTrack: Track | null = null;
  looping = false;
  volume = 0.8;
  private guildId: string;
  onTrackEnd?: () => void;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.looping && this.currentTrack) {
        this.playTrack(this.currentTrack);
        return;
      }
      this.currentTrack = null;
      this.playNext();
    });

    this.player.on("error", (err) => {
      console.error(`[Music] Error en ${this.guildId}:`, err.message);
      this.currentTrack = null;
      this.playNext();
    });
  }

  async join(channel: VoiceBasedChannel): Promise<void> {
    if (this.connection) {
      // Mover al nuevo canal si es diferente
      if (this.connection.joinConfig.channelId !== channel.id) {
        this.connection.destroy();
        this.connection = null;
      } else return;
    }

    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      conn.destroy();
      throw new Error("No se pudo conectar al canal de voz.");
    }

    this.connection = conn;
    conn.subscribe(this.player);

    conn.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  async addAndPlay(track: Track): Promise<boolean> {
    this.tracks.push(track);
    if (!this.currentTrack) {
      this.playNext();
      return true; // empieza a tocar ahora
    }
    return false; // agregado a la cola
  }

  private async playTrack(track: Track): Promise<void> {
    try {
      // Importar play-dl dinámicamente para evitar problemas de bundle
      const playdl = await import("play-dl");
      const stream = await playdl.stream(track.url, { quality: 2 });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type as StreamType,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume);
      this.currentTrack = track;
      this.player.play(resource);
    } catch (err) {
      console.error("[Music] Error reproduciendo:", err);
      this.currentTrack = null;
      this.playNext();
    }
  }

  playNext(): void {
    if (this.tracks.length === 0) {
      this.currentTrack = null;
      return;
    }
    const next = this.tracks.shift()!;
    this.playTrack(next);
  }

  skip(): boolean {
    if (!this.currentTrack && this.tracks.length === 0) return false;
    this.looping = false;
    this.player.stop();
    return true;
  }

  stop(): void {
    this.tracks = [];
    this.looping = false;
    this.currentTrack = null;
    this.player.stop();
  }

  pause(): boolean {
    if (this.player.state.status !== AudioPlayerStatus.Playing) return false;
    this.player.pause();
    return true;
  }

  resume(): boolean {
    if (this.player.state.status !== AudioPlayerStatus.Paused) return false;
    this.player.unpause();
    return true;
  }

  setVolume(pct: number): void {
    this.volume = Math.max(0, Math.min(2, pct / 100));
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      const res = (this.player.state as any).resource;
      res?.volume?.setVolume(this.volume);
    }
  }

  shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  toggleLoop(): boolean {
    this.looping = !this.looping;
    return this.looping;
  }

  getQueue(): Track[] { return this.tracks; }
  isPlaying(): boolean { return this.player.state.status === AudioPlayerStatus.Playing; }
  isPaused(): boolean { return this.player.state.status === AudioPlayerStatus.Paused; }

  destroy(): void {
    this.stop();
    this.connection?.destroy();
    this.connection = null;
    queues.delete(this.guildId);
  }
}

const queues = new Map<string, MusicQueue>();
export function getQueue(guildId: string): MusicQueue {
  if (!queues.has(guildId)) queues.set(guildId, new MusicQueue(guildId));
  return queues.get(guildId)!;
}
export function deleteQueue(guildId: string): void { queues.delete(guildId); }
