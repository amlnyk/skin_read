import { describe, expect, it } from 'vitest';
import { validateLogin } from '../loginForm';

describe('validateLogin', () => {
  it('accepts a normal email and a long enough password', () => {
    expect(validateLogin('anna@example.com', 'secret1')).toEqual({});
  });

  it('trims spaces around the email', () => {
    expect(validateLogin('  anna@example.com ', 'secret1')).toEqual({});
  });

  it('flags an email without @ or domain', () => {
    expect(validateLogin('anna', 'secret1').email).toBe('email_invalid');
    expect(validateLogin('anna@mail', 'secret1').email).toBe('email_invalid');
  });

  it('flags a short password', () => {
    expect(validateLogin('anna@example.com', '12345').password).toBe('password_short');
  });
});
