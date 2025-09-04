import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message, scheduledAt } = req.body;
  const apiToken = "46a41b56a940789fc2ef1178f6151a79d8639ec4 ";

  if (!phoneNumber || !message) {
    res.status(400).json({ error: "phoneNumber and message are required." });
    return;
  }

  try {
    let url: string;

    if (scheduledAt) {
      // Scheduled SMS
      url = `https://sms.iprogtech.com/api/v1/message-reminders?api_token=${apiToken}&message=${encodeURIComponent(message)}&phone_number=${encodeURIComponent(phoneNumber)}&scheduled_at=${encodeURIComponent(scheduledAt)}`;
    } else {
      // Immediate SMS
      url = `https://sms.iprogtech.com/api/v1/sms_messages?api_token=${apiToken}&message=${encodeURIComponent(message)}&phone_number=${encodeURIComponent(phoneNumber)}`;
    }

    const response = await axios.post(url, {});
    res.status(200).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: (error as Error).message || "Unknown error" });
    }
  }
});

export const api = functions.https.onRequest(app);
