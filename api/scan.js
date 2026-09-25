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

    // Yoğunluk anında birbirini yedekleyen modeller sırasıyla denenir
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    let lastError = null;

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await geminiResponse.json();

        if (geminiResponse.ok) {
          const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textContent) {
            return res.status(200).json({ result: textContent });
          }
        }

        // Hata geldiyse kaydet ve bir sonraki modeli dene
        lastError = data.error ? data.error.message : 'Yanıt alınamadı';
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(503).json({
      error: 'Google sunucuları şu an çok yoğun. Lütfen 5-10 saniye sonra tekrar deneyin. (' + lastError + ')'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Bilinmeyen sunucu hatası' });
  }
}
