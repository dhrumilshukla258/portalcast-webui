export interface PasswordChecks {
  length: boolean;
  capital: boolean;
  number: boolean;
  special: boolean;
}

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}
