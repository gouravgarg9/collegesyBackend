require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/messgaeSchema')

process.on('uncaughtException',(err)=>{
    console.log(err);
    process.exit(1);
})

const app = require('./app');
const Chat = require('./models/chatSchema');

//const DB = process.env.DB_CONN_STR;
const Initial_DB = process.env.MONGODB_ATLAS_LINK;
const Inter_DB = Initial_DB.replace('<username>',process.env.MONGODB_ATLAS_USERNAME);
const DB = Inter_DB.replace('<password>',process.env.MONGODB_ATLAS_PASSWORD);
mongoose.connect(DB,{
    useNewUrlParser: true,
    useUnifiedTopology : true
})
.then(() => console.log('DB connection successfull!'));

const port = process.env.PORT;
const server = app.listen(port,() => console.log("Server running on port :",port));
    
const io = require('socket.io')(server,{
    pingTimeout : 60000,
    cors : {
        origin : process.env.FRONT_END_URL
    }
})

const mapping = {};
io.on('connection',(socket)=>{    
    //need userId to be passed
    socket.on('join',async (userId)=>{
        socket.join(userId);
        socket.emit('connected');
        let chat = await Chat.find({buyerId : userId});
        const nDate = new Date(Date.now());

        for(let ch of chat){
            ch.lastRecieveByBuyer = nDate;
            await Chat.findByIdAndUpdate(ch._id,ch);
            io.to(ch.sellerId).emit('recieve',ch._id)
        };

        chat = await Chat.find({sellerId : userId});
        for(let ch of chat){
            ch.lastRecieveBySeller = nDate;
            await Chat.findByIdAndUpdate(ch._id,ch);
            io.to(ch.buyerId).emit('recieve',ch._id)
        };
    });
    
    socket.on('message',async (data)=>{
        const {content, senderId,recieverId, chatId} = data;
        const chat = await Chat.findById(chatId);
        if(!chat || !chat.active || !(chat.sellerId == senderId || chat.buyerId == senderId))return ;
        const message = await Message.create({
            senderId,
            content,
            chatId
        })
        await Chat.findByIdAndUpdate(chatId,{latestMessage : message._id})
        io.to(senderId).emit('message1',message);
        io.to(recieverId).emit('message1',message);
    });

    socket.on('typing',(data)=>{
        const {chatId,senderId,recieverId} = data;
        socket.in(senderId).emit('disableTyping',chatId);
        io.to(recieverId).emit('typing',chatId);
    })

    socket.on('seen',async(data)=>{
        const {chatId,senderId,recieverId} = data;
        let chat = await Chat.findById(chatId);
        const role = (chat.sellerId ==recieverId)?'Seller':'Buyer';
        const x = {}
        x[`lastSeenBy${role}`] = new Date(Date.now());
        console.log(await Chat.findByIdAndUpdate(chat._id,x,{new:true}));
        io.to(senderId).emit('seen',chatId);
    })
    
    socket.on('reveal',async(data)=>{
        const {chatId,senderId,recieverId} = data;
        let chat = await Chat.findById(chatId);
        if (senderId == chat.sellerId) chat.sReveal = true;
        if (senderId == chat.buyerId) chat.bReveal = true;
        if(chat.sReveal && chat.bReveal) chat.bothReveal = true;
        console.log(await chat.save());
        if (chat.bothReveal) io.to(senderId).emit('reveal',chatId);
        if (chat.bothReveal) io.to(recieverId).emit('reveal',chatId);
    })

    //client will listen to recieve event to mark its sent messages delivered
    socket.on('recieve',async (data)=>{
        const {chatId,senderId,recieverId} = data;
        const chat = await Chat.findById(chatId);
        const role = (chat.sellerId == recieverId)?'Seller':'Buyer';
        chat[`lastRecieveBy${role}`] = new Date(Date.now());
        console.log(await Chat.findByIdAndUpdate(chat._id,chat,{new:true}));
        io.to(senderId).emit('recieve',chatId);
    });

    // //client as soon as open chat will emit read event 
    // //to mark blue tick he will listen to read events
    // socket.on('read',async (data)=>{
    //     const {chatId,userId} = data;
    //     const chat = await Chat.findById(chatId);
    //     const role = (chat.sellerId ==userId)?'Seller':'Buyer';
    //     chat[`lastSeenBy${role}`] = Date.now();
    //     await Chat.findByIdAndUpdate(chat._id,chat);
    //     socket.broadcast.to(chatId).emit('read1');
    // })

    socket.on('disconnect',()=>{})
})

process.on('unhandledRejection',(err)=>{
    console.log(err);
    server.close(()=>process.exit(1));
})