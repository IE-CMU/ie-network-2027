import { type ConstructEmailDataParams, _constructEmailData } from './data'
import { _sendEmail } from './engine'

export async function sendEmail(data: ConstructEmailDataParams) {
  const emailData = _constructEmailData(data)
  await _sendEmail(emailData)
}
