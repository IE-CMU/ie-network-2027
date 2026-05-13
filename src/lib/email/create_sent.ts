import { type CreateEmailParams, createEmail } from './create'
import { sendEmail } from './sent'

export async function sendEmailNoQueue(data: CreateEmailParams) {
  const emailData = createEmail(data)
  try {
    await sendEmail(emailData)
  } catch (error) {
    console.error('Error sending email:', error)
  }
}
