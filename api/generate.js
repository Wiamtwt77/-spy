export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // استخدام متغير البيئة الخاص بك OPENROUTER_GAME
  const apiKey = process.env.OPENROUTER_GAME;
  if (!apiKey) {
    return res.status(500).json({ error: "Configuration Error: OPENROUTER_GAME missing" });
  }

  const { categories = [], usedTopics = [] } = req.body || {};
  const categoriesStr = categories.length > 0 ? categories.join('، ') : 'عام، أسطوري، يوميات، وظائف';
  const usedStr = usedTopics.length > 0 ? usedTopics.join('، ') : 'لا يوجد';

  const prompt = `أنت المبتكر للعبة 'جاسوس وكاشف'.
مهمتك: توليد زوج من المواضيع المتقاربة جداً وذكية باللغة العربية.

التصنيفات المتاحة: [${categoriesStr}]
مواضيع سابقة (ممنوع التكرار): [${usedStr}]

قواعد توليد الفكرة:
1. "realTopic": موضوع محدد جداً وواضح (مثال: "طباخ في مطعم فاخر").
2. "fakeTopic": موضوع من نفس البيئة أو المجال وبينهما تشابه كبير جداً في التلميحات السطحية (مثال: "ناقد طعام في برنامج تلفزيوني").
3. الفارق الضمني يجب أن يكون دقيقاً بحيث يتبين فقط عند كتابة التلميحات التفصيلية.

المطلوب: رد بصيغة JSON فقط (Valid JSON Object) بدون أي علامات Markdown:
{
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
        temperature: 0.9
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
      { realTopic: "طيار مدني في شركة طيران", fakeTopic: "مراقب برج المراقبة الجوية" },
      { realTopic: "جراح في غرفة العمليات", fakeTopic: "طبيب إسعاف في الميدان" },
      { realTopic: "مدرب فريق كرة قدم", fakeTopic: "حكم مباراة نهائية" },
      { realTopic: "مصور صحفي في منطقة حرب", fakeTopic: "صحفي تحقيقات استقصائية" }
    ];

    const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return res.status(200).json(randomFallback);
  }
}
