import { emailPattern, usernamePattern } from "../constants";
import { RegisterInputs } from "../resolvers/RegisterInputs";

export const validateRegister = (options: RegisterInputs) => {
  const { username, email, password } = options;

  if (!username) {
    return [
      {
        field: "username",
        message: "Username is required",
      },
    ];
  }

  if (!usernamePattern.test(username)) {
    return [
      {
        field: "username",
        message:
          "Username must be 4 characters at least, and only contains lowercase letters, numbers, - and _",
      },
    ];
  }

  if (!email) {
    return [
      {
        field: "email",
        message: "Email is required",
      },
    ];
  }

  if (!emailPattern.test(email)) {
    return [
      {
        field: "email",
        message: "Invalid email address",
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

  if (password.length <= 5) {
    return [
      {
        field: "password",
        message: "Password length must be greater than 5",
      },
    ];
  }

  return null;
};

export const validateRegisterDuplicate = (errorDetail: string) => {
  if (errorDetail.includes("Key (email)")) {
    return [
      {
        field: "email",
        message: "This email is taken",
      },
    ];
  }

  if (errorDetail.includes("Key (username)")) {
    return [
      {
        field: "username",
        message: "This username is taken",
      },
    ];
  }

  return null;
};
