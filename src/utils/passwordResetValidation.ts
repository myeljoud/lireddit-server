interface PasswordResetInputs {
  newPassword: string;
  passwordConfirmation: string;
}

export const validatePasswordReset = (options: PasswordResetInputs) => {
  const { newPassword, passwordConfirmation } = options;

  if (!newPassword) {
    return [
      {
        field: "newPassword",
        message: "New password is required",
      },
    ];
  }

  if (newPassword.length <= 5) {
    return [
      {
        field: "newPassword",
        message: "Password length must be greater than 5",
      },
    ];
  }

  if (!passwordConfirmation) {
    return [
      {
        field: "passwordConfirmation",
        message: "Password confirmation is required",
      },
    ];
  }

  if (newPassword !== passwordConfirmation) {
    return [
      {
        field: "passwordConfirmation",
        message: "Password confirmation must match exactly your new password",
      },
    ];
  }

  return null;
};
