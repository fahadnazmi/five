(() => {
  const STORAGE_KEY = 'projectBackgroundAudioState';
  const AUDIO_ID = 'background-audio';
  const TRACK_PATH = "./can't help.mp3";

  function safeParseState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveState(audio) {
    if (!audio) return;
    try {
      const state = {
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        volume: audio.volume,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage failures in restricted environments.
    }
  }

  function buildAudio() {
    const existing = document.getElementById(AUDIO_ID);
    if (existing) return existing;

    const audio = document.createElement('audio');
    audio.id = AUDIO_ID;
    audio.preload = 'auto';
    audio.loop = true;
    audio.playsInline = true;
    audio.volume = 0.3;
    audio.src = new URL(TRACK_PATH, window.location.href).href;
    document.body.appendChild(audio);
    return audio;
  }

  function restorePosition(audio) {
    const state = safeParseState();
    if (!state || !Number.isFinite(state.currentTime)) return;

    if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
      const target = Math.min(state.currentTime, audio.duration);
      if (Math.abs(audio.currentTime - target) > 0.25) {
        audio.currentTime = target;
      }
      return;
    }

    audio.addEventListener('loadedmetadata', () => {
      const metaState = safeParseState();
      if (!metaState || !Number.isFinite(metaState.currentTime)) return;
      const target = Math.min(metaState.currentTime, audio.duration || metaState.currentTime || 0);
      if (Math.abs(audio.currentTime - target) > 0.25) {
        audio.currentTime = target;
      }
    }, { once: true });
  }

  function startPlayback() {
    const audio = buildAudio();

    const tryPlay = () => {
      restorePosition(audio);

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    if (audio.readyState >= 1) {
      tryPlay();
    } else {
      audio.addEventListener('loadedmetadata', tryPlay, { once: true });
    }

    document.removeEventListener('pointerdown', startPlayback);
    document.removeEventListener('touchstart', startPlayback);
    document.removeEventListener('keydown', startPlayback);
  }

  function bootstrap() {
    const audio = buildAudio();
    const state = safeParseState();
    const isLandingPage = window.location.pathname === '/' || /(^|\/)(index\.html)?$/.test(window.location.pathname);

    if (state && Number.isFinite(state.currentTime) && audio.duration) {
      if (Math.abs(audio.currentTime - state.currentTime) > 0.25) {
        audio.currentTime = Math.min(state.currentTime, audio.duration);
      }
    }

    audio.volume = state && Number.isFinite(state.volume) ? state.volume : 0.7;

    const onInteraction = () => {
      startPlayback();
    };

    document.addEventListener('pointerdown', onInteraction, { once: true });
    document.addEventListener('touchstart', onInteraction, { once: true });
    document.addEventListener('keydown', onInteraction, { once: true });

    try {
      if (isLandingPage) {
        startPlayback();
      } else {
        startPlayback();
      }
    } catch (error) {
      // Autoplay may be blocked until the user interacts.
    }

    audio.addEventListener('timeupdate', () => {
      saveState(audio);
    });

    window.addEventListener('beforeunload', () => saveState(audio));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveState(audio);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
