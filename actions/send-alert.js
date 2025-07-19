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
      from: process.env.TWILIO_SMS_FROM,
      to,
    });
    console.log(`✅ SMS sent to ${to}: SID ${response.sid}`);
  } catch (error) {
    console.error("❌ SMS Error:", error?.message || error);
    console.error(error);
  }
}

export async function sendWhatsAppAlert(to, message) {
  if (!to) return;
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
    });
    console.log(`✅ WhatsApp sent to ${to}: SID ${response.sid}`);
  } catch (error) {
    console.error("❌ WhatsApp Error:", error?.message || error);
    console.error(error);
  }
}
