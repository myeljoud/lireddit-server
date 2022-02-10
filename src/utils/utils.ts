import { FieldError } from "../types";

export function getFieldErrors(field: string, message: string): FieldError {
  return {
    errors: [
      {
        field,
        message,
      },
    ],
  };
}

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export function getRandomArbitrary(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
