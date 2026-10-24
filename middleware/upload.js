const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const folder = path.join(__dirname, "../uploads");
require("fs").mkdirSync(folder, { recursive: true });
const types = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};
const diskStorage = multer.diskStorage({
  destination: folder,
  filename: (req, file, callback) =>
    callback(
      null,
      crypto.randomUUID() + path.extname(file.originalname).toLowerCase(),
    ),
});

function uploader(allowPdf, count) {
  return multer({
    // Listing photos live in PostgreSQL, so buffer them in memory.
    // Application documents remain disk-backed and are served through the
    // existing authorization-checked download route.
    storage: allowPdf ? diskStorage : multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: count,
      fields: 12,
      fieldSize: 10000,
      parts: 25,
    },
    fileFilter: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (
        !types[extension] ||
        types[extension] !== file.mimetype ||
        (!allowPdf && extension === ".pdf")
      ) {
        return callback(
          Object.assign(
            new Error(
              "Use JPG, PNG or WebP images" +
                (allowPdf ? " or PDF documents." : "."),
            ),
            { status: 400 },
          ),
        );
      }
      callback(null, true);
    },
  });
}

async function validateFiles(req, res, next) {
  for (const file of req.files || []) {
    const buffer = file.buffer || (file.path ? await fs.readFile(file.path) : null);
    const extension = path.extname(file.originalname).toLowerCase();
    if (!buffer)
      throw Object.assign(new Error("The uploaded file could not be read."), { status: 400 });
    let valid = false;
    if (extension === ".jpg" || extension === ".jpeg")
      valid = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    if (extension === ".png")
      valid = buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (extension === ".webp")
      valid =
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";
    if (extension === ".pdf")
      valid = buffer.toString("ascii", 0, 5) === "%PDF-";
    if (!valid)
      throw Object.assign(
        new Error("A file does not match its declared type."),
        { status: 400 },
      );
  }
  next();
}

async function cleanup(req) {
  if (req.uploadSaved) return;
  for (const file of req.files || []) {
    if (file.path) await fs.unlink(file.path).catch(() => {});
  }
}

module.exports = {
  photos: uploader(false, 6).array("photos", 6),
  documents: uploader(true, 3).array("documents", 3),
  validateFiles,
  cleanup,
  folder,
};
