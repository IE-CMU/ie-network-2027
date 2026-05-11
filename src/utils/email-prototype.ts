import { sendEmail, createTransporter } from './email'

// Example usage
async function testEmail() {
  try {
    await sendEmail({
      name: 'John Doe',
      recipientEmail: 'nnnpooh@gmail.com',
      message: 'Hello! This is a test email from the contact form.',
    })
    console.log('Email sent successfully!')
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

testEmail()
// createTransporter()
