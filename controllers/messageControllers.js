const Chat = require("../models/chatSchema");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync")
const Message = require('./../models/messgaeSchema');

// exports.sendMessage = catchAsync(async (req,res,next)=>{
//     const {chatId,content} = req.body;
//     if(!chatId || !content)
//         return next(new AppError('Bad Request',404));
        
//     const chat = await Chat.findById(chatId);
//     if(!chat || !(chat.buyerId.equals(req.user._id) || chat.sellerId.equals(req.user._id)) || !chat.active)
//         return next(new AppError('Chat do not exist or blocked'));
    
//     const message = await Message.create({
//         senderId : req.user._id,
//         content,
//         chatId
//     });

//     await Chat.findByIdAndUpdate(chatId,{latestMessageId : message._id});
    
//     res.status(200).json({
//         status : 'success',
//         message : 'message sent'
//     })
// })

exports.getMessages = catchAsync(async (req,res,next)=>{
    const chatId = req.params.chatId;
    if(!chatId)return next(new AppError('Bad Request',404));
    const chat = await Chat.findById(chatId);
    if(!chat || !(chat.buyerId.equals(req.user._id) || chat.sellerId.equals(req.user._id)))
        return next(new AppError('Bad Request',404));
    const messages = await Message.find({chatId}).sort('createdAt');
    res.status(200).json({
        status : 'success',
        data : {
            messages
        }
    })
})

// exports.deleteMessage = catchAsync(async (req,res,next)=>{
//     const {messageId} = req.body;
//     if(!messageId)return new AppError('Bad Request',404);
//     await Message.findByIdAndDelete(messageId);
//     res.status(200).json({
//         status : 'success'
//     })
// })