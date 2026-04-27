import { PRICING } from "./pricing.js";

let sessionTotal = 0;

export function trackCost(model, promptTokens, responseTokens) {
    const pricing = PRICING[model];
    if (!pricing) {
        console.warn(`No pricing for model ${model}, skipping cost tracking`);
        return 0;
    }

    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (responseTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    sessionTotal += totalCost;
    return totalCost;
}

export function getSessionTotal() {
    return sessionTotal;
}

export function resetSession() {
    sessionTotal = 0;
}

export function formatCost(cost) {
    return `$${cost.toFixed(6)}`;
}