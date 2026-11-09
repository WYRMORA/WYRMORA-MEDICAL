import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const isBcryptPasswordLengthValid = password =>
  typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 72;

export const passwordSchema = z.string().min(10).max(72)
  .refine(isBcryptPasswordLengthValid, 'Password must not exceed 72 UTF-8 bytes')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(4000),
  categoryId: z.coerce.number().int().positive(),
  price: z.coerce.number().positive().max(100000000),
  stock: z.coerce.number().int().min(0).max(100000)
});
