#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { parseCommand } from "./commands/parse.js";
import { matchCommand } from "./commands/match.js";
import { chatCommand } from "./commands/chat.js";

const program = new Command();

program
    .name("resume-parser")
    .description("AI-powered resume parser, JD matcher, and career chat")
    .version("1.0.0");

program
    .command("parse <file>")
    .description("Parse a resume (.pdf or .txt) into structured JSON")
    .option("-m, --model <model>", "Gemini model to use", "gemini-2.5-flash")
    .action(async (file, options) => {
        try {
            await parseCommand(file, options);
        } catch (err) {
            console.error(`\n❌ Parse failed: ${err.message}`);
            if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
            process.exit(1);
        }
    });

program
    .command("match <resume> <jobDescription>")
    .description("Analyze fit between a parsed resume (.json) and a job description (.txt)")
    .option("-m, --model <model>", "Gemini model to use", "gemini-2.5-flash")
    .action(async (resume, jd, options) => {
        try {
            await matchCommand(resume, jd, options);
        } catch (err) {
            console.error(`\n❌ Match failed: ${err.message}`);
            if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
            process.exit(1);
        }
    });

program
    .command("chat <resume>")
    .description("Interactive career advisor session with your parsed resume as context")
    .option("-m, --model <model>", "Gemini model to use", "gemini-2.5-flash")
    .action(async (resume, options) => {
        try {
            await chatCommand(resume, options);
        } catch (err) {
            console.error(`\n❌ Chat failed: ${err.message}`);
            process.exit(1);
        }
    });

program.parse();