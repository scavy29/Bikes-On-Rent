const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const paySchema=new Schema({
    sdate:{
        type:Date,
        default:Date.now
    },
    stime:{
        type:String
    },
    edate:{
        type:Date,
        default:Date.now
    },
    etime:{
        type:String
    },
    type:{
        type:String
    }
});

module.exports=mongoose.model('Pay',paySchema); 