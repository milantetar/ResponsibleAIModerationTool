const axios = require('axios');

class ModerationService {
  constructor() {
    this.ruleBasedFilters = {
      hate_speech: [
        /\b(hate|stupid|idiot|moron)\b/gi,
        /\bh8\b/gi,
        /\bf[*@#$%]ck\b/gi
      ],
      harassment: [
        /\b(kill yourself|kys)\b/gi,
        /\b(loser|pathetic)\b/gi
      ],
      explicit: [
        /\b(sex|porn|xxx)\b/gi,
        /\b(nude|naked)\b/gi
      ]
    };
  }

  async moderateContent(content) {
    try {
      // First, try rule-based moderation
      const ruleBasedResult = this.ruleBasedModeration(content);
      
      // If rule-based finds issues, return immediately
      if (ruleBasedResult.flagged) {
        return ruleBasedResult;
      }

      // Try Gemini API if available
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        try {
          const geminiResult = await this.geminiModeration(content);
          return geminiResult;
        } catch (error) {
          console.warn('Gemini API failed, falling back to rule-based:', error.message);
        }
      }

      // Fallback to rule-based result
      return ruleBasedResult;
    } catch (error) {
      console.error('Moderation service error:', error);
      return {
        flagged: false,
        confidence: 0,
        categories: [],
        reason: 'Moderation service temporarily unavailable',
        method: 'error'
      };
    }
  }

  ruleBasedModeration(content) {
    const violations = [];
    let maxConfidence = 0;

    for (const [category, patterns] of Object.entries(this.ruleBasedFilters)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          violations.push(category);
          maxConfidence = Math.max(maxConfidence, 0.8);
        }
      }
    }

    return {
      flagged: violations.length > 0,
      confidence: maxConfidence,
      categories: violations,
      reason: violations.length > 0 
        ? `Content flagged for: ${violations.join(', ')}`
        : 'Content appears safe',
      method: 'rule-based',
      details: {
        total_violations: violations.length,
        categories_flagged: violations
      }
    };
  }

  async geminiModeration(content) {
    const prompt = `
    Analyze the following content for moderation purposes. Determine if it contains:
    1. Hate speech or discriminatory language
    2. Harassment or bullying
    3. Explicit or inappropriate content
    4. Spam or misleading information

    Content: "${content}"

    Respond with a JSON object containing:
    - flagged: boolean (true if content should be flagged)
    - confidence: number (0-1, confidence in the decision)
    - categories: array of strings (categories that apply)
    - reason: string (explanation of the decision)

    Be strict but fair. Consider context and intent.
    `;

    const response = await axios.post(
      `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    
    try {
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      return {
        ...result,
        method: 'gemini-ai',
        raw_response: text
      };
    } catch (parseError) {
      // Fallback parsing for non-JSON responses
      const flagged = /flagged["\s]*:\s*true/i.test(text);
      const confidenceMatch = text.match(/confidence["\s]*:\s*([\d.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
      
      return {
        flagged,
        confidence,
        categories: flagged ? ['general'] : [],
        reason: flagged ? 'Content flagged by AI analysis' : 'Content appears safe',
        method: 'gemini-ai-fallback',
        raw_response: text
      };
    }
  }
}

module.exports = new ModerationService();