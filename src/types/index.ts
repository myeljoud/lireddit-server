import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from "express";

declare module "express-session" {
  interface Session {
    userId: number;
  }
}

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
};

export type FieldError = {
  errors: [
    {
      field: string;
      message: string;
    }
  ];
};
