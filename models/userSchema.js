const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserSchema = new mongoose.Schema({
    oauthType : {
        type : String,
        require : true,
        enum : ['local','google','facebook','apple'],
        default : 'local'
    },
    username : {
        type : String,
    },
    email : {
        type : String,
        require : [true,"plz provide an email id"],
        unique : [true,"email already exists in database"],
        lowercase : true,
        validate : [validator.isEmail,'Please provide a valid email']
    },
    photo: {
        type : String,
        default : 'xyz.png'
    },
    oauthId : String,

    role : {
        type : String,
        enum : ['buyer','seller','admin'],
        default : 'buyer'
    },
    password : {
        type : String,
        minlength : [8,'try longer password'],
        select : false
    },
    passwordConfirm : {
        type : String,
        require  : [true, 'confirm your password'],
        //executes only on create and save only
        validate:{
            validator: function(el){
                return el === this.password;
            },
            message : "password don't match"
        }
    },
    passwordChangedAt : Date,
    passwordResetToken : String,
    passwordResetExpires : Date,
    active:{
        type:Boolean,
        default: true,
    },    
    verified:{
        type:Boolean,
        default:false
    },
    deleteBy: Date,
    hashedOTP : String,
    OTPExpires : Date,
    jwtTokens : [
        {
            token: String,
            expiresBy: Date
        }
    ],
    lastLogOutFromAllDevices : Date
},{timestamps:true});


// UserSchema.pre(/^find/,function(next){
//     this.find({active : {$ne : false}});
//     next();
// });


UserSchema.pre('save',async function(next){
    if((this.isNew || this.isModified('password')) && this.password)
    {
        this.password = await bcrypt.hash(this.password,12);
        //passwordconfirm was required to schema not database
        this.passwordConfirm = undefined;
        this.passwordChangedAt = Date.now() - 1000; 
        this.passwordResetToken = undefined;
        this.passwordResetExpires = undefined;
    }
    next();
});

UserSchema.methods.verifyPassword = async function(candidatePassword,userPassword)
{
    //we need to pass userpassword as well as this.password is not available as password select is set to false
    return await bcrypt.compare(candidatePassword,userPassword);
}

UserSchema.methods.addJwtToken = async function(token,time){
    const partiallyHashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const encryptedToken = await bcrypt.hash(partiallyHashedToken,12);
    let expiresBy = new Date(Date.now() + process.env.NOT_REMEMBER_TIME*24*60*60*1000);
    if(time) expiresBy = new Date(Date.now() + process.env.COOKIE_JWT_EXPIRES*24*60*60*1000);
    //for early verification in subsequent requests, we have added new token at beginning, not end
    this.jwtTokens.unshift({token:encryptedToken,expiresBy});
    await this.save();
}

//since it need to be done before every logged in request completely,
//using find to move on as soon as possible and not removing old tokens here
UserSchema.methods.verifyJwtToken = async function(candidateToken){
    let ans;
    const partiallyHashedCandidateToken = crypto.createHash("sha256").update(candidateToken).digest("hex");
    if(!this.jwtTokens || this.jwtTokens?.length==0)return false;
    if( await bcrypt.compare(partiallyHashedCandidateToken,this.jwtTokens[0].token)) return true;
    for(const singleTokenObj of this.jwtTokens){
        const userToken = singleTokenObj.token;
        if(await bcrypt.compare(partiallyHashedCandidateToken,userToken)){
            ans = singleTokenObj;
            break;
        }
    }
    if(!ans)return false;
    // //for early verification in subsequent requests, we have added new token at beginning
    // const i = this.jwtTokens.indexOf(ans);
    // this.jwtTokens.unshift(ans);
    // this.jwtTokens.splice(i+1,1);
    // await this.save();
    return true;
}

//since we move on calling it ,it can be a bit heavy
//using filter and removing old tokens
UserSchema.methods.removeToken = async function(candidateToken){
    const partiallyHashedCandidateToken = crypto.createHash("sha256").update(candidateToken).digest("hex");
    const tokenToKeepOrNot = await Promise.all(this.jwtTokens.map(async (singleTokenObj)=>{
        if(singleTokenObj.expiresBy < Date.now())
            return false;
        const userToken = singleTokenObj.token;
        const matched = await bcrypt.compare(partiallyHashedCandidateToken,userToken);
        if(matched)
            return false;
        return true;
    }));
    const res = this.jwtTokens.filter((value, index) => tokenToKeepOrNot[index]);
    this.jwtTokens = res;
    await this.save();
}

UserSchema.methods.passwordChangedAfter = function(JWTtimestamp){
    if(this.passwordChangedAt){
        passwordTimeStamp = Date.parse(this.passwordChangedAt);
        return passwordTimeStamp > JWTtimestamp*1000; 
    }    
    return false;
}

UserSchema.methods.createPassResetKey = async function(){
    const resetKey = crypto.randomBytes(16).toString('hex');
    const passwordResetToken = crypto.createHash('sha256').update(resetKey).digest('hex');
    console.log(passwordResetToken);
    const passwordResetExpires = Date.now() + 10 * 60 * 1000;
    this.passwordResetToken = passwordResetToken;
    this.passwordResetExpires = passwordResetExpires;
    console.log(await this.save({ validateBeforeSave: false })); 
    return resetKey;
}

const User = mongoose.model('user',UserSchema);

module.exports = User;
