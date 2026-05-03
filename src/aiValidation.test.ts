import { describe, it, expect } from 'vitest';
import { checkPromptInjection } from './services/geminiService';
import { validateAiResponse, ThreatDetectionSchema, ResumeAnalysisSchema } from './services/aiValidation';

describe('AI Safety & Validation', () => {
    it('should validate valid threat detection response', () => {
        const mockResponse = { isMalicious: false, threatReason: undefined, sanitizedText: "Hello" };
        const result = validateAiResponse(mockResponse, ThreatDetectionSchema);
        expect(result.isMalicious).toBe(false);
    });

    it('should throw error on invalid schema', () => {
        const mockResponse = { someRandomThing: true };
        expect(() => validateAiResponse(mockResponse, ThreatDetectionSchema)).toThrow();
    });
});

describe('Resume Intelligence Validation', () => {
   it('should support legacy ATS fields and diffInsights safely', () => {
       const mockResume = {
          engineeringDepth: 8,
          growthTrajectory: 9,
          summary: "Great Dev",
          skills: ["React"],
          transferableSkills: ["JS"],
          leadershipSignals: [],
          yearsOfExperience: 4,
          domainExpertise: ["Frontend"],
          atsScore: 95,
          readabilityScore: 85,
          diffInsights: ["Improved React ecosystem knowledge"],
          aiConfidenceScore: 92,
          validationStatus: "valid"
       };
       const result = validateAiResponse(mockResume, ResumeAnalysisSchema);
       expect(result.atsScore).toBe(95);
       expect(result.diffInsights?.length).toBe(1);
   });
});
