import fs from "fs/promises";
import path from "path";
import { generateStructured } from "../lib/gemini.js";
import { ResumeSchema, ResumeJsonSchema } from "../lib/schemas.js";
import { buildParsePrompt } from "../lib/prompts.js";

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".txt") {
        return await fs.readFile(filePath, "utf-8");
    }

    if (ext === ".pdf") {
        const buffer = await fs.readFile(filePath);
        const { default: pdfParse } = await import("pdf-parse-fork");
        const data = await pdfParse(buffer);
        return data.text;
    }

    throw new Error(`Unsupported file type: ${ext}. Use .txt or .pdf`);
}

function sanitizeFilename(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function printSummary(resume) {
    console.log("\n📋 Parsed Resume Summary");
    console.log("─".repeat(50));
    console.log(`Name:       ${resume.contact.name}`);
    console.log(`Email:      ${resume.contact.email}`);
    if (resume.contact.location) console.log(`Location:   ${resume.contact.location}`);
    console.log(`Experience: ${resume.experience.length} role(s)`);
    console.log(`Education:  ${resume.education.length} entry(ies)`);
    console.log(`Projects:   ${resume.projects.length} project(s)`);

    const totalSkills =
        resume.skills.languages.length +
        resume.skills.frameworks.length +
        resume.skills.databases.length +
        resume.skills.tools.length +
        resume.skills.other.length;
    console.log(`Skills:     ${totalSkills} total`);

    if (resume.experience.length > 0) {
        console.log(`\nMost recent role: ${resume.experience[0].role} @ ${resume.experience[0].company}`);
    }
    console.log("─".repeat(50));
}

export async function parseCommand(filePath, options = {}) {
    const model = options.model || "gemini-2.5-flash";

    console.log(`📄 Reading ${filePath}...`);
    const resumeText = await extractText(filePath);

    if (resumeText.trim().length < 100) {
        throw new Error("Resume text is suspiciously short. PDF extraction may have failed.");
    }

    console.log(`   Extracted ${resumeText.length} characters`);
    console.log(`🤖 Parsing with ${model}...`);

    const prompt = buildParsePrompt(resumeText);
    const rawResume = await generateStructured({
        model,
        prompt,
        jsonSchema: ResumeJsonSchema,
        label: "parse-resume",
    });

    const resume = ResumeSchema.parse(rawResume);

    await fs.mkdir("output", { recursive: true });
    const filename = `parsed-${sanitizeFilename(resume.contact.name)}.json`;
    const outputPath = path.join("output", filename);
    await fs.writeFile(outputPath, JSON.stringify(resume, null, 2), "utf-8");

    printSummary(resume);
    console.log(`\n✅ Saved to ${outputPath}\n`);

    return resume;
}