const companyInfo = require('../utilty/company/companyInfo');
const passport = require('passport');
const { validateUser } = require('../validators/signup');
const { isEmpty } = require('lodash');
const accountOperations = require('../utilty/account/accountOperations');
const productOperations = require('../utilty/products/productOperations');
const deliveryOperations = require('../utilty/delivery/deliveryOperations');
const basketOperations = require('../utilty/basket/basketOperations');
const emailOperations = require('../utilty/email/emailOperations');
const orderOperations = require('../utilty/order/orderOperations');
const refundOperations = require('../utilty/refund/refundOperations');
const faqOperations = require('../utilty/faq/faqOperations');
const utilityHelper = require('../utilty/general/utilityHelper');

const stripe = require('stripe')(process.env.STRIPE_KEY);

var GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const models = require('../models');

exports.getAdminDashboardPage = async function (req, res) {
    var message = req.session.message;
    req.session.message = undefined;

    const orderDetailsInLastMonth = await orderOperations.getOrderDetailsInLastMonth();
    const newCustomersInTheLastWeek = await accountOperations.getNewCustomersInTheLastWeek();
    res.render('adminDashboard', {
        user: req.user,
        message: message,
        orderDetailsInLastMonth: orderDetailsInLastMonth,
        newCustomersInTheLastWeek: newCustomersInTheLastWeek,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

exports.getCreateAdminPage = async function (req, res) {

    res.render('createAdmin', {
        defaultPassword: process.env.LOGIN_PASSWORD,
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

exports.createAdmin = async function (req, res, next) {
    const errors = {};

    return validateUser(errors, req).then(async errors => {

        if (!isEmpty(errors)) {
            // reRender the sign up page with the errors
            console.log(errors);
            rerenderCreateAdmin(errors, req, res);
        }
        else {
            await accountOperations.createAccount(1, req.body.email, req.body.name, req.body.phoneNumber, req.body.password);

            req.session.message = 'Admin account created!';
            res.redirect('/admin_dashboard');
        }
    })
}

exports.getSetup2faPage = async function (req, res) {
    await render_setup2fa(req, res, false);
}

exports.setup2fa2Registration = async function (req, res, next) {
    passport.authenticate('register', async (err, account, info) => {
        if (err) {
            return next(err);
        }

        if (!account) {
            return await render_setup2fa(req, res, true);
        }

        await accountOperations.complete2FaSetupForAccountId(account.id, req.body.secret);

        req.session.message = '2FA has been successfully set up';
        return res.redirect('/admin_dashboard');

    })(req, res, next);

}

exports.getProductsPage = async function (req, res) {
    const products = await productOperations.getAllProducts();
    res.render('adminProducts', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        products: products
    });
}

// exports.getProductPage1 = async function (req, res) {
//     const productTypes = await productOperations.getAllActiveProductTypes();
//     const optionTypes = await productOperations.getAllOptionTypesWithOptions();
//     const quantities = await productOperations.getAllQuantities();
//     const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
//     const id = req.params.id;
//     const product =  await productOperations.getProductById(id);

//     var message = req.session.message;
//     req.session.message = undefined;
//     res.render('productPage1', {
//         user: req.user,
//         companyDetails: companyInfo.getCompanyDetails(),
//         productTypes: productTypes,
//         quantities: quantities,
//         optionTypes: optionTypes,
//         deliveryTypes: deliveryTypes,
//         product: product,
//         message: message
//     });
// }

exports.getProductPage1 = async function (req, res) {
    const id = req.params.id;
    const product = await productOperations.getProductById(id);

    const productTypes = await productOperations.getAllActiveProductTypes();
    // const optionTypes = await productOperations.getAllOptionTypesWithOptions();
    // const quantities = await productOperations.getAllQuantities();
    // const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    // const statuses = {};
    let quantityGroup = null;
    if(product) {
        // const errors = await productOperations.validateProductInformationDetails(product);
        // statuses['productInformation'] = isEmpty(errors);
        quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    }
    
    const priceMatrix = product ? await productOperations.getPriceMatrixForProductId(product.id) : null;
    const finishingMatrices = product ? await productOperations.getFinishingMatricesForProductId(product.id) : [];
    const productDeliveries = product ? await deliveryOperations.getProductDeliveriesForProduct(product.id) : [];
    const isValid = product ? await productOperations.isProductValid(product) : {isValid: false};
    var message = req.session.message;
    req.session.message = undefined;
    res.render('productPage1', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        productTypes: productTypes,
        product: product,
        // statuses: statuses,
        quantityGroup: quantityGroup,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
        // quantities: quantities,
        //  optionTypes: optionTypes,
        // deliveryTypes: deliveryTypes,
        message: message
    });
}

exports.getProductPage2 = async function (req, res) {
    const id = req.params.id;
    const product = await productOperations.getProductById(id);

    if(product == null) {
        // message
        return res.redirect('/admin_dashboard/products');
    }
    // const optionTypes = await productOperations.getAllOptionTypesWithOptions();
    const quantities = await productOperations.getAllQuantities();
    const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);
    
    // const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();

    // if product information details valid
    // const errors = await productOperations.validateProductInformationDetails(product);
    // const statuses = {
    //     productInformation: isEmpty(errors)
    // };
    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);
    var message = req.session.message;
    req.session.message = undefined;
    res.render('productPage2', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantities: quantities,
        selectedQuantities: selectedQuantities,
        quantityGroup: quantityGroup,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
        // optionTypes: optionTypes,
        // statuses: statuses,
        // deliveryTypes: deliveryTypes,
        message: message
    });
}


exports.getProductPage3 = async function (req, res) {
    const id = req.params.id;
    const product = await productOperations.getProductById(id);

    if(product == null) {
        // message
        return res.redirect('/admin_dashboard/products');
    }
    const optionTypes = await productOperations.getOptionTypesNotUsedByFinishingMatrixForProduct(product.id);
    
    // const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();

    // if product information details valid
    // const errors = await productOperations.validateProductInformationDetails(product);
    // const statuses = {
    //     productInformation: isEmpty(errors)
    // };

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

    var optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(product.id);
    await productOperations.addAllOptionTypesToOptionTypesAndOptionJson(optionTypesAndOptions);
    const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(product.id);
    const selectedOptionTypes = matrixRows.length == 0 ? [] : matrixRows[0][0].options.map(o => o.optionType);
    const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);

    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);

    var message = req.session.message;
    req.session.message = undefined;
    res.render('productPage3', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantityGroup: quantityGroup,
        optionTypes: optionTypes,
        selectedOptionTypes: selectedOptionTypes,
        optionTypesAndOptions: optionTypesAndOptions,
        selectedQuantities: selectedQuantities,
        matrixRows: matrixRows,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
        // statuses: statuses,
        // deliveryTypes: deliveryTypes,
        message: message
    });
}

exports.getProductPage4 = async function (req, res) {
    const id = req.params.id;
    const product = await productOperations.getProductById(id);

    if(product == null) {
        // message
        return res.redirect('/admin_dashboard/products');
    }
    const optionTypes = await productOperations.getOptionTypesNotUsedByPricingMatrixForProduct(product.id);
    
    
    // const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();

    // if product information details valid
    // const errors = await productOperations.validateProductInformationDetails(product);
    // const statuses = {
    //     productInformation: isEmpty(errors)
    // };

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
    // const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);

    var optionTypesAndOptions = await productOperations.getFinishingMatrixOptionTypesAndOptionsForProduct(product.id);
    
    await productOperations.addAllOptionTypesToOptionTypesAndOptionToFinishingJson(optionTypesAndOptions);
    const matrixRows = [];
    const selectedOptionTypes = [];
    const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);

    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);
    var message = req.session.message;
    req.session.message = undefined;
    res.render('productPage4', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantityGroup: quantityGroup,
        optionTypes: optionTypes,
        selectedOptionTypes: selectedOptionTypes,
        optionTypesAndOptions: optionTypesAndOptions,
        selectedQuantities: selectedQuantities,
        matrixRows: matrixRows,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
        // deliveryTypes: deliveryTypes,
        message: message
    });
}

exports.getProductPage5 = async function (req, res) {
    const id = req.params.id;
    const product = await productOperations.getProductById(id);

    if(product == null) {
        // message
        return res.redirect('/admin_dashboard/products');
    } 

    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);

    var message = req.session.message;
    req.session.message = undefined;
    res.render('productPage5', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantityGroup: quantityGroup,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        deliveryTypes: deliveryTypes,
        isValid: isValid.isValid,
        message: message
    });
}

exports.verifyQuantities = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }
    const quantities = JSON.parse(req.query.quantities);

    const verification = await productOperations.verifyQuantities(productId, quantities);
    res.status(200).json(verification);
}

exports.getPriceMatrixRows = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(productId);
    res.status(200).json(matrixRows);
}

exports.continuePage3 = async function (req, res) {
    const productId = req.params.id;
    const rows = JSON.parse(req.body.rows);
    const options = parseCommaSeperatedText(req.body.options);

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const quantityGroups = rows.map(r => r.quantityGroup);
    const pricesNotSet = quantityGroups.filter(q => q.prices === '');

    if(pricesNotSet.length > 0) {
        return res.status(400).json({error: 'All prices must be set to continue.'})
    }
    // validate row values
    // make sure every single one is present else fail
    
    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

    if(priceMatrix) {
        // update
        await productOperations.deletePriceMatrixForProduct(productId);
        await productOperations.createPrintingAttributes(productId, options, rows, true);
    } else {
        // create option group
        // items
        // and price matrix

        await productOperations.createPrintingAttributes(productId, options, rows, true);
    }

    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);

    return res.status(200).json({});
}

exports.continuePage4 = async function (req, res) {
    const productId = req.params.id;
    const matrices = JSON.parse(req.body.matrices);

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const isComplete = await productOperations.isAllFinishingMatricesComplete(matrices);
    if(!isComplete)
        return res.status(400).json({error: 'All prices must be set to continue.'});

    // const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);

    // if(finishingMatrices.length > 0) {
        // update
    await productOperations.deleteFinishingPriceMatricesForProduct(product.id);
    // } 
    await productOperations.createFinishingMatrices(productId, matrices);
    
    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);
    res.status(200).json({});
}

exports.savePrintingAttributes = async function (req, res) {
    const productId = req.params.id;
    const rows = JSON.parse(req.body.rows);
    const options = parseCommaSeperatedText(req.body.options);

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
    // need validation to determine whether its completed
    if(priceMatrix) {
        // update
        await productOperations.deletePriceMatrixForProduct(productId);
        await productOperations.createPrintingAttributes(productId, options, rows);
    } else {
        // create option group
        // items
        // and price matrix

        await productOperations.createPrintingAttributes(productId, options, rows);
    }

    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);

    return res.status(200).json({});

}

exports.saveDeliveryOptions = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const deliveryOptions = JSON.parse(req.body.deliveryOptions);

    const invalidOptions = deliveryOptions.filter(d => d.price === '');

    if(invalidOptions.length > 0)
        return res.status(400).json({error: 'All delivery option prices must be set to continue.'});

    const existingDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);

    if(existingDeliveries.length > 0) {
        await deliveryOperations.updateProductDeliveriesForProduct(productId, deliveryOptions);
    } else {
        await deliveryOperations.createDeliveryOptionsForProduct(productId, deliveryOptions);
    }

    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);

    res.status(200).json({});

}

exports.saveFinishingAttributes = async function (req, res) {
    const productId = req.params.id;
    const matrices = JSON.parse(req.body.matrices);

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);

    if(finishingMatrices.length > 0) {
        // update
        await productOperations.deleteFinishingPriceMatricesForProduct(product.id);
    } 
    await productOperations.createFinishingMatrices(productId, matrices);
    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);
    
    res.status(200).json({});
}

exports.getQuantities = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const quantities = await productOperations.getQuantitiesForProduct(product.id);

    res.status(200).json(quantities)
}

exports.saveQuantities = async function (req, res) {
    const productId = req.params.id;
    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found. Contact Support'});
    }

    const quantities = parseCommaSeperatedText(req.body.quantities);
    const override = req.body.override === 'true';

    
    const {valid, message, warning, create} = await productOperations.verifyQuantities(productId, quantities);
    if(!override) {
        if(!valid) {
            return res.status(400).json({error: message});
        }

        if(warning) {
            return res.status(400).json({error: message});
        }     
    }
    
    if(!create) {
        // update quantities for group
        const quantityGroup = await productOperations.getQuantityGroupForProductId(productId);
        await productOperations.updateQuantitiesForQuantityGroup(quantityGroup, quantities);
        // deactivate product
        await productOperations.deactivateProduct(product.id, false);

    } else {
        // new
        // create
        await productOperations.createQuantityGroupAndSetQuantities(productId, quantities);
    }

    const updatedProduct = await productOperations.getProductById(productId);
    const isValid = await productOperations.isProductValid(updatedProduct);
    await productOperations.setProductStatusComplete(productId, isValid.isValid);

    res.status(200).json({});

}

exports.getOptionsForOptionType = async function (req, res) {

    const optionTypeId = req.query.optionTypeId;
    const options = await productOperations.getOptionsForOptionTypeId(optionTypeId);

    return res.status(200).json(options);
}

exports.getProductPage = async function (req, res) {
    const productId = req.params.id;
    // need to get all the details for product
    const productTypes = await productOperations.getAllActiveProductTypes();
    const optionTypes = await productOperations.getAllOptionTypes();
    const quantities = await productOperations.getAllQuantities();
    const product = await productOperations.getProductById(productId);
    var message = req.session.message;
    req.session.message = undefined;
    // TODO
    if (product == null)
        return res.redirect('/admin_dashboard');

    var optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
    await productOperations.addAllOptionTypesToOptionTypesAndOptionJson(optionTypesAndOptions);
    const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);
    // const selectedOptionTypes = Array.from(new Set(optionTypesAndOptions.map(o => o.optionTypeId)));

    const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(productId);
    const selectedOptionTypes = matrixRows[0][0].options.map(o => o.optionType);

    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(productId);
    res.render('adminProduct', {
        user: req.user,
        product: product,
        productTypes: productTypes,
        quantities: quantities,
        optionTypes: optionTypes,
        optionTypesAndOptions: optionTypesAndOptions,
        selectedQuantities: selectedQuantities,
        matrixRows: matrixRows,
        message: message,
        selectedOptionTypes: selectedOptionTypes,
        productDeliveries: productDeliveries,
        deliveryTypes: deliveryTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.continuePage1 = async function (req, res) {
    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const productId = req.body.productId;

    const productDetails = {
        name: productName,
        productTypeFk: productTypeId,
        description: description,
        subDescription: subDescription,
        subDescriptionTitle: subDescriptionTitle,
    };
    let s3PathMap = new Map();
    if(files != null) {
        s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
    }
    // verify productName is not empty
    if(productName === '')
        return res.status(400).json({error: "'Product Name' must be set to save."});

    // validate
    addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);
    productOperations.updateProductDetailsWithPicturesAndBulletPoints(s3PathMap, productDetails, bulletPoints);
    
    const errors = await productOperations.validateProductInformationDetails(productDetails);
    if (!isEmpty(errors)) {
        // if(!(Object.keys(errors).length === 1 && errors.picture1 && files['1Blob'])) {
        //     return res.status(400).json(errors);
        // } 

        if(!files || !files['1Blob'] || Object.keys(errors).length !== 1 || !errors.picture1)
            return res.status(400).json(errors);
    }
    if(productId === 'undefined') {
        // create product
        productDetails['deleteFl'] = true;

        productDetails['versionNo'] = 1;
        const product = await productOperations.createProduct(productDetails, s3PathMap, bulletPoints);
        // req.session.message = 'Saved' ;
        return res.status(201).json({id: product.id});
    } else {
        // update existing product
        const product = await productOperations.getProductById(productId);
        if(!product) {
            // error
            return res.status(400).json({error: 'Product no found.'});
        }
        
        productDetails['s3PathMap'] = s3PathMap;
        productDetails['bulletPoints'] = bulletPoints;
        productDetails['productId'] = productId;
        await productOperations.updateProduct(productDetails); 
        
        const updatedProduct = await productOperations.getProductById(productId);
        const isValid = await productOperations.isProductValid(updatedProduct);
        await productOperations.setProductStatusComplete(productId, isValid.isValid);
        
        // req.session.message = 'Saved';
        return res.status(200).json({id: productId});
    }
}

exports.savePage1 = async function (req, res) {
    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const productId = req.body.productId;

    const productDetails = {
        name: productName,
        productTypeFk: productTypeId,
        description: description,
        subDescription: subDescription,
        subDescriptionTitle: subDescriptionTitle,
    };
    let s3PathMap = new Map()
    if(files != null) {
        s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
    }
    // verify productName is not empty
    if(productName === '')
        return res.status(400).json({error: "'Product Name' must be set to save."});


    if(productId === 'undefined') {
        // create product
        productDetails['deleteFl'] = true;

        productDetails['versionNo'] = 1;
        const product = await productOperations.createProduct(productDetails, s3PathMap, bulletPoints);
        req.session.message = 'Saved' ;
        return res.status(201).json({id: product.id});
    } else {
        const product = await productOperations.getProductById(productId);
        if(!product) {
            // error
            return res.status(400).json({error: 'Product no found.'});
        }
        // update existing product
        addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);
        productDetails['s3PathMap'] = s3PathMap;
        productDetails['bulletPoints'] = bulletPoints;
        productDetails['productId'] = productId;
        await productOperations.updateProduct(productDetails); 

        const updatedProduct = await productOperations.getProductById(productId);
        const isValid = await productOperations.isProductValid(updatedProduct);
        await productOperations.setProductStatusComplete(productId, isValid.isValid);
        
        // await productOperations.updateProduct(productDetails);
        req.session.message = 'Saved';
        return res.status(200).json({id: productId});
    }
}

exports.getProductTypesPage = async function (req, res) {

    const productTypes = await productOperations.getAllProductTypesWithNumberOfProducts();
    const message = req.session.message;
    req.session.message = undefined;

    res.render('adminProductTypes', {
        user: req.user,
        message: message,
        productTypes: productTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getTemplatesPage = async function (req, res) {

    const templates = await productOperations.getTemplates();
    const message = req.session.message;
    req.session.message = undefined;

    res.render('adminTemplates', {
        user: req.user,
        message: message,
        templates: templates,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getFaqsPage = async function (req, res) {

    const faqs = await faqOperations.getFaqs();
    const message = req.session.message;
    req.session.message = undefined;

    res.render('adminFaqs', {
        user: req.user,
        message: message,
        faqs: faqs,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAddFaqPage = async function (req, res) {
    const faqTypes = await faqOperations.getFaqTypes();
    const message = req.session.message;
    req.session.message = undefined;

    res.render('addFaq', {
        user: req.user,
        faqTypes: faqTypes,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.addFaq = async function (req, res) {

    const question = req.body.question;
    const answer = req.body.answer;
    const deleteFl = req.body.deleteFl == 'true';
    const faqTypeId = req.body.faqTypeId;

    const existingFaq = await faqOperations.getFaqByQuestion(question);

    if (existingFaq != null) {
        return res.status(400).json({})
    }

    await faqOperations.createFaq(question, answer, faqTypeId, deleteFl);
    req.session.message = 'Question created!'
    return res.status(201).json({});
}

exports.getAddTemplatePage = async function (req, res) {
    const message = req.session.message;
    req.session.message = undefined;
    const sizes = await productOperations.getAvailableSizeOptionsForNewTemplate();

    res.render('addTemplate', {
        user: req.user,
        message: message,
        sizes: sizes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.addTemplate = async function (req, res) {

    const files = req.files;
    const s3PathMap = await productOperations.uploadPictures('Templates/', 'Size', files);
    const body = {
        bleedAreaWidth: req.body.bleedAreaWidth,
        bleedAreaHeight: req.body.bleedAreaHeight,
        trimWidth: req.body.trimWidth,
        trimHeight: req.body.trimHeight,
        safeAreaHeight: req.body.safeAreaHeight,
        safeAreaWidth: req.body.safeAreaWidth,
        deleteFl: req.body.deleteFl == 'true',
        sizeOptionFk: req.body.size,
        versionNo: 1,
        pdfPath: s3PathMap.get('pdfTemplate'),
        jpegPath: s3PathMap.get('jpgTemplate')
    }

    const transaction = await models.sequelize.transaction();

    try {
        await productOperations.createTemplate(body);
        await transaction.commit();
    } catch (err) {

        console.log(err);
        await transaction.rollback();
        return res.status(400).json(err);
    }

    req.session.message = 'Template created!';
    res.status(201).json({});

}

exports.editTemplate = async function (req, res) {

    const templateId = req.params.id;

    const body = {
        bleedAreaWidth: req.body.bleedAreaWidth,
        bleedAreaHeight: req.body.bleedAreaHeight,
        trimWidth: req.body.trimWidth,
        trimHeight: req.body.trimHeight,
        safeAreaHeight: req.body.safeAreaHeight,
        safeAreaWidth: req.body.safeAreaWidth,
        deleteFl: req.body.deleteFl == 'true',
        versionNo: models.sequelize.literal('versionNo + 1'),
        // pdfPath: s3PathMap.get('pdfTemplate'),
        // jpegPath: s3PathMap.get('jpgTemplate')
    }

    const files = req.files;
    if (files) {
        const s3PathMap = await productOperations.uploadPictures('Templates/', 'Size', files);

        if (s3PathMap.get('pdfTemplate')) {
            body['pdfPath'] = s3PathMap.get('pdfTemplate');
        }

        if (s3PathMap.get('jpgTemplate')) {
            body['jpegPath'] = s3PathMap.get('jpgTemplate');
        }
    }

    const transaction = await models.sequelize.transaction();

    try {
        await productOperations.updateTemplate(templateId, body);
        await transaction.commit();
        req.session.message = 'Template updated!';
        return res.status(200).json({});
    } catch (err) {
        console.log(err);
        await transaction.rollback();

        return res.status(400).json({});
    }
}

exports.editFaq = async function (req, res) {

    const faqId = req.params.id;
    const question = req.body.question;
    const answer = req.body.answer;
    const deleteFl = req.body.deleteFl == 'true';
    const faqTypeId = req.body.faqTypeId;

    const faq = await faqOperations.getFaq(faqId);

    if (faq == null) {
        return res.status(400).json({ error: 'No Question to update' })
    }

    // findQuestionName
    const faqWithQuestion = await faqOperations.getFaqByQuestion(question);

    if (faqWithQuestion && faqWithQuestion.id != faqId) {
        return res.status(400).json({ error: 'Question Name already exists' });
    }

    const transaction = await models.sequelize.transaction();

    try {
        await faqOperations.updateFaq(question, answer, deleteFl, faqTypeId, faqId);
        await transaction.commit();
        req.session.message = 'Question Updated!';
        res.status(200).json({});
    } catch (err) {
        console.log(err);
        await transaction.rollback();
        res.status(400).json({ error: err })
    }
}

exports.getTemplatePage = async function (req, res) {
    const id = req.params.id;
    const template = await productOperations.getTemplate(id);
    var message = req.session.message;
    req.session.message = undefined;

    res.render('adminTemplate', {
        user: req.user,
        template: template,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getFaqPage = async function (req, res) {
    const id = req.params.id;
    const faq = await faqOperations.getFaq(id);
    const faqTypes = await faqOperations.getFaqTypes();
    var message = req.session.message;
    req.session.message = undefined;

    res.render('adminFaq', {
        user: req.user,
        faq: faq,
        faqTypes: faqTypes,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.createProduct = async function (req, res) {

    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const rows = JSON.parse(req.body.rows);
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const options = parseCommaSeperatedText(req.body.options);
    const quantities = parseCommaSeperatedText(req.body.quantities);
    const deleteFl = JSON.parse(req.body.deleteFl);
    const deliveryOptions = JSON.parse(req.body.deliveryOptions);

    const productDetails = {
        name: productName,
        productTypeFk: productTypeId,
        description: description,
        subDescription: subDescription,
        subDescriptionTitle: subDescriptionTitle,
        deleteFl: deleteFl,
        versionNo: 1
    };

    const transaction = await models.sequelize.transaction();

    try {
        const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
        const product = await productOperations.createProduct(productDetails, s3PathMap, bulletPoints);

        // create priceMatrix object
        const priceMatrix = await productOperations.createPriceMatrix(product.id, options, quantities);
        await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
        await deliveryOperations.createDeliveryOptionsForProduct(product.id, deliveryOptions);
        req.session.message = 'Product ' + product.name + ' has been successfully created';
    } catch (err) {
        console.log(err)
        await transaction.rollback();
        req.session.message = 'Error Creating product, please contact support'
        return res.status(500).send(err);
    }

    await transaction.commit();
    return res.status(201).json({});
}

exports.getOptionTypesAndOptionForProduct = async function (req, res) {

    const productId = req.query.productId;
    const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
    const parsedOptionTypesAndOptions = await productOperations.parseOptionTypesAndOption(optionTypesAndOptions);

    res.status(200).json(parsedOptionTypesAndOptions);
}

exports.editProduct = async function (req, res) {

    const productId = req.body.productId;
    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const rows = JSON.parse(req.body.rows);
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const options = parseCommaSeperatedText(req.body.options);
    const quantities = parseCommaSeperatedText(req.body.quantities);
    const deleteFl = JSON.parse(req.body.deleteFl);
    const deliveryOptions = JSON.parse(req.body.deliveryOptions);

    // const transaction = await models.sequelize.transaction();

    try {
        const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
        addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);

        const productDetails = {
            productId: productId,
            productName: productName,
            productTypeId: productTypeId,
            description: description,
            subDescription: subDescription,
            subDescriptionTitle: subDescriptionTitle,
            bulletPoints: bulletPoints,
            s3PathMap: s3PathMap,
            deleteFl: deleteFl
        }
        await productOperations.updateProduct(productDetails);

        const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
        const existingOptionIds = getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions);
        const exisitingQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);
        const existingQuantityIds = exisitingQuantities.map(q => q.id.toString());
        await deliveryOperations.updateProductDeliveriesForProduct(productId, deliveryOptions);

        if (hasNewMatrixBeenCreated(options, existingOptionIds, quantities, existingQuantityIds)) {
            console.log('new created')
            // delete active priceMatrix For product
            await productOperations.deletePriceMatrixForProduct(productId);
            const priceMatrix = await productOperations.createPriceMatrix(productId, options, quantities);
            await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
        } else {
            console.log('same matrix')
            // then just update
            await productOperations.updatePriceMatrixRowPrices(rows);
        }

        req.session.message = 'Product ' + productName + ' has been successfully updated';

    } catch (err) {
        console.log(err);
        // await transaction.rollback();
        req.session.message = 'Error Updating product, please contact support'
        return res.status(500).send(err);
    }
    // await transaction.commit();

    res.status(200).json({});
}

exports.getProductTypePage = async function (req, res) {
    const id = req.params.id;
    const productType = await productOperations.getProductTypeById(id);
    var message = req.session.message;
    req.session.message = undefined;

    res.render('adminProductType', {
        user: req.user,
        productType: productType,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.editProductType = async function (req, res) {
    const productTypeName = req.body.productTypeName;
    const productTypeId = req.body.productTypeId;
    const existingProductType = await productOperations.getProductTypeByType(productTypeName);

    if (existingProductType && existingProductType.id != productTypeId)
        return res.status(400).json({ error: 'Product Type with this name already exists.' });


    const files = req.files;
    const deleteFl = JSON.parse(req.body.deleteFl);

    const transaction = await models.sequelize.transaction();

    try {
        var s3PathMap = null;
        if (files != null) {
            s3PathMap = await productOperations.uploadPictures('ProductTypes/', productTypeName, files);
        }

        var productTypeDetails = {
            productTypeName: productTypeName,
            productTypeId: productTypeId,
            deleteFl: deleteFl
        };

        if (s3PathMap != null) {
            productTypeDetails['bannerPath'] = s3PathMap.get('banner');
        }

        await productOperations.updateProductType(productTypeDetails);
        req.session.message = 'Product Type' + productTypeName + ' has been successfully updated';

    } catch (err) {
        console.log(err);
        await transaction.rollback();
        req.session.message = 'Error Updating product type, please contact support'
        return res.status(400).send(err);
    }

    await transaction.commit();
    res.status(200).json({});
}

exports.getDeliveryTypes = async function (req, res) {

    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    res.status(200).json({ deliveryTypes });
}

exports.getDeliveryType = async function (req, res) {
    const id = req.query.id;
    const deliveryType = await deliveryOperations.getDeliveryType(id);

    res.status(200).json({ deliveryType });
}

exports.getAccountsPage = async function (req, res) {

    const accounts = await accountOperations.getAllNonGuestAccounts();

    res.render('adminAccounts', {
        user: req.user,
        accounts: accounts,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountPage = async function (req, res) {

    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');

    const message = req.session.message;
    req.session.message = undefined;
    res.render('adminAccount', {
        user: req.user,
        account: account,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountDeletePage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
    const message = req.session.message;
    req.session.message = undefined;
    res.render('adminAccountDelete', {
        user: req.user,
        account: account,
        orders: orders,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountEmailsPage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const emails = await emailOperations.getEmailsForByEmailAddress(account.email);
    res.render('adminAccountEmails', {
        user: req.user,
        account: account,
        emails: emails,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountOrdersPage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
    res.render('adminAccountOrders', {
        user: req.user,
        account: account,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountOrderPage = async function (req, res) {
    const purchaseBasketId = req.params.id;

    const order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);

    const account = await accountOperations.getAccountById(order.accountFk);
    const shippingDetailFk = order.shippingDetailFk;
    const shippingDetail = (shippingDetailFk == null) ? null : await deliveryOperations.getShippingDetailById(shippingDetailFk);
    const basketItems = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
    const isNewRefundPossible = refundOperations.isRefundPossibleForOrder(refunds, order.total);
    const message = req.session.message;
    req.session.message = undefined;

    res.render('adminOrder', {
        user: req.user,
        account: account,
        order: order,
        shippingDetail: shippingDetail,
        companyDetails: companyInfo.getCompanyDetails(),
        basketItems: basketItems,
        refunds: refunds,
        message: message,
        isNewRefundPossible: isNewRefundPossible
    });
}

exports.getOrdersPage = async function (req, res) {

    const orders = await orderOperations.getAllCompletedOrders();
    res.render('adminOrders', {
        user: req.user,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getRefundTypes = async function (req, res) {

    const refundTypes = await refundOperations.getRefundTypes();
    res.status(200).json(refundTypes);
}

exports.createRefund = async function (req, res) {

    const refundTypeId = req.body.refundTypeId;

    const purchaseBasketId = req.body.orderId;
    const order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
    const amount = refundTypeId == 2 ? order.total : req.body.amount;
    const refundAmount = parseFloat(amount) * 100;

    try {
        await stripe.refunds.create({
            payment_intent: order.orderId,
            amount: refundAmount
        });
    } catch (err) {
        console.log(err)
        return res.status(400).json({ error: 'There was an issue with attempting to make a refund. Either try again or login into your stripe account for more details' });
    }

    await refundOperations.createRefund(purchaseBasketId, refundTypeId, refundAmount);

    req.session.message = 'Refund Successful';
    return res.status(200).json({});
}

exports.getOustandingAmountOfOrder = async function (req, res) {

    const purchaseBasketId = req.query.purchaseBasketId;

    const purchaseBasket = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
    const max = await refundOperations.maxRefundPossibleForOrder(refunds, purchaseBasket.total);

    res.status(200).json({ max: max });
}

exports.getNotifications = async function (req, res) {

    const accountId = req.user.id;

    const notificationDetails = await getNotificationDetails(accountId);

    res.status(200).json(notificationDetails);
}

exports.deleteNotification = async function (req, res) {
    const id = req.body.id;

    await accountOperations.deleteNotificationById(id);

    res.status(200).json({});
}

exports.deleteNotifications = async function (req, res) {
    await accountOperations.deleteAllNotificationsForAccount(req.user.id);
    res.status(200).json({});
}

exports.getOptionTypesPage = async function (req, res) {

    const optionTypes = await productOperations.getAllOptionTypes();
    const message = req.session.message;
    req.session.message = undefined;
    res.render('adminOptionTypes', {
        user: req.user,
        optionTypes: optionTypes,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getOptionTypePage = async function (req, res) {

    const id = req.params.id;

    const optionType = await productOperations.getOptionTypeById(id);
    const options = await productOperations.getOptionsForOptionTypeId(id);
    const message = req.session.message;
    req.session.message = undefined;
    res.render('adminOptionType', {
        user: req.user,
        optionType: optionType,
        options: options,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.addOption = async function (req, res) {

    const optionTypeId = req.body.optionTypeId;
    const option = req.body.option;

    const existingOption = await productOperations.getOptionByNameAndType(option, optionTypeId);

    if (existingOption)
        return res.status(400).json({ error: 'Option with this name already exists for this Option Type.' });

    await productOperations.createOption(option, optionTypeId);
    req.session.message = 'Option created!';
    return res.status(201).json({});
}

exports.addOptionType = async function (req, res) {

    const optionType = req.body.optionType;

    const existingOptionType = await productOperations.getOptionTypeByName(optionType);

    if (existingOptionType)
        return res.status(400).json({ error: 'Option Type with this name already exists.' });

    await productOperations.createOptionType(optionType);
    req.session.message = 'Option Type created!';
    return res.status(201).json({});
}

exports.getOptionPage = async function(req, res) {

    const id = req.params.id;

    const option = await productOperations.getOptionById(id);

    if(!option)
        return res.status(400).json({error: 'Option not found'});

    const optionType = await productOperations.getOptionTypeById(option.optionTypeFk);

    res.render('adminOption', {
        user: req.user, option: option, optionType: optionType,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAddProductTypePage = async function (req, res) {
    res.render('addProductType', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.addProductType = async function (req, res) {

    const productTypeName = req.body.productTypeName;

    const existingProductType = await productOperations.getProductTypeByType(productTypeName);

    if (existingProductType)
        return res.status(400).json({ error: 'Product Type with this name already exists.' });

    const files = req.files;
    // const deleteFl = JSON.parse(req.body.deleteFl);

    const transaction = await models.sequelize.transaction();

    try {
        var s3PathMap = null;
        if (files != null) {
            s3PathMap = await productOperations.uploadPictures('ProductTypes/', productTypeName, files);
        }

        var productTypeDetails = {
            productType: productTypeName,
            deleteFl: false
        };

        if (s3PathMap != null) {
            productTypeDetails['bannerPath'] = s3PathMap.get('banner');
        }

        await productOperations.createProductType(productTypeDetails);
        req.session.message = 'Product Type' + productTypeName + ' has been successfully created';

    } catch (err) {
        console.log(err);
        await transaction.rollback();
        req.session.message = 'Error Creating product type, please contact support'
        return res.status(400).send(err);
    }

    await transaction.commit();
    res.status(201).json({});
}

exports.getNavigationBarPage = async function (req, res) {

    const message = req.session.message;
    req.session.message = undefined;

    const productTypes = await productOperations.getAllActiveProductTypes();
    const navigationBarHeaders = await productOperations.getNavigationBarHeaders();
    // const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('navigationBarHeaders', {
        user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        productTypes: productTypes,
        // allProductTypes: allProductTypes,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.setNavigationBarHeaders = async function setNavigationBarHeaders(req, res) {

    const ids = [
        Number(req.body.position1),
        Number(req.body.position2),
        Number(req.body.position3),
        Number(req.body.position4),
        Number(req.body.position5),
        Number(req.body.position6),
        Number(req.body.position7),
        Number(req.body.position8),
        Number(req.body.position9),
        Number(req.body.position10),
    ]

    if (!checkNoDuplicateNonZeroNumbers(ids)) {
        return res.status(400).json({ error: 'You have selected a product type more than once.' })
    }
    const transaction = await models.sequelize.transaction();

    try {
        await productOperations.updateNavigationBarHeaders(ids);
    } catch (err) {

        console.log(err)
        await transaction.rollback();
        return res.status(400).json({ error: 'Unable to make the update. Contact support.' })
    }

    await transaction.commit();

    req.session.message = "Navigation Bar Headers Updated!"
    res.status(200).json({});
}

exports.getOptions1To4Page = async function (req, res) {
    const message = req.session.message;
    req.session.message = undefined;

    const homePageOptions = await productOperations.getHomePageOptions();
    const productTypes = await productOperations.getAllActiveProductTypes();
    res.render('adminOptions1To4', {
        user: req.user,
        message: message,
        homePageOptions: homePageOptions,
        productTypes: productTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getOptions5To8Page = async function (req, res) {
    const message = req.session.message;
    req.session.message = undefined;

    const homePageOptions = await productOperations.getHomePageOptions();
    const productTypes = await productOperations.getAllActiveProductTypes();
    res.render('adminOptions5To8', {
        user: req.user,
        message: message,
        homePageOptions: homePageOptions,
        productTypes: productTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.setHomePageBanner = async function (req, res) {

    const title = req.body.title;
    const description = req.body.description;
    const bannerBlob = req?.files?.bannerBlob;
    const productType = req.body.productType;

    const homePageBannerSection = await productOperations.getHomePageBannerSection();

    if (productType == 0) {
        return res.status(400).json({ error: 'Product Type must be set.' });
    }
    if (homePageBannerSection == null) {
        if (bannerBlob == undefined) {
            return res.status(400).json({ error: 'Banner Image must be set' });
        }
        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Banner', req.files);
        await productOperations.createHomePageBannerSection(title, productType, description, s3PathMap.get('banner'));
        req.session.message = 'Home Page Second Banner Section Set Up!';
        return res.status(201).json({});
    }

    const data = {
        title: title,
        description: description,
        productTypeFk: productType,
        versionNo: models.sequelize.literal('versionNo + 1')
    };

    if (bannerBlob != undefined) {
        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Banner', req.files);
        data['imagePath'] = s3PathMap.get('banner');
    }

    await productOperations.updateHomePageBannerSection(data);
    req.session.message = 'Home Page Second Banner Section Updated!';
    return res.status(200).json({});

}

exports.setHomePageMainBanner = async function (req, res) {

    const title = req.body.title;
    const description = req.body.description;
    const bannerBlob = req?.files?.bannerBlob;
    const buttonText = req.body.buttonText;

    const homePageMainBannerSection = await productOperations.getHomePageMainBannerSection();

    if (homePageMainBannerSection == null) {
        if (bannerBlob == undefined) {
            return res.status(400).json({ error: 'Banner Image must be set' });
        }
        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'MainBanner', req.files);
        await productOperations.createHomePageMainBannerSection(title, buttonText, description, s3PathMap.get('banner'));
        req.session.message = 'Home Page Main Banner Section Set Up!';
        return res.status(201).json({});
    }

    const data = {
        title: title,
        description: description,
        buttonText: buttonText,
        versionNo: models.sequelize.literal('versionNo + 1')
    };

    if (bannerBlob != undefined) {
        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'MainBanner', req.files);
        data['imagePath'] = s3PathMap.get('banner');
    }

    await productOperations.updateHomePageMainBannerSection(data);
    req.session.message = 'Home Page Main Banner Section Updated!';
    return res.status(200).json({});

}

exports.getBannerSectionPage = async function (req, res) {
    const message = req.session.message;
    req.session.message = undefined;
    const productTypes = await productOperations.getAllActiveProductTypes();
    const homePageBannerSection = await productOperations.getHomePageBannerSection();

    res.render('adminBannerSection', {
        user: req.user,
        message: message,
        productTypes: productTypes,
        homePageBannerSection: homePageBannerSection,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getMainBannerSectionPage = async function (req, res) {
    const message = req.session.message;
    req.session.message = undefined;
    const homePageMainBannerSection = await productOperations.getHomePageMainBannerSection();

    res.render('adminMainBannerSection', {
        user: req.user,
        message: message,
        homePageMainBannerSection: homePageMainBannerSection,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.updateHomePage1To4 = async function (req, res) {
    var errors = {};
    const ids = [
        Number(req.body.productTypeId1),
        Number(req.body.productTypeId2),
        Number(req.body.productTypeId3),
        Number(req.body.productTypeId4),
    ]

    if (!checkNoDuplicateNonZeroNumbers(ids)) {
        errors['error'] = 'You have selected a product type more than once.';
        return res.status(400).json(errors);
    }

    errors = await validateDetails(req.body, req.files, 1, 4);

    if (!isEmpty(errors)) {
        return res.status(400).json(errors);
    } else {

        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Option_1_4', req.files);
        await productOperations.setHomePageOptions1To4(req.body, s3PathMap);
        req.session.message = "Options 1-4 Updated!";
        res.status(200).json({})
    }
}

exports.updateHomePage5To8 = async function (req, res) {
    var errors = {};
    const ids = [
        Number(req.body.productTypeId5),
        Number(req.body.productTypeId6),
        Number(req.body.productTypeId7),
        Number(req.body.productTypeId8),
    ]

    if (!checkNoDuplicateNonZeroNumbers(ids)) {
        errors['error'] = 'You have selected a product type more than once.';
        return res.status(400).json(errors);
    }

    errors = await validateDetails(req.body, req.files, 5, 8);

    if (!isEmpty(errors)) {
        return res.status(400).json(errors);
    } else {

        const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Option_5_8', req.files);
        await productOperations.setHomePageOptions5To8(req.body, s3PathMap);
        req.session.message = "Options 5-8 Updated!";
        res.status(200).json({})
    }
}

exports.deactivateAccount = async function (req, res) {

    const accountId = req.params.id;

    await accountOperations.deleteAccount(accountId);
    req.session.message = "Account Successfully Deactivated!"
    res.status(200).json({});
}

exports.reactivateAccount = async function (req, res) {

    const accountId = req.params.id;

    await accountOperations.reactivateAccount(accountId);
    req.session.message = "Account Successfully Reactivated!"
    res.status(200).json({});
}

exports.getDeactivatePage = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.redirect('/admin_dashboard/products');
    }

    // check is active

    // if not do nothing

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);

    res.render('productDeactivatePage', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantityGroup: quantityGroup,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
    });
}

exports.getActivatePage = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.redirect('/admin_dashboard/products');
    }

    const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
    const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
    const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const isValid = await productOperations.isProductValid(product);

    res.render('productActivatePage', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        product: product,
        quantityGroup: quantityGroup,
        priceMatrix: priceMatrix,
        finishingMatrices: finishingMatrices,
        productDeliveries: productDeliveries,
        isValid: isValid.isValid,
    });
    // check is deactive
    // check whether everyting is valid
    // activate
}

exports.activate = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    if(product.deleteFl === false)
        return res.status(400).json({error: 'Product is already activated'});

    const isValid = await productOperations.isProductValid(product);

    if(!isValid.isValid) {
        return res.status(400).json({error: `${isValid.page} is not valid.`, page: isValid.page});
    }

    await productOperations.activateProduct(product.id);

    res.status(200).json({});

}

exports.deactivate = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    if(product.deleteFl === true)
        return res.status(400).json({error: 'Product already deactive'});

        
    const isValid = await productOperations.isProductValid(product);
    await productOperations.deactivateProduct(productId, isValid.isValid);

    res.status(200).json({});
}

exports.validate = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    if(product.deleteFl === false) {
        return res.redirect(`/admin_dashboard/product/${productId}/page5`);
    }

    const isValid = await productOperations.isProductValid(product);
    if(!isValid.isValid) {
        const page = isValid.page;

        return res.redirect(`/admin_dashboard/product/${productId}/${page}`);
    }

    return res.redirect(`/admin_dashboard/product/${productId}/activate`);
}

exports.getFinishingMatrices = async function (req, res) {
    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const finishingMatrices = await productOperations.getFinishingMatricesDetailsForProductId(product.id);
    res.status(200).json(finishingMatrices);
}

exports.getProductDeliveries = async function (req, res) {

    const productId = req.params.id;

    const product = await productOperations.getProductById(productId);
    if(!product) {
        // error
        return res.status(400).json({error: 'Product no found.'});
    }

    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    res.status(200).json(productDeliveries);

}


async function validateDetails(body, files, from, to) {
    const errors = {};
    const homePageOptions = await productOperations.getHomePageOptions();
    for (var i = from; i <= to; i++) {
        const productTypeId = body[`productTypeId${i}`];
        const description = body[`description${i}`.trimStart()];
        const picture = files == null ? null : files[`${i}Blob`];

        if (productTypeId == 0) {

            if (description != '' || picture != undefined) {
                errors['error' + i] = "All values must be set."
            }
        }

        if (description == '') {

            if (productTypeId != 0 || picture != undefined) {
                errors['error' + i] = "All values must be set."
            }
        }

        if ((picture == undefined || picture == null) && homePageOptions[`imagePath${i}`] == null) {
            if (productTypeId != 0 || description != '') {
                errors['error' + i] = "All values must be set."
            }
        }
    }

    return errors;
}

function checkNoDuplicateNonZeroNumbers(arr) {
    // Create a set to keep track of seen elements (excluding 0)
    const seen = new Set();
    // Create a set to keep track of seen non-zero elements
    const nonZeroSeen = new Set();

    for (const num of arr) {
        if (num === 0) {
            // Ignore 0 and continue to the next element
            continue;
        }

        if (nonZeroSeen.has(num)) {
            // If any non-zero number is already seen, return false
            return false;
        }

        // Add non-zero numbers to the seen set
        nonZeroSeen.add(num);
        if (seen.has(num)) {
            // If any non-zero number is already seen (including 0), return false
            return false;
        }

        // Add all numbers (including 0) to the seen set
        seen.add(num);
    }

    // If the loop finishes without returning false, there are no duplicate non-zero numbers
    return true;
}

function getTimeDifference(date) {
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - date.getTime();

    const minutes = Math.floor(timeDifference / (1000 * 60));
    if (minutes < 60) {
        return `${minutes} minutes ago`;
    }

    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    if (hours < 24) {
        return `${hours} hours ago`;
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
}


function hasNewMatrixBeenCreated(newOptions, existingOptions, newQuantities, exisitingQuantities) {

    const optionsTheSame = utilityHelper.hasTheSameItems(newOptions, existingOptions);
    const quantitiesTheSame = utilityHelper.hasTheSameItems(newQuantities, exisitingQuantities);

    return optionsTheSame == false || quantitiesTheSame == false;
}

function getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions) {
    var result = [];
    for (key in optionTypesAndOptions) {

        const optionTypeAndOptions = optionTypesAndOptions[key];
        result.push(...optionTypeAndOptions.map(o => o.optionId.toString()));
    }

    return result;
}

function addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, request) {

    for (var i = 1; i < 6; i++) {

        const itemRemove = JSON.parse(request[i + "Remove"]);
        const itemPath = request[i + "Path"];
        const iString = i.toString();
        if (itemRemove == true) {
            s3PathMap.set(iString, null);
        } else  {
            const uploadedPath = s3PathMap.get(iString);
            if(uploadedPath === undefined && itemPath !== 'null') {
                s3PathMap.set(iString, itemPath);
            } 
            
        }
    }
}

async function rerenderCreateAdmin(errors, req, res) {
    res.render('createAdmin', {
        defaultPassword: process.env.LOGIN_PASSWORD,
        errors: errors,
        formData: req.body,
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

function parseCommaSeperatedText(text) {

    const textSplit = text.split(',');

    if (textSplit.length == 0)
        return [textSplit];

    return textSplit;
}

async function render_setup2fa(req, res, error) {
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(req.user.id);

    var secret;
    var qrCode;
    if (twoFactorAuth == null) {
        var qrInfo = GoogleAuthenticator.register(companyInfo.getCompanyDetails().COMPANY_NAME + ' (' + req.user.email + ')');
        secret = qrInfo.secret;
        qrCode = qrInfo.qr;

        await accountOperations.createTwoFactorAuthForAccountId(req.user.id, secret, qrCode);
    } else {
        secret = twoFactorAuth.secret;
        qrCode = twoFactorAuth.qrCode;
    }

    var data = { user: req.user, secret: secret, qrCode: qrCode, companyDetails: companyInfo.getCompanyDetails() };
    if (error)
        data['error'] = "Code entered was incorrect. Please scan the new code in your authenticator app and enter the code.";
    res.render('setup2fa', data);
}

async function getNotificationDetails(accountId) {
    var notifications = await accountOperations.getNotificationsForAccount(accountId);
    const numberOfNotifications = notifications.length;
    notifications = notifications.slice(0, 3);
    notifications = notifications.map(n => {
        return { id: n.id, link: n.link, text: n.text, longAgo: getTimeDifference(n.createdDttm) };
    })

    return { numberOfNotifications: numberOfNotifications, notifications: notifications };
}

exports.updateOptionName = async function(req, res) {
    const id = req.params.id;
    const name = req.body.name;
    const withWarnings = req.body.withWarnings === 'true';

    const option = await productOperations.getOptionById(id);
    if(!option)
        return res.status(400).json({error: 'Option not found'});

    // do any products use this option
    if(option.name === name)
        return res.status(400).json({error: 'No Change made.'});

    // check whether name already exists for the same optiontype
    const existingOption = await productOperations.getOptionByNameAndType(name, option.optionTypeFk);

    if (existingOption)
        return res.status(400).json({ error: 'Option with this name already exists for this Option Type.' });

    const {productsWithPrintingOption, productsWithFinishingOption, optionGroupItemIds, finishingMatrixRowIds} = await productOperations.getProductsWhichCurrentlyUseOptionId(id);
    
    if(productsWithPrintingOption.length > 0 || productsWithFinishingOption.length > 0) {
        if(withWarnings) 
            return res.status(500).json({productsWithFinishingOption, productsWithPrintingOption});
    }

    const newOption = await productOperations.createOption(name, option.optionTypeFk);

    if(optionGroupItemIds.length > 0) {
        await productOperations.updateOptionForOptionGroupItems(optionGroupItemIds, newOption.id);
    }

    if(finishingMatrixRowIds.length > 0) {
        await productOperations.updateOptionForFinishingMatrixRows(finishingMatrixRowIds, newOption.id);
    }

    const templates = await productOperations.getTemplatesForSizeOptions([id]);

    if(templates.length > 0) {
        const templateIds = templates.map(t => t.id);
        await productOperations.updateOptionForTemplates(templateIds, newOption.id);
    }

    await productOperations.deleteOption(id);

    res.status(200).json({id: newOption.id});

}