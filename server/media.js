"use strict";

const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const ffmpegStatic = require("ffmpeg-static");
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Every image we store is resized+re-encoded to JPEG at a small set of widths.
// The width is encoded as a `__<width>` suffix on the Cloudinary public_id, so
// the client can swap suffixes on an existing secure_url without any schema
// change. Rows written before this pipeline have no suffix, and the client
// helper leaves unsuffixed URLs untouched.
const FOLDER_WIDTHS = {
  "profile-pictures": [128, 512],
  "cover-photos": [640, 1400],
  "post-media": [360, 1080, 1600],
  "sparks": [360, 1080, 1600],
  "snaps": [360, 1080, 1600],
  "messages": [360, 1080, 1600],
  "discussion-media": [360, 1080, 1600],
  "textmob/groups": [360, 1080, 1600],
  "textmob/group_profiles": [128, 512],
};

const DEFAULT_WIDTHS = [360, 1080, 1600];

// Per-width JPEG quality. Small widths are shown at tiny physical sizes, so
// they can afford much lower quality than the full-size fallback.
const QUALITY_BY_WIDTH = {
  128: 72,
  360: 72,
  512: 78,
  640: 74,
  1080: 78,
  1400: 78,
  1600: 82,
  2400: 84,
};
const DEFAULT_QUALITY = 78;

const POSTER_WIDTH = 640;
const POSTER_QUALITY = 76;
const VIDEO_SIZE_LIMIT = 96 * 1024 * 1024;

function sniffKind(buf) {
  if (!buf || buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image";
  if (buf.toString("ascii", 0, 4) === "RIFF") {
    const fourcc = buf.toString("ascii", 8, 12);
    if (fourcc === "WEBP") return "image";
    if (fourcc === "AVI ") return "video";
    return null;
  }
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand && /^(heic|heix|hevc|hevx|mif1|msf1|avif|avis)$/.test(brand)) return "image";
    return "video";
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video";
  return null;
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
}

function suffixWidth(publicId) {
  const m = /__(\d+)$/.exec(publicId || "");
  return m ? Number(m[1]) : 0;
}

function widthsFor(folder) {
  return FOLDER_WIDTHS[folder] || DEFAULT_WIDTHS;
}

async function processImage(buffer, { folder, baseId, resource_type }) {
  const widths = widthsFor(folder);
  const image = sharp(buffer, { failOn: "none" }).rotate();

  const meta = await image.metadata().catch(() => null);
  const naturalWidth = meta && meta.width ? meta.width : Infinity;

  // Which widths are worth producing for this source. Anything wider than the
  // original would be an upscale, so it is skipped — unless it is the only
  // candidate, in which case we still want one small file. When a source falls
  // between two rungs (e.g. 700px against [360, 1080, 1600]) we also emit the
  // next rung up, re-encoded at the original size, so the URL ends up with a
  // suffix the client knows how to swap; without it the whole asset would be
  // served at its original, uncompressed size.
  const sorted = widths.slice().sort((a, b) => a - b);
  let targets = sorted.filter((w) => w <= naturalWidth);
  if (targets.length === 0) {
    targets = [sorted[0]];
  } else if (targets.length < 2) {
    const nextRung = sorted.find((w) => w > targets[0]);
    if (nextRung !== undefined && naturalWidth > targets[0]) targets.push(nextRung);
  }

  const uploads = [];
  for (const w of targets) {
    const q = QUALITY_BY_WIDTH[w] || DEFAULT_QUALITY;
    const out = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: w, withoutEnlargement: true, fit: "inside" })
      .jpeg({ quality: q, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: false })
      .toBuffer();

    const res = await uploadBuffer(out, {
      folder,
      public_id: baseId ? `${baseId}__${w}` : undefined,
      resource_type: "image",
      format: "jpg",
      overwrite: true,
      invalidate: true,
    });
    uploads.push({ width: w, result: res });
  }

  if (!uploads.length) throw new Error("image produced no variants");

  const largest = uploads[uploads.length - 1];
  return {
    secure_url: largest.result.secure_url,
    public_id: largest.result.public_id,
    resource_type: "image",
    bytes: largest.result.bytes,
    width: largest.result.width,
    height: largest.result.height,
    format: "jpg",
    variant_public_ids: uploads.map((u) => u.result.public_id),
  };
}

function runFfmpeg(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!ffmpegStatic) return reject(new Error("ffmpeg-static unavailable"));
    const child = spawn(ffmpegStatic, args, { windowsHide: true });
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill("SIGKILL"); } catch (_) {}
      reject(new Error("ffmpeg timeout"));
    }, timeoutMs);
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-400)}`));
    });
  });
}

async function extractPosterFrame(videoBuffer) {
  const stamp = crypto.randomBytes(6).toString("hex");
  const inPath = path.join(os.tmpdir(), `tm-vid-${stamp}.bin`);
  const outPath = path.join(os.tmpdir(), `tm-poster-${stamp}.jpg`);
  try {
    fs.writeFileSync(inPath, videoBuffer);
    // Output-side seeking so the demuxer can stream from a plain file while we
    // still grab a frame ~1s in instead of a black first frame.
    try {
      await runFfmpeg(
        ["-y", "-i", inPath, "-ss", "1", "-frames:v", "1", "-vf", `scale=${POSTER_WIDTH}:-2`, "-q:v", "4", outPath],
        45000
      );
    } catch (firstErr) {
      await runFfmpeg(
        ["-y", "-i", inPath, "-frames:v", "1", "-vf", `scale=${POSTER_WIDTH}:-2`, "-q:v", "4", outPath],
        45000
      ).catch(() => { throw firstErr; });
    }
    if (!fs.existsSync(outPath)) throw new Error("no poster frame");
    return { buffer: fs.readFileSync(outPath), cleanup: true };
  } finally {
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
  }
}

async function processVideo(buffer, { folder, baseId, resource_type }) {
  const raw = await uploadBuffer(buffer, {
    folder,
    ...(baseId ? { public_id: baseId } : {}),
    resource_type: resource_type === "image" ? "video" : (resource_type || "video"),
    overwrite: Boolean(baseId),
  });

  let poster_url = null;
  let poster_public_id = null;
  if (buffer.length <= VIDEO_SIZE_LIMIT) {
    try {
      const poster = await extractPosterFrame(buffer);
      const uploaded = await uploadBuffer(poster.buffer, {
        folder,
        public_id: `${raw.public_id}__poster`,
        resource_type: "image",
        format: "jpg",
        overwrite: true,
        invalidate: true,
      });
      poster_url = uploaded.secure_url;
      poster_public_id = uploaded.public_id;
    } catch (err) {
      console.warn("[media] poster extraction failed for", raw.public_id, err.message);
    }
  }

  return {
    secure_url: raw.secure_url,
    public_id: raw.public_id,
    resource_type: raw.resource_type || "video",
    bytes: raw.bytes,
    width: raw.width,
    height: raw.height,
    poster_url,
    poster_public_id,
  };
}

/**
 * Single entry point for every multipart upload in server.js.
 * Keeps the exact shape of a Cloudinary upload_stream result so call sites
 * keep reading `.secure_url` / `.public_id`, but images are resized + JPEG
 * encoded first and videos get a `__poster` companion image.
 */
async function uploadMedia(buffer, opts = {}) {
  const folder = opts.folder;
  const baseId = opts.public_id;
  const kind = sniffKind(buffer);

  if (kind === "image") {
    try {
      return await processImage(buffer, { folder, baseId, resource_type: opts.resource_type });
    } catch (err) {
      console.warn("[media] image pipeline failed, falling back to raw upload:", err.message);
      return uploadBuffer(buffer, {
        folder,
        ...(baseId ? { public_id: baseId } : {}),
        resource_type: opts.resource_type || "image",
      });
    }
  }

  return processVideo(buffer, {
    folder,
    baseId,
    resource_type: opts.resource_type || (kind === "video" ? "video" : "auto"),
  });
}

/**
 * Destroy a stored media record and every width variant of it. Passing the
 * largest variant's public_id (what we store) destroys the whole set.
 */
async function destroyMedia(publicId) {
  if (!publicId) return;
  const base = publicId.replace(/__\d+$/, "");
  const ids = [publicId];
  for (const w of [128, 360, 512, 640, 1080, 1400, 1600, 2400]) {
    ids.push(`${base}__${w}`);
  }
  if (!publicId.endsWith("__poster")) ids.push(`${base}__poster`);
  ids.push(base);
  for (const id of [...new Set(ids)]) {
    try {
      await cloudinary.uploader.destroy(id, { invalidate: true });
    } catch (_) {
      /* already gone */
    }
  }
}

module.exports = { uploadMedia, destroyMedia, sniffKind };
