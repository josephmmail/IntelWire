// api/generate.js - This code runs securely on the Vercel/Netlify server

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// IMPORTANT: Do NOT hardcode the API key here. It is read from the server's environment.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// Vercel/Netlify entry point for a serverless function
export default async (req, res) => {
    // 1. Check for the secret key
    if (!GEMINI_API_KEY) {
        // Send a non-specific server error message to the client for security
        res.status(500).json({ error: 'Server configuration error. API Key is missing.' });
        return;
    }
    
    // 2. Ensure it's a POST request
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        // Retrieve the complex payload sent from the client
        const { userQuery, systemPrompt, responseSchema, model } = req.body;

        if (!userQuery || !systemPrompt || !responseSchema) {
            res.status(400).json({ error: 'Missing required parameters (query, system prompt, or schema) in request body.' });
            return;
        }

        // Define the target API endpoint using the secured key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        // Construct the full Gemini API payload based on client data
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            // Enable Google Search for real-time grounding
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        };

        // Forward the request to the Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        // Check for generated content (which will be a JSON string)
        const generatedJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedJsonText) {
            // Success: Send the raw JSON string text back to the client
            res.status(200).json({ generatedJsonText });
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


