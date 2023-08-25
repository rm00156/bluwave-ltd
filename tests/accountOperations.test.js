const { app } = require('../app');
const models = require('../models');
const utiltyHelper = require('../utilty/general/utilityHelper');
const accountOperations = require('../utilty/account/accountOperations');
const db = models;

// Before any tests run, clear the DB and run migrations with Sequelize sync()
async function setup() {
    await db.accountType.create({
        id: 1,
        accountType: 'Admin',
        deleteFl: false,
        versionNo: 1
    });

    await db.accountType.create({
        id: 2,
        accountType: 'Customer',
        deleteFl: false,
        versionNo: 1
    });
};

beforeEach(async () => {
    await db.sequelize.sync({ force: true });
    await setup();
});

afterEach(async () => {
    await db.sequelize.drop();
});

afterAll(async () => {
    await db.sequelize.close();
});

// describe("test the JWT authorization middleware", () => { 


describe('test creation of an account', () => {

    test("if email is not a valid error thrown", async () => {

        try {
            await accountOperations.createAccount(2, 'reece', 'reece', 'fe', 'rer');
        } catch(err) {
            expect(err.message).toBe('error with account sign up');
        }
    });

    test("account is created", async () => {

        const accountTypeId = 2;
        const email = 'reece@hotmail.co.uk';
        const name =  'reece';
        const phoneNumber = 'fe';
        const password = 'rer';

        const account = await accountOperations.createAccount(accountTypeId, email, name, phoneNumber, password);
        expect(account.name).toBe('reece');
        expect(account.email).toBe('reece@hotmail.co.uk');
        expect(account.accountTypeFk).toBe(2);
        expect(account.phoneNumber).toBe('fe');
        expect(utiltyHelper.validPassword(account, 'rer')).toBe(true);
        
    })

})




// })

