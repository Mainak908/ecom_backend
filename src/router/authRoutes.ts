import { Router } from "express";
import { loginFunc, signupFunc } from "../controller/authController.js";

const router = Router();

router.route("/login").post(loginFunc);
router.route("/signup").post(signupFunc);

export default router;
