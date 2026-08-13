export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENROUTER_GAME;
  if (!apiKey) {
    return res.status(500).json({ error: "Configuration Error: OPENROUTER_GAME missing" });
  }

  const prompt = `أنت مبتكر ألعاب ذكي. أنشئ ثنائية مواضيع للعبة 'جاسوس وكاشف' تعتمد على 'نظام السياق والموقف المشترك'.

القواعد:
1. "context": سياق أو بيئة موحدة تجمع الطرفين (مثال: "في صالة الأفراح"، "في غرفة العمليات"، "في المطار").
2. "realTopic": موضوع دقيق وواضح داخل هذا السياق (مثال: "أم العروس").
3. "fakeTopic": موضوع يتشارك نفس البيئة والموقف ولكن بزاوية مختلفة (مثال: "منظمة الحفل").
4. الهدف: أن يكتب الجاسوس تلميحات تناسب البيئة العامة ويتوهم أنه داخل الموضوع، ولكن الكاشف يلمح الزاوية المختلفة بسهولة.

المطلوب: رد بصيغة JSON فقط (Valid JSON Object) بدون Markdown:
{
  "context": "السياق المشترك",
  "realTopic": "الموضوع الحقيقي",
  "fakeTopic": "الموضوع الخاطئ للجاسوس"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "Spy and Detector Game"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a JSON-only API for an Arabic party game. Always return valid raw JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.95
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(content);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Error context fallback:", error);

    const fallbacks = [
      { context: "في صالة الأفراح 💒", realTopic: "أم العروس", fakeTopic: "منظمة الحفل (Event Planner)" },
      { context: "في غرفة العمليات 🏥", realTopic: "طبيب جراحة القلب", fakeTopic: "مخدر العمليات (Anesthesiologist)" },
      { context: "في المطار ✈️", realTopic: "طيار مدني", fakeTopic: "مراقب برج المراقبة" },
      { context: "في المحكمة ⚖️", realTopic: "القاضي", fakeTopic: "محامي الدفاع" }
    ];

    const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return res.status(200).json(randomFallback);
  }
}
