const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    content : {
        type : String,
        require : true
    },
    chatId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Chat"
    }
},{timestamps : true});

const Message = mongoose.model("Message",messageSchema);
module.exports = Message;
