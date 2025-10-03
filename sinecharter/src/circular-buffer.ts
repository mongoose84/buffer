/** Simple auto‑locking circular buffer for Float64 values. */
export class CircularBuffer {
  private readonly data: Float64Array;
  private writeIdx = 0;
  private count = 0;
  private locked = false;

  constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('capacity must be a positive integer');
    }
    this.data = new Float64Array(capacity);
  }

  private lock() {
    if (this.locked) throw new Error('internal lock already held');
    this.locked = true;
  }
  private unlock() {
    this.locked = false;
  }
  private assertLocked() {
    if (!this.locked) throw new Error('internal error: expected lock');
  }

  /** Push an iterable of numbers; returns any overwritten values. */
  push(values: Iterable<number>): number[] {
    console.log('Pushing', values);
    this.lock();
    const overwritten: number[] = [];
    try {
      this.assertLocked();
      for (const v of values) {
        if (this.isFull) overwritten.push(this.data[this.writeIdx]);
        this.data[this.writeIdx] = v;
        this.writeIdx = (this.writeIdx + 1) % this.capacity;
        if (this.count < this.capacity) this.count++;
      }
      return overwritten;
    } finally {
      this.unlock();
    }
  }

  /** Return the buffer contents in chronological order. */
  read(): number[] {
    this.lock();
    try {
      this.assertLocked();
      const out = new Array(this.count);
      const start = (this.writeIdx - this.count + this.capacity) % this.capacity;
      for (let i = 0; i < this.count; i++) {
        out[i] = this.data[(start + i) % this.capacity];
      }
      return out;
    } finally {
      this.unlock();
    }
  }

  /** Empty the buffer and return the removed data. */
  drain(): number[] {
    this.lock();
    try {
      const out = this.read();
      this.clear();
      return out;
    } finally {
      this.unlock();
    }
  }

  /** Reset counters (optionally zero the underlying storage). */
  clear(): void {
    this.lock();
    try {
      this.writeIdx = 0;
      this.count = 0;
      this.data.fill(0);
    } finally {
      this.unlock();
    }
  }

  get length(): number {
    return this.count;
  }
  private get isFull(): boolean {
    return this.count === this.capacity;
  }
}