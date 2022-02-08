import argon2 from "argon2";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { getFieldErrors } from "../utils/utils";

@InputType()
class RegisterInputs {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;
}

@InputType()
class LoginInputs {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

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
    if (!username) {
      return getFieldErrors("username", "Username is required");
    } else if (username.length <= 5) {
      return getFieldErrors(
        "username",
        "Username length must be greater than 5"
      );
    }

    if (!email) {
      return getFieldErrors("email", "Email is required");
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
      return getFieldErrors("email", "Invalid email address");
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
    const hashedPassword = await argon2.hash(password);

    const user = em.create(User, { username, email, password: hashedPassword });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === "23505" || error.detail.includes("already exists")) {
        if (error.detail.includes("Key (email)")) {
          return getFieldErrors("email", "This email is taken");
        } else if (error.detail.includes("Key (username)")) {
          return getFieldErrors("username", "This username is taken");
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
}
