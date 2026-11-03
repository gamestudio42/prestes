export interface RNGState {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function splitmix32(value: number): number {
  let z = (value + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

/** Deterministic xoshiro128** stream. One instance is owned by the simulation. */
export class RNG {
  private readonly state: Uint32Array;

  constructor(seed = 1) {
    this.state = new Uint32Array(4);
    this.seed(seed);
  }

  seed(seed: number): void {
    let value = seed >>> 0;
    for (let index = 0; index < 4; index += 1) {
      value = splitmix32(value);
      this.state[index] = value;
    }
  }

  nextUint32(): number {
    const s = this.state;
    const s0 = s[0] ?? 0;
    const s1 = s[1] ?? 0;
    const s2 = s[2] ?? 0;
    const s3 = s[3] ?? 0;

    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;

    s[2] = (s2 ^ s0) >>> 0;
    s[3] = (s3 ^ s1) >>> 0;
    s[1] = (s1 ^ (s[2] ?? 0)) >>> 0;
    s[0] = (s0 ^ (s[3] ?? 0)) >>> 0;
    s[2] = ((s[2] ?? 0) ^ t) >>> 0;
    s[3] = rotl(s[3] ?? 0, 11);

    return result;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  getState(): RNGState {
    return {
      s0: this.state[0] ?? 0,
      s1: this.state[1] ?? 0,
      s2: this.state[2] ?? 0,
      s3: this.state[3] ?? 0,
    };
  }

  setState(state: RNGState): void {
    this.state[0] = state.s0 >>> 0;
    this.state[1] = state.s1 >>> 0;
    this.state[2] = state.s2 >>> 0;
    this.state[3] = state.s3 >>> 0;
  }

  clone(): RNG {
    const copy = new RNG(0);
    copy.setState(this.getState());
    return copy;
  }
}
