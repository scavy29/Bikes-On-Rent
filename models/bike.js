const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const bikeSchema=new Schema({
    owner:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    make:{
        type:String
    },
    model:{
        type:String
    },
    year:{
        type:Number
    },
    type:{
        type:String
    },
    pricePerWeek:{
        type:Number
    },
    pricePerHour:{
        type:Number
    },
    image:[{
        imageUrl:{
            type:String
        }
    }],
    location:{
        type: String
    },
    date:{
        type:Date,
        default:Date.now
    },
    coorde:{
        lat:{
            type:Number
        },
        lng:{
            type:Number
        }
    },
    wallet:{
        type:Number
    }
});

module.exports=mongoose.model('Bike',bikeSchema);
