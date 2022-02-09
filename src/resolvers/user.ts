import argon2 from "argon2";
import {
  validateRegister,
  validateRegisterDuplicate,
} from "../utils/registerValidation";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { COOKIE_NAME } from "../constants";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { getFieldErrors } from "../utils/utils";
import { LoginInputs } from "./LoginInputs";
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
    @Arg("options") options: LoginInputs,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    const user = await em.findOne(User, { username });

    if (!username) {
      return getFieldErrors("username", "Username is required");
    } else if (username.length <= 5) {
      return getFieldErrors(
        "username",
        "Username length must be greater than 5"
      );
    }

    if (!password) {
      return getFieldErrors("password", "Password is required");
    } else if (password.length <= 5) {
      return {
        errors: [
          {
            field: "password",
            message: "Password length must be greater than 5",
          },
        ],
      };
    }

    const errors = {
      errors: [
        {
          field: "username",
          message: "There is no user with the given credentials",
        },
      ],
    };

    if (!user) {
      return errors;
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return errors;
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
