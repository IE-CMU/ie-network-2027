import {
  gmailUser,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
} from '@utils/env'
import nodemailer from 'nodemailer'

export type SendMessageData = nodemailer.SendMailOptions

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

export async function _sendEmail(data: SendMessageData) {
  try {
    await transporter.sendMail(data)
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error('Failed to send email')
  }
}
