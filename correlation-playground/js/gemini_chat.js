// js/gemini_chat.js
window.sendToGemini = async function(userMessage, currentContext) {
  // 若使用後端反向代理：
  const url = '/api/chat';

  const systemInstruction = `
你是一位友善的高中統計與社會議題引導老師。
目前學生正在操作「相關係數遊樂場」互動網站。
當前單元主題：${currentContext.theme}
- 探索地區：${currentContext.counties.join(', ')}
- 自變數 (X軸)：${currentContext.xVar}
- 應變數 (Y軸/地圖指標)：${currentContext.yVar}

你的教學引導原則：
1. 肯定學生的觀察，並結合上述具體數值回答。
2. 提醒高中生核心觀念：「相關不等於因果 (Correlation does not imply causation)」。
3. 提出 1~2 個啟發性問題，引導學生思考背後的潛在變因或社會脈絡。
4. 繁體中文回答，口吻親切明快，長度控制在 150-250 字之內。
`;

  const payload = {
    contents: [
      { role: "user", parts: [{ text: `${systemInstruction}\n\n學生問：${userMessage}` }] }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};