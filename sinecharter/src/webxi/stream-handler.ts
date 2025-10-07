

/**
 * Initialize a stream and start it. Returns the WebSocket URI for the stream.
 */
export async function setupStream(
  host: string,
  ip: string,
  sequenceID: number | number[],
  streamName: string
): Promise<string> {
  // Ensure sequenceID is an array
  const sequences = Array.isArray(sequenceID) ? sequenceID : [sequenceID];

  const body = {
    ConnectionType: "WebSocket",
    Sequences: sequences,
    MessageTypes: ["SequenceData"],
    Name: streamName,
  };

  const response = await fetch(`${host}/WebXi/Streams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("Response:", response.status);

  if (response.status !== 201) {
    const text = await response.text();
    console.error(text);
    throw new Error(
      "Cannot start stream, possibly due to too many open streams on the device."
    );
  }

  const json = (await response.json()) as { URI: string[] };
  return `ws://${'10.42.0.1'}${json.URI[0]}`;
}

/**
 * Find the ID of a specific stream by its name.
 */
export async function getStreamID(
  host: string,
  streamName: string
): Promise<number | undefined> {
  const response = await fetch(`${host}/WebXi/Streams?recursive`);
  const streams = (await response.json()) as Record<string, any>;

  let count = 0;
  for (const subtree of Object.values(streams)) {
    count++;
    if ((subtree as any).Name === streamName) {
      return count;
    }
  }
  return undefined;
}

/**
 * Convert byte data retrieved from BK2245 to Int16 or BKTimeSpan format.
 */
export function dataTypeConv(dataType: string, value: ArrayBuffer, vectorLength?: number): number | number[] {
  const view = new DataView(value);
  const byteLength = view.byteLength;

  if (dataType === "Int16") {
    if (!vectorLength) {
      if (byteLength < 2) {
        console.warn("⚠️ Not enough bytes for Int16:", byteLength);
        return 0;
      }
      return view.getInt16(0, true);
    }

    const safeLength = Math.floor(byteLength / 2);
    const count = Math.min(vectorLength, safeLength);
    const values: number[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * 2;
      values.push(view.getInt16(offset, true));
    }

    if (count < vectorLength) {
      console.warn(
        `⚠️ Truncated Int16 array: expected ${vectorLength}, got ${count}`
      );
    }

    return values;
  }

  return [];
}
