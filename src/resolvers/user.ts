import argon2 from "argon2";
import { validateLogin } from "../utils/loginValidation";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { COOKIE_NAME, emailPattern, PASSWORD_RESET_PREFIX } from "../constants";
import { User } from "../entities/User";
import { MyContext } from "../types";
import {
  validateRegister,
  validateRegisterDuplicate,
} from "../utils/registerValidation";
import { RegisterInputs } from "./RegisterInputs";
import { UserResponse } from "./UserResponse";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";

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

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });

    if (!user) {
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
