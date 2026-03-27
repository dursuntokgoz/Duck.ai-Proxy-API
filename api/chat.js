import { chromium } from "playwright-core";
import chromiumPack from "@sparticuz/chromium";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let browser = null;
  try {
    browser = await chromium.launch({
      args: chromiumPack.args,
      executablePath: await chromiumPack.executablePath(),
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Duck.ai yükleme süresini optimize et
    await page.goto("https://duck.ai", { waitUntil: "domcontentloaded", timeout: 20000 });

    const prompt = req.body.messages.map(m => m.content).join("\n");
    await page.fill("textarea", prompt);
    await page.keyboard.press("Enter");

    // Mesajın gelmesini bekle
    const selector = ".assistant-message";
    await page.waitForSelector(selector, { timeout: 15000 });
    const reply = await page.locator(selector).last().innerText();

    await browser.close();

    res.json({
      id: "chatcmpl-duck",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }]
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
}
