/**
 * Incrementally extracts the value of one top-level string property from a JSON document
 * that is still being streamed. Lets the UI show the chef's reply as it is generated while
 * the full structured answer is validated only once complete.
 */
export class JsonStringFieldStream {
  private buffer = "";
  private state: "seek" | "value" | "done" = "seek";
  private cursor = 0;
  private readonly needle: string;

  constructor(field: string) {
    this.needle = `"${field}"`;
  }

  /** Feeds a raw chunk; returns newly decoded characters of the field (possibly empty). */
  push(chunk: string): string {
    if (this.state === "done") return "";
    this.buffer += chunk;

    if (this.state === "seek") {
      const at = this.buffer.indexOf(this.needle);
      if (at < 0) return "";
      const match = /^\s*:\s*"/.exec(this.buffer.slice(at + this.needle.length));
      if (!match) return "";
      this.cursor = at + this.needle.length + match[0].length;
      this.state = "value";
    }

    let out = "";
    while (this.cursor < this.buffer.length) {
      const ch = this.buffer[this.cursor]!;
      if (ch === '"') {
        this.state = "done";
        break;
      }
      if (ch !== "\\") {
        out += ch;
        this.cursor += 1;
        continue;
      }
      const next = this.buffer[this.cursor + 1];
      if (next === undefined) break; // escape split across chunks
      if (next === "u") {
        const hex = this.buffer.slice(this.cursor + 2, this.cursor + 6);
        if (hex.length < 4) break;
        const code = Number.parseInt(hex, 16);
        if (!Number.isNaN(code)) out += String.fromCharCode(code);
        this.cursor += 6;
        continue;
      }
      const map: Record<string, string> = { n: "\n", t: "\t", r: "", b: "", f: "", '"': '"', "\\": "\\", "/": "/" };
      out += map[next] ?? next;
      this.cursor += 2;
    }
    return out;
  }
}

/** Parses model output that should be JSON, tolerating code fences and surrounding prose. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model output is not valid JSON");
  }
}
