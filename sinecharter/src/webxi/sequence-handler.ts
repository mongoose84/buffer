

/**
 * Recursively search for a sequence by its numeric or string ID.
 */
export function findSequence(sequenceId: string | number, sequences: Record<string, any>): any | null {
  let result: any | null = null;

  if (typeof sequences !== "object" || sequences === null) return null;

  const idStr = String(sequenceId);
  if (idStr in sequences) {
    return sequences[idStr];
  }

  for (const [, subseq] of Object.entries(sequences)) {
    if (typeof subseq === "object") {
      result = findSequence(sequenceId, subseq);
      if (result !== null) return result;
    }
  }

  return null;
}

/**
 * Recursively search for a sequence by its Name field.
 * Returns the sequence ID (as a number) if found, otherwise undefined.
 */
export function findSequenceByName(sequenceName: string, sequences: Record<string, any>): number | undefined {
  if (typeof sequences !== "object" || sequences === null) return undefined;

  if ("Name" in sequences && sequences["Name"] === sequenceName) {
    return undefined; // direct name match found, parent will handle ID
  }

  for (const [count, subtree] of Object.entries(sequences)) {
    const test = findSequenceByName(sequenceName, subtree as Record<string, any>);
    if (typeof test === "boolean" && test) return parseInt(count);
    if (typeof test === "number") return test;
  }

  return undefined;
}

/**
 * Fetch the full sequence list from the device and locate the one matching ID.
 * Throws an error if the sequence doesn’t exist.
 */
export async function getSequence(hostID: string, ID: number | string): Promise<[number | string, any]> {
  const url = `${hostID}/webxi/sequences?recursive`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sequences from ${url}: ${response.status} ${response.statusText}`);
  }

  // ✅ FIX: explicitly type the result of .json()
  const sequences = (await response.json()) as Record<string, any>;
  const sequence = findSequence(ID, sequences);

  if (sequence === null) {
    throw new Error(`No such sequence: ${ID}`);
  }

  console.log("Found sequence:", sequence);
  return [ID, sequence];
}
