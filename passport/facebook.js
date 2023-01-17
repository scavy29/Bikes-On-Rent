const passport=require('passport');
const facebookStrategy=require('passport-facebook').Strategy;
//To bring User COllections
const User=require('../models/user');
//Load keys file
const keys=require('../config/keys');


require('dotenv').config()

//fetch user id and generate cookie id
passport.serializeUser((user,done)=>{
    done(null,user.id); 
});

passport.deserializeUser((id,done)=>{
    User.findById(id,(err,user)=>{
        done(err,user);
    });
});

// facebookStratergy
passport.use(new facebookStrategy({
    clientID:keys.FBAppId,
    clientID:keys.FBAppId,
    clientSecret:keys.FBAppSECRET,
    callbackURL:'http://localhost:8000/auth/facebook/callback',
    profileFields:['email','name','displayName','photos']
},(accessToken,refreshToken,profile,done)=>{
    console.log(profile);
    // save user data
    User.findOne({facebook:profile.id},(err,user)=>{
        if(err){
            return done(err);
        }
        if(user){
            return done(null,user);
        }
        else{
            const newUser={
                facebook:profile.id,
                firstname:profile.name.givenName,
                lastname:profile.name.familyName,
                image:`https://graph.facebook.com/${profile.id}/picture?type=large`,
                email:profile.emails[0].value
            }
            new User(newUser).save((err,user)=>{
                if(err){
                    return done(err);
                }
                if(user){
                    return done(null,user);
                }
            })
        }
    })
}));