import { z } from 'zod';

export const ThreatDetectionSchema = z.object({
  isMalicious: z.boolean(),
  threatReason: z.string().optional(),
  sanitizedText: z.string().optional()
});

export const ResumeAnalysisSchema = z.object({
  engineeringDepth: z.number().min(0).max(10),
  growthTrajectory: z.number().min(0).max(10),
  summary: z.string(),
  skills: z.array(z.string()),
  transferableSkills: z.array(z.string()),
  leadershipSignals: z.array(z.string()),
  yearsOfExperience: z.number(),
  domainExpertise: z.array(z.string()),
  atsScore: z.number().min(0).max(100).optional(),
  readabilityScore: z.number().min(0).max(100).optional(),
  diffInsights: z.array(z.string()).optional(),
  aiConfidenceScore: z.number().default(90),
  validationStatus: z.enum(['valid', 'low_confidence', 'flagged']).default('valid')
});

export const JobBiasSchema = z.object({
  hasBias: z.boolean(),
  biasScore: z.number().min(0).max(10),
  suggestions: z.array(z.string()),
  improvedDescription: z.string(),
  aiConfidenceScore: z.number().default(90),
});

export const MatchScoreSchema = z.object({
  score: z.number().min(0).max(100),
  explanation: z.string(),
  strengths: z.array(z.string()),
  missingSkills: z.array(z.string()),
  growthPotential: z.string(),
  aiConfidenceScore: z.number().default(90),
});

// A pure function to validate response against schema and compute fallback confidence
export function validateAiResponse<T>(data: any, schema: z.ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("AI Validation Error:", error);
    throw new Error("AI produced malformed output. Please retry.");
  }
}
