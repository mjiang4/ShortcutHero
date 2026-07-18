export type HitQuality = "good" | "perfect";

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const MIN_GAIN = 0.0001;

/**
 * Tiny, procedural sound engine for the game. It intentionally creates no
 * AudioContext until start() is called from a click or key handler.
 */
export class ShortcutHeroAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private ambientSources: AudioScheduledSourceNode[] = [];
  private ambientNodes: AudioNode[] = [];
  private muted = false;

  get isReady() {
    return this.context?.state === "running";
  }

  get isMuted() {
    return this.muted;
  }

  /** Call directly inside a user gesture handler. */
  async start(): Promise<boolean> {
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
    this.startAmbient();
    return true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.context || !this.master) return;

    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.72, now + 0.04);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playStart() {
    if (!this.canPlay()) return;
    [0, 0.09, 0.18].forEach((delay, index) => {
      this.tone({
        delay,
        duration: 0.22,
        from: [220, 277.18, 329.63][index],
        to: [277.18, 329.63, 440][index],
        volume: 0.065,
        type: "sine",
      });
    });
  }

  playHit(quality: HitQuality = "good") {
    if (!this.canPlay()) return;
    const perfect = quality === "perfect";

    this.tone({
      duration: perfect ? 0.25 : 0.18,
      from: perfect ? 523.25 : 440,
      to: perfect ? 783.99 : 587.33,
      volume: perfect ? 0.09 : 0.07,
      type: "sine",
    });

    if (perfect) {
      this.tone({
        delay: 0.035,
        duration: 0.2,
        from: 659.25,
        to: 987.77,
        volume: 0.045,
        type: "triangle",
      });
    }
  }

  playMiss() {
    if (!this.canPlay()) return;
    this.tone({
      duration: 0.24,
      from: 146.83,
      to: 92.5,
      volume: 0.065,
      type: "triangle",
    });
    this.noise(0.13, 0.025);
  }

  playCombo(combo: number) {
    if (!this.canPlay()) return;
    const step = Math.min(Math.max(combo, 0), 24);
    const root = 392 * 2 ** (step / 24);

    this.tone({
      duration: 0.2,
      from: root,
      to: root * 1.5,
      volume: 0.06,
      type: "sine",
    });
    this.tone({
      delay: 0.055,
      duration: 0.24,
      from: root * 1.25,
      to: root * 2,
      volume: 0.04,
      type: "triangle",
    });
  }

  stopAmbient() {
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
    this.stopAmbient();
    const context = this.context;

    this.master?.disconnect();
    this.ambientBus?.disconnect();
    this.effectsBus?.disconnect();
    this.context = null;
    this.master = null;
    this.ambientBus = null;
    this.effectsBus = null;

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

    master.gain.value = this.muted ? 0 : 0.72;
    ambientBus.gain.value = 0.55;
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
    if (!context || !destination || this.ambientSources.length > 0) return;

    const filter = context.createBiquadFilter();
    const pulse = context.createGain();
    const low = context.createOscillator();
    const fifth = context.createOscillator();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();

    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 0.55;
    pulse.gain.value = 0.009;
    low.type = "sine";
    low.frequency.value = 55;
    fifth.type = "sine";
    fifth.frequency.value = 82.5;
    lfo.type = "sine";
    lfo.frequency.value = 0.42;
    lfoDepth.gain.value = 0.006;

    low.connect(filter);
    fifth.connect(filter);
    filter.connect(pulse);
    pulse.connect(destination);
    lfo.connect(lfoDepth);
    lfoDepth.connect(pulse.gain);

    low.start();
    fifth.start();
    lfo.start();
    this.ambientSources = [low, fifth, lfo];
    this.ambientNodes = [filter, pulse, lfoDepth];
  }

  private canPlay(): boolean {
    return Boolean(
      !this.muted &&
        this.context?.state === "running" &&
        this.effectsBus,
    );
  }

  private tone({
    delay = 0,
    duration,
    from,
    to,
    volume,
    type,
  }: {
    delay?: number;
    duration: number;
    from: number;
    to: number;
    volume: number;
    type: OscillatorType;
  }) {
    const context = this.context;
    const destination = this.effectsBus;
    if (!context || !destination) return;

    const start = context.currentTime + delay;
    const end = start + duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, end);
    envelope.gain.setValueAtTime(MIN_GAIN, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
  }

  private noise(duration: number, volume: number) {
    const context = this.context;
    const destination = this.effectsBus;
    if (!context || !destination) return;

    const sampleCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const now = context.currentTime;

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 520;
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, now + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    source.start(now);
    source.stop(now + duration);
    source.addEventListener("ended", () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    });
  }
}
