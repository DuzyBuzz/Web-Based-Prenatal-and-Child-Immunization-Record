import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import helmet from 'helmet'; // optional for better security headers

const app = express();

// Enable CORS and secure headers
app.use(cors({ origin: true }));
app.use(helmet()); // Optional, improves security
app.use(express.json());

// ⚠️ Secure API key: Use Firebase environment config in production
const GOOGLE_API_KEY = functions.config().gemini.key;


// 👇 AI Assistant route
app.post('/ai-assistant', async (req: express.Request, res: express.Response): Promise<void> => {
  const userMessage = req.body.message;

  // Input validation
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
    res.status(400).json({ error: 'Missing or invalid "message" in request body' });
    return;
  }

  console.log('[Request] Message:', userMessage);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

    const response = await axios.post(geminiUrl, {
      contents: [
        {
          parts: [
            {
              text: `Ikaw ay isang propesyonal na AI assistant para sa prenatal care at bakuna. Sagutin ang mga tanong sa paraang malinaw at makatao. ${userMessage}`,
            },
          ],
        },
      ],
    });

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.warn('[Gemini Warning] No reply content found');
      res.status(502).json({ error: 'Walang sagot mula sa AI.' });
      return;
    }

    res.status(200).json({ reply });
  } catch (error: any) {
    console.error('[Gemini Error]', error.response?.data || error.message);
    res.status(500).json({ error: 'Hindi makuha ang sagot mula sa AI.' });
  }
});

// 🔥 Export the Express app as a Firebase function
exports.api = functions.https.onRequest(app);
