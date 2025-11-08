// api/generate.js - This code runs securely on the Vercel/Netlify server

// Fix for Vercel/Node.js compatibility with fetch on the server:
// Vercel environments sometimes require a specific polyfill or configuration
// for 'fetch' when running older runtimes or specific configurations.
// However, since we are focused on making this an ES Module, we will
// ensure the environment variable is correctly referenced.

// IMPORTANT: Do NOT hardcode the API key here. It is read from the server's environment.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// Vercel/Netlify entry point for a serverless function
export default async (req, res) => {
    // Set CORS headers for security and access control
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 1. Check for the secret key
    if (!GEMINI_API_KEY) {
        // Send a non-specific server error message to the client for security
        res.status(500).json({ error: 'Server configuration error. GEMINI_API_KEY is missing.' });
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

        if (!userQuery || !systemPrompt || !responseSchema || !model) {
            res.status(400).json({ error: 'Missing required parameters (query, system prompt, schema, or model) in request body.' });
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
            // Handle error response from Gemini API (e.g., safety block or API error)
            const errorReason = JSON.stringify(result.error || result, null, 2);
            console.error("Gemini API Error details:", errorReason);
            res.status(502).json({ error: 'External API Error. Could not retrieve content from Gemini.' });
        }

    } catch (error) {
        console.error("Serverless Function Error:", error);
        res.status(500).json({ error: `Internal Server Error during processing: ${error.message}` });
    }
};


