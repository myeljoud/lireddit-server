import { Field, InputType } from "type-graphql";

@InputType()
export class LoginInputs {
  @Field()
  usernameOrEmail: string;
  @Field()
  password: string;
}
