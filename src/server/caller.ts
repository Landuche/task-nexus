import { appRouter } from "./routers/_app";

// Calls the router directly from Server Components, so SSR skips the HTTP round trip.
export const caller = appRouter.createCaller({});
