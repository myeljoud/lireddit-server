import argon2 from "argon2";
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
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
import { getConnection } from "typeorm";

@Resolver(User)
export class UserResolver {
  @FieldResolver()
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }

    return "";
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext): Promise<User | undefined> {
    if (!req.session.userId) {
      return undefined;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async passwordReset(
    @Arg("newPassword") newPassword: string,
    @Arg("passwordConfirmation") passwordConfirmation: string,
    @Arg("token") token: string,
    @Ctx() { redis, req }: MyContext
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
            message: "Invalid or expired token!",
          },
        ],
      };
    }

    const userIdInt = parseInt(userId);

    const user = await User.findOne(userIdInt);

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

    const hashedPassword = await argon2.hash(newPassword);
    await User.update({ id: userIdInt }, { password: hashedPassword });

    await redis.del(tokenKey);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<boolean> {
    if (!email || !emailPattern.test(email)) {
      return false;
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      await sleep(getRandomArbitrary(3, 7) * 1000);
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

    try {
      await sendEmail(email, passwordResetEmailSubject, passwordResetEmailBody);
    } catch (error) {
      // An Error occured
      console.error("NodeMailer Error: ", error);
    }

    return true;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: RegisterInputs,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const { username, email, password } = options;

    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(password);
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({ username, email, password: hashedPassword })
        .returning("*")
        .execute();

      user = result.raw[0];
    } catch (error) {
      if (error.code === "23505" || error.detail.includes("already exists")) {
        const duplicateError = validateRegisterDuplicate(error.detail);

        if (duplicateError) {
          return { errors: duplicateError };
        }
      }
    }

    req.session.userId = user?.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateLogin({ usernameOrEmail, password });

    if (errors) {
      return { errors };
    }

    const isUsername = !emailPattern.test(usernameOrEmail);

    const user = await User.findOne({
      where: isUsername
        ? { username: usernameOrEmail }
        : { email: usernameOrEmail },
    });

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
