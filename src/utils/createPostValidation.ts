import { PostInput } from "src/resolvers/PostInput";

export const createPostValidation = (options: PostInput) => {
  const { title, body } = options;

  if (!title) {
    return [
      {
        field: "title",
        message: "Title is required",
      },
    ];
  }

  if (title.length <= 5) {
    return [
      {
        field: "title",
        message: "Title length must be greater than 5",
      },
    ];
  }

  if (!body) {
    return [
      {
        field: "body",
        message: "Body is required",
      },
    ];
  }

  if (body.length <= 10) {
    return [
      {
        field: "body",
        message: "Body length must be greater than 5",
      },
    ];
  }

  return null;
};
