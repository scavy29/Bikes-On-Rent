const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const budgetSchema=new Schema({
    bikeID:{
        type:Schema.Types.ObjectId,
        ref:'Bike'
    },
    total:{
        type:Number
    },
    renter:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    date:{
        type:Date,
        default:Date.now
    }
});

module.exports=mongoose.model('Budget',budgetSchema);