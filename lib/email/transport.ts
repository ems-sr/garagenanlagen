import nodemailer, { type Transporter } from 'nodemailer';

let cached: Transporter | null = null;

// Lazily built and cached — most requests never send an email, so this
// avoids opening an SMTP connection pool at module load for every request.
// Throws with a clear message when SMTP isn't configured (dev environments
// without real credentials) rather than letting nodemailer fail opaquely;
// callers (lib/email/send-email.ts) catch this and log it as a failed
// CorrespondenceLog row instead of crashing the request.
export function getTransport(): Transporter {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (!host || !port) {
    throw new Error('SMTP ist nicht konfiguriert (SMTP_HOST/SMTP_PORT fehlen).');
  }

  cached = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  return cached;
}
