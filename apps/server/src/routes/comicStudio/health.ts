import { Router } from "express";
import { success } from "@/lib/responseFormat";

export default Router().get("/", (_req, res) => {
  res.set("Cache-Control", "no-store").json(success({ application: "comicStudio", version: 1 }));
});
