import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { createPostValidation } from "../utils/createPostValidation";
import { PostInput } from "./PostInput";
import { PostResponse } from "./PostResponse";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find().then(res => res.reverse());
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("inputs") inputs: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<PostResponse> {
    const errors = createPostValidation(inputs);

    if (errors) {
      return { errors };
    }

    const post = await Post.create({
      ...inputs,
      authorId: req.session.userId,
    }).save();

    return { post };
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", { nullable: true }) title: string,
    @Arg("body", { nullable: true }) body: string
  ): Promise<Post | undefined> {
    let post = await Post.findOne(id);

    if (!post) {
      return undefined;
    }

    if (typeof title !== "undefined" && typeof body !== "undefined") {
      const p = await Post.update({ id }, { title, body });
      console.log("Updatedpost: ", p);
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    try {
      await Post.delete(id);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}
