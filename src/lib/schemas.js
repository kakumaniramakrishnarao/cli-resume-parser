import { z } from "zod";

// --- Sub-schemas ---

const ContactSchema = z.object({
    name: z.string().describe("Full name of the candidate"),
    email: z.string().describe("Primary email address"),
    phone: z.string().optional().describe("Phone number with country code if available"),
    location: z.string().optional().describe("City, State or City, Country"),
    linkedin: z.string().optional().describe("LinkedIn profile URL"),
    github: z.string().optional().describe("GitHub profile URL"),
    portfolio: z.string().optional().describe("Personal website or portfolio URL"),
});

const ExperienceSchema = z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().optional(),
    startDate: z.string().describe("Format: YYYY-MM, or 'YYYY' if only year known"),
    endDate: z.string().describe("Format: YYYY-MM, or 'Present' if current role"),
    bullets: z.array(z.string()).describe("Bullet points or achievements from this role"),
});

const EducationSchema = z.object({
    institution: z.string(),
    degree: z.string().describe("e.g., 'MS', 'BS', 'PhD'"),
    field: z.string().describe("e.g., 'Computer Science'"),
    graduationDate: z.string().describe("Format: YYYY-MM or YYYY"),
    gpa: z.string().optional(),
});

const ProjectSchema = z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()).describe("Tech stack used"),
    link: z.string().optional().describe("URL to live project or repo"),
});

const SkillsSchema = z.object({
    languages: z.array(z.string()).describe("Programming languages"),
    frameworks: z.array(z.string()).describe("Frameworks and libraries"),
    databases: z.array(z.string()).describe("Databases and data stores"),
    tools: z.array(z.string()).describe("Dev tools, cloud platforms, methodologies"),
    other: z.array(z.string()).describe("Other technical skills not in above categories"),
});

// --- Top-level Resume schema ---

export const ResumeSchema = z.object({
    contact: ContactSchema,
    summary: z.string().optional().describe("Professional summary or objective if present"),
    skills: SkillsSchema,
    experience: z.array(ExperienceSchema),
    education: z.array(EducationSchema),
    projects: z.array(ProjectSchema).describe("Personal/portfolio projects, not work experience"),
    certifications: z.array(z.string()).optional(),
    publications: z.array(z.object({
    title: z.string(),
    venue: z.string().describe("Conference, journal, or publisher"),
    year: z.string(),
    role: z.string().optional().describe("Candidate's contribution"),})).optional(),

});

// --- Match result schema (used by `match` command) ---

export const MatchResultSchema = z.object({
    matchScore: z.number().min(0).max(100).describe("Overall fit score 0-100"),
    summary: z.string().describe("2-3 sentence overall assessment"),
    matchedSkills: z.array(z.string()).describe("Skills/requirements from JD that the candidate clearly has"),
    missingSkills: z.array(z.string()).describe("Skills/requirements from JD the candidate is missing or weak on"),
    transferableExperience: z.array(z.string()).describe("Existing experience that maps well to JD requirements"),
    suggestedBulletRewrites: z.array(z.object({
        original: z.string(),
        rewritten: z.string(),
        reason: z.string(),
    })).describe("Up to 5 resume bullets rewritten to better match the JD"),
    redFlags: z.array(z.string()).describe("Concerns the candidate should address — e.g., experience gaps, missing required skills"),
});


// --- JSON schemas for Gemini's responseSchema (no $ref allowed) ---

export const ResumeJsonSchema = {
    type: "object",
    properties: {
        contact: {
            type: "object",
            properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                location: { type: "string" },
                linkedin: { type: "string" },
                github: { type: "string" },
                portfolio: { type: "string" },
            },
            required: ["name", "email"],
        },
        summary: { type: "string" },
        skills: {
            type: "object",
            properties: {
                languages: { type: "array", items: { type: "string" } },
                frameworks: { type: "array", items: { type: "string" } },
                databases: { type: "array", items: { type: "string" } },
                tools: { type: "array", items: { type: "string" } },
                other: { type: "array", items: { type: "string" } },
            },
            required: ["languages", "frameworks", "databases", "tools", "other"],
        },
        experience: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    company: { type: "string" },
                    role: { type: "string" },
                    location: { type: "string" },
                    startDate: { type: "string" },
                    endDate: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } },
                },
                required: ["company", "role", "startDate", "endDate", "bullets"],
            },
        },
        education: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    institution: { type: "string" },
                    degree: { type: "string" },
                    field: { type: "string" },
                    graduationDate: { type: "string" },
                    gpa: { type: "string" },
                },
                required: ["institution", "degree", "field", "graduationDate"],
            },
        },
        publications: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    venue: { type: "string" },
                    year: { type: "string" },
                    role: { type: "string" },
                },
                required: ["title", "venue", "year"],
            },
        },
        projects: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    technologies: { type: "array", items: { type: "string" } },
                    link: { type: "string" },
                },
                required: ["name", "description", "technologies"],
            },
        },
        certifications: { type: "array", items: { type: "string" } },
    },
    required: ["contact", "skills", "experience", "education", "projects"],
};

export const MatchResultJsonSchema = {
    type: "object",
    properties: {
        matchScore: { type: "number" },
        summary: { type: "string" },
        matchedSkills: { type: "array", items: { type: "string" } },
        missingSkills: { type: "array", items: { type: "string" } },
        transferableExperience: { type: "array", items: { type: "string" } },
        suggestedBulletRewrites: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    original: { type: "string" },
                    rewritten: { type: "string" },
                    reason: { type: "string" },
                },
                required: ["original", "rewritten", "reason"],
            },
        },
        redFlags: { type: "array", items: { type: "string" } },
    },
    required: ["matchScore", "summary", "matchedSkills", "missingSkills", "transferableExperience", "suggestedBulletRewrites", "redFlags"],
};