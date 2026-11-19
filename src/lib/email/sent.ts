import { requireGmailEnv } from '@utils/env'
import nodemailer, { type SendMailOptions } from 'nodemailer'

export type SendEmailPayload = SendMailOptions

// Runs when the worker imports this module, so missing Gmail env stops the
// worker at startup instead of failing the first email job.
const gmail = requireGmailEnv()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  // auth: {
  //   type: 'OAuth2',
  //   user: gmail.gmailUser,
  //   clientId: gmail.googleClientId,
  //   clientSecret: gmail.googleClientSecret,
  //   refreshToken: gmail.googleRefreshToken,
  // },
  auth: {
    user: gmail.gmailUser,
    pass: gmail.gmailAppPassword,
  },
})

export async function sendEmail(data: SendEmailPayload) {
  try {
    // The sender is set here, not by the web service, so only the worker
    // needs GMAIL_USER.
    await transporter.sendMail({
      ...data,
      from: gmail.gmailUser,
      replyTo: gmail.gmailUser,
    })
  } catch (error) {
    // Keep the real reason so it shows up as the job's failure reason.
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to send email: ${reason}`, { cause: error })
  }
}
