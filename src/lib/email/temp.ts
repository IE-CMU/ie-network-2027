// import nodemailer from 'nodemailer'
// import {
//   gmailUser,
//   googleClientId,
//   googleClientSecret,
//   googleRefreshToken,
// } from '@utils/env'

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     type: 'OAuth2',
//     user: gmailUser,
//     clientId: googleClientId,
//     clientSecret: googleClientSecret,
//     refreshToken: googleRefreshToken,
//   },
// })

// export async function sendEmail({
//   name,
//   recipientEmail,
//   message,
// }: {
//   name: string
//   recipientEmail: string
//   message: string
// }) {
//   try {
//     await transporter.sendMail({
//       from: gmailUser,
//       to: recipientEmail,
//       replyTo: gmailUser,
//       subject: `New contact form from ${name}`,
//       text: `New contact form`,
//       html: `
//         <h2>New contact form</h2>
//         <p><strong>Name:</strong> ${escapeHtml(name)}</p>
//         <p><strong>Message:</strong></p>
//         <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
//       `,
//     })
//   } catch (error) {
//     console.error('Error sending email:', error)
//     throw new Error('Failed to send email')
//   }
// }

// function escapeHtml(value: string) {
//   return value
//     .replaceAll('&', '&amp;')
//     .replaceAll('<', '&lt;')
//     .replaceAll('>', '&gt;')
//     .replaceAll('"', '&quot;')
//     .replaceAll("'", '&#39;')
// }

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
