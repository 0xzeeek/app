import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const IV_LENGTH = 16;

export function encryptPassword(password: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"), // explicitly decode Base64
    iv
  );
  const encrypted = Buffer.concat([cipher.update(password), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decodePassword(hash: string) {
  const [iv, encrypted] = hash.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"), // explicitly decode Base64
    Buffer.from(iv, "hex")
  );
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]);
  return decrypted.toString();
}
