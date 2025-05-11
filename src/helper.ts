import { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";

export const accessTokenCookieOptions: CookieOptions = {
  maxAge: 1000 * 60 * 20 * 3 * 12,
  httpOnly: true,
  sameSite: "none",
  secure: true,
  signed: true,
};

export const Cookiehelper = (res: Response, user: any) => {
  const { password: m, ...userWithoutPassword } = user;
  const token = jwt.sign(userWithoutPassword, process.env.TOKEN_SECRET!, {
    expiresIn: "12h",
  });
  res
    .cookie("accessToken", token, accessTokenCookieOptions)
    .status(200)
    .json({ message: "Login successful", user: userWithoutPassword });
};
