import { LoginInputs } from "src/resolvers/LoginInputs";

export const validateLogin = (options: LoginInputs) => {
  const { usernameOrEmail, password } = options;

  if (!usernameOrEmail) {
    return [
      {
        field: "usernameOrEmail",
        message: "You are required to provide a username or an email",
      },
    ];
  }

  if (!password) {
    return [
      {
        field: "password",
        message: "Password is required",
      },
    ];
  }

  return null;
};
