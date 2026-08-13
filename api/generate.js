export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENROUTER_GAME;
  if (!apiKey) {
    return res.status(500).json({ error: "Configuration Error: OPENROUTER_GAME missing" });
  }

  const prompt = `أنت مبتكر ألعاب حماسية. أنشئ ثنائية مواضيع موهمة للعبة 'جاسوس وكاشف وجوكر':

القواعد:
1. "context": سياق أو بيئة موحدة تجمع الطرفين (مثال: "في كواليس مسرحية"، "في قسم الطوارئ").
2. "realTopic": موضوع دقيق وواضح داخل السياق (مثال: "المخرج").
3. "fakeTopic": موضوع متقاطع يتوهم الجاسوس أنه هو الأساسي (مثال: "الممثل الرئيسي").

رد بصيغة JSON فقط (Valid JSON Object):
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
        "X-Title": "Spy Detector Joker Game"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a JSON-only API for an Arabic party game." },
          { role: "user", content: prompt }
        ],
        temperature: 0.95
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    return res.status(200).json(JSON.parse(content));

  } catch (error) {
    const fallbacks = [
      { context: "في كواليس مسرحية 🎭", realTopic: "المخرج", fakeTopic: "الممثل الرئيسي" },
      { context: "في قسم الطوارئ 🏥", realTopic: "طبيب الجراحة", fakeTopic: "ممرض الإنعاش" },
      { context: "في صالة مطار دولي ✈️", realTopic: "كابتن الطائرة", fakeTopic: "مراقب البرج" },
      { context: "في استوديو تصوير 🎬", realTopic: "المصور الرئيسي", fakeTopic: "خبراء الإضاءة" }
    ];
    return res.status(200).json(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }
}
