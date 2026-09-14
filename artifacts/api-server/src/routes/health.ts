import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { readRuntimeState } from "../lib/runtime-control.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  const runtime = readRuntimeState();
  const heartbeatAge = runtime.botHeartbeatAt ? Date.now() - Date.parse(runtime.botHeartbeatAt) : Infinity;
  res.json({
    ...data,
    apiEnabled: runtime.apiEnabled,
    botEnabled: runtime.botEnabled,
    botOnline: runtime.botEnabled && heartbeatAge < 90_000,
    botHeartbeatAt: runtime.botHeartbeatAt,
  });
});

export default router;
