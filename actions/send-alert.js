
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMSAlert(to, message) {
  if (!to) return;
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_SMS_FROM, // ✅ MUST be set correctly
      to,
    });
    console.log(`✅ SMS sent to ${to}: SID ${response.sid}`);
  } catch (error) {
    console.error("❌ SMS Error:", error.message);
  }
}

export async function sendWhatsAppAlert(to, message) {
  if (!to) return;
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_FROM, // ✅ MUST be set correctly
      to: `whatsapp:${to}`, // ✅ Destination must have 'whatsapp:' prefix
    });
    console.log(`✅ WhatsApp sent to ${to}: SID ${response.sid}`);
  } catch (error) {
    console.error("❌ WhatsApp Error:", error.message);
  }
}
