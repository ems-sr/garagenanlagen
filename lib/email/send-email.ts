import { getTransport } from './transport';

export type SendEmailInput = { to: string; subject: string; text: string };
export type SendEmailResult = { success: true } | { success: false; error: string };

// The one low-level SMTP send point for the whole app — lib/email/send-
// correspondence.ts is the only current caller, but any future transactional
// email (e.g. auth notifications) should go through this too rather than
// opening a second transport.
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const transport = getTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler beim E-Mail-Versand.' };
  }
}
