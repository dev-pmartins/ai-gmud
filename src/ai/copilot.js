'use strict';

const axios = require('axios');

const GITHUB_MODELS_API = 'https://models.inference.ai.azure.com';

/**
 * Generates a GMUD document using the GitHub Models (Copilot) API.
 * @param {string} prompt - The full prompt to send
 * @param {object} options
 * @param {string} [options.model] - Model to use (default: gpt-4o)
 * @param {number} [options.maxTokens] - Max tokens for the response
 * @returns {Promise<string>} The generated GMUD text
 */
async function generateWithCopilot(prompt, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required for Copilot provider.');
  }

  const model = options.model || 'gpt-4o';
  const maxTokens = options.maxTokens || 4096;

  if (typeof options.onChunk === 'function') {
    const response = await axios.post(
      `${GITHUB_MODELS_API}/chat/completions`,
      { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, stream: true },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'stream',
      }
    );

    return new Promise((resolve, reject) => {
      let fullText = '';
      let buffer = '';

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              options.onChunk(delta);
            }
          } catch { /* skip malformed chunks */ }
        }
      });

      response.data.on('end', () => resolve(fullText));
      response.data.on('error', reject);
    });
  }

  const response = await axios.post(
    `${GITHUB_MODELS_API}/chat/completions`,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const choice = response.data.choices && response.data.choices[0];
  if (!choice || !choice.message || !choice.message.content) {
    throw new Error('No content in GitHub Models response.');
  }

  return choice.message.content;
}

module.exports = { generateWithCopilot };
