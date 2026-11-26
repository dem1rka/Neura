import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import manifest from "../src/features/mri/demo-manifest.json";
import functional from "../src/features/mri/fmri-demo-manifest.json";
import { createMRIId } from "../src/features/mri/files";
import { loadDemoScan } from "../src/features/mri/demo";

afterEach(() => vi.unstubAllGlobals());

describe("built-in MRI demo", () => {
  it("ships a complete 12-frame NYU series with the original TR", async () => {
    const compressed = readFileSync(resolve(process.env.NEURA_DEMO_DIR!,functional.file));
    const raw = gunzipSync(compressed);
    expect(compressed.length).toBe(functional.compressedBytes);
    expect(raw.length).toBe(functional.originalBytes);
    expect(raw.readInt16LE(40)).toBe(4);
    expect([42, 44, 46, 48].map(offset => raw.readInt16LE(offset))).toEqual(functional.dimensions);
    expect(raw.readFloatLE(92)).toBe(2);
    expect(raw.length).toBe(352 + 64 * 80 * 33 * 12 * 4);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(functional.originalSha256);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(compressed)));
    expect((await loadDemoScan(new AbortController().signal, true)).name).toBe(functional.file);
  });
  it("ships the complete, losslessly compressed user-provided NIfTI", () => {
    const compressed = readFileSync(
      resolve(process.env.NEURA_DEMO_DIR!,manifest.file),
    );
    const original = gunzipSync(compressed);
    expect(compressed.length).toBe(manifest.compressedBytes);
    expect(original.length).toBe(manifest.originalBytes);
    expect(createHash("sha256").update(original).digest("hex")).toBe(
      manifest.originalSha256,
    );
    expect(original.readInt32LE(0)).toBe(348);
    expect([42, 44, 46].map((offset) => original.readInt16LE(offset))).toEqual(
      manifest.dimensions,
    );
  });

  it("rejects an HTML fallback instead of adding a broken demo entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<!doctype html>")),
    );
    const signal = new AbortController().signal;
    await expect(loadDemoScan(signal)).rejects.toThrow(
      "Incomplete demo download",
    );
    expect(fetch).toHaveBeenCalledWith("/api/materials/demo/mprage.nii.gz", { signal });
  });

  it("creates MRI IDs on HTTP LAN origins without randomUUID", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    const first = createMRIId();
    expect(first).toMatch(/^[a-f\d]{32}$/);
    expect(createMRIId()).not.toBe(first);
  });

  it.each([false, true])(
    "accepts the demo with HTTP decoding = %s",
    async (decoded) => {
      const compressed = readFileSync(
        resolve(process.env.NEURA_DEMO_DIR!,manifest.file),
      );
      const bytes = decoded ? gunzipSync(compressed) : compressed;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes)));
      const file = await loadDemoScan(new AbortController().signal);
      expect(file.name).toBe(decoded ? "mprage.nii" : "mprage.nii.gz");
      expect(file.size).toBe(
        decoded ? manifest.originalBytes : manifest.compressedBytes,
      );
    },
  );
});
