const express = require("express");
const userControllers = require("./../controllers/userControllers");
const authControllers = require("../controllers/authControllers");
const router = express.Router();

router.post("/signup", authControllers.signup, authControllers.sendSignUpOTP);
//router.get("/sendSignUpOTP", authControllers.sendSignUpOTP)
router.post("/sendSignUpOTP", authControllers.sendSignUpOTP);
router.post("/verifySignUpOTP", authControllers.verifySignUpOTP);

router.post("/forgotPassword", authControllers.forgotPassword);
router.post("/resetPassword/", authControllers.resetPassword);

router.patch(
  "/updatePassword",
  authControllers.protect,
  authControllers.updatePassword
);

router.delete(
  "/deleteUser",
  authControllers.protect,
  userControllers.disableUser,
  authControllers.deleteUser
);
router.patch(
  "/updateMe",
  authControllers.protect,
  userControllers.userPhotoUpload,
  userControllers.userPhotoReOrg,
  userControllers.updateMe
);
router.get(
  "/checkLoggedIn",
  authControllers.protect,
  authControllers.checkLoggedIn
);
router.post("/login", authControllers.logIn);
router.post("/logout", authControllers.protect, authControllers.logOut);
router.post(
  "/logoutAllDevices",
  authControllers.protect,
  authControllers.logOutAllDevices
);

module.exports = router;
