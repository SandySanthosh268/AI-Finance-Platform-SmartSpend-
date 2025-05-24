// pages/api/send-test-sms.js
import { sendSMS } from '@/lib/twilio';

export default async function handler(req, res) {
  const phone = '+919944776843'; // E.g., +14155552671
  const message = 'This is a test SMS from your Next.js app!';

  try {
    const sid = await sendSMS(phone, message);
    res.status(200).json({ success: true, sid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
