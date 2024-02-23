const bcrypt = require('bcrypt');

exports.generateNumberCode = function() {
    var result = '';
    const characters = '23456789';
    const charactersLength = characters.length;
    for ( var i = 0; i < 7; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

exports.generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null );
}


exports.dateXAmountFromNow = function(amountInMs) {
    const currentTime = Date.now();

    // Create a new Date object using the current timestamp
    const currentDate = new Date(currentTime);

    // Add one hour to the current date
    const futureDate = new Date(currentDate.getTime() + (amountInMs));

    return futureDate;
}

exports.validPassword = function(account, password)
{
    return bcrypt.compareSync(password, account.password);
}

exports.hasTheSameItems = function(list1, list2) {
    return list1.length === list2.length && list1.every(item => list2.includes(item));
}