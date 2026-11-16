import {
  gmailUser,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
} from '@utils/env'
import nodemailer from 'nodemailer'

export type SendEmailPayload = nodemailer.SendMailOptions

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: gmailUser,
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    refreshToken: googleRefreshToken,
  },
})

export async function sendEmail(data: SendEmailPayload) {
  try {
    await transporter.sendMail(data)
  } catch (error) {
    // Keep the real reason so it shows up as the job's failure reason.
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to send email: ${reason}`, { cause: error })
  }
}
