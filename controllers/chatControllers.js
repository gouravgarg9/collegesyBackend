const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Chat = require("./../models/chatSchema");
const Product = require("../models/productSchema");

exports.getChats = catchAsync(async (req, res, next) => {
  const buyingChats = await Chat.find({ buyerId: req.user._id }).populate({
      path: "sellerId buyerId latestMessage",
      //match : {bothReveal : true}
    }).sort("-latestMessage.createdAt");
  
  const sellingChats = await Chat.find({ sellerId: req.user._id }).populate({
      path: "sellerId buyerId latestMessage",
      //match : {bothReveal : true}
    }).sort("-latestMessage.createdAt");

  res.status(200).json({
    status: "success",  
    data: {
      buyingChats,
      sellingChats,
    },
  });
});

exports.getChatbyProduct = catchAsync(async (req, res, next) => {
  //if user is seller
  let chat;
  if (req.product.sellerId.equals(req.user._id)) {
    //give all chats with product_id
    chat = await Chat.find({ productId: req.product._id }).populate({
      path: "sellerId buyerId latestMessage",
      //match : {bothReveal : true}
    }).sort("-latestMessage.createdAt");;
  } else {
    //if buyer
    //check if chat exist for buyer and product
    chat = await Chat.findOne({
      $and: [
        { buyerId: { $eq: req.user._id } },
        { productId: { $eq: req.product._id } },
      ],
    }).populate({
      path: "sellerId buyerId latestMessage",
      //match : {bothReveal : true}
    });

    //create chat if don't exist already
    if (!chat) {
      if (!req.product.interestedViews) req.product.interestedViews = 0;
      req.product.interestedViews++;
      Product.findByIdAndUpdate(req.product._id, req.product);
      chat = await Chat.create({
        buyerId: req.user._id,
        productId: req.product._id,
        sellerId: req.product.sellerId,
      }).populate({
        path: "sellerId buyerId latestMessage",
        //match : {bothReveal : true}
      });;
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      chat,
    },
  });
});

exports.reveal = catchAsync(async (req, res, next) => {
  const { chatId } = req.body;
  let chat = await Chat.findById(chatId).populate('latestMessage');
  if (
    !chat ||
    !chat.active ||
    !(chat.buyerId.equals(req.user._id) || chat.sellerId.equals(req.user._id))
  )
    return next(new AppError("Forbidden", 403));
  if (req.user._id.equals(chat.sellerId)) chat.sReveal = true;
  if (req.user._id.equals(chat.buyerId)) chat.bReveal = true;
  if(chat.sReveal && chat.bReveal) chat.bothReveal = true;
  await chat.save();
  if (chat.bothReveal)
    chat = await Chat.findById(chat._id).populate({ path: "sellerId buyerId latestMessage" });
  res.status(200).json({
    status: "success",
    data: {
      chat,
    },
  });
});

exports.getChatbyChatId = catchAsync(async (req,res,next)=>{
  let chat = await Chat.findById(req.params.chatId);
  if(!chat || !(chat.sellerId.equals(req.user._id) || chat.buyerId.equals(req.user._id)))
    return next(new AppError('Forbidden',403));
  if(chat.bothReveal)
    chat = await Chat.findById(chat._id).populate({ path: "sellerId buyerId latestMessage" });

    res.status(200).json({
      status: "success",
      data: {
        chat,
      },
    });

})
exports.blockChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.body;
  const chat = await Chat.findById(chatId);
  if (
    !chat ||
    !chat.active ||
    !(chat.buyerId.equals(req.user._id) || chat.sellerId.equals(req.user._id))
  )
    return next(new AppError("Forbidden", 403));
  await Chat.findByIdAndUpdate(chat._id, { active: false });
  res.status(200).json({
    status: "success",
  });
});
