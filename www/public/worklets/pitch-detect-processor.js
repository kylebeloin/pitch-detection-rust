const options = {
  freqMin: 50,
  freqLow: 50,
  freqHigh: 200,
  freqMax: 500,
  freqRate: 100,
  sampleRate: 48000,
  enmax: 0.1,
  enmin: 0.5,
  disptime: 5,
  style: {
    BACKCOLOUR: "#fafafa",
    GRIDCOLOUR: "#DDDDDD",
    AMPCOLOUR: "#2a6cad",
    FREQCOLOUR: "#b8dcff",
    FREQWIDTH: 1,
    GRIDWIDTH: 3,
  },
};

class AutoCorrelation {
  constructor(freqMin, freqLow, freqHigh, freqMax, sampleRate) {
    this.sampleRate = sampleRate;
    this.tmin = Math.round(this.sampleRate / freqMax);
    this.tmax = Math.round(this.sampleRate / freqMin);
    this.bias = new Float32Array(this.tmax + 1);
    this.ac = new Float32Array(this.tmax + 1);
    const m = Math.log(freqLow);
    const B = m * m;
    const D = 1;
    const E = 0.95;
    const v = Math.log(freqHigh);
    const w = v * v;
    const o = 1;
    const x = 0.95;
    let G = (m + v) / 2;
    const F = G * G;
    const H = 1;
    const t = 1;
    const q =
      B * G * o + m * H * w + D * F * v - D * G * w - B * H * v - m * F * o;
    const y =
      E * G * o + m * H * x + D * t * v - D * G * x - E * H * v - m * t * o;
    const J =
      B * t * o + E * H * w + D * F * x - D * t * w - B * H * x - E * F * o;
    const I =
      B * G * x + m * t * w + E * F * v - E * G * w - B * t * v - m * F * x;
    for (let r = this.tmin - 1; r <= this.tmax; r++) {
      G = Math.log(this.sampleRate / r);
      this.bias[r] = (G * G * y) / q + (G * J) / q + I / q;
    }
    this.calculateFrequency = function (a, O) {
      let Q = 0;
      for (let j = 0; j < O; j++) {
        Q += a[j] * a[j];
      }
      Q = Math.sqrt(Q / O);
      for (let f = this.tmin - 1; f <= this.tmax; f++) {
        let T = 0;
        let R = 0;
        let S = 0;
        for (let j = 0; j < O - f; j++) {
          S += a[j] * a[j + f];
          T += a[j] * a[j];
          R += a[j + f] * a[j + f];
        }
        this.ac[f] = (this.bias[f] * S) / Math.sqrt(T * R);
      }
      let N = this.tmin - 1;
      let d = this.ac[N];
      for (let f = this.tmin; f <= this.tmax; f++) {
        if (this.ac[f] > d) {
          d = this.ac[f];
          N = f;
        }
      }
      if (N <= this.tmin + 1 || N >= this.tmax - 1 || d < 0.5) {
        return { fx: 0, tx: N / this.sampleRate, vs: d, en: Q };
      }
      let K = this.ac[N - 1];
      let P = this.ac[N];
      let l = this.ac[N + 1];
      let g = (0.5 * (l - K)) / (2 * P - K - l);
      let h = N + g;
      let b = 2;
      if (d > 0.9) {
        for (let L = b; L > 1; L--) {
          let e = true;
          for (let M = 1; M < L; M++) {
            let c = Math.round((M * h) / L);
            if (this.ac[c] < 0.9 * d) {
              e = false;
            }
          }
          if (e) {
            h = h / L;
            break;
          }
        }
      }
      return { tx: h / this.sampleRate, fx: this.sampleRate / h, vs: d, en: Q };
    };
  }
}

const processAudio = (view) => {
  const { freqMin, freqLow, freqHigh, freqMax, sampleRate } = options;
  let autoCorrelator = new AutoCorrelation(
    freqMin,
    freqLow,
    freqHigh,
    freqMax,
    sampleRate
  );

  let track = [];
  let animationLength = options.sampleRate / 20;
  let animationBuff = new Float32Array(animationLength);
  let animationPosition = 0;
  let enmin = 0.5;
  let enmax = 0.1;
  for (let i = 0; i < view.length; i++) {
    animationBuff[animationPosition++] = view[i].valueOf();
    if (animationPosition === animationLength) {
      let fxest = autoCorrelator.calculateFrequency(
        animationBuff,
        animationLength
      );

      if (fxest.en > 0) {
        enmin = fxest.en < enmin ? fxest.en : 0.99 * enmin + 0.01 * fxest.en;
        enmax = fxest.en > enmax ? fxest.en : 0.99 * enmax + 0.01 * fxest.en;
      }
      //					console.log("enmin="+enmin+" enmax="+enmax+" en="+fxest.en);
      fxest.en > 0.1 * enmax
        ? track.push([fxest.fx, fxest.en / enmax, fxest.vs])
        : track.push([0, 0, 0]);
      // stop after one screen in mode 2
      // shift analysis buffer by 10ms
      let j;
      for (
        animationPosition = 0, j = animationLength / 3;
        j < animationLength;
        j++, animationPosition++
      )
        animationBuff[animationPosition] = animationBuff[j];
    }
  }
  console.log(track);
  return track;
};

class PitchDetectProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
    this.port.onmessageerror = this.handleMessageError.bind(this);

    this.samples = [];
    this.track = [];
  }

  handleMessage(event) {
    const { data } = event;
    const { type, view } = data;
    switch (type) {
      case "process":
        const track = processAudio(view);

        this.port.postMessage({ type: "processed", payload: { track } });
        this.track = [...this.track, track];
        break;
      case "stop":
        this.port.postMessage({
          type: "stopped",
          payload: { track: this.track },
        });
      default:
        console.log("Unknown message type");
        break;
    }
  }

  handleMessageError(event) {
    console.log("Message error", event);
  }
  // jsdocs for process params
  process(inputs, outputs, parameters) {
    // console.log(inputs[0][0]);
    this.samples = [...this.samples, ...inputs[0][0]];
    if (this.samples.length > options.sampleRate / 20) {
      this.port.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "process",
            view: [...this.samples],
          },
        })
      );
      this.samples = [];
    }

    return true;
  }
}

registerProcessor("pitch-detect-processor", PitchDetectProcessor);
