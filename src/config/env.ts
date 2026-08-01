import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalCsvString = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.string().trim().min(1)).optional(),
);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required.'),
  MONGODB_DNS_SERVERS: optionalCsvString,
  AUTH_SECRET: z.string(),
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  API_URL: z.url().default('http://localhost:4000'),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  CORS_URL: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim().replace(/\/$/, ''))
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1, 'CORS_URL must include an allowed origin.')),
  ACCESS_TOKEN_MAX_AGE_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(15),
  REFRESH_TOKEN_MAX_AGE_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  COOKIE_SAME_SITE: z.enum(['lax', 'none']).default('lax'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config);
}
