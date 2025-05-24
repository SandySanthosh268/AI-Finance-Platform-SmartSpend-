// lib/twilio.js
import Twilio from 'twilio';

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const twilioSender = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to, body) {
  if (!to || !body) {
    console.error("Missing phone number or message body.");
    return;
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: twilioSender,
      to,
    });

    console.log("SMS sent:", message.sid);
    return message.sid;
  } catch (error) {
    console.error("Twilio SMS error:", error);
    throw error;
  }
}
