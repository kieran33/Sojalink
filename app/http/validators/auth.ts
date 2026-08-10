import vine from '@vinejs/vine'

const passwordRule = vine
  .string()
  .minLength(8)
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).*/)

export const registerValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(4).maxLength(255),
    password: passwordRule,
  })
)

export const loginValidator = vine.compile(
  vine.object({
    username: vine.string().trim(),
    password: vine.string(),
  })
)
