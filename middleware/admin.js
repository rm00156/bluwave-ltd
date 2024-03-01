const accountOperations = require('../utilty/account/accountOperations');
const utilityHelper = require('../utilty/general/utilityHelper');
const notProduction = process.env.NODE_ENV != 'production';

exports.isAdmin = async function(req,res,next)
{
    var account = req.user;

    if(account == null)
    {
       return res.redirect('/login');
    }
    else
    {
        if(account.accountTypeFk != 1)
        {
            // redirect to page to set up 2fa
           return res.redirect('/login');
        }
        else
        {
            next();
        }
    }
}

exports.isSecuredAdmin = async function(req,res,next)
{
    var account = req.user;

    if(account == null)
    {
       return res.redirect('/login');
    }
    else
    {
        const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
            
        if(account.accountTypeFk != 1 || (twoFactorAuth != null && twoFactorAuth.authenticatedFl == true))
        {
            // redirect to page to set up 2fa
           return res.redirect('/login');
        }
        else
        {
            next();
        }
    }
}


exports.enterPassword = async function(req,res,next)
{
    var password = req.query.password;
    if(!utilityHelper.validPassword(req.user,password))
    {
        res.redirect('/setup_2fa');
    }
    else
    {
        req.session.password = password;
        next();
    }
}

exports.adminRequire2faSetup = async function(req,res,next)
{
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(req.user.id);
    if(!notProduction && (twoFactorAuth == null || !twoFactorAuth.authenticatedFl))
        return res.redirect('/setup_2fa');
    
    next();
}

exports.isLoginRequire2faCode = async function(req,res, next)
{
    var email = req.body.email;
    var password = req.body.password;

    var account = await accountOperations.findAccountByEmail(email);

    if(account == null)
    {
        // error 
        return res.redirect('/admin/login?error=UserNotFound');
    }

    if(!utilityHelper.validPassword(account,password))
    {
        return res.redirect('/admin/login?error=UserNotFound');
    }

    req.session.password = password;
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
    if(twoFactorAuth != null && twoFactorAuth.authenticatedFl == true)
    {
        req.session.email = account.email;
        req.session.twoFa = true;
        return res.redirect('/admin/login/step_two');
    }
    
    req.session.twoFa = false;
    next();
}

exports.twoFa = function(req,res,next)
{
    twoFa(req,res,next);
}

exports.twoFa2 = function(req,res,next)
{
    if(req.session.attempt == undefined)
        return res.redirect('/admin/login');
        
    req.session.attempt = req.session.attempt + 1;

    if(req.session.attempt > 1)
    {
        res.redirect('/admin/login');
    }
    else
    {
        next();
    }

}

function twoFa(req,res,next)
{
    if(req.session.twoFa == true)
    {
        req.body['email'] = req.session.email;
        req.body['password'] = req.session.password;
        next();
    }
    else
        res.redirect('/admin/login');
}

exports.setup2fa = async function(req,res,next)
{
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(req.user.id);

    if(twoFactorAuth != null && twoFactorAuth.authenticatedFl == true) {
        req.session.message = undefined;
        res.redirect('/admin_dashboard');
    }
    else
    {
        req.body['email'] = req.user.email;
        req.body['password'] = req.session.password;
        next();
    }
}