import { Field, InputType } from "type-graphql";

@InputType()
export class RegisterInputs {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;
}
