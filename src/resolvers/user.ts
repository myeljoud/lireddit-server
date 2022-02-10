import argon2 from "argon2";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { v4 } from "uuid";
import { COOKIE_NAME, emailPattern, PASSWORD_RESET_PREFIX } from "../constants";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { validateLogin } from "../utils/loginValidation";
import { validatePasswordReset } from "../utils/passwordResetValidation";
import {
  validateRegister,
  validateRegisterDuplicate,
} from "../utils/registerValidation";
import { sendEmail } from "../utils/sendEmail";
import { getRandomArbitrary, sleep } from "../utils/utils";
import { RegisterInputs } from "./RegisterInputs";
import { UserResponse } from "./UserResponse";

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext): Promise<User | null> {
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });

    return user;
  }

  @Mutation(() => UserResponse)
  async passwordReset(
    @Arg("newPassword") newPassword: string,
    @Arg("passwordConfirmation") passwordConfirmation: string,
    @Arg("token") token: string,
    @Ctx() { em, redis, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validatePasswordReset({ newPassword, passwordConfirmation });

    if (errors) {
      return { errors };
    }
    const tokenKey = PASSWORD_RESET_PREFIX + token;
    const userId = await redis.get(tokenKey);

    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "This token has expired!",
          },
        ],
      };
    }

    const userIdInt = parseInt(userId);

    const user = await em.findOne(User, { id: userIdInt });

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "This user no longer exists!",
          },
        ],
      };
    }

    user.password = await argon2.hash(newPassword);

    await em.persistAndFlush(user);
    await redis.del(tokenKey);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ): Promise<boolean> {
    if (!email || !emailPattern.test(email)) {
      return false;
    }

    const user = await em.findOne(User, { email });

    if (!user) {
      await sleep(getRandomArbitrary(5, 8) * 1000);
      return true;
    }

    const passwordResetUrlToken = v4();

    await redis.set(
      PASSWORD_RESET_PREFIX + passwordResetUrlToken,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 // one day
    );

    const passwordResetEmailSubject = "Password reset request";
    const passwordResetUrl = `http://localhost:3030/password-reset/${passwordResetUrlToken}`;

    const passwordResetEmailBody = `<div><h1>Reset your password?</h1><p>If you requested a password reset for ${email}, click the link below. If you didn't make this request, ignore this email.</p><a style="color: "#285e61';" href="${passwordResetUrl}">Reset password</a><br /><br /><small>Link valid for 1 day!</small></div>`;

    await sendEmail(email, passwordResetEmailSubject, passwordResetEmailBody);

    return true;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: RegisterInputs,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, email, password } = options;

    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(password);

    const user = em.create(User, { username, email, password: hashedPassword });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === "23505" || error.detail.includes("already exists")) {
        const duplicateError = validateRegisterDuplicate(error.detail);

        if (duplicateError) {
          return { errors: duplicateError };
        }
      }
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateLogin({ usernameOrEmail, password });

    if (errors) {
      return { errors };
    }

    const isUsername = !emailPattern.test(usernameOrEmail);
    const user = await em.findOne(
      User,
      isUsername ? { username: usernameOrEmail } : { email: usernameOrEmail }
    );

    const wrongUserError = [
      {
        field: "usernameOrEmail",
        message: "There is no user with the given credentials",
      },
    ];

    if (!user) {
      return { errors: wrongUserError };
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return { errors: wrongUserError };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    return new Promise(resolve => {
      req.session.destroy(err => {
        if (err) {
          console.log("Session destroy err: ", err);
          resolve(false);
          return;
        }

        res.clearCookie(COOKIE_NAME);
        resolve(true);
      });
    });
  }
}
