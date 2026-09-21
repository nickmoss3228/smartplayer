// routes/payments.routes.js
//
// Two routers, mounted very differently.
//
// paymentsRoutes goes at /api/payments inside the normal stack, under the global
// rate limiter and the JSON body parser.
//
// webhookRoutes is mounted separately in app.js, ABOVE both of those: a
// throttled webhook reads to an acquirer as a failed delivery, and a parsed body
// destroys the raw bytes a signature check needs. It uses mergeParams so the
// handler can read :driver from the mount path.

import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../helpers/asyncHandler.js";
import {
  createOrder,
  getOrder,
  listOrders,
  getPaymentConfig,
  paymentWebhook,
  fakeDescribe,
  fakeAct,
} from "../controllers/payment.controller.js";

const router = Router();

// Public: the shop needs to know whether checkout is live before anyone logs in.
router.get("/config", asyncHandler(getPaymentConfig));

router.post("/orders", authenticateToken, orderLimiter, asyncHandler(createOrder));
router.get("/orders", authenticateToken, asyncHandler(listOrders));
router.get("/orders/:id", authenticateToken, asyncHandler(getOrder));

// The fake acquirer's hosted page, and its buttons.
//
// Deliberately unauthenticated, because the page they stand in for is on a
// bank's domain and is reached without our cookie — requiring auth here would
// make the fake behave unlike the thing it is imitating, which is the one thing
// it must not do. The controller 404s both unless a driver that moves no money
// is selected.
router.get("/fake/:id", asyncHandler(fakeDescribe));
router.post("/fake/:id/act", asyncHandler(fakeAct));

// mergeParams so :driver from the mount path in app.js reaches the handler.
const webhookRouter = Router({ mergeParams: true });
webhookRouter.post("/", asyncHandler(paymentWebhook));

export { router as paymentsRoutes, webhookRouter as webhookRoutes };
