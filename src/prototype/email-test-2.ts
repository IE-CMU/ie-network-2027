import { sendEmailNoQueue } from '@/lib/email/create_sent'

// Example usage
async function testEmail() {
  try {
    await sendEmailNoQueue({
      name: 'Nirand',
      recipientEmail: 'nnnpooh@gmail.com',
      subject: 'Test Email from IE Network 2027',
      message: 'This is a test email sent without using the queue.',
    })
    console.log('Email sent successfully!')
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

testEmail()
