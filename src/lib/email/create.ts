import { type SendEmailPayload } from '@/lib/email/sent'
import { gmailUser } from '@/utils/env'

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
  const messageContent = `Dear ${name},\n\n${message}\n\nBest regards,\nIE Network 2017 Committee`
  const htmlContent = html
    ? html
    : `<h1>Dear ${name},</h1><p>${formatHTML(message)}</p><p>Best regards,<br>IE Network 2017 Committee</p>`
  return {
    from: gmailUser,
    to: recipientEmail,
    replyTo: gmailUser,
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
