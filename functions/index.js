/**
 * Firebase Cloud Functions for RiverChat
 * Proxies API requests to OpenAI and Anthropic to avoid CORS issues
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

/**
 * Proxy for OpenAI API requests
 * Handles both Chat Completions and Responses API with streaming
 */
exports.proxyOpenAI = onRequest({cors: true}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {apiKey, endpoint, body} = req.body;

    if (!apiKey) {
      res.status(400).json({error: "API key is required"});
      return;
    }

    if (!endpoint) {
      res.status(400).json({error: "Endpoint is required"});
      return;
    }

    logger.info("OpenAI proxy request", {endpoint});

    // Make request to OpenAI
    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // Handle error responses
    if (!response.ok) {
      const error = await response.json();
      logger.error("OpenAI API error", error);
      res.status(response.status).json(error);
      return;
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    logger.error("Proxy error", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

/**
 * Proxy for Anthropic API requests
 * Handles Messages API with streaming
 */
exports.proxyAnthropic = onRequest({cors: true}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {apiKey, body} = req.body;

    if (!apiKey) {
      res.status(400).json({error: "API key is required"});
      return;
    }

    logger.info("Anthropic proxy request");

    // Make request to Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    // Handle error responses
    if (!response.ok) {
      const error = await response.json();
      logger.error("Anthropic API error", error);
      res.status(response.status).json(error);
      return;
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    logger.error("Proxy error", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

/**
 * Proxy for Google Gemini API requests
 * Handles streaming requests
 */
exports.proxyGoogle = onRequest({cors: true}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {apiKey, model, body} = req.body;

    if (!apiKey) {
      res.status(400).json({error: "API key is required"});
      return;
    }

    if (!model) {
      res.status(400).json({error: "Model is required"});
      return;
    }

    logger.info("Google proxy request", {model});

    // Make request to Google
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
    );

    // Handle error responses
    if (!response.ok) {
      const error = await response.json();
      logger.error("Google API error", error);
      res.status(response.status).json(error);
      return;
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    logger.error("Proxy error", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});
