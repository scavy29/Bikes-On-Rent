// load module
const express = require('express');
const exphbs = require('express-handlebars');
const mongoose=require('mongoose');
const bodyParser=require('body-parser');
// const session=require('express-session');
const session=require('cookie-session');
const cookieparser=require('cookie-parser');
const passport=require('passport'); 
const bcrypt=require('bcryptjs');
const formidable=require('formidable');
const Handlebars=require('handlebars');
const socketIO=require('socket.io');
const http=require('http');


//init app
const app = express();

//Env Variable
require('dotenv').config();
//Setup Body Parser MIddlewware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Configuration for Authentication
app.use(cookieparser());
app.use(session({
    secret:'mysecret',
    maxAge:6000,
    resave:true,
    saveUninitialized:true
}));
app.use(passport.initialize());
app.use(passport.session());    

//Load Helpers
const {requireLogin,ensureGuest}=require('./helpers/authHelpers');

// load passport
require('./passport/local');

//load stratergy passport
require('./passport/facebook');

//make user as a global object
app.use((req,res,next)=>{
    res.locals.user=req.user || null;
    next();
});

//load files or import the keys
const keys=require('./config/keys');
const stripe=require('stripe')(keys.StripeSecretKey);

// Load Collections
const User=require('./models/user');
const Contact=require('./models/contact');
const {upload}=require('./helpers/aws');
const Bike=require('./models/bike');
const Pay=require('./models/pay');
const Budget=require('./models/budget');
const {allowInsecurePrototypeAccess}=require('@handlebars/allow-prototype-access');

// Connect to MongoDB
mongoose.connect(keys.MongoDB,()=>{
    console.log('MongoDB is connected!!!');
}).catch((err)=>{
    console.log(err);
});

//Setup View Engine
app.engine('handlebars',exphbs({
    defaultLayout:'main',
    handlebars:allowInsecurePrototypeAccess(Handlebars)
}));

app.set('view engine','handlebars');
    
// Connect Client Side to Server CSS & JS Files
app.use(express.static('public'));

//Create port
const port=process.env.PORT || 8000;

//handle home route
app.get('/',ensureGuest,(req,res)=>{
    res.render('home',{
        title:'Home'
    });
});

app.get('/about',ensureGuest,(req,res)=>{
    res.render('about',{
        title:"About "
    });
});

app.get('/contact',requireLogin,(req,res)=>{
    res.render('contact',{
        title:"Contact Us"
    });
});

// Save ContactUs Form data
app.post('/contact',requireLogin,(req,res)=>{
    console.log(req.body);
    const newContact={
        name:req.user._id,
        message:req.body.message
    }
    new Contact(newContact).save((err,user)=>{
        if(err){
            throw err;
        }
        else{
            console.log('Received Message from User',user);
        }
    });
});

app.get('/signup',ensureGuest,(req,res)=>{
    res.render('signupForm',{
        title:"Register"
    });
});

app.post('/signup',ensureGuest,(req,res)=>{
    console.log(req.body);
    let errors=[];
    if(req.body.password!=req.body.password2){
        errors.push({text:'Password does not match'});
    }
    if(req.body.password.length<5){
        errors.push({text:'Password must be greater than 5 Letters'});
    }
    if(errors.length>0){
        res.render('signupForm',{
            errors:errors,
            firstname:req.body.firstname,
            middlename:req.body.middlename,
            lastname:req.body.lastname,
            password:req.body.password,
            password2:req.body.password2,
            email:req.body.email
        })
    }else{
        User.findOne({email:req.body.email})
        .then((user)=>{
            if(user){
                let errors=[];
                errors.push({text:'Email Already Exists'});
                res.render('signupForm',{
                    errors:errors,
                    firstname:req.body.firstname,
                    middlename:req.body.middlename,
                    lastname:req.body.lastname,
                    password:req.body.password,
                    password2:req.body.password2,
                    email:req.body.email
                });
            }else{
                //Encrypt the password
                let salt=bcrypt.genSaltSync(10);
                let hash=bcrypt.hashSync(req.body.password,salt);

                const newUser={
                    firstname:req.body.firstname,
                    middlename:req.body.middlename,
                    lastname:req.body.lastname,
                    email:req.body.email,
                    password:hash
                }
                new User(newUser).save((err,user)=>{
                    if(err){
                        throw err;
                    }
                    if(user){
                        let success=[];
                        success.push({text:'Your account is created Successfully'});
                        res.render('loginForm',{
                            success:success
                        })
                    }
                })
            }
        })
    }
});

app.get('/displayLoginForm',ensureGuest,(req,res)=>{
    res.render('loginForm',{
        title: 'Login'
    });
})

// Passport Authentication
app.post('/login',passport.authenticate('local',{
    successRedirect:'/profile',
    failureRedirect:'/loginErrors'
}));

app.get('/auth/facebook',passport.authenticate('facebook',{
    scope:['email']
}));

app.get('/auth/facebook/callback',passport.authenticate('facebook',{
    successRedirect:'/profile',
    failureRedirect:'/'
}));

// Display Profile
app.get('/profile',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .lean()
    .then((user)=>{
        res.render('profile',{
            user:user,
            title:'Profile'
        });
    });
});


///show user online
app.get('/profile',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .lean()
    .then((user)=>{
        user.online=true;
        user.save((err,user)=>{
            if(err){
                throw err;
            }
            if(user){
                res.render('profile',{
                    user:user,
                    title:'Profile'
                });
            }
        })
    });
});


//Login errors
app.get('/loginErrors',(req,res)=>{
    let errors=[];
    errors.push({text:'User Not Found or Password Incorrect'});
    res.render('loginForm',{
        errors:errors,
        title: 'Errors'
    });
});

// List a car
app.get('/listBike',requireLogin,(req,res)=>{
    res.render('listBike',{
        title:'Listing'
    })
})

app.post('/listBike',requireLogin,(req,res)=>{
    const newBike={
        owner:req.user._id,
        make:req.body.make,
        model:req.body.model,
        year:req.body.year,
        type:req.body.type,
    }
    new Bike(newBike).save((err,bike)=>{
        if(err){
            throw err;
        }
        if(bike){
            res.render('listBike2',{
                title:'Finish',
                bike:bike
            });
        }
    })
});


app.post('/listBike2',requireLogin,(req,res)=>{
    Bike.findOne({_id:req.body.bikeID,owner:req.user._id})
    .then((bike)=>{
        let imageUrl={
            imageUrl:`https://bike-on-rent.s3.ap-south-1.amazonaws.com/${req.body.image}`
        };
        bike.pricePerHour=req.body.pricePerHour;
        bike.pricePerWeek=req.body.pricePerWeek;
        bike.location=req.body.location;
        bike.image.push(imageUrl);
        bike.save((err,bike)=>{
            if(err){
                throw err;
            }
            if(bike){
                res.redirect('/showBikes');
            }
        })
    })
});


app.get('/showBikes',requireLogin,(req,res)=>{
    Bike.find({})
    .populate('owner')
    .sort({date:'desc'})
    .then((bikes)=>{
        res.render('showBikes',{
            title:'Bikes',
            bikes:bikes
        })
    })
})

//Rent a Bike and calculate total******************
app.get('/rentBike',requireLogin,(req,res)=>{
    res.render('rentBike',{
        title:'Rental'
    })
})

app.post('/rentBike',requireLogin,(req,res)=>{
    const newPay={
        sdate:req.body.sdate,
        stime:req.body.stime,
        edate:req.body.edate,
        etime:req.body.etime,
	    type:req.body.type,
    }
    new Pay(newPay).save((err,pay)=>{
        if(err){
            throw err;
        }
        if(pay){
            res.redirect('/payStripe');
        }
    })
});

app.post('/rentBike/:id',(req,res)=>{
    Bike.findOne({_id:req.params.id})
    .then((car)=>{
        console.log(req.body);
        console.log('Type is:',typeof(req.body.week));
        console.log('Type is:',typeof(req.body.hour));
    });
});


app.get('/calculate',requireLogin,(req,res)=>{
    res.render('calculate',{
        title:'Payment Info'
    })
})

app.post('/calculate',requireLogin,(req,res)=>{
    const newPay={
        sdate:req.body.sdate,
        stime:req.body.stime,
        edate:req.body.edate,
        etime:req.body.etime,
	type:req.body.type,
    }
    new Pay(newPay).save((err,pay)=>{
        if(err){
            throw err;
        }
        if(pay){
            res.redirect('/calculate');
        }
    })
});

// app.get('/payStripe',requireLogin,(req,res)=>{
//     res.render('payStripe',{
//         title:'Payment Portal'
//     })
// })

// app.post('/calculate',(req,res)=>{
//     Bike.findOne({_id:req.params.id})
//     .then((bike)=>{
//         console.log(req.body);
//         var hour=parseInt(req.body.hour);
//         var week=parseInt(req.body.week);
//         var totalHours=hour*bike.pricePerHour;
//         var totalWeeks=week*bike.pricePerWeek;
//         var total=totalHours+totalWeeks;
//         console.log('Total is: ',total);
//         //Create a budget
//         const budget={
//             bikeID:req.params.id,
//             total:total,
//             renter:req.user._id,
//             date:new Date()
//         }
//         new Budget(budget).save((err,budget)=>{
//             if(err){
//                 console.log(err);
//             }
//             if(budget){
//                 Bike.findOne({_id:req.params.id})
//                 .then((bike)=>{
//                     res.render('calculate',{
//                         budget:budget,
//                         bike:bike
//                     })
//                 }).catch((err)=>{console.log(err)});
//             }
//         })
//     })
// })


//Rent a Bike and calculate total******************
//payment


// Receive Image
app.post('/uploadImage',requireLogin,upload.any(),(req,res)=>{
    const form=new formidable.IncomingForm();
    form.on('file',(field,file)=>{
        console.log(file);
    });
    form.on('error',(err)=>{
        console.log(err);
    });
    form.on('end',()=>{
        console.log('Image Received Successfully');
    });
    form.parse(req);
});


// Log user out
app.get('/logout',(req,res)=>{
    User.findById({_id:req.user._id})
    .then((user)=>{
        user.online=false;
        user.save((err,user)=>{
            if(err){
                throw err;
            }
            if(user){
                req.logout();
                res.redirect('/');
            }
        });
    });
});

// socket connection
const server=http.createServer(app);
const io=socketIO(server);
io.on('connection',(socket)=>{
    console.log('Connected to Client');
    // Listen to ObjectID event
    socket.on('ObjectID',(ObjectID)=>{
        console.log('User ID is:',ObjectID);
        Bike.findOne({owner:ObjectID})
        .then((bike)=>{
            socket.emit('bike',bike);
        });
    });
    // listen to event to receive lat & lng
    socket.on('LatLng',(data)=>{
        console.log(data);
        // find a car object and update lat and lng
        Bike.findOne({owner:data.bike.owner})
        .then((bike)=>{
            // bike.coords.lat=data.data.results[0].geometry.location.lat;
            bike.coords.lng=data.data.results[0].geometry.location.lng;
            bike.save((err,bike)=>{
                if(err){
                    throw err;
                }
                if(bike){
                    console.log('Bike lat and lng is updated');
                }
            })
        }).catch((err)=>{
            console.log(err);
        });
    });
    //Listen to Disconnection
    socket.on('disconnect',(socket)=>{
        console.log('Disconnect(Client)');
    });
});

server.listen(port,()=>{
    console.log(`Server is Running on port: ${port}`);
})