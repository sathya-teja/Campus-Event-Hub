// src/config/passport.js
import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import { uploadUrlToCloudinary } from "../services/cloudinaryService.js";

const PROFILE_IMAGE_FOLDER = "campuseventhub/profiles";

// ── Shared find-or-create logic ──────────────────────────────────────────────
const findOrCreateUser = async ({ providerId, providerField, email, name, avatar }) => {
  // 1. Already linked to this provider
  let user = await User.findOne({ [providerField]: providerId });
  if (user) {
    // Backfill Cloudinary avatar if missing
    if (!user.profileImage && avatar) {
      const uploadedUrl = await uploadUrlToCloudinary(avatar, PROFILE_IMAGE_FOLDER);
      if (uploadedUrl) {
        user.profileImage = uploadedUrl;
        await user.save();
      }
    }
    return user;
  }

  // 2. Email exists → link provider to existing account
  user = await User.findOne({ email });
  if (user) {
    user[providerField] = providerId;
    if (!user.profileImage && avatar) {
      const uploadedUrl = await uploadUrlToCloudinary(avatar, PROFILE_IMAGE_FOLDER);
      if (uploadedUrl) {
        user.profileImage = uploadedUrl;
      }
    }
    await user.save();
    return user;
  }

  // 3. Brand new user → upload avatar to Cloudinary + create
  const profileImage = await uploadUrlToCloudinary(avatar, PROFILE_IMAGE_FOLDER);
  user = await User.create({
    name,
    email,
    [providerField]: providerId,
    profileImage: profileImage || avatar || "", // Cloudinary URL, raw Google URL, or "" → initials fallback shows
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