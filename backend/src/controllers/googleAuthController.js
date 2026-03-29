// src/controllers/googleAuthController.js
import jwt from "jsonwebtoken";


/*
  ══════════════════════════════════════════════
  🔐 GOOGLE OAUTH CALLBACK CONTROLLER
  ══════════════════════════════════════════════
  Called after passport.authenticate("google") succeeds.
  req.user is already populated by the Google strategy in passport.js.

  This controller only:
    1. Reads req.user (set by Passport)
    2. Issues the same JWT your existing loginUser uses
    3. Redirects to /auth/callback on the frontend

  ✅ Existing authController.js is NEVER touched.

  Future providers (GitHub, Microsoft etc.) get their own
  identical callback function added at the bottom of this file.
  ══════════════════════════════════════════════
*/

// ── Shared JWT issuer — same payload shape as your existing loginUser ────────
const issueJWT = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

// ── Build the redirect URL the frontend /auth/callback page expects ──────────
const buildRedirectURL = (user, token) => {
  const params = new URLSearchParams({
    token,
    id:           String(user._id),
    name:         user.name,
    email:        user.email,
    role:         user.role,
    profileImage: user.profileImage || "",
  });
  return `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`;
};

// ── Google callback ──────────────────────────────────────────────────────────
export const googleCallback = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
    }

    const token = issueJWT(req.user);
    res.redirect(buildRedirectURL(req.user, token));
  } catch (err) {
    console.error("Google callback error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

/*
  ── Future GitHub callback (uncomment when ready) ───────────────────────────
  export const githubCallback = (req, res) => {
    try {
      if (!req.user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=github_auth_failed`);
      const token = issueJWT(req.user);
      res.redirect(buildRedirectURL(req.user, token));
    } catch (err) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  };
*/
