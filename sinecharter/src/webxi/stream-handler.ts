

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
export function dataTypeConv(
  dataType: "Int16" | "BKTimeSpan",
  value: Uint8Array,
  vectorLength?: number
): number | number[] {
  if (dataType === "Int16") {
    if (vectorLength == null) {
      return new DataView(value.buffer).getInt16(0, true);
    } else {
      const valueArray: number[] = [];
      for (let i = 0; i < vectorLength * 2; i += 2) {
        const intVal = new DataView(value.buffer).getInt16(i, true);
        valueArray.push(intVal);
      }
      return valueArray;
    }
  } else if (dataType === "BKTimeSpan") {
    const offset = value.length - 4;
    return new DataView(value.buffer).getInt32(offset, true);
  }

  throw new Error(`Unsupported data type: ${dataType}`);
}
