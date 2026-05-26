import { z } from "zod";

const emailRe       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const indianMobile  = /^[6-9]\d{9}$/;

export function isEmail(s: string)        { return emailRe.test(s.trim()); }
export function isIndianMobile(s: string) { return indianMobile.test(s.trim()); }

export const identifierSchema = z.string()
  .trim()
  .min(1, "Required")
  .refine((v) => isEmail(v) || isIndianMobile(v),
    "Enter a valid email or 10-digit mobile (starting 6–9).");

export const passwordSchema = z.string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[0-9]/, "Must include a digit");

export const signupSchema = z.object({
  identifier: identifierSchema,
  password:   passwordSchema,
  fullName:   z.string().trim().min(2, "Min 2 characters").max(120),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password:   z.string().min(1, "Required"),
});

export const sportSchema = z.enum(["cricket", "badminton", "volleyball"]);

export const teamRegisterSchema = z.object({
  sport:            sportSchema,
  apartmentName:    z.string().trim().min(2).max(120),
  teamName:         z.string().trim().min(2).max(60),
  captainName:      z.string().trim().min(2).max(80),
  captainMobile:    z.string().trim().regex(indianMobile, "10-digit mobile starting 6–9"),
  apartmentLat:     z.number().min(-90).max(90),
  apartmentLng:     z.number().min(-180).max(180),
  apartmentAddress: z.string().trim().min(3).max(400),
});

export type SignupInput        = z.infer<typeof signupSchema>;
export type LoginInput         = z.infer<typeof loginSchema>;
export type TeamRegisterInput  = z.infer<typeof teamRegisterSchema>;
export type Sport              = z.infer<typeof sportSchema>;
