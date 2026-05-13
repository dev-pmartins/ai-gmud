'use strict';

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Generates a GMUD document using the Anthropic Claude API.
 * @param {string} prompt - The full prompt to send to Claude
 * @param {object} options
 * @param {string} [options.model] - Claude model to use
 * @param {number} [options.maxTokens] - Max tokens for the response
 * @returns {Promise<string>} The generated GMUD text
 */
async function generateWithClaude(prompt, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude provider.');
  }

  const client = new Anthropic({ apiKey });

  const model = options.model || 'claude-3-5-sonnet-20241022';
  const maxTokens = options.maxTokens || 4096;

  if (typeof options.onChunk === 'function') {
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    let fullText = '';
    stream.on('text', (text) => {
      fullText += text;
      options.onChunk(text);
    });

    await stream.finalMessage();
    return fullText;
  }

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Claude response.');
  }

  return textBlock.text;
}

module.exports = { generateWithClaude };
