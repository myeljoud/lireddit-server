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
  } else if (username.length <= 5) {
    return [
      {
        field: "username",
        message: "Username length must be greater than 5",
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
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
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
  } else if (password.length <= 5) {
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
