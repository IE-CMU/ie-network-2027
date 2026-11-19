// Sends one email the same way the worker does (createEmail -> sendEmail),
// but directly instead of through the queue.
// sendEmailNoQueue() is not used here because it logs and swallows errors,
// which would make a failed send look successful.
import { createEmail } from '@/lib/email/create'
import { sendEmail } from '@/lib/email/sent'

async function testEmail() {
  try {
    const emailData = createEmail({
      name: 'Nirand',
      recipientEmail: 'nnnpooh@gmail.com',
      subject: 'Test Email from IE Network 2027',
      message: 'This is a test email sent without using the queue.',
    })
    await sendEmail(emailData)
    console.log('Email sent successfully!')
  } catch (error) {
    console.error('Error sending email:', error)
    process.exitCode = 1
  }
}

testEmail()
