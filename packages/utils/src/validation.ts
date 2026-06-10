import { isValidCpf, stripCpf } from './cpf';
import { isValidEmail, normalizeEmail } from './email';
import { isValidPhone, stripPhone } from './phone';

export interface RegisterValidationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function validateRegisterInput(input: RegisterValidationInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.firstName?.trim() || input.firstName.trim().length < 2) {
    errors.firstName = 'Nome deve ter pelo menos 2 caracteres';
  }

  if (!input.lastName?.trim() || input.lastName.trim().length < 2) {
    errors.lastName = 'Sobrenome deve ter pelo menos 2 caracteres';
  }

  if (!isValidCpf(input.cpf)) {
    errors.cpf = 'CPF inválido';
  }

  if (!isValidEmail(input.email)) {
    errors.email = 'E-mail inválido';
  }

  if (!isValidPhone(input.phone)) {
    errors.phone = 'Telefone inválido. Use DDD + número (10 ou 11 dígitos)';
  }

  if (!input.address?.trim() || input.address.trim().length < 5) {
    errors.address = 'Endereço deve ter pelo menos 5 caracteres';
  }

  if (!input.city?.trim() || input.city.trim().length < 2) {
    errors.city = 'Cidade inválida';
  }

  const state = input.state?.trim().toUpperCase();
  if (!state || !BRAZILIAN_STATES.includes(state)) {
    errors.state = 'Estado inválido (use sigla, ex: SP)';
  }

  if (!input.password || input.password.length < 8) {
    errors.password = 'Senha deve ter pelo menos 8 caracteres';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeRegisterInput(input: RegisterValidationInput): RegisterValidationInput {
  return {
    ...input,
    email: normalizeEmail(input.email),
    cpf: stripCpf(input.cpf),
    phone: stripPhone(input.phone),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
  };
}

export { BRAZILIAN_STATES };
