const bcrypt = require('bcryptjs');
const models = require('./models');
const accountOperations = require('./utilty/account/accountOperations');
var GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
var TwoFAStrategy = require('passport-2fa-totp').Strategy;

module.exports = function(passport)
{
    passport.serializeUser((user, done)=>{
        done(null,user.id);
    });

    passport.deserializeUser( async (id,done) =>{
        var account = await accountOperations.findAccountById(id);

        if(account == null)
            done( new Error('Wrong account id'));

        done(null,user);
    });

    passport.use(new TwoFAStrategy(async function (email, password, done) {
        // 1st step verification: username and password

        var account = await accountOperations.findAccountByEmail(email);

        if(account == null )
        {
            return done(null,false);
        }
        else if( account.password == null || account.password == undefined)
        {
            return done(null, false);
        }
        else if(!validPassword(account, password))
        {
            return done(null,false);
        }

        return done(null,account);


        }, async function (account, done) {
            // 2nd step verification: TOTP code from Google Authenticator
          
            const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
            if(twoFactorAuth == null || !twoFactorAuth.authenticatedFl)
            {
                done(new Error("Google Authenticator is not setup yet."));
            } 
            else 
            {
                // Google Authenticator uses 30 seconds key period
                // https://github.com/google/google-authenticator/wiki/Key-Uri-Format

                var secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
                done(null, secret, 30);
            }
        })

    );

    const validPassword = function(account, password)
    {
        return bcrypt.compareSync(password, account.password);
    }

}