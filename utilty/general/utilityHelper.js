const bcrypt = require('bcrypt');

function generateNumberCode() {
    var result = '';
    const characters = '23456789';
    const charactersLength = characters.length;
    for ( var i = 0; i < 7; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateHash(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null );
}

function dateXAmountFromNow(amountInMs) {
    const currentTime = Date.now();

    // Create a new Date object using the current timestamp
    const currentDate = new Date(currentTime);

    // Add one hour to the current date
    const futureDate = new Date(currentDate.getTime() + (amountInMs));

    return futureDate;
}

function validPassword(account, password)
{
    return bcrypt.compareSync(password, account.password);
}

function hasTheSameItems(list1, list2) {
    return list1.length === list2.length && list1.every(item => list2.includes(item));
}

function pauseForTimeInSecond(seconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
}

module.exports = {
    dateXAmountFromNow,
    generateHash,
    generateNumberCode,
    hasTheSameItems,
    pauseForTimeInSecond,
    validPassword
}