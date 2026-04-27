import fs from "fs/promises";
import readline from "readline";
import { ResumeSchema } from "../lib/schemas.js";
import { buildChatSystemInstruction } from "../lib/prompts.js";
import { streamChat, countTokens } from "../lib/gemini.js";
import { getSessionTotal, formatCost, resetSession } from "../lib/costTracker.js";

const MAX_HISTORY = 20;  // 10 turns of user+model

function printHelp() {
    console.log(`
Commands:
  /tokens   Show current conversation token count
  /history  Show recent conversation turns
  /reset    Clear conversation history (resume context preserved)
  /help     Show this help
  /exit     Quit
`);
}

function printHistory(history) {
    if (history.length === 0) {
        console.log("(No conversation yet)\n");
        return;
    }
    history.forEach((item, i) => {
        const preview = item.parts[0].text.slice(0, 80);
        const ellipsis = item.parts[0].text.length > 80 ? "..." : "";
        console.log(`[${i}] ${item.role}: ${preview}${ellipsis}`);
    });
    console.log();
}

export async function chatCommand(resumePath, options = {}) {
    const model = options.model || "gemini-2.5-flash";

    console.log(`📄 Loading resume: ${resumePath}`);
    const resumeRaw = JSON.parse(await fs.readFile(resumePath, "utf-8"));
    const resume = ResumeSchema.parse(resumeRaw);

    const systemInstruction = buildChatSystemInstruction(resume);

    console.log(`🤖 Career advisor ready. Talking with ${resume.contact.name}'s context loaded.`);
    console.log(`   Model: ${model}  |  Type /help for commands\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "you > ",
    });

    let history = [];

    rl.prompt();

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) {
            rl.prompt();
            continue;
        }

        // --- commands ---
        if (trimmed === "/help") {
            printHelp();
            rl.prompt();
            continue;
        }

        if (trimmed === "/tokens") {
            if (history.length === 0) {
                console.log("History is empty. 0 tokens.\n");
            } else {
                const tokens = await countTokens(model, history);
                console.log(`Conversation size: ${tokens} tokens  |  Session cost: ${formatCost(getSessionTotal())}\n`);
            }
            rl.prompt();
            continue;
        }

        if (trimmed === "/history") {
            printHistory(history);
            rl.prompt();
            continue;
        }

        if (trimmed === "/reset") {
            history = [];
            resetSession();
            console.log("Conversation reset.\n");
            rl.prompt();
            continue;
        }

        if (trimmed === "/exit") {
            console.log(`\nGoodbye. Session cost: ${formatCost(getSessionTotal())}`);
            rl.close();
            return;
        }

        // --- normal chat turn ---
        process.stdout.write("\nadvisor > ");

        try {
            await streamChat({
                model,
                history,
                systemInstruction,
                userMessage: trimmed,
            });
        } catch (err) {
            console.error(`\nError: ${err.message}\n`);
        }

        // sliding window — keep last MAX_HISTORY turns
        while (history.length > MAX_HISTORY) {
            history = history.slice(2);
        }

        rl.prompt();
    }
}