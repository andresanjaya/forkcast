import { z } from "zod";

export const CandidateSchema = z.object({
  candidateName: z.string().trim().min(1).max(100),
  estimatedServing: z.object({
    value: z.number().positive().max(1000),
    unit: z.string().trim().min(1).max(30),
    gramsMin: z.number().positive().max(3000),
    gramsMax: z.number().positive().max(3000),
  }).strict().refine((serving) => serving.gramsMax >= serving.gramsMin, "Serving range is reversed"),
  estimatedNutritionPer100g: z.object({
    calories: z.number().min(0).max(900),
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fat: z.number().min(0).max(100),
  }).strict(),
  nutritionConfidence: z.enum(["low", "medium", "high"]),
  visibleNotes: z.string().max(240),
  confidence: z.enum(["low", "medium", "high"]),
  needsConfirmation: z.boolean(),
}).strict();

export const AnalysisSchema = z.object({
  items: z.array(CandidateSchema).min(1).max(10),
  followUpQuestion: z.string().max(200).optional(),
  disclaimer: z.string().min(1).max(250),
}).strict();

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export function imageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}
