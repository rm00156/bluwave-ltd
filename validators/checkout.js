const validator = require('validator');
const basketOperations = require('../utilty/basket/basketOperations');
const orderOperations = require('../utilty/order/orderOperations');

exports.validatePhoneNumber = function(req, res) {
    
    const phoneNumber = req.query.phoneNumber;
    const errors = [];
    if (phoneNumber != undefined && !validator.isLength(phoneNumber, { min: 11, max: 11 })) {
        errors.push("Please enter a valid Phone Number");
        console.log("Please use enter a valid Phone Number");
    }

    if (phoneNumber != undefined && !validator.isNumeric(phoneNumber)) {
        errors.push("Please use enter a valid Phone Number");
        console.log("Please use enter a valid Phone Number");
    }

    res.status(200).json({errors});
}

exports.isCorrectAccount = async function(req, res, next) {

    const purchaseBasketId = req.params.id;
    const purchaseBasket = await orderOperations.getPurchaseBasketWithIdAndAccountId(purchaseBasketId, req.user.id);

    if(purchaseBasket == null) {
        return res.redirect('/');
    } 

    next();
}