import { GoogleGenAI } from "@google/genai";
import pRetry, { AbortError } from "p-retry";
import { trackCost, formatCost, getSessionTotal } from "./costTracker.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// --- Retry wrapper ---
// Retries on transient errors (429, 5xx, network).
// Does NOT retry on 400/401 (bad request, auth) — those are surfaced immediately.

async function withRetry(fn, label = "API call") {
    return pRetry(
        async () => {
            try {
                return await fn();
            } catch (err) {
                const status = err.status ?? err.code;
                // Non-retryable: bad request, auth, content filter
                if (status === 400 || status === 401 || status === 403) {
                    throw new AbortError(err);
                }
                // Everything else (429, 500, 503, network) → retry
                throw err;
            }
        },
        {
            retries: 3,
            minTimeout: 1000,
            factor: 2,
            randomize: true,
            onFailedAttempt: (err) => {
                console.error(`⏳ ${label} attempt ${err.attemptNumber} failed (${err.message}). ${err.retriesLeft} retries left.`);
            },
        }
    );
}

// --- Structured generation (used by parse + match) ---

export async function generateStructured({ model, prompt, jsonSchema, label = "generate" }) {
    const response = await withRetry(
        () =>
            ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature: 0,
                    responseMimeType: "application/json",
                    responseSchema: jsonSchema,
                },
            }),
        label
    );

    const usage = response.usageMetadata;
    const cost = trackCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

    console.log(
        `   ↳ tokens: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out  |  cost: ${formatCost(cost)}  |  session: ${formatCost(getSessionTotal())}`
    );

    return JSON.parse(response.text);
}

// --- Streaming chat (used by chat command) ---

export async function streamChat({ model, history, systemInstruction, userMessage }) {
    history.push({ role: "user", parts: [{ text: userMessage }] });

    const stream = await withRetry(
        () =>
            ai.models.generateContentStream({
                model,
                contents: history,
                config: {
                    temperature: 0.3,
                    systemInstruction,
                },
            }),
        "chat"
    );

    let fullText = "";
    let usage = null;

    try {
        for await (const chunk of stream) {
            if (chunk.text) {
                process.stdout.write(chunk.text);
                fullText += chunk.text;
            }
            if (chunk.usageMetadata) usage = chunk.usageMetadata;
        }
    } catch (err) {
        history.pop(); // remove orphaned user turn on failure
        throw err;
    }

    history.push({ role: "model", parts: [{ text: fullText }] });

    if (usage) {
        const cost = trackCost(model, usage.promptTokenCount, usage.candidatesTokenCount);
        console.log(
            `\n   ↳ ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out | ${formatCost(cost)} | session: ${formatCost(getSessionTotal())}\n`
        );
    } else {
        console.log();
    }

    return fullText;
}

// --- Token counting (for /tokens command in chat) ---

export async function countTokens(model, contents) {
    const result = await ai.models.countTokens({ model, contents });
    return result.totalTokens;
}