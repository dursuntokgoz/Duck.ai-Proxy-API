export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // 1. Duck.ai'den VQD (doğrulama tokenı) al
    const statusRes = await fetch("https://duckduckgo.com/duckchat/v1/status", {
      headers: { "x-vqd-accept": "1" }
    });
    const vqd = statusRes.headers.get("x-vqd-4");

    if (!vqd) throw new Error("VQD alınamadı");

    // 2. Mesajı gönder
    const chatRes = await fetch("https://duckduckgo.com/duckchat/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vqd-4": vqd,
        "Accept": "text/event-stream",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Alternatif: "claude-3-haiku"
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await chatRes.text();
    
    // Yanıtı ayıkla (SSE formatından temizle)
    const reply = data
      .split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          return json.message || "";
        } catch { return ""; }
      })
      .join('');

    res.status(200).json({
      id: "chatcmpl-duck",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
