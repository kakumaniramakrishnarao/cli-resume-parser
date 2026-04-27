import fs from "fs/promises";
import path from "path";
import { generateStructured } from "../lib/gemini.js";
import { ResumeSchema, MatchResultSchema, MatchResultJsonSchema } from "../lib/schemas.js";
import { buildMatchPrompt } from "../lib/prompts.js";

function printMatchSummary(match) {
    console.log("\n🎯 Match Analysis");
    console.log("─".repeat(50));
    console.log(`Score: ${match.matchScore}/100`);
    console.log(`\n${match.summary}`);

    console.log(`\n✅ Matched (${match.matchedSkills.length}):`);
    match.matchedSkills.forEach(s => console.log(`   • ${s}`));

    console.log(`\n❌ Missing (${match.missingSkills.length}):`);
    match.missingSkills.forEach(s => console.log(`   • ${s}`));

    if (match.transferableExperience.length > 0) {
        console.log(`\n🔄 Transferable:`);
        match.transferableExperience.forEach(s => console.log(`   • ${s}`));
    }

    if (match.suggestedBulletRewrites.length > 0) {
        console.log(`\n✏️  Suggested Bullet Rewrites:`);
        match.suggestedBulletRewrites.forEach((r, i) => {
            console.log(`\n   ${i + 1}. Original:  ${r.original}`);
            console.log(`      Rewritten: ${r.rewritten}`);
            console.log(`      Why:       ${r.reason}`);
        });
    }

    if (match.redFlags.length > 0) {
        console.log(`\n🚩 Red Flags:`);
        match.redFlags.forEach(s => console.log(`   • ${s}`));
    }
    console.log("─".repeat(50));
}

export async function matchCommand(resumePath, jdPath, options = {}) {
    const model = options.model || "gemini-2.5-flash";

    console.log(`📄 Loading resume: ${resumePath}`);
    const resumeRaw = JSON.parse(await fs.readFile(resumePath, "utf-8"));
    const resume = ResumeSchema.parse(resumeRaw);

    console.log(`📄 Loading JD: ${jdPath}`);
    const jdText = await fs.readFile(jdPath, "utf-8");

    if (jdText.trim().length < 100) {
        throw new Error("Job description is suspiciously short.");
    }

    console.log(`🤖 Analyzing match with ${model}...`);

    const prompt = buildMatchPrompt(resume, jdText);
    const rawMatch = await generateStructured({
        model,
        prompt,
        jsonSchema: MatchResultJsonSchema,
        label: "match-analysis",
    });

    const match = MatchResultSchema.parse(rawMatch);

    await fs.mkdir("output", { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `match-${timestamp}.json`;
    const outputPath = path.join("output", filename);
    await fs.writeFile(outputPath, JSON.stringify(match, null, 2), "utf-8");

    printMatchSummary(match);
    console.log(`\n✅ Saved to ${outputPath}\n`);

    return match;
}