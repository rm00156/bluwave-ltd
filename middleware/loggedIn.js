exports.isLoggedIn = function(req,res,next)
{
    if(req.user != null)
        next();
    else
        res.redirect('/');
}