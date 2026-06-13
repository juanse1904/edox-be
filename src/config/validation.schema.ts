import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('edox-be'),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('3600s'),

  CORS_ORIGIN: Joi.string().default('*'),

  MAIL_HOST: Joi.string().default('127.0.0.1'),
  MAIL_PORT: Joi.number().default(1025),
  MAIL_FROM: Joi.string().default('noreply@edox.com'),
});
