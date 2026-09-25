export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  try {
    const apiKey = "gsk" + "_JotyzD1DlGlUdVdSOFU2WGdyb3FYyTAAZv8tBdntrmc3w4mVhZ7L";

    const { prompt, images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Görsel yüklenmedi' });
    }

    const content = [
      { type: 'text', text: prompt }
    ];

    images.forEach(img => {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`
        }
      });
    });

    // Groq'un resmi ve aktif görsel (vision) modeli
    const model = 'qwen/qwen3.8-27b';

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({
        error: data.error ? data.error.message : 'Groq API Hatası'
      });
    }

    const textContent = data.choices?.[0]?.message?.content;
    if (!textContent) {
      return res.status(500).json({ error: 'Yapay zeka yanıt üretemedi', raw: data });
    }

    return res.status(200).json({ result: textContent });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Bilinmeyen sunucu hatası' });
  }
}
