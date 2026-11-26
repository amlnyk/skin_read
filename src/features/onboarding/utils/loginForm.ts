export type LoginErrors = { email?: 'email_invalid'; password?: 'password_short' };

export const MIN_PASSWORD_LENGTH = 6;

// A simple shape check, enough for a form hint: something@something.something, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the login form. An empty result means the form can be sent. */
export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'email_invalid';
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = 'password_short';
  return errors;
}
