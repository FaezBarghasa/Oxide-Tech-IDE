import { ApiProviderType } from '../state/settingsStore';

export async function callModelAPI(
  promptText: string,
  provider: ApiProviderType,
  apiKey: string | null,
  endpoint: string | null,
  modelName: string | null
): Promise<string> {
  if (!apiKey && provider !== 'custom') {
    throw new Error('API Key is required for the selected provider.');
  }

  const cleanKey = apiKey ? apiKey.trim() : '';

  switch (provider) {
    case 'gemini': {
      const finalModel = modelName?.trim() || 'gemini-1.5-flash';
      const finalUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${cleanKey}`;
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    case 'openai': {
      const finalUrl = `${endpoint?.trim() || 'https://api.openai.com/v1'}/chat/completions`;
      const finalModel = modelName?.trim() || 'gpt-4o';
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: finalModel,
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    case 'anthropic': {
      const finalUrl = `${endpoint?.trim() || 'https://api.anthropic.com/v1'}/messages`;
      const finalModel = modelName?.trim() || 'claude-3-5-sonnet-20241022';
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: finalModel,
          max_tokens: 2048,
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await response.json();
      if (data.content?.[0]?.text) {
        return data.content[0].text;
      }
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    case 'custom': {
      const finalUrl = `${endpoint?.trim() || 'http://localhost:11434/v1'}/chat/completions`;
      const finalModel = modelName?.trim() || 'llama3';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (cleanKey) {
        headers['Authorization'] = `Bearer ${cleanKey}`;
      }
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: finalModel,
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    default:
      throw new Error(`Unsupported API provider: ${provider}`);
  }
}
