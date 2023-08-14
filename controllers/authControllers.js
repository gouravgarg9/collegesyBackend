const User = require("../models/userSchema");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Mail = require("../utils/email");
const crypto = require("crypto");
const OTP = require("../utils/otpGenerator");
const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.COOKIE_JWT_EXPIRES * 24 * 60 * 60 * 1000,
  });
};

const createAndSendToken = async (user, statusCode,time, res) => {
  if (!user) return next(new AppError("No user to generate Token",404));
  try{
    // user.addJwtToken(token,time);
    //await user.addJwtToken(token,time);
    //trying to make things a bit fast. Don't need to wait to add token to user in db 
    const token = signToken(user._id);
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'none',
    };
    if(time) cookieOptions.expires = new Date(Date.now() + process.env.COOKIE_JWT_EXPIRES * 24 * 60 * 60 * 1000);
    if(process.env.NODE_ENV === 'production')   cookieOptions.secure = true; 
    res.cookie("jwt", token, cookieOptions);
    res.status(statusCode).json({
    status: "success",
    token,
    data : {
      user
    }
  });
  }catch(err){
    console.log(err);
    res.status(500).json({
      status: "Internal Error",
      message: "Can't log you in."
    })
  }
};


exports.signup = catchAsync(async (req, res, next) => {
  const email =  req.body?.email;
  if (!email)
    return next(new AppError("Bad Request.No mail recieved.", 404));
  const user = await User.findOne({ email });
  if (user && user.verified)
    return next(new AppError("Account exists. Just Login to use", 404));
  if (user && !user.verified){
    req.body.email = user.email;
    return next();
  }
  
  const newUser = await User.create({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  if (!newUser) next(new AppError(`Account can't be created`), 404);
  req.body.email = newUser.email;
  //to send signup otp
  next();
});

exports.sendSignUpOTP = catchAsync(async (req, res, next) => {
  const email =  req.body?.email;
  if (!email)
    return next(new AppError("Bad Request.No mail recieved.", 404));
  const newUser = await User.findOne({email});
  if (!newUser)
    return next(new AppError("No Sign up request from this account", 404));
  if (newUser.verified)
    return next(new AppError(`Already Verified.Log in`, 404));

  try {
    OTP.generateSendSaveOTP(newUser);
    //await OTP.generateSendSaveOTP(newUser);
    //saving some time dude
  } catch (err) {
    return next(new AppError(`Problem Generating OTP. Try Again.`, 500));
  }

  res.status(200).json({
    status: "success",
    message: "OTP sent",
  });
});

exports.verifySignUpOTP = catchAsync(async (req, res, next) => {
  const email =  req.body?.email;
  const otp = req.body?.otp;
  if (!email || !otp)
    return next(new AppError("Bad Request", 404));

  let newUser = await User.findOne({email}).select("+password");

  if (!newUser)
    return next(new AppError("No Sign up request from this account", 404));
  if (newUser.verified)
    return next(new AppError(`Already Verified.Log in`, 404));

  const hashedCandidateOTP = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  if (Date.now() > Date.parse(newUser.OTPExpires))
    return next(new AppError("OTP Expired,Try Again", 404));

  if (hashedCandidateOTP !== newUser.hashedOTP)
    return next(new AppError("Wrong OTP,Try Again", 404));

  newUser.verified= true
  newUser.OTPExpires=undefined
  newUser.hashedOTP= undefined
  newUser.save({validateBeforeSave:false});
  //await newUser.save({validateBeforeSave:false});
  //saving some time dude

  new Mail(newUser).sendVerified();
  res.status(200).json({
    status: "success",
    message: "Account Verified",
  });
});


// recieves mail in body and send resetkey
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const email =  req.body?.email;
  if (!email)
    return next(new AppError("Bad Request.No mail recieved.", 404));

  const user = await User.findOne({email});
  if (!user) return next(new AppError("No user found", 404));

  //generate key and update user
  const resetKey = await user.createPassResetKey();

  //generate url and send mail
  const resetRoute = "reset-password";
  const resetUrl = `${process.env.FRONT_END_URL}/${resetRoute}/?${resetKey}`;
  try {
    new Mail(user).sendResetPasswordURL({ resetUrl });
    //await new Mail(user).sendResetPasswordURL({ resetUrl });
    //saving some time dude
    res.status(200).json({
      status: "success",
      message: "Reset Link sent to mail id",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Unable to send mail. Try later", 500));
  }
});

// recieves key verify it and set new passsword
exports.resetPassword = catchAsync(async (req, res, next) => {
  //hash token and get user
  console.log(req.body.token);
  
  const hashtoken = crypto
    .createHash("sha256")
    .update(req.body.token.substr(1))
    .digest("hex");

  
  const user = await User.findOne({ passwordResetToken: hashtoken }).select("+password");

  if (!user) return next(new AppError("Token is invalid", 404));

  let message = null;
  if (Date.parse(user.passwordResetExpires) < Date.now())
    message = "Token Expired";
  else if (await user.verifyPassword(req.body.password, user.password))
    message = "Same as old password.Try new one.";
  else {
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
  }

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  if (message) {
    user.save({ validateBeforeSave: false });
    //await user.save({ validateBeforeSave: false });
    //saving some time dude
    return next(new AppError(message, 404));
  }

  //4. LogOutFromAllDevices
  //saving some time dude
  //if(!await LogOutFromAllDevices(user))
  //return next(new AppError("Can't update Password.", 500));
  //await user.save();
  
  LogOutFromAllDevices(user);
  user.save();
  new Mail(user).sendPasswordChanged();

  res.status(200).json({
    status: "success",
    message: "Password Changed Successfully.",
  });

  
});

exports.checkLoggedIn = (req, res)=>{
  res.status(200).json({
    status : "success",
    data : {
      user : req.user
    }
  })
}

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1.get user
  const user = await User.findById(req.user._id).select("+password");

  //2.checkforPassword
  const passwordCorrect = await user.verifyPassword(
    req.body.currentPassword,
    user.password
  );

  user.password = undefined;
  if (!user || !passwordCorrect)
    return next(new AppError("Wrong Password", 404));
  else if (req.body.currentPassword === req.body.newPassword)
    return next(new AppError("Same as old password.Try new one.", 404));

  LogOutFromAllDevices(user);
  //4. LogOutFromAllDevices
  //saving some time dude
  //if(!await LogOutFromAllDevices(user))
  //return next(new AppError("Can't update Password.", 500));


  //3.updateNewPassword
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.confirmNewPassword;
  await user.save();

  

  new Mail(user).sendPasswordChanged();
  res.status(200).json({
    status: "success",
    message: "Password Changed Successfully.",
  });

});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");
  const correct = await user.verifyPassword(req.body.password, user.password);
  if (!user || !correct) return next(new AppError("Invalid credentials", 404));

  LogOutFromAllDevices(user);
  await user.updateOne({ active: false ,deleteBy : new Date(
    Date.now() + process.env.DELETE_ACCOUNT_BY * 24 * 60 * 60 * 1000
  )});
  
  res.status(204).json({
    status: "success",
    data: null,
  });
});

//login
exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError("PLease provide email and password", 400));

  //select to to explicitly select password as its select is fals ein schema as we need to verify login
  const user = await User.findOne({ email: email }).select("+password");
  console.log(user)
  if (!user || !(user && (await user.verifyPassword(password, user.password)))) {
    return next(new AppError("Invalid mail or password", 401));
  }

  //For secuirty, dont tell password or mail whats wrong
  // if(!user)
  // return next(new AppError('No user registered with this mail',401));

  // if(!user.verifyPassword(password,user.password))
  //     return next(new AppError('Wrong Password',401));


  // const rememberMe = false;
  // if(req.body?.rememberMe) rememberMe = true;
  rememberMe=req.body.rememberMe;
  // console.log(rememberMe)
  await user.updateOne({active:true})
  //await user.updateOne({active:true})
  //save some time dude
  createAndSendToken(user, 200,rememberMe,res);
});


//protect
exports.protect = catchAsync(async (req, res, next) => {
  //get token and check if exists
  let token = null;
  console.log(req.cookies);
  if (req.cookies?.jwt) token = req.cookies.jwt;
  else if (req.headers?.authorization?.split(" ")[0] === "Bearer")
    token = req.headers.authorization.split(" ")[1];

  if (!token || token == "logged out") return next(new AppError("Not logged in", 401));

  //validate and decode token
  //sign verify are synchronous but we will make verify promise by using promisify from native util module
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET_KEY
  );

  //check if user exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser || !freshUser.active ) return next(new AppError("User don't exist"));

  //if user changed password after token issued
  if (freshUser.passwordChangedAfter(decoded.iat))
    return next(new AppError("Password changed recently"));

  //check if loggedOutFromAllDevices
  //if(! await freshUser.verifyJwtToken(token))
  if(!( !freshUser.lastLogOutFromAllDevices || freshUser.lastLogOutFromAllDevices < decoded.iat))
    return next(new AppError("Please Log In Again"));

  //finally authorize access
  req.user = freshUser;
  req.token = token;
  //res.locals.user = freshUser;
  // console.log(freshUser)
  return next();
});


//logout 
exports.logOut = catchAsync(async (req, res, next) => {
  
  //await req.user.removeToken(req.token);
  res.cookie("jwt", "logged out", {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    sameSite: 'none',
    secure: true
  });
  res.status(200).json({
    status: "success"
  });
});

exports.logOutAllDevices = catchAsync(async (req,res,next)=>{
  await LogOutFromAllDevices(req.user);
  //console.log(req.cookie);
  res.cookie("jwt", "logged out", {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    sameSite: 'none',
    secure: true
  });
  //console.log(req.cookie);
  res.status(200).json({
    status : 'success'
  })
})
//logoutfromalldevices
const LogOutFromAllDevices = async(user)=>{
  try {
    //await User.findByIdAndUpdate(user._id,{jwtTokens : []});
    await User.findByIdAndUpdate({lastLogOutFromAllDevices : Date.now()})
    return true;
  } catch (error) {
    return false;
  } 
};


