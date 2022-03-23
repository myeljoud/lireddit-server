import { Updoot } from "src/entities/Updoot";
import { MyContext } from "src/types";
import { Arg, Ctx, Int, Mutation, Resolver } from "type-graphql";
import { getConnection } from "typeorm";

@Resolver(Updoot)
export class UpdootResolver {
  @Mutation(() => Boolean)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session;
    const isUpdoot = value > 0;
    const realValue = isUpdoot ? 1 : -1;

    try {
      await Updoot.insert({ postId, userId, value: realValue });
    } catch (err) {
      console.log(err);
      throw new Error("Updoot insertion failed");
    }

    await getConnection().query(
      `
      update post
      set points = points + $1
      where id = $2
    `,
      [realValue, userId]
    );

    return true;
  }
}
