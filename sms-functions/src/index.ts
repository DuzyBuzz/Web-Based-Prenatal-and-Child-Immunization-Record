import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message, scheduledAt } = req.body;
  // Prefer token from functions config, then environment variable, finally fallback.
  const configured = (functions.config && functions.config().sms && functions.config().sms.token) || process.env.SMS_API_TOKEN;
  const apiToken = (configured || '46a41b56a940789fc2ef1178f6151a79d8639ec4').toString().trim();

  if (!phoneNumber || !message) {
    res.status(400).json({ error: "phoneNumber and message are required." });
    return;
  }

  try {
    const hosts = [
      'https://www.iprogsms.com',
      'https://sms.iprogtech.com'
    ];

    // Choose endpoint path (no query) and prepare JSON payload per provider docs
    const path = scheduledAt ? '/api/v1/message-reminders' : '/api/v1/sms_messages';
    const payload: any = {
      api_token: apiToken,
      phone_number: phoneNumber,
      message: message
    };
    if (scheduledAt) payload.scheduled_at = scheduledAt;

    // Optional: allow client to pass sms_provider in body
    if (req.body.sms_provider !== undefined) payload.sms_provider = req.body.sms_provider;

    const headers = { 'Content-Type': 'application/json' };

    let lastErr: any = null;
    for (const host of hosts) {
      const url = `${host}${path}`;
      try {
        const response = await axios.post(url, payload, { headers, timeout: 10000 });
        res.status(response.status === 200 ? 200 : response.status).json(response.data);
        return;
      } catch (e) {
        lastErr = e;
        // try next host
      }
    }

    // If we reach here, all hosts failed
    throw lastErr || new Error('Failed to send SMS to any host');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: (error as Error).message || "Unknown error" });
    }
  }
});

export const api = functions.https.onRequest(app);
