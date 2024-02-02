const validator = require('validator');
const models = require('../models');

const validateCreateUserFields = function (errors, req) {

    if (req.body.name != undefined && !validator.isLength(req.body.name, { min: 3, max: 50 })) {
        errors["name"] = "Please enter name between 3 and 50 characters in length.";
        console.log("Please use enter name between 3 and 50 characters in length.");
    }

    if (req.body.email != undefined && !validator.isEmail(req.body.email)) {
        errors["email"] = "Please use a valid email address";
        console.log("Please use a valid email address");
    }

    if (req.body.password != undefined && !validator.isAscii(req.body.password)) {
        errors["password"] = "Invalid characters in password";
        console.log("Invalid characters in password");
    }
    if (req.body.password != undefined && !validator.isLength(req.body.password, { min: 5, max: 25 })) {
        errors["password"] = "Please ensure that the password length is at least 5 characters long and no more than 25";
        console.log("Please ensure that the password length is at least 5 characters long and no more than 25");
    }


    if (req.body.phoneNumber != undefined && !validator.isLength(req.body.phoneNumber, { min: 11, max: 11 })) {
        errors["phoneNumber"] = "Please enter a valid Phone Number";
        console.log("Please use enter a valid Phone Number");
    }

    if (req.body.phoneNumber != undefined && !validator.isNumeric(req.body.phoneNumber)) {
        errors["phoneNumber"] = "Please use enter a valid Phone Number";
        console.log("Please use enter a valid Phone Number");
    }

}

exports.validateCreateUserFields = function (errors, req) {
    validateCreateUserFields(errors, req);
}

exports.validateUser = function (errors, req) {
    return new Promise((resolve, reject) => {
        // populates the errors array if any errors found
        validateCreateUserFields(errors, req);
        return models.account.findOne({
            where: {
                email: req.body.email,
                deleteFl: false
            }
        }).then(async account => {

            if (account !== null) {
                // user already exists
                errors["email"] = "An account with this email already exists. Please log in";
                console.log("An account with this email already exists. Please log in");

            }
            resolve(errors);
        });

    });
}

exports.validateCustomerUser = function (errors, req) {
    return new Promise((resolve, reject) => {
        // populates the errors array if any errors found
        validateCreateUserFields(errors, req);
        
        resolve(errors);
        
    });
}
