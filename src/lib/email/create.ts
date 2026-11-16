// Type-only import: the web service must not load sent.ts, which requires
// the Gmail env.
import type { SendEmailPayload } from '@/lib/email/sent'

export interface CreateEmailParams {
  name: string
  recipientEmail: string
  subject: string
  message: string
  html?: string
}
export function createEmail({
  name,
  recipientEmail,
  message,
  subject,
  html,
}: CreateEmailParams): SendEmailPayload {
  const messageContent = `Dear ${name},\n\n${message}\n\nBest regards,\nIE Network 2027 Committee`
  const htmlContent = html
    ? html
    : `<p><b>Dear ${escapeHtml(name)},</b></p>${formatHTML(message)}<p>Best regards,<br>IE Network 2027 Committee</p>`
  // from/replyTo are filled in by the worker in sendEmail().
  return {
    to: recipientEmail,
    subject: subject,
    text: messageContent,
    html: htmlContent,
  }
}

function formatHTML(message: string) {
  return `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
