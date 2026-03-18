// src/config/passport.js
import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import https from "https";
import fs from "fs";
import path from "path";

// ── Download Google avatar to local uploads/ ─────────────────────────────────
const downloadAvatar = (url, filename) => {
  return new Promise((resolve) => {
    if (!url) { console.log("❌ No URL"); return resolve(""); }
    const filepath = path.join("uploads", filename);
    console.log("📥 Downloading:", url);
    console.log("📁 Saving to:", filepath);
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      console.log("📡 Status:", res.statusCode);
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        return resolve("");
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        const stats = fs.statSync(filepath);
        console.log("📦 File size:", stats.size, "bytes");
        if (stats.size < 3000) {
          fs.unlink(filepath, () => {});
          console.log("⚠️ Too small, skipping");
          return resolve("");
        }
        console.log("✅ Saved as:", filename);
        resolve(filename);
      });
    }).on("error", (err) => {
      console.log("❌ Download error:", err.message);
      fs.unlink(filepath, () => {});
      resolve("");
    });
  });
};

// ── Shared find-or-create logic ──────────────────────────────────────────────
const findOrCreateUser = async ({ providerId, providerField, email, name, avatar }) => {
  const filename = `google_${providerId}.jpg`;

  // 1. Already linked to this provider
  let user = await User.findOne({ [providerField]: providerId });
  if (user) {
    // Re-download if profileImage is missing
    if (!user.profileImage && avatar) {
      user.profileImage = await downloadAvatar(avatar, filename);
      await user.save();
    }
    return user;
  }

  // 2. Email exists → link provider to existing account
  user = await User.findOne({ email });
  if (user) {
    user[providerField] = providerId;
    if (!user.profileImage && avatar) {
      user.profileImage = await downloadAvatar(avatar, filename);
    }
    await user.save();
    return user;
  }

  // 3. Brand new user → download avatar + create
  const profileImage = await downloadAvatar(avatar, filename);
  user = await User.create({
    name,
    email,
    [providerField]: providerId,
    profileImage, // filename if real photo, "" if letter avatar → initials shows
    role:   "student",
    status: "approved",
  });

  return user;
};

// ── Google Strategy ──────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value;

        if (!email) return done(new Error("Google account has no email"), null);

        const user = await findOrCreateUser({
          providerId:    profile.id,
          providerField: "googleId",
          email,
          name:  profile.displayName,
          avatar,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── No sessions — using JWT ──────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;