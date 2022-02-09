import { Field, InputType } from "type-graphql";

@InputType()
export class LoginInputs {
  @Field()
  username: string;
  @Field()
  password: string;
}
