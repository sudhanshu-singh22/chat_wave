const express = require("express");
const router = express.Router();

// ── Local fallback bad-words list ─────────────────────────────────────────
// Used only if OpenRouter API call fails for any reason
const FALLBACK_BAD_WORDS = [
  // English
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cock",
  "cunt", "whore", "slut", "nigger", "faggot", "retard",
  // Sexual
  "porn", "nude", "naked", "boobs", "penis", "vagina", "rape",
  // Hindi/Indian slang
  "bsdk", "bhosdk", "bhosdike", "madarchod", "behenchod", "chutiya",
  "gandu", "randi", "harami", "lund", "chut", "gaand", "mc", "bc", "mf",
];

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return FALLBACK_BAD_WORDS.some((word) => lower.includes(word));
}

// POST /api/moderate
router.post("/", async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const trimmed = text.trim();

  // ── Try OpenRouter AI first ───────────────────────────────────────────
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5001",
        "X-Title": "ChatApp Moderation",
      },
      body: JSON.stringify({
        model: "openrouter/auto", // free model on OpenRouter
        messages: [
          {
            role: "system",
            content: `You are a content moderation assistant. 
Your job is to detect if a message contains: hate speech, sexual content, harassment, threats, foul language, or abusive content in ANY language including Hindi, English, or Indian slang.
Respond with ONLY a valid JSON object in this exact format, nothing else:
{"flagged": true, "reason": "brief reason"} 
or 
{"flagged": false}`,
          },
          {
            role: "user",
            content: `Check this message: "${trimmed}"`,
          },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      // Fall back to local list
      const flagged = containsBadWord(trimmed);
      return res.json({ flagged, source: "local_fallback" });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content?.trim();

    console.log(`🤖 OpenRouter reply: ${aiReply}`);

    // Parse the JSON response from AI
    try {
      // Strip markdown code fences if model wrapped it
      const clean = aiReply.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const flagged = parsed.flagged === true;

      if (flagged) {
        console.log(`🚨 AI flagged message. Reason: ${parsed.reason}`);
      }

      return res.json({ flagged, source: "openrouter" });
    } catch (parseErr) {
      // AI didn't return clean JSON — fall back to local
      console.warn("Could not parse AI response, using local fallback:", aiReply);
      const flagged = containsBadWord(trimmed);
      return res.json({ flagged, source: "local_fallback" });
    }
  } catch (err) {
    console.error("OpenRouter fetch error:", err);
    // Network error — use local fallback
    const flagged = containsBadWord(trimmed);
    return res.json({ flagged, source: "local_fallback" });
  }
});

module.exports = router;