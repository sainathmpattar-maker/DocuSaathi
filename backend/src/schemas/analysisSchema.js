'use strict';

/**
 * schemas/analysisSchema.js
 *
 * Zod validation schema for structured Gemini AI document intelligence output.
 * Ensures the model output is strictly typed, validated, and sanitized before saving to database.
 */

const { z } = require('zod');

const DocumentTypeEnum = z.enum([
  'GST Invoice',
  'Utility Bill',
  'Tax Notice',
  'Bank Notice / Bank Letter',
  'Medical Bill',
  'Rent Agreement',
  'Other',
  'Unknown',
]);

const SeverityEnum = z.enum(['info', 'warning', 'error', 'critical']);
const PriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

const ExtractedFieldSchema = z.object({
  field_name: z.string().min(1),
  field_value: z.union([z.string(), z.number(), z.boolean()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined) return null;
    return String(val);
  }),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

const RiskItemSchema = z.object({
  severity: SeverityEnum,
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['open', 'acknowledged', 'resolved']).default('open'),
});

const DeadlineItemSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().nullable().optional().transform((val) => {
    if (!val || typeof val !== 'string') return null;
    const clean = val.trim();
    // Validate simple YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    // Try parsing date
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  }),
  priority: PriorityEnum.default('medium'),
  completed: z.boolean().default(false),
});

const PlainLanguageExplanationSchema = z.object({
  whatIsThis: z.string().min(1),
  whatItMeans: z.string().min(1),
  whatUserMustDo: z.string().min(1),
  cautions: z.string().min(1),
});

const GeminiAnalysisResponseSchema = z.object({
  documentType: DocumentTypeEnum,
  confidenceScore: z.number().min(0).max(1),
  documentSummary: z.string().min(1),
  plainLanguageExplanation: PlainLanguageExplanationSchema,
  fields: z.array(ExtractedFieldSchema).default([]),
  risks: z.array(RiskItemSchema).default([]),
  deadlines: z.array(DeadlineItemSchema).default([]),
  actionPlan: z.array(z.string()).default([]),
});

module.exports = {
  DocumentTypeEnum,
  SeverityEnum,
  PriorityEnum,
  ExtractedFieldSchema,
  RiskItemSchema,
  DeadlineItemSchema,
  PlainLanguageExplanationSchema,
  GeminiAnalysisResponseSchema,
};
