

/**
 * Starts or pauses a measurement.
 * If trying to start a measurement that is already running, or pause one that is already paused,
 * this function does nothing.
 *
 * @param hostID - The base URL of the device (e.g. "http://192.168.1.10")
 * @param start - True to start, False to pause
 */
export async function startPauseMeasurement(hostID: string, start: boolean): Promise<void> {
  const stateUrl = `${hostID}/webxi/Applications/SLM/State`;
  const actionUrl = `${hostID}/WebXi/Applications/SLM?Action=StartPause`;

  // Fetch current measurement state
  const stateResponse = await fetch(stateUrl);
  const currentState = await stateResponse.json();

  console.log("Current SLM State:", currentState);

  const isRunning = currentState === "Running";

  // Decide whether to send StartPause
  if ((start && !isRunning) || (!start && isRunning)) {
    const response = await fetch(actionUrl, { method: "PUT" });

    if (response.status !== 200) {
      const text = await response.text();
      throw new Error(`Failed to toggle Start/Pause: ${response.status} - ${text}`);
    }
  } else {
    console.log("No action taken — state already matches desired condition.");
  }
}

/**
 * Stops a measurement on the device.
 *
 * @param hostID - The base URL of the device (e.g. "http://192.168.1.10")
 */
export async function stopMeasurement(hostID: string): Promise<void> {
  const stopUrl = `${hostID}/WebXi/Applications/SLM?Action=Stop`;

  const response = await fetch(stopUrl, { method: "PUT" });

  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`Failed to stop measurement: ${response.status} - ${text}`);
  }
}
