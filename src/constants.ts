export const __prod__ = process.env.NODE_ENV === "production";

export const PORT = process.env.PORT || 4000;
export const COOKIE_NAME = "qid";

export const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
export const usernamePattern = /^[a-z0-9_-]{4,16}$/i;
