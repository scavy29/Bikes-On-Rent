if(process.env.NODE_ENV=='production'){
    module.exports=require('.env');
}
else{
    module.exports=require('./dev.js')
}