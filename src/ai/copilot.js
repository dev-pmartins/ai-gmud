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
