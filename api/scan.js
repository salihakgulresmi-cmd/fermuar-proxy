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
    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_KEY Vercel ortam değişkenlerinde bulunamadı!' });
    }

    const { prompt, images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Görsel yüklenmedi' });
    }

    const imageParts = images.map(img => ({
      inline_data: {
        mime_type: img.mimeType || 'image/jpeg',
        data: img.data
      }
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    let geminiResponse;
    let data;

    // Yoğunluk takılmalarına karşı otomatik 3 deneme
    for (let attempt = 1; attempt <= 3; attempt++) {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      data = await geminiResponse.json();

      if (geminiResponse.ok) {
        break;
      }

      // Eğer yoğunluk (503/429) varsa 1 saniye bekleyip tekrar dene
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: data.error ? data.error.message : 'Gemini API Hatası'
      });
    }

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      return res.status(500).json({ error: 'Gemini yanıt üretemedi', raw: data });
    }

    return res.status(200).json({ result: textContent });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Bilinmeyen sunucu hatası' });
  }
}
