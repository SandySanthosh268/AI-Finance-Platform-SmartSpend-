// app/api/test-alert/route.js
import { NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Replace with your verified number in E.164 format
const TEST_NUMBER = "+919944776843"; // <-- ✅ Your verified number

export async function GET() {
  const smsMessage = "📨 Twilio SMS Test: Your SmartSpend project SMS is working!";
  const whatsappMessage = "📲 Twilio WhatsApp Test: SmartSpend WhatsApp alert test successful.";

  try {
    // ✅ Send SMS
    const sms = await client.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_SMS_FROM, // e.g., +1XXXXXXXXXX (your Twilio number)
      to: TEST_NUMBER,
    });

    // ✅ Send WhatsApp
    const wa = await client.messages.create({
      body: whatsappMessage,
      from: process.env.TWILIO_WHATSAPP_FROM, // e.g., whatsapp:+14155238886
      to: `whatsapp:${TEST_NUMBER}`,
    });

    return NextResponse.json({
      status: "✅ Sent",
      smsSid: sms.sid,
      whatsappSid: wa.sid,
    });
  } catch (error) {
    console.error("❌ Twilio Test Error:", error.message);
    return NextResponse.json({
      status: "❌ Failed",
      message: error.message,
    });
  }
}
