import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";

const main = async () => {
  await createConnection({
    type: "postgres",
    database: "lireddit2",
    username: "postgres",
    password: "Mohamed@27020450",
    logging: true,
    synchronize: true,
    entities: [User, Post],
  });

  const app = express();
  !__prod__ && app.set("trust proxy", 1);

  app.use(
    cors({
      origin: ["http://localhost:3030", "https://studio.apollographql.com"],
      credentials: true,
    })
  );

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      secret: "qowiueojwojfalksdjoqiwueo",
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        // httpOnly: true,
        // sameSite: "lax",
        // secure: __prod__,
        httpOnly: false,
        sameSite: "none",
        secure: true,
      },
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver, PostResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log(`listening on http://localhost:${4000}`);
  });
};

main().catch(err => console.error("Errors: ", err));
