// Standalone Gmail test: builds its own transporter so it can be run without
// the queue or the worker. Auth matches src/lib/email/sent.ts (App Password).
import { requireGmailEnv } from '@utils/env'
import nodemailer from 'nodemailer'

const gmail = requireGmailEnv()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmail.gmailUser,
    pass: gmail.gmailAppPassword,
  },
})

export async function sendEmail({
  name,
  recipientEmail,
  message,
}: {
  name: string
  recipientEmail: string
  message: string
}) {
  try {
    await transporter.sendMail({
      from: gmail.gmailUser,
      to: recipientEmail,
      replyTo: gmail.gmailUser,
      subject: `Test Email from IE Network 2027`,
      text: `Dear ${name},\n\n${message}\n\nBest regards,\nIE Network 2027 Committee`,
      html: `
        <p><b>Dear ${escapeHtml(name)},</b></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        <p>Best regards,<br>IE Network 2027 Committee</p>
      `,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to send email: ${reason}`, { cause: error })
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
