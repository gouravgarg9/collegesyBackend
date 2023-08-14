const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const appError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorControllers')
const userRouter = require('./routes/userRouter');
const chatRouter = require('./routes/chatRouter');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const XSSClean = require('xss-clean');
const paymentRouter = require('./routes/paymentRouter');
const cookieParser = require('cookie-parser');
const compression = require('compression')
const productRouter = require('./routes/productRouter')
const messageRouter = require('./routes/messageRouter')
const cors=require('cors')
const limiter = rateLimit({
    max: 10000,
    windowMs : 60*60*1000,
    message : '100 Request Limit crossed for this hour'
});

const app = express();

app.use(cors({credentials:true, exposedHeaders: ["set-cookie"], origin: process.env.FRONT_END_URL}));

//setting pug view engine for mails
app.set('views', path.join(__dirname,'views'));
app.set('view engine','pug');

//set secuirty header
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

//development logging
if(process.env.NODE_ENV === 'development')
    app.use(morgan('tiny'));

//rate limiter for an ip
app.use('/api',limiter)

//body Parser and cookie-parser
app.use(express.json({ limit : '10kb'}));
app.use(express.urlencoded({extended : true}));
app.use(cookieParser());
// app.use(bodyParser.urlencoded({extended:true}));
// app.use(bodyParser.json());

//data sanitization against NoSQL query attacks and cross site scripting attacks
//e.g in place of id one can send a query in email which may resul true
app.use(mongoSanitize());
app.use(XSSClean());

//test middleware
app.use((req,res,next)=>{
    req.reqTime = new Date().toString();
    next();
});

app.use(compression());

//serve static files
app.use(express.static(path.join(__dirname,'public')));
app.use("./images/products",express.static(path.join(__dirname,'/images')));
app.use("./images/users",express.static(path.join(__dirname,'/images')));

// routes
// const upcLookup = require('./utils/upcLookUp');
// app.get('/',async(req,res,next)=>{
//     const upcRes = await upcLookup.upcLookupFun(6941059623571);
// });


// const imgToText = require('./utils/imgToText');
// app.get('/',async(req,res,next)=>{
//     const arr = await imgToText.detectText();
//     const newArr = imgToText.getRequired(arr,"ingredients");
//     newArr.forEach((s)=>console.log(s));
// });

app.use('/api/users',userRouter);
app.use('/api/chats',chatRouter);
app.use('/api/payments',paymentRouter);
app.use('/api/products',productRouter);
app.use('/api/messages',messageRouter);
//to handle unhandled requests
app.all('*',(req,res,next)=>{
    next(new appError(`Can't find ${req.originalUrl}`,404)); 
});

//using Global error handler
app.use(globalErrorHandler);

module.exports = app;