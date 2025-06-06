import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

// Create the Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Define route
app.post('/sendSms', async (req: any, res: any) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).send('Missing "to" or "message"');
  }

  try {
    const response = await axios.post(
      'https://api.sms.to/sms/send',
      {
        to,
        message
      },
      {
        headers: {
          Authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2F1dGg6ODA4MC9hcGkvdjEvdXNlcnMvYXBpL2tleXMvZ2VuZXJhdGUiLCJpYXQiOjE3NDkxMjk2MjMsIm5iZiI6MTc0OTEyOTYyMywianRpIjoiZzNSalJYM1NVS2hSb3pCUiIsInN1YiI6NDgyNzI1LCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.B27M5tMXEojZzIASuHQxFVxZl4VZcTOsyETl98_f8S0',
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).send(response.data);
  } catch (error: any) {
    console.error('SMS sending failed:', error.response?.data || error.message);
    return res.status(500).send('Failed to send SMS.');
  }
});

// Export it as a Firebase Function
export const sendSms = functions.https.onRequest(app);
