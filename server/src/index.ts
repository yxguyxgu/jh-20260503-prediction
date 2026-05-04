import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT) || 4000;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export default app;
