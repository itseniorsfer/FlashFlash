const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Trust Cloud Run Reverse Proxy (Fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// Rate Limiter: Max 15 requests per 1-minute window per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Demasiadas peticiones. Por favor espera un minuto antes de intentar de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to API routes
app.use('/api/', apiLimiter);

// Health check and config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    hasBackendKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '')
  });
});

// Helper for calling Gemini API with auto-fallback to active Gemini 3+ models
async function callGeminiAPI(apiKey, payload) {
  const models = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-flash'
  ].filter(Boolean);

  let lastData = null;
  for (const model of models) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return data;
      }
      lastData = data;
    } catch (e) {
      console.warn(`Falló intento con modelo ${model}:`, e.message);
    }
  }
  return lastData;
}

// Endpoint 1: Generate Flashcard Deck
app.post('/api/generate-deck', async (req, res) => {
  try {
    const { prompt, lang = 'es' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'El tema (prompt) es requerido.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'No se ha configurado ninguna API Key de Gemini.' });
    }

    const isEn = lang === 'en';
    const systemInstruction = isEn
      ? "Act as a high-performance learning expert. Analyze the user's prompt carefully. If the user specifies a quantity (e.g., 100 elements, 50 verbs, 30 terms), generate EXACTLY that requested quantity. If no quantity is specified, generate 20 to 30 essential concepts or terms. Return ONLY the items separated exclusively by commas, with NO list numbers, NO bullet points, NO introductory text, and NO conclusion commentary. Strictly respect requested formatting inside each item, such as 'Symbol - Name' or 'Word - Translation'."
      : "Actúa como un experto en pedagogía y aprendizaje de alto rendimiento. Analiza cuidadosamente la petición del usuario. Si el usuario especifica una cantidad (ejemplo: 100 elementos de la tabla periódica, 50 verbos, 30 conceptos), genera EXACTAMENTE esa cantidad solicitada. Si no especifica cantidad, genera de 20 a 30 conceptos esenciales. Devuelve ÚNICAMENTE los elementos separados exclusivamente por comas, SIN números de lista (como 1., 2.), SIN viñetas, SIN introducción y SIN comentarios finales. Respeta fielmente formatos internos solicitados como 'Símbolo - Nombre' o 'Término - Definición'.";

    const payload = {
      contents: [{ parts: [{ text: `Prompt del usuario: ${prompt}` }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.2
      }
    };

    const data = await callGeminiAPI(apiKey, payload);

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Error en la API de Gemini' });
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      return res.status(500).json({ error: 'No se obtuvo respuesta estructurada de Gemini.' });
    }

    // Limpieza avanzada: remueve números de lista (1., 2.), guiones de viñeta e intros
    let cleanText = textOutput
      .trim()
      .replace(/^(Aquí tienes|Here is|Below is|Lista de).*?\n+/gi, '')
      .split(/\n+/)
      .map(line => line.replace(/^[\d\s\.\*\-\•\)\:]+/, '').trim())
      .filter(Boolean)
      .join(', ');

    res.json({ concepts: cleanText });
  } catch (error) {
    console.error('Error en /api/generate-deck:', error);
    res.status(500).json({ error: 'Error interno al comunicarse con Gemini API.' });
  }
});

// Endpoint 2: Explain Word
app.post('/api/explain-word', async (req, res) => {
  try {
    const { word, lang = 'es' } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'El término a explicar es requerido.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'No se ha configurado ninguna API Key de Gemini.' });
    }

    const isEn = lang === 'en';
    const textPrompt = isEn
      ? `Define the term "${word}" ultra-concisely (maximum 12 words) with an educational and practical focus in English.`
      : `Define de forma ultra-concisa (máximo de 12 palabras) y con enfoque educativo y práctico el término: "${word}"`;

    const payload = {
      contents: [{ parts: [{ text: textPrompt }] }]
    };

    const data = await callGeminiAPI(apiKey, payload);

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Error en la API de Gemini' });
    }

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Definición no disponible.';
    res.json({ explanation });
  } catch (error) {
    console.error('Error en /api/explain-word:', error);
    res.status(500).json({ error: 'Error interno al comunicarse con Gemini API.' });
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for single page application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`⚡ FlashFlash Server corriendo en puerto ${PORT}`);
});
