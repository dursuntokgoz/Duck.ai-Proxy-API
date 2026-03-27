import { chromium } from "playwright-core";
import chromiumPack from "@sparticuz/chromium";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let browser = null;
  try {
    // Vercel/AWS Lambda uyumlu tarayıcı başlatma
    browser = await chromium.launch({
      args: chromiumPack.args,
      executablePath: await chromiumPack.executablePath(),
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Duck.ai sayfasına git
    await page.goto("https://duckduckgo.com/?q=DuckDuckGo+AI&ia=chat", { 
      waitUntil: "networkidle",
      timeout: 20000 
    });

    const messages = req.body.messages || [];
    const lastMessage = messages[messages.length - 1]?.content || "Merhaba";

    // Giriş alanını bekle ve mesajı gönder
    await page.waitForSelector("textarea", { timeout: 10000 });
    await page.fill("textarea", lastMessage);
    await page.keyboard.press("Enter");

    // Yanıtın (AI cevabının) gelmesini bekle
    const responseSelector = '.chat-message__content'; 
    await page.waitForSelector(responseSelector, { timeout: 15000 });
    
    const reply = await page.locator(responseSelector).last().innerText();

    await browser.close();

    return res.status(200).json({
      id: "chatcmpl-duck",
      object: "chat.completion",
      choices: [{
          index: 0,
          message: { role: "assistant", content: reply },
          finish_reason: "stop"
      }]
    });

  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
}
