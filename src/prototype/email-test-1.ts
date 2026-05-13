import {
  gmailUser,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
} from '@utils/env'
import nodemailer from 'nodemailer'

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
      from: gmailUser,
      to: recipientEmail,
      replyTo: gmailUser,
      subject: `Test Email from IE Network 2027`,
      text: `Dear ${name},\n\n${message}\n\nBest regards,\nIE Network 2017 Committee`,
      html: `
        <h1>Dear ${name},</h1>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        <p>Best regards,<br>IE Network 2017 Committee</p>
      `,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error('Failed to send email')
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

// Old implementation

// import { google } from 'googleapis'
// const OAuth2 = google.auth.OAuth2

// export const createTransporter = async () => {
//   const oauth2Client = new OAuth2(
//     googleClientId,
//     googleClientSecret,
//     'https://developers.google.com/oauthplayground'
//   )

//   oauth2Client.setCredentials({
//     refresh_token: googleRefreshToken,
//   })

//   const accessToken = await new Promise((resolve, reject) => {
//     oauth2Client.getAccessToken((err, token) => {
//       if (err) {
//         console.error('Failed to create access token :(', err)
//         reject('Failed to create access token :(')
//       }
//       resolve(token)
//     })
//   })

//   console.log('Access Token:', accessToken)

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       type: 'OAuth2',
//       user: gmailUser,
//       accessToken,
//       clientId: googleClientId,
//       clientSecret: googleClientSecret,
//       refreshToken: googleRefreshToken,
//     },
//   })

//   return transporter
// }
