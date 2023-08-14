const passport = require("passport");
const User = require("../models/userSchema");
const oAuthControllers = require("./../controllers/oAuthControllers");
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (user) done(null, user);
  } catch (err) {
    done(err, null);
  }
});

//GOOGLE CONFIG
const googleStrategy = require("passport-google-oauth20").Strategy;
passport.use(
  new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET_KEY,
    callbackURL: "http://localhost:3000/api/users/oauth/google/callback",
  }, oAuthControllers.getOAuthResponse)
);

//FACEBOOK CONFIG
const FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_OAUTH_APPID,
  clientSecret: process.env.FACEBOOK_OAUTH_SECRET_KEY,
  callbackURL: "http://localhost:3000/api/users/oauth/facebook/callback",
  profileFields: ['id', 'displayName', 'photos', 'email']
},oAuthControllers.getOAuthResponse)
);
