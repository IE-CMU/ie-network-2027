import { gmailUser } from '@/utils/env'

import { type SendMessageData } from './engine'

export interface ConstructEmailDataParams {
  name: string
  recipientEmail: string
  subject: string
  message: string
  html?: string
}
export function _constructEmailData({
  name,
  recipientEmail,
  message,
  subject,
  html,
}: ConstructEmailDataParams): SendMessageData {
  const htmlContent = html
    ? html
    : `<h1>Dear ${name},</h1><p>${formatHTML(message)}</p><p>Best regards,<br>IE Network 2017 Committee</p>`

  return {
    from: gmailUser,
    to: recipientEmail,
    replyTo: gmailUser,
    subject: subject,
    text: message,
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
