import { defineAction } from "astro:actions";
import { z } from "astro/zod";

export const server = {
  getGreeting: defineAction({
    input: z.object({ name: z.string() }),
    handler: async (input) => {
      console.log("Received input for getGreeting:", input);
      return `Hello, ${input.name}!`;
    },
  }),
};
