export type HitQuality = "early" | "good" | "perfect" | "late";
export type AudioTempo = "relaxed" | "standard" | "turbo" | number;

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type ToneOptions = {
  at?: number;
  delay?: number;
  duration: number;
  from: number;
  to: number;
  volume: number;
  type: OscillatorType;
  attack?: number;
  destination?: "music" | "effects";
  transport?: boolean;
};

type NoiseOptions = {
  at?: number;
  delay?: number;
  duration: number;
  volume: number;
  frequency?: number;
  filter?: BiquadFilterType;
  destination?: "music" | "effects";
  transport?: boolean;
};

const MIN_GAIN = 0.0001;
const MASTER_GAIN = 0.76;
const MUSIC_GAIN = 0.62;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const SCHEDULER_INTERVAL_MS = 25;
const TEMPO_BPM = {
  relaxed: 140,
  standard: 180,
  turbo: 220,
} as const;

function resolveTempo(tempo: AudioTempo): number {
  if (typeof tempo === "number") return Math.min(220, Math.max(80, tempo));
  return TEMPO_BPM[tempo];
}

/**
 * Procedural rhythm-game audio. No AudioContext is created until start() is
 * called from a click or key handler, keeping browser autoplay behavior safe.
 */
export class ShortcutHeroAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private ambientSources: AudioScheduledSourceNode[] = [];
  private ambientNodes: AudioNode[] = [];
  private transportSources = new Set<AudioScheduledSourceNode>();
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private nextStepAt = 0;
  private transportStep = 0;
  private bpm: number = TEMPO_BPM.standard;
  private muted = false;
  private hitStreak = 0;

  get isReady() {
    return this.context?.state === "running";
  }

  get isMuted() {
    return this.muted;
  }

  /** Call directly inside a user gesture handler. */
  async unlock(): Promise<boolean> {
    const context = this.ensureContext();
    if (!context) return false;

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    if (context.state !== "running") return false;
    return true;
  }

  /** Starts the procedural score after the render scene is ready. */
  async start(tempo?: AudioTempo): Promise<boolean> {
    if (tempo !== undefined) this.setTempo(tempo);
    if (!(await this.unlock())) return false;
    this.startAmbient();
    return true;
  }

  setTempo(tempo: AudioTempo) {
    const nextBpm = resolveTempo(tempo);
    if (nextBpm === this.bpm) return;
    this.bpm = nextBpm;

    if (this.scheduler && this.context?.state === "running") {
      this.restartTransport(0.035);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.context || !this.master) return;

    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_GAIN, now + 0.04);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Re-establishes the downbeat when gameplay begins after its count-in. */
  playStart() {
    if (!this.canPlay()) return;
    this.hitStreak = 0;
    this.restartTransport(0.025);

    [0, 0.075, 0.15].forEach((delay, index) => {
      this.tone({
        delay,
        duration: 0.19,
        from: [261.63, 329.63, 392][index],
        to: [329.63, 392, 523.25][index],
        volume: 0.075,
        type: index === 2 ? "triangle" : "sine",
      });
    });
    this.noise({
      delay: 0.15,
      duration: 0.055,
      volume: 0.038,
      frequency: 6200,
      filter: "highpass",
    });
  }

  playHit(quality: HitQuality = "good", combo?: number) {
    if (!this.canPlay()) return;
    this.hitStreak = combo ?? this.hitStreak + 1;
    const lift = Math.min(12, Math.floor(Math.max(0, this.hitStreak - 1) / 3) * 2);
    const transpose = 2 ** (lift / 12);

    this.duckMusic(quality === "perfect" ? 0.2 : 0.28, 0.11);
    this.noise({
      duration: quality === "perfect" ? 0.065 : 0.04,
      volume: quality === "perfect" ? 0.048 : 0.03,
      frequency: quality === "late" ? 1800 : 4800,
      filter: "highpass",
    });

    if (quality === "perfect") {
      this.tone({
        duration: 0.095,
        from: 132,
        to: 58,
        volume: 0.07,
        type: "sine",
        attack: 0.003,
      });
      this.tone({
        duration: 0.24,
        from: 659.25 * transpose,
        to: 987.77 * transpose,
        volume: 0.11,
        type: "sine",
        attack: 0.004,
      });
      this.tone({
        delay: 0.018,
        duration: 0.28,
        from: 830.61 * transpose,
        to: 1318.51 * transpose,
        volume: 0.052,
        type: "triangle",
      });
    } else if (quality === "early") {
      this.tone({
        duration: 0.15,
        from: 392 * transpose,
        to: 523.25 * transpose,
        volume: 0.078,
        type: "triangle",
      });
      this.tone({
        delay: 0.025,
        duration: 0.12,
        from: 493.88 * transpose,
        to: 587.33 * transpose,
        volume: 0.034,
        type: "sine",
      });
    } else if (quality === "late") {
      this.tone({
        duration: 0.18,
        from: 440 * transpose,
        to: 349.23 * transpose,
        volume: 0.075,
        type: "triangle",
      });
      this.tone({
        delay: 0.03,
        duration: 0.13,
        from: 329.63 * transpose,
        to: 293.66 * transpose,
        volume: 0.03,
        type: "sine",
      });
    } else {
      this.tone({
        duration: 0.19,
        from: 523.25 * transpose,
        to: 698.46 * transpose,
        volume: 0.088,
        type: "sine",
      });
      this.tone({
        delay: 0.022,
        duration: 0.18,
        from: 659.25 * transpose,
        to: 783.99 * transpose,
        volume: 0.036,
        type: "triangle",
      });
    }

    if (this.hitStreak > 0 && this.hitStreak % 4 === 0) {
      this.tone({
        delay: 0.045,
        duration: 0.31,
        from: 783.99 * transpose,
        to: 1567.98 * transpose,
        volume: 0.041,
        type: "sine",
      });
    }
  }

  playMiss() {
    if (!this.canPlay()) return;
    this.hitStreak = 0;
    this.duckMusic(0.16, 0.2);
    this.tone({
      duration: 0.28,
      from: 174.61,
      to: 73.42,
      volume: 0.085,
      type: "sawtooth",
      attack: 0.004,
    });
    this.tone({
      delay: 0.035,
      duration: 0.2,
      from: 116.54,
      to: 82.41,
      volume: 0.048,
      type: "triangle",
    });
    this.noise({
      duration: 0.16,
      volume: 0.035,
      frequency: 720,
      filter: "lowpass",
    });
  }

  playCombo(combo: number) {
    if (!this.canPlay()) return;
    this.hitStreak = Math.max(this.hitStreak, combo);
    const tier = Math.min(3, Math.floor(Math.max(combo, 1) / 3));
    const root = 392 * 2 ** (tier / 12);

    [1, 1.25, 1.5].forEach((interval, index) => {
      this.tone({
        delay: index * 0.052,
        duration: 0.24 + index * 0.025,
        from: root * interval,
        to: root * interval * (index === 2 ? 2 : 1.5),
        volume: 0.058 - index * 0.008,
        type: index === 1 ? "triangle" : "sine",
      });
    });
    this.noise({
      delay: 0.1,
      duration: 0.1,
      volume: 0.026 + tier * 0.006,
      frequency: 5200,
      filter: "highpass",
    });
  }

  /** Stops the musical transport without closing the user-authorized context. */
  pause() {
    this.stopAmbient();
  }

  stop() {
    this.stopAmbient();
    this.hitStreak = 0;
  }

  /** Kept public for compatibility with the original audio hook. */
  stopAmbient() {
    this.stopTransport();
    for (const source of this.ambientSources) {
      try {
        source.stop();
      } catch {
        // A source can already be stopped during teardown.
      }
      source.disconnect();
    }
    for (const node of this.ambientNodes) node.disconnect();
    this.ambientSources = [];
    this.ambientNodes = [];
  }

  async destroy() {
    this.stop();
    const context = this.context;

    this.master?.disconnect();
    this.ambientBus?.disconnect();
    this.effectsBus?.disconnect();
    this.context = null;
    this.master = null;
    this.ambientBus = null;
    this.effectsBus = null;
    this.noiseBuffer = null;

    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // Closing is best-effort during component unmount.
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;

    const browserWindow = window as BrowserWindow;
    const AudioContextClass =
      browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const master = context.createGain();
    const ambientBus = context.createGain();
    const effectsBus = context.createGain();

    master.gain.value = this.muted ? 0 : MASTER_GAIN;
    ambientBus.gain.value = MUSIC_GAIN;
    effectsBus.gain.value = 1;
    ambientBus.connect(master);
    effectsBus.connect(master);
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    this.ambientBus = ambientBus;
    this.effectsBus = effectsBus;
    return context;
  }

  private startAmbient() {
    const context = this.context;
    const destination = this.ambientBus;
    if (!context || !destination) return;

    if (this.ambientSources.length === 0) {
      const filter = context.createBiquadFilter();
      const bed = context.createGain();
      const low = context.createOscillator();
      const fifth = context.createOscillator();

      filter.type = "lowpass";
      filter.frequency.value = 270;
      filter.Q.value = 0.7;
      bed.gain.value = 0.018;
      low.type = "sine";
      low.frequency.value = 55;
      fifth.type = "triangle";
      fifth.frequency.value = 82.5;

      low.connect(filter);
      fifth.connect(filter);
      filter.connect(bed);
      bed.connect(destination);
      low.start();
      fifth.start();
      this.ambientSources = [low, fifth];
      this.ambientNodes = [filter, bed];
    }

    this.startTransport();
  }

  private startTransport(delay = 0.035) {
    const context = this.context;
    if (!context || this.scheduler) return;

    this.transportStep = 0;
    this.nextStepAt = context.currentTime + delay;
    this.scheduleTransport();
    this.scheduler = setInterval(
      () => this.scheduleTransport(),
      SCHEDULER_INTERVAL_MS,
    );
  }

  private restartTransport(delay = 0.035) {
    if (!this.context || this.ambientSources.length === 0) return;
    this.stopTransport();
    this.startTransport(delay);
  }

  private stopTransport() {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }

    for (const source of this.transportSources) {
      try {
        source.stop();
      } catch {
        // The source may have naturally ended between scheduling and teardown.
      }
    }
    this.transportSources.clear();
    this.transportStep = 0;
    this.nextStepAt = 0;
  }

  private scheduleTransport() {
    const context = this.context;
    if (!context || context.state !== "running") return;

    while (this.nextStepAt < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.scheduleStep(this.nextStepAt, this.transportStep);
      this.nextStepAt += 30 / this.bpm;
      this.transportStep = (this.transportStep + 1) % 8;
    }
  }

  private scheduleStep(at: number, step: number) {
    const quarter = step % 2 === 0;
    const downbeat = step === 0;

    this.noise({
      at,
      duration: downbeat ? 0.045 : 0.026,
      volume: downbeat ? 0.025 : step % 2 === 0 ? 0.016 : 0.011,
      frequency: downbeat ? 5000 : 7200,
      filter: "highpass",
      destination: "music",
      transport: true,
    });

    if (!quarter) return;

    this.tone({
      at,
      duration: downbeat ? 0.15 : 0.1,
      from: downbeat ? 128 : 104,
      to: 48,
      volume: downbeat ? 0.085 : 0.048,
      type: "sine",
      attack: 0.002,
      destination: "music",
      transport: true,
    });

    const bassNotes = [55, 82.5, 65.41, 82.5];
    const note = bassNotes[Math.floor(step / 2)];
    this.tone({
      at: at + 0.008,
      duration: Math.min(0.19, 42 / this.bpm),
      from: note,
      to: note * 0.997,
      volume: downbeat ? 0.036 : 0.023,
      type: "triangle",
      attack: 0.006,
      destination: "music",
      transport: true,
    });
  }

  private duckMusic(level: number, release: number) {
    const context = this.context;
    const bus = this.ambientBus;
    if (!context || !bus) return;
    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(level, now + 0.008);
    bus.gain.exponentialRampToValueAtTime(MUSIC_GAIN, now + release);
  }

  private canPlay(): boolean {
    return Boolean(
      !this.muted &&
        this.context?.state === "running" &&
        this.effectsBus,
    );
  }

  private tone({
    at,
    delay = 0,
    duration,
    from,
    to,
    volume,
    type,
    attack = 0.008,
    destination = "effects",
    transport = false,
  }: ToneOptions) {
    const context = this.context;
    const output = destination === "music" ? this.ambientBus : this.effectsBus;
    if (!context || !output) return;

    const start = (at ?? context.currentTime) + delay;
    const end = start + duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, from), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), end);
    envelope.gain.setValueAtTime(MIN_GAIN, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    oscillator.stop(end + 0.02);

    if (transport) this.transportSources.add(oscillator);
    oscillator.addEventListener("ended", () => {
      this.transportSources.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    });
  }

  private noise({
    at,
    delay = 0,
    duration,
    volume,
    frequency = 1800,
    filter: filterType = "lowpass",
    destination = "effects",
    transport = false,
  }: NoiseOptions) {
    const context = this.context;
    const output = destination === "music" ? this.ambientBus : this.effectsBus;
    if (!context || !output) return;

    if (!this.noiseBuffer) {
      const sampleCount = Math.ceil(context.sampleRate * 0.25);
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const start = (at ?? context.currentTime) + delay;

    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.start(start);
    source.stop(start + duration);

    if (transport) this.transportSources.add(source);
    source.addEventListener("ended", () => {
      this.transportSources.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    });
  }
}
