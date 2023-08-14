const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title : {
        type : String,
        require : true
    },
    description : String,
    price : {
        type : Number,
        require : true,
        minimum: [0, 'Not a valid price.']
    },
    sellerId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        require : true
    },
    category : {
        type : String,
        enum : ['Books','Mobiles','Electronics','Accessories','Vehicle','Health & Fitness','Furniture','Calculator','Stationary','Others'],
        default : 'Others'
    },
    imgCount : {
        type : Number,
        default : 0
    },
    interestedViews : {
        type : Number,
        default : 0
    },
    age : Date,
    images : [String],
    active : {
        type : Boolean,
        default : true
    }
},{timestamps:true});


// productSchema.pre(/^find/,function(next){
//     this.find({active : {$ne : false}});
//     next();
// });


const Product = mongoose.model('Product',productSchema);
module.exports = Product;   