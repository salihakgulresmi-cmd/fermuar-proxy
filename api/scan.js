export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Sadece POST desteklenir", { status: 405 });
    }

    try {
      const requestData = await request.json();
      const GEMINI_API_KEY = env.GEMINI_KEY; 

      const prompt = `Sen uzman bir fermuar atölyesi sipariş analistisin. Ekli fotoğraftaki el yazısı veya basılı fermuar sipariş föyünü dikkatle oku.
Eğer birden fazla föy varsa, modelleri "Model1 / Model2" olarak birleştir ve aynı boy/renk adetlerini topla. Tek bir föy ise olduğu gibi oku.
Şu JSON şemasında SADECE geçerli bir JSON döndür (ekstra hiçbir markdown veya açıklama olmadan):
{
  "customer": "Müşteri adı (varsa)",
  "model": "Model no veya adı",
  "zipType": "T10 Naylon | T10 Ters Separe | T10 Su Geçirmez | T10 Naylon Özel Dikiş | T10 Naylon Dokuma Şerit",
  "sliderType": "Demonte Kürsör (N 51) | Otomatik Kürsör (N 51 A) | Kancalı Kürsör (N 51 AH) | Kombi Kürsör (N 51 DBS) | Maçalı Kürsör (N 51 AF) | Telli Kürsör (N 519) | Döner Kafa Kürsör (N 518) | Yarı Otomatik (N 51 YG) | Karasaban Kürsör | Plastik Elcikli Demonte | Ters Separe Kürsörü | Gizli Kürsör",
  "coatingType": "S. Nikel | Free Nikel | S. Oksit | Antik Sarı | Kalay Oksit | Pirinç (Gold) | Boyalı",
  "puller": "Elcik açıklaması",
  "stitch": "Dikiş/şerit açıklaması",
  "lengths": [55, 60, 75],
  "separeRows": [
    { "color": "Siyah", "qtys": [10, 20, 30] }
  ],
  "dipliLength": 18,
  "dipliRows": [
    { "color": "Siyah", "qty": 15 }
  ]
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...requestData.images
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const result = await geminiResponse.json();

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
