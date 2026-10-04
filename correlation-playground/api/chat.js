// api/chat.js

export default async function handler(req, res) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 從 Vercel 環境變數中讀取你的金鑰
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器端尚未設定 GEMINI_API_KEY 環境變數' });
  }

  // 設定 Google Gemini API 官方端點 (此處使用 3.8-flash)
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

  try {
    // 將前端傳來的請求原封不動轉發給 Google
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    // 如果 Google 回傳錯誤（例如配額用盡），也將其回傳給前端
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error });
    }

    // 成功則回傳 JSON
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
