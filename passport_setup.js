const LocalStrategy = require('passport-local').Strategy;
const utilityHelper = require('./utilty/general/utilityHelper');
const accountOperations = require('./utilty/account/accountOperations');
var GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
var TwoFAStrategy = require('passport-2fa-totp').Strategy;

module.exports= function(passport)
{
    passport.serializeUser((account, done)=>{
        done(null,account.id);
    });

    passport.deserializeUser(async(id, done) =>{
        const account = await accountOperations.findAccountById(id);
        if(account== null)
            done( new Error('Wrong account id'));

        done(null,account);
    });

    passport.use(new LocalStrategy({
        usernameField:'email',
        passwordField:'password',
        passReqToCallback: true
    }, async (req,email,password,done)=>{
        const account = await accountOperations.findAccountByEmail(email);

        if(account == null){
            req.flash('message', 'Incorrect Credentials');
            return done(null,false);
        } 
        if(account.accountTypeFk == 1) {
            req.flash('message', 'Admin');
            return done(null,false);
        }
        else if( account.password == null || account.password == undefined){
            req.flash('message', 'You must reset your password');
            return done(null, false);
        }
        else if(!utilityHelper.validPassword(account, password)){
            req.flash('message', 'Incorrect credentials');
            return done(null,false);
        }

        return done(null,account);
        
    }));

    passport.use('local2' ,new LocalStrategy({
        usernameField:'email',
        passwordField:'password',
        passReqToCallback: true
    }, async (req,email,password,done)=>{
        const account = await accountOperations.findAccountByEmail(email);

        if(account == null){
            req.flash('message', 'Incorrect Credentials');
            return done(null,false);
        }
        
        return done(null,account);
        
    }));


    passport.use('login2', new TwoFAStrategy({
        usernameField: 'email',
        passwordField: 'password',
        codeField:'code',
        passReqToCallback: true,
        skipTotpVerification:true

    }, async function(req,email, password,done){

        var account = await accountOperations.findAccountByEmail(email);
        
        if(account == null )
        {
            req.flash('message', 'Incorrect Credentials');
            return done(null,false);
        } 
        if(account.accountTypeFk != 1) {
            req.flash('message', 'Not Admin');
            return done(null,false);
        }
        else if( account.password == null || account.password == undefined)
        {
            req.flash('message', 'You must reset your password');
            return done(null, false);
        }
        else if(!utilityHelper.validPassword(account, password))
        {
            req.flash('message', 'Incorrect credentials');
            return done(null,false);
        }

        return done(null,account);

    },function(req,user,done)
    {}));

    passport.use('register', new TwoFAStrategy({
        usernameField: 'email',
        passwordField: 'password',
        codeField:'code',
        passReqToCallback: true,
        skipTotpVerification:false
    }, async function(req,email, password,done){
        done(null,req.user);
    }, async function(req,user,done){

        const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(user.id);
        var secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
        done(null,secret,30);
    }));


    passport.use('login1', new TwoFAStrategy({
        usernameField: 'email',
        passwordField: 'password',
        codeField:'code',
        passReqToCallback: true,
        skipTotpVerification:false
    }, async function(req,email, password,done){


        var account = await accountOperations.findAccountByEmail(email);
        
        if(account == null ) {
            req.flash('message', 'Incorrect Credentials');
            return done(null,false);
        }
        if(account.accountTypeFk != 1) {
            req.flash('message', 'Not Admin');
            return done(null,false);
        }
        else if( account.password == null || account.password == undefined)
        {
            req.flash('message', 'You must reset your password');
            return done(null, false);
        }
        else if(!utilityHelper.validPassword(account, password))
        {
            req.flash('message', 'Incorrect credentials');
            return done(null,false);
        }

        return done(null,account);

    },async function(req,account,done)
    {
        if(account.accountTypeFk != 1)
           return done(new Error("Not an admin Account"));
        

        const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
        if(twoFactorAuth == null || !twoFactorAuth.authenticatedFl) {
           return done(null,account);
        }
        
        var secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
        done(null,secret,30);
        
    }))
}