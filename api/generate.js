// api/generate.js - This code runs securely on the Vercel/Netlify server
// This uses the Node.js native fetch API
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// IMPORTANT: Do NOT hardcode the API key here. It is read from the server's environment.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// Vercel/Netlify entry point for a serverless function
export default async (req, res) => {
    // 1. Check for the secret key
    if (!GEMINI_API_KEY) {
        res.status(500).json({ error: 'Server configuration error: API Key not set.' });
        return;
    }
    
    // 2. Ensure it's a POST request
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is missing in the request body.' });
            return;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            // Optional: You can include system instructions or tools here if needed
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
            // Success: Send only the final generated text back to the client
            res.status(200).json({ generatedText });
        } else {
            // Handle error response from Gemini API (e.g., safety block)
            const errorReason = JSON.stringify(result.error || result, null, 2);
            res.status(500).json({ error: 'Gemini API call failed: ' + errorReason });
        }

    } catch (error) {
        console.error("Serverless Function Error:", error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};

#### Step 2: Set the Secret Environment Variable

1.  Push both your `index.html` and the new `api/generate.js` file to your GitHub repository.
2.  Log in to **Vercel** or **Netlify** and import your GitHub repository.
3.  Go to your project's **Settings** tab.
4.  Find the **Environment Variables** section.
5.  Create a new variable with the following name and value:
    * **Name:** `GEMINI_API_KEY`
    * **Value:** `YOUR_ACTUAL_GEMINI_API_KEY_HERE` (Paste your real key here)
6.  Redeploy your project.

Once the deployment is complete, your key will be securely stored on the serverless platform and used only by the `generate.js` file, making your web app both functional and secure!

