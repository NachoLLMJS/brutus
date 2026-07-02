// Game audio manager.
// All combat/UI SFX are intentionally disabled. The only enabled audio is the
// looped game soundtrack under /music/vault-brawl-background.mp3.

export type SfxKey = string;
export type MusicStatus = 'playing' | 'blocked' | 'muted';

const BACKGROUND_MUSIC_URL = '/music/vault-brawl-background.mp3';
const BACKGROUND_VOLUME = 0.34;

let muted = false;
let masterVolume = 1.0;
let bgm: HTMLAudioElement | null = null;
let playPending = false;
const listeners = new Set<(status: MusicStatus) => void>();

function currentMusicStatus(): MusicStatus {
  if (muted) return 'muted';
  if (bgm && !bgm.paused && !bgm.ended) return 'playing';
  return 'blocked';
}

function notifyMusicStatus(): void {
  const status = currentMusicStatus();
  for (const listener of listeners) listener(status);
}

function ensureBgm(): HTMLAudioElement {
  if (bgm) return bgm;
  bgm = new Audio(BACKGROUND_MUSIC_URL);
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = BACKGROUND_VOLUME * masterVolume;
  bgm.addEventListener('play', notifyMusicStatus);
  bgm.addEventListener('playing', notifyMusicStatus);
  bgm.addEventListener('pause', notifyMusicStatus);
  bgm.addEventListener('ended', notifyMusicStatus);
  bgm.addEventListener('error', notifyMusicStatus);
  return bgm;
}

function syncVolume(): void {
  if (!bgm) return;
  bgm.volume = muted ? 0 : BACKGROUND_VOLUME * masterVolume;
}

// SFX are muted by design. Keep the public API as no-ops so combat code can keep
// calling these hooks without conditional branches or runtime breakage.
export function playSfx(_key: SfxKey): void {}

export function playSkillSfx(_skillId: string): void {}

export function playWeaponHit(_weaponId?: string): void {}

export function playBlockSfx(): void {}

export function playPetHit(_model: string): void {}

export function setMuted(value: boolean): void {
  muted = value;
  syncVolume();
  if (muted && bgm) {
    bgm.pause();
    notifyMusicStatus();
  } else if (!muted && bgm && playPending) {
    void bgm.play()
      .then(notifyMusicStatus)
      .catch(() => {
        // Browser autoplay policy may require a user gesture; App retries on input.
        notifyMusicStatus();
      });
  } else {
    notifyMusicStatus();
  }
}

export function isMuted(): boolean {
  return muted;
}

export function getMusicStatus(): MusicStatus {
  return currentMusicStatus();
}

export function subscribeMusicStatus(listener: (status: MusicStatus) => void): () => void {
  listeners.add(listener);
  listener(currentMusicStatus());
  return () => {
    listeners.delete(listener);
  };
}

export function setVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
  syncVolume();
}

export function playBgm(_key: SfxKey = 'bg'): void {
  playPending = true;
  if (muted) {
    notifyMusicStatus();
    return;
  }
  const audio = ensureBgm();
  syncVolume();
  if (!audio.paused && !audio.ended) {
    notifyMusicStatus();
    return;
  }
  void audio.play()
    .then(notifyMusicStatus)
    .catch(() => {
      // Browser autoplay policy may block until the first click/key/touch.
      notifyMusicStatus();
    });
}

// The soundtrack is global background music, so fight teardown must not stop it.
export function stopBgm(): void {}
