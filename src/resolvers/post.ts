import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { createPostValidation } from "../utils/createPostValidation";
import { PostInput } from "./PostInput";
import { PostResponse } from "./PostResponse";
import { getConnection } from "typeorm";

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  bodySnippet(@Root() root: Post) {
    const dotDotDot = root.body.length > 50 ? "..." : "";
    return root.body.slice(0, 50) + dotDotDot;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const queryParams: any[] = [realLimitPlusOne];

    if (cursor) {
      queryParams.push(new Date(parseInt(cursor)));
    }

    // select p.*, u.id, u.username, u.email

    const allPosts = await getConnection().query(
      `
      select p.*, json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
      ) author
      from post p
      inner join public.user u on u.id = p."authorId"
      ${cursor ? 'where p."createdAt" < $2' : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      queryParams
    );

    const posts = allPosts.slice(0, realLimit);
    const hasMore = allPosts.length === realLimitPlusOne;

    return { posts, hasMore };
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
      await Post.update({ id }, { title, body });
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
