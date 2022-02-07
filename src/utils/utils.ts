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
