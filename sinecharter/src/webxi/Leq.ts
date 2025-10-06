
/**
 * Configure the SLM (BK2245) for LAeq measurement.
 * This enables logging mode, free-run, A-weighting, and LAeq mode.
 */
export async function SLM_Setup_LAeq(host: string): Promise<void> {
  // Enable logging mode
  console.log('Enabling logging mode...');
  const url = `${host}/webxi/Applications/SLM/Setup/ControlLoggingMode`;
    console.log('PUT', url);
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(1),
  });

  // Set the device in free-running mode
    console.log('Setting free-running mode...');
  await fetch(`${host}/webxi/Applications/SLM/Setup/ControlMeasurementTimeControl`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(0),
  });

  // Disable all other broadband weightings
  console.log('Disabling C, Z weightings...');
  const disableWeights = ["BBFreqWeightB", "BBFreqWeightC", "BBFreqWeightZ"];
  for (const w of disableWeights) {
    await fetch(`${host}/webxi/Applications/SLM/Setup/${w}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(false),
    });
  }

  // Enable A-weighting
  console.log('Enabling A-weighting...');
  await fetch(`${host}/webxi/Applications/SLM/Setup/BBFreqWeightA`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true),
  });

  // Enable LAeq mode
    console.log('Enabling LAeq mode...');
  await fetch(`${host}/webxi/applications/slm/setup/BBLAeq`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true),
  });
}

/**
 * Utility class for storing and calculating moving Leq values.
 * Maintains a sliding window of dB values and computes their combined Leq.
 */
export class MovingLeq {
  private windowLength: number;
  private leqWindow: number[];
  private oldestIndex = 0;
  private leqTotal = 0;
  private windowFull = false;
  private storeData: boolean;
  private rawData?: LeqData;
  private leqData?: LeqData;

  constructor(windowLengthSec: number, storeData = false, windowSize?: number) {
    this.windowLength = windowLengthSec;
    const ws = windowSize ?? this.windowLength * 10 + 1;

    this.leqWindow = Array(this.windowLength).fill(NaN);
    this.storeData = storeData;

    if (this.storeData) {
      this.rawData = new LeqData(ws);
      this.leqData = new LeqData(ws);
    }
  }

  /** Compute combined Leq over the given window. */
  private totalLeq(window: number[]): number {
    const validValues = window.filter((v) => !Number.isNaN(v));
    if (validValues.length === 0) return NaN;
    const soundPa = validValues.reduce((sum, L) => sum + Math.pow(10, L / 10), 0) / validValues.length;
    return 10 * Math.log10(soundPa);
  }

  /**
   * Insert a new Leq value into the moving window and recompute total.
   * Returns the updated total Leq.
   */
  move(newValue: number): number {
    this.leqWindow[this.oldestIndex] = newValue;
    this.oldestIndex++;

    if (this.windowFull) {
      this.leqTotal = this.totalLeq(this.leqWindow);
      this.oldestIndex = this.oldestIndex % this.windowLength;
    } else {
      const partial = this.leqWindow.slice(0, this.oldestIndex);
      this.leqTotal = this.totalLeq(partial);
      this.oldestIndex = this.oldestIndex % this.windowLength;
      if (this.oldestIndex === this.windowLength - 1) this.windowFull = true;
    }

    if (this.storeData && this.rawData && this.leqData) {
      this.leqData.move(this.leqTotal);
      this.rawData.move(newValue);
    }

    return this.leqTotal;
  }

  /** Retrieve stored data for plotting (Leq or raw). */
  getPlotData(Leq: boolean): number[] {
    if (!this.storeData) return [];
    return Leq ? this.leqData!.getData() : this.rawData!.getData();
  }
}

/**
 * Helper class for maintaining a simple numeric ring buffer (used for plotting).
 */
export class LeqData {
  private leqWindow: number[];

  constructor(windowLength: number) {
    this.leqWindow = Array(windowLength).fill(NaN);
  }

  /** Push new value and shift window */
  move(newValue: number): void {
    this.leqWindow = [...this.leqWindow.slice(1), newValue];
  }

  /** Return full stored data */
  getData(): number[] {
    return this.leqWindow;
  }
}
