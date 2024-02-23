const models = require('../../models');
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");
const { Op } = require('sequelize');
const { isEmpty } = require('lodash');
const utilityHelper = require('../general/utilityHelper');
const deliveryOperations = require('../delivery/deliveryOperations');

async function getAllActiveProductTypes() {
    return await models.productType.findAll({
        where: {
            deleteFl: false
        }
    })
}

async function getAllProductTypes() {
    return await models.productType.findAll();
}

async function getProductTypeByType(type) {
    return await models.productType.findOne({
        where: {
            productType: type,
            deleteFl: false
        }
    })
}

async function getActiveProductTypeById(id) {
    return await models.productType.findOne({
        where: {
            id: id,
            deleteFl: false
        }
    })
}

async function getProductTypeById(id) {
    return await models.productType.findOne({
        where: {
            id: id
        }
    })
}


async function getAllActiveProducts() {
    return await models.product.findAll({
        where: {
            deleteFl: false
        }
    })
}

async function getAllProducts() {
    return models.sequelize.query('select p.*, pt.productType from products p ' +
    ' inner join productTypes pt on p.productTypeFk = pt.id ', 
    {type: models.sequelize.QueryTypes.SELECT});
}

async function getProductByProductName(productName) {
    return await models.product.findOne({
        where: {
            name: productName,
            deleteFl: false
        }
    })
}

async function getProductById(id) {
    return models.product.findOne({
        where: {
            id: id
        }
    })
}

async function getOptionGroupForProductId(productId) {
    return models.optionGroup.findOne({
        where: {
            productFk: productId
        }
    })
}

async function getAllProductsByProductTypeId(productTypeId) {
    return await models.product.findAll({
        where: {
            productTypeFk: productTypeId,
            deleteFl: false
        }
    })
}
async function getLowestPriceWithQuantityForProductByProductId(productId) {

    const result = await models.sequelize.query('select quantity, pmrqp.price from products p ' +
        ' inner join priceMatrices pm on pm.productFk = p.id ' +
        ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id ' +
        ' inner join priceMatrixRowQuantityPrices pmrqp on pmrqp.priceMatrixRowFk = pmr.id ' +
        ' inner join quantities q on pmrqp.quantityFk = q.id ' +
        ' where p.id = :productId ' +
        ' and pm.deleteFl = false ' +
        ' order by pmrqp.price asc limit 1', { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT });

    if (result.length > 0)
        return result[0];
    else
        return null;
}

async function getAllOptionTypes() {
    return await models.optionType.findAll({
        where: {
            deleteFl: false
        }
    })
}

async function getAllOptionTypesWithOptions() {
    return await models.sequelize.query('select distinct ot.* from optionTypes ot ' +
        ' inner join options o on o.optionTypeFk = ot.id ',
        { type: models.sequelize.QueryTypes.SELECT });
}

async function getAllQuantities() {
    return await models.quantity.findAll({
        order: [['quantity', 'ASC']],
        where: {
            deleteFl: false
        }
    })
}

async function getQuantityPriceTable(options, finishingOptions, productId,) {

    var query = 'select q.quantity, q.id as quantityId, pmrqpr.id as priceMatrixRowQuantityRowId, pmrqpr.price, pmrqpr.price/q.quantity as pricePer from priceMatrixRowQuantityPrices pmrqpr ' +
        ' inner join priceMatrixRows pmr on pmrqpr.priceMatrixRowFk = pmr.id ' +
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id  ' +
        ' inner join quantities q on pmrqpr.quantityFk = q.id ' +
        ' where pm.deleteFl = false and pmr.optionGroupFk = ( ' +

        ' SELECT  ogi.optiongroupFk from priceMatrixRowQuantityPrices pmrqpr  ' +
        ' inner join priceMatrixRows pmr on pmrqpr.priceMatrixRowFk = pmr.id ' +
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
        ' inner join products p on pm.productFk = p.id ' +
        ' inner join optionGroupItems ogi on pmr.optionGroupFk = ogi.optionGroupFk ' +
        ' where p.id = :productId ' +
        ' and pm.deleteFl = false ' +
        ' GROUP BY ogi.optionGroupFk ' +
        ' HAVING SUM(ogi.optionFk NOT IN (';
    // 3, 11, 1)) = 0) ' +

    var count = 0;
    var replacements = {}
    options.forEach(option => {
        query = query + ':option' + count + ',';
        replacements['option' + count] = option.value;
        count++
    });
    replacements['productId'] = productId;

    query = query.substring(0, query.length - 1);
    query = query + ')) = 0 ) order by q.quantity asc';

    const quantityPriceTable = await models.sequelize.query(query, { replacements: replacements, type: models.sequelize.QueryTypes.SELECT });
    // return quantityPriceTable;

    if(finishingOptions.length > 0) {
        const finishingPriceTable = await models.sequelize.query('select q.quantity, q.id as quantityId, fq.id as finishingMatrixRowQuantityPriceId, fq.price, fq.price/q.quantity as pricePer  from finishingMatrices fm ' +
        ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id ' +
        ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id ' +
        ' inner join quantities q on fq.quantityFk = q.id ' +
        ' where fmr.optionFk in (:options) ' + 
        ' and fm.deleteFl = false ' + 
        ' and fm.productFk = :productId', {replacements:{productId: productId, options: finishingOptions.map(f => f.value)}, type: models.sequelize.QueryTypes.SELECT});
    
        const quantities = new Set(finishingPriceTable.map(f => f.quantityId));
        const finishingQuantityPriceMap = new Map();
    
        quantities.forEach(quantityId => {
    
            const finishingQuantityRows = finishingPriceTable.filter(f => f.quantityId === quantityId);
    
            let price = 0;
            let pricePer = 0;
    
            finishingQuantityRows.forEach(fqr => {
                price += parseFloat(fqr.price);
                pricePer += parseFloat(fqr.pricePer);
            });
    
            finishingQuantityPriceMap.set(quantityId, {price: price, pricePer: pricePer});
        });
    
        quantityPriceTable.forEach(qr => {
    
            const quantityId = qr.quantityId;
            const {pricePer, price} = finishingQuantityPriceMap.get(quantityId);
            qr.price = (parseFloat(qr.price) + price).toFixed(2);
            qr.pricePer = (parseFloat(qr.pricePer) + pricePer).toFixed(2);
        });
    }
    

    return quantityPriceTable;
}

async function getPricingMatrixOptionTypesAndOptionsForProduct(productId) {

    const results = await models.sequelize.query('SELECT distinct ot.id AS optionTypeId, ot.optionType, o.id AS optionId, o.name ' +
        ' FROM products p ' +
        ' INNER JOIN priceMatrices pm ON pm.productFk = p.id ' +
        ' INNER JOIN priceMatrixRows pmr ON pmr.priceMatrixFk = pm.id ' +
        ' INNER JOIN optionGroupItems ogi ON ogi.optionGroupFk = pmr.optionGroupFk ' +
        ' INNER JOIN options o ON ogi.optionFk = o.id ' +
        ' INNER JOIN optionTypes ot ON o.optionTypeFk = ot.id ' +
        ' WHERE p.id = :productId ' +
        ' and pm.deleteFl = false ', { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT });

    if (results.length == 0)
        return null;

    return mapToObject(results);
}

async function getFinishingMatrixOptionTypesAndOptionsForProduct(productId) {

    const results = await models.sequelize.query('SELECT distinct ot.id AS optionTypeId, ot.optionType, o.id AS optionId, o.name ' +
        ' FROM products p ' +
        ' INNER JOIN finishingMatrices fm ON fm.productFk = p.id ' +
        ' INNER JOIN finishingMatrixRows fmr ON fmr.finishingMatrixFk = fm.id ' +
        ' INNER JOIN options o ON o.id = fmr.optionFk ' +
        ' INNER JOIN optionTypes ot ON o.optionTypeFk = ot.id ' +
        ' WHERE p.id = :productId ' +
        ' and fm.deleteFl = false ', { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT });

    if (results.length == 0)
        return null;

    return mapToFinishingObject(productId, results);
}

function mapToObject(results) {
    var map = new Map();

    results.forEach(result => {

        const optionTypeId = result.optionTypeId;
        const optionType = result.optionType;
        const optionId = result.optionId;
        const name = result.name;

        if (!map.has(optionType)) {
            map.set(optionType, []);
        }

        var options = map.get(optionType);
        var option = {
            optionId: optionId,
            name: name,
            optionTypeId: optionTypeId
        };

        options.push(option);
    
        map.set(optionType, options);
    });

   
    const mapAsObject = Object.fromEntries(map);

    return mapAsObject;
}

async function mapToFinishingObject(productId, results) {
    var map = new Map();

    results.forEach(result => {

        const optionTypeId = result.optionTypeId;
        const optionType = result.optionType;
        const optionId = result.optionId;
        const name = result.name;

        if (!map.has(optionType)) {
            map.set(optionType, {options: []});
        }

        var options = map.get(optionType);
        var option = {
            optionId: optionId,
            name: name,
            optionTypeId: optionTypeId
        };
        const newOptions = options.options;
        newOptions.push(option);

        map.set(optionType, {options: newOptions, rows: []});
    });
    for (const [optionType, value] of map.entries()) {

        
        const rowQuantityPrices = await getFinishingMatrixRowQuantityPricesForProductIdAndOptionType(productId, optionType);
        let options = value.options;

        for(let i = 0; i < options.length; i++) {
            const option = options[i];
            const rowItems = rowQuantityPrices.filter(rq => rq.optionId === option.optionId);
            const sortedRowItems = rowItems.sort((a, b) => a.quantity - b.quantity);
            
            const existingRows = value['rows'];
            existingRows.push(sortedRowItems);
            value['rows'] = existingRows;
        }
        
        
        map.set(optionType, value);
    }


    const mapAsObject = Object.fromEntries(map);

    return mapAsObject;
}

async function getOptionsForOptionTypeId(optionTypeId) {

    return await models.option.findAll({
        where: {
            deleteFl: false,
            optionTypeFk: optionTypeId
        }
    })
}

async function uploadPictures(folder, productName, files) {
    const s3 = new S3Client({
        region: process.env.S3_REGION,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
        endpoint: 'https://s3.eu-west-2.amazonaws.com',

    });
    const date = Date.now();
    var s3PathMap = new Map();

    for (var key in files) {
        var value = files[key];
        const index = key.replace('Blob', '');
        var blob = value.data;
        var extension = getExtension(value.mimetype);
        var fileName = 'picture' + index;
        var s3Path = process.env.S3_BUCKET_PATH + '/' + folder + productName + '/' + date + '_' + encodeURIComponent(fileName) + '.' + extension;
        var params = {
            Bucket: process.env.S3_BUCKET,
            Body: blob,
            Key: folder + productName + '/' + date + '_' + fileName + '.' + extension,
            ACL: 'public-read'
        };

        const s3UploadPromise = new Upload({
            client: s3,
            params
        }).done();
        await s3UploadPromise;
        s3PathMap.set(index, s3Path);

    }

    return s3PathMap;
}

function getExtension(mimeType) {
    console.log(mimeType)
    switch(mimeType) {
        case 'image/jpeg': return 'jpeg';
        case '.jpeg': return 'jpeg';
        case 'image/png': return 'png';
        case 'application/pdf': return 'pdf';
        case '.pdf': return 'pdf';
        default: return 'png';
    }
}
async function createProduct(productDetails, s3PathMap, bulletPoints) {

    updateProductDetailsWithPicturesAndBulletPoints(s3PathMap, productDetails, bulletPoints);

    productDetails['status'] = 'Incomplete';

    return await models.product.create(productDetails);
}

function updateProductDetailsWithPicturesAndBulletPoints(s3PathMap, productDetails, bulletPoints) {
    s3PathMap.forEach((value, key) => {
        productDetails['image' + key + 'Path'] = value;
    });

    var descriptionCount = 1;
    bulletPoints.forEach(bulletPoint => {
        const trimmed = bulletPoint.replace(/\s+$/, "");
        if (trimmed !== '') {
            productDetails['descriptionPoint' + descriptionCount] = bulletPoint;
            descriptionCount++;
        }

    });
}

async function validateProductInformationDetails(productDetails) {

    const errors = {};
    const {name, productTypeFk, image1Path, description, subDescriptionTitle, subDescription, descriptionPoint1} = productDetails;

    if(name === null || name === '')
        errors['name'] = "'Product Name' must be set to continue.";

    const productType = await getProductTypeById(productTypeFk);
    if(productType === null)
        errors['productType'] = "'Product Type' must be set to continue.";

    if(image1Path === undefined || image1Path === null || image1Path === '')
        errors['picture1'] = "Make sure the main picture has been set to continue.";

    if(description === undefined || description === null || description === '')
        errors['description'] = "'Main Product Description'' must be set to continue.";

    if(subDescriptionTitle === undefined || subDescriptionTitle === null || subDescriptionTitle === '')
        errors['subDescriptionTitle'] = "'Sub Product Description Title' must be set to continue.";

    if(subDescription === undefined || subDescription === null || subDescription === '')
        errors['subDescription'] = "'Sub Product Description' must be set to continue.";

    if(descriptionPoint1 === undefined || descriptionPoint1 === null || descriptionPoint1 === '')
        errors['descriptionBulletPoint'] = "'Description Bullet Point' must be set to continue.";

    return errors;
}

async function createPriceMatrix(productId, options, isComplete) {

    // from options list, u have the id
    // from the list of ids get the distinct optionType ids
    // create optiontypegroup
    // then optiontypegroupitems
    const attributeType = await getPrintingAttributeType();
    const optionTypeGroup = await createOptionTypeGroup(productId, attributeType.id);
    var optionsObject = await getOptionsByIds(options);
    var optionTypeIds = new Set();

    optionsObject.forEach(o => {
        optionTypeIds.add(o.optionTypeFk);
    });

    optionTypeIds.forEach(async optionTypeId => {
        await createOptionTypeGroupItem(optionTypeGroup.id, optionTypeId);
    })

    const quantityGroup = await getQuantityGroupForProductId(productId);

    return models.priceMatrix.create({
        productFk: productId,
        optionTypeGroupFk: optionTypeGroup.id,
        status: isComplete ? 'Complete' : 'Incomplete',
        quantityGroupFk: quantityGroup.id,
        deleteFl: false,
        verisonNo: 1
    })
}

async function createPriceMatrixRowsAndQuantityPrices(priceMatrixId, rows) {
    let orderNo = 1;
    rows.forEach(async row => {
        const optionGroup = await createOptionGroup();
        const priceMatrixRow = await createPriceMatrixRow(priceMatrixId, optionGroup.id, orderNo);
        const optionIds = row.optionIdGroup;
        optionIds.forEach(async optionId => {
            await createOptionGroupItem(optionGroup.id, optionId);
        });

        const quantities = row.quantityGroup;

        quantities.forEach(async quantity => {

            await createPriceMatrixRowQuantityPrices(priceMatrixRow.id, quantity.id, quantity.price === '' ? null : quantity.price);
        });

        orderNo++;
    })
}

async function getAllProductWithLowestPriceDetails() {

    return await models.sequelize.query(' select distinct pq.price, pt.productType, p.* from priceMatrixRowQuantityPrices pq ' +
        ' inner join priceMatrixRows pr on pq.priceMatrixRowFk = pr.id ' +
        ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id ' +
        ' inner join products p on pm.productFk = p.id ' +
        ' inner join productTypes pt on p.productTypeFk = pt.id ' +
        ' where pq.id = ( ' +
        ' select pq2.id from priceMatrixRowQuantityPrices pq2 ' +
        ' inner join priceMatrixRows pr2 on pq2.priceMatrixRowFk = pr2.id ' +
        ' inner join priceMatrices pm2 on pr2.priceMatrixFk = pm2.id ' +
        ' where pm2.productFk = p.id ' +
        ' and pm2.deleteFl = false ' +
        ' order by pq2.price asc limit 1 ) ' +
        ' and pm.deleteFl = false ', { type: models.sequelize.QueryTypes.SELECT });
}

async function createQuantityGroupItem(quantityGroupId, quantityId) {
    await models.quantityGroupItem.create({
        quantityGroupFk: quantityGroupId,
        quantityFk: quantityId,
        deleteFl: false,
        versionNo: 1
    });
}

async function createQuantityGroup(productFk) {
    return models.quantityGroup.create({
        productFk,
        deleteFl: false,
        versionNo: 1
    })
}

async function createOptionTypeGroupItem(optionTypeGroupId, optionTypeId) {
    return await models.optionTypeGroupItem.create({
        optionTypeGroupFk: optionTypeGroupId,
        optionTypeFk: optionTypeId,
        deleteFl: false,
        versionNo: 1
    })
}

async function getOptionsByIds(options) {
    return await models.option.findAll({
        where: {
            id: {
                [Op.in]: options
            },
            deleteFl: false
        }
    })
}

async function createOptionTypeGroup(productId, attributeTypeId) {
    return await models.optionTypeGroup.create({
        productFk: productId,
        attributeTypeFk: attributeTypeId,
        deleteFl: false,
        versionNo: 1
    });
}

async function createOptionGroup() {
    return await models.optionGroup.create({
        deleteFl: false,
        versionNo: 1
    });
}

async function createOptionGroupItem(optionGroupId, optionId) {
    return await models.optionGroupItem.create({
        optionGroupFk: optionGroupId,
        optionFk: optionId,
        deleteFl: false,
        versionNo: 1
    });
}

async function createPriceMatrixRow(priceMatrixId, optionGroupId, orderNo) {
    return await models.priceMatrixRow.create({
        priceMatrixFk: priceMatrixId,
        optionGroupFk: optionGroupId,
        orderNo,
        deleteFl: false,
        versionNo: 1
    });
}

async function createPriceMatrixRowQuantityPrices(priceMatrixRowId, quantityId, price) {
    return await models.priceMatrixRowQuantityPrice.create({
        priceMatrixRowFk: priceMatrixRowId,
        quantityFk: quantityId,
        price: price,
        deleteFl: false,
        versionNo: 1
    })
}

async function parseOptionTypesAndOption(optionTypesAndOptions) {

    const optionTypeIds = new Set();
    var parsedOptionTypesAndOptions = [];

    for (var key in optionTypesAndOptions) {

        const optionTypeAndOption = optionTypesAndOptions[key];
        var typeIds = (optionTypeAndOption.map(o => { return o.optionTypeId }));
        typeIds.forEach(typeId => {
            optionTypeIds.add(typeId);
        })
    }

    optionTypeIds.forEach(optionTypeId => {

        for (var key in optionTypesAndOptions) {
            const optionTypeAndOption = optionTypesAndOptions[key];

            var items = optionTypeAndOption.filter(o => o.optionTypeId == optionTypeId)
                .map(o2 => {
                    return { name: o2.name, optionId: o2.optionId };
                });
            parsedOptionTypesAndOptions.push({ optionTypeId, options: items });
        }

    })

    return parsedOptionTypesAndOptions;
}

async function addAllOptionTypesToOptionTypesAndOptionJson(optionTypesAndOptions) {

    for (var key in optionTypesAndOptions) {
        const optionTypeAndOption = optionTypesAndOptions[key];

        const optionTypeId = optionTypeAndOption[0].optionTypeId;
        const selectedOptionNames = optionTypeAndOption.map(o1 => o1.name).join(", ");
        const allOptions = await getOptionsForOptionTypeId(optionTypeId);

        optionTypeAndOption.forEach(o => {
            o['selectedOptionNames'] = selectedOptionNames;
            o['allOptions'] = allOptions;
        });
    }
}

async function addAllOptionTypesToOptionTypesAndOptionToFinishingJson(optionTypesAndOptions) {

    for (var key in optionTypesAndOptions) {
        const optionTypeAndOption = optionTypesAndOptions[key];

        const optionTypeId = optionTypeAndOption.options[0].optionTypeId;
        const selectedOptionNames = optionTypeAndOption.options.map(o1 => o1.name).join(", ");
        const allOptions = await getOptionsForOptionTypeId(optionTypeId);

        optionTypeAndOption.options.forEach(o => {
            o['selectedOptionNames'] = selectedOptionNames;
            o['allOptions'] = allOptions;
        });
    }
}

async function getSelectedQuantitiesForProductById(productId) {

    var result = await models.sequelize.query('select distinct q.id, q.quantity from quantityGroupItems qi ' + 
    ' inner join quantities q on qi.quantityFk = q.id ' + 
    ' inner join quantityGroups qg on qi.quantityGroupFk = qg.id ' +
    ' where qg.productFk = :productId ' +
    ' order by q.quantity asc ', { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT })

    return result;
}

async function getPriceMatrixForProductId(productId) {
    return models.priceMatrix.findOne({
        where: {
            productFk: productId,
            deleteFl: false
        }
    })
}

async function getPriceMatrixDetailsForProductId(productId) {

    const result = await models.sequelize.query('select distinct q.quantity, pmr.*,pq.*, pq.id as priceMatrixRowQuantityPriceId from priceMatrixRows pmr ' +
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
        ' inner join priceMatrixRowQuantityPrices pq on pq.priceMatrixRowFk = pmr.id ' +
        ' inner join quantities q on pq.quantityFk = q.id ' +
        ' inner join optionGroupItems ogi on ogi.optionGroupFk = pmr.optionGroupFk ' + 
        ' where pm.productFk = :productId ' +
        ' and pm.deleteFl = false order by pmr.orderNo asc', { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT });

    return await getRowDetails(result);
}

async function getRowDetails(result) {
    const optionGroupIds = Array.from(new Set(result.map(o => o.optionGroupFk)));
    var rows = [];
    for (var i = 0; i < optionGroupIds.length; i++) {
        const optionGroupId = optionGroupIds[i];
        var row = result.filter(o => o.optionGroupFk == optionGroupId);
        row = row.sort((a, b) => a.quantity - b.quantity);
        // get optionGroupItems
        const optionGroupItems = await getOptionGroupItemsForOptionGroup(optionGroupId);

        row.forEach(r => r['options'] = optionGroupItems);
        rows.push(row);
    }

    return rows;
}


async function getOptionGroupItemsForOptionGroup(optionGroupId) {

    return await models.sequelize.query('select o.name, o.id, ot.optionType from optionGroupItems ogi ' +
        ' inner join options o on ogi.optionFk = o.id ' +
        ' inner join optionTypes ot on o.optionTypeFk = ot.id ' +
        ' where ogi.optionGroupFk = :optionGroupId ',
        { replacements: { optionGroupId: optionGroupId }, type: models.sequelize.QueryTypes.SELECT });
}

async function getOptionGroupItemsByOptionGroupId(id) {
    return await models.optionGroupItem.findAll({
        where: {
            optionGroupFk: id
        }
    })
}

async function updateProduct(productDetails) {

    const data = {
        name: productDetails.name,
        productTypeFk: productDetails.productTypeFk,
        description: productDetails.description,
        subDescriptionTitle: productDetails.subDescriptionTitle,
        subDescription: productDetails.subDescription,
        versionNo: models.sequelize.literal('versionNo + 1')
    };

    const s3PathMap = productDetails.s3PathMap;
    s3PathMap.forEach((value, path) => {
        data['image' + path + 'Path'] = value;
    });

    const bulletPoints = productDetails.bulletPoints;
    const numberOfPoints = bulletPoints.length;
    for (var i = 0; i < 6; i++) {

        if (i < numberOfPoints) {
            const bulletPoint = bulletPoints[i];
            const trimmed = bulletPoint.replace(/\s+$/, "");
            if(trimmed !== '') {
                data['descriptionPoint' + (i + 1)] = bulletPoint;
            } else {
                data['descriptionPoint' + (i + 1)] = null;
            }
            
        } else {
            data['descriptionPoint' + (i + 1)] = null;
        }
    }

    // data['status'] = await isV ? 'Complete' : 'Incomplete';

    await models.product.update(data, {
        where: {
            id: productDetails.productId
        }
    })
}

async function updatePriceMatrixRowQuantityPriceById(id, price) {
    await models.priceMatrixRowQuantityPrice.update({
        price: price,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: id
        }
    })
}

async function updatePriceMatrixRowPrices(rows) {
    rows.forEach(row => {

        const quantityGroup = row.quantityGroup;

        quantityGroup.forEach(async item => {

            const priceMatrixRowQuantityPriceId = item.priceMatrixRowQuantityPriceId;
            await updatePriceMatrixRowQuantityPriceById(priceMatrixRowQuantityPriceId, item.price);

        })
    })
}

async function getAllProductTypesWithNumberOfProducts() {
    return await models.sequelize.query('SELECT pt.id, pt.productType, COUNT(p.id) as numberOfProducts, pt.deleteFl ' +
        ' FROM productTypes pt ' +
        ' LEFT JOIN products p ON pt.id = p.productTypeFk ' +
        ' GROUP BY pt.id, pt.productType ', { type: models.sequelize.QueryTypes.SELECT });
}

async function updateProductType(productTypeDetails) {
    await models.productType.update({
        productType: productTypeDetails.productTypeName,
        bannerPath: productTypeDetails.bannerPath,
        deleteFl: productTypeDetails.deleteFl,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: productTypeDetails.productTypeId
        }
    })
}

async function createProductType(productTypeDetails) {
    return await models.productType.create({
        productType: productTypeDetails.productType,
        bannerPath: productTypeDetails.bannerPath,
        deleteFl: productTypeDetails.deleteFl,
        versionNo: 1
    })
}

async function getActiveProductsForProductTypeName(productTypeName) {
    return await models.sequelize.query('select p.* from productTypes pt ' +
        ' inner join products p on p.productTypeFk = pt.id ' +
        ' where pt.productType = :productTypeName ' +
        ' and p.deleteFl = false ', { replacements: { productTypeName: productTypeName }, type: models.sequelize.QueryTypes.SELECT });
}

async function getQuantitiesForProduct(productId) {
    return await models.sequelize.query('select q.* from products p ' + 
    ' inner join quantityGroups qg on qg.productFk = p.id ' +
    ' inner join quantityGroupItems qgi on qgi.quantityGroupFk = qg.id ' +
    ' inner join quantities q on qgi.quantityFk = q.id ' + 
    ' where p.id = :productId ' +
    ' order by q.quantity asc' , { replacements: { productId: productId }, type: models.sequelize.QueryTypes.SELECT });
}

async function getOptionGroupById(id) {
    return await models.optionGroup.findOne({
        where: {
            id: id
        }
    })
}

async function searchProductTypesByName(search) {
    return await models.sequelize.query("select concat('/shop?type=', productType) as link, productType as name from productTypes " +
        " where productType like :search ",
        { replacements: { search: '%' + search + '%' }, type: models.sequelize.QueryTypes.SELECT });
}

async function searchProductsByName(search) {
    return await models.sequelize.query("select concat('/shop/', name) as link, name from products " +
        " where name like :search ",
        { replacements: { search: '%' + search + '%' }, type: models.sequelize.QueryTypes.SELECT });
}

async function getOptionTypeById(id) {
    return await models.optionType.findOne({
        where: {
            id: id
        }
    })
}

async function getOptionByName(name) {
    return await models.option.findOne({
        where: {
            name: name
        }
    })
}

async function getOptionByNameAndType(name, optionTypeId) {
    return await models.option.findOne({
        where: {
            name: name,
            optionTypeFk: optionTypeId
        }
    })
}

async function createOption(name, optionTypeId) {

    return models.option.create({
        name: name,
        optionTypeFk: optionTypeId,
        deleteFl: false,
        versionNo: 1
    })
}

async function getOptionTypeByName(optionType) {
    return models.optionType.findOne({
        where: {
            optionType: optionType
        }
    })
}

async function createOptionType(optionType) {
    return models.optionType.create({
        optionType: optionType,
        deleteFl: false,
        versionNo: 1
    })
}

async function getNavigationBarHeaders() {
    return models.navigationBar.findOne({
        where: {
            deleteFl: false
        }
    })
}

async function updateNavigationBarHeaders(ids) {

    await models.navigationBar.update({
        productTypeFk1: ids[0] == 0 ? null : ids[0],
        productTypeFk2: ids[1] == 0 ? null : ids[1],
        productTypeFk3: ids[2] == 0 ? null : ids[2],
        productTypeFk4: ids[3] == 0 ? null : ids[3],
        productTypeFk5: ids[4] == 0 ? null : ids[4],
        productTypeFk6: ids[5] == 0 ? null : ids[5],
        productTypeFk7: ids[6] == 0 ? null : ids[6],
        productTypeFk8: ids[7] == 0 ? null : ids[7],
        productTypeFk9: ids[8] == 0 ? null : ids[8],
        productTypeFk10: ids[9] == 0 ? null : ids[9],
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: 1
        }
    })
}

async function getNavigationBarHeadersAndProducts() {

    const navigationBarHeaders = await models.navigationBar.findOne({
        where: {
            deleteFl: false
        }
    });

    const result = [];
    for (var i = 1; i <= 10; i++) {

        const productTypeId = navigationBarHeaders['productTypeFk' + i];

        if (productTypeId != null) {

            const productType = await getProductTypeById(productTypeId);
            const products = await getAllProductsByProductTypeId(productTypeId);
            result.push({ name: productType.productType, products: products });
        }
    }

    return result;
}

async function setHomePageOptions1To4(optionDetails, s3PathMap) {

    const data = {
        productTypeFk1: optionDetails.productTypeId1 == 0 ? null : optionDetails.productTypeId1,
        description1: optionDetails.productTypeId1 == 0 ? null : optionDetails.description1,
        productTypeFk2: optionDetails.productTypeId2 == 0 ? null : optionDetails.productTypeId2,
        description2: optionDetails.productTypeId2 == 0 ? null : optionDetails.description2,
        productTypeFk3: optionDetails.productTypeId3 == 0 ? null : optionDetails.productTypeId3,
        description3: optionDetails.productTypeId3 == 0 ? null : optionDetails.description3,
        productTypeFk4: optionDetails.productTypeId4 == 0 ? null : optionDetails.productTypeId4,
        description4: optionDetails.productTypeId4 == 0 ? null : optionDetails.description4,
        versionNo: models.sequelize.literal('versionNo + 1')
    }
    s3PathMap.forEach((value, key) => {
        data['imagePath' + key] = value;
    });

    for (var i = 1; i <= 4; i++) {
        const productTypeId = data[`productTypeFk${i}`];

        if (productTypeId == null) {
            data[`imagePath${i}`] = null;
        }
    }

    await models.homePageOption.update(data, {
        where: {
            id: 1
        }
    });
}

async function setHomePageOptions5To8(optionDetails, s3PathMap) {

    const data = {
        productTypeFk5: optionDetails.productTypeId5 == 0 ? null : optionDetails.productTypeId5,
        description5: optionDetails.productTypeId5 == 0 ? null : optionDetails.description5,
        productTypeFk6: optionDetails.productTypeId6 == 0 ? null : optionDetails.productTypeId6,
        description6: optionDetails.productTypeId6 == 0 ? null : optionDetails.description6,
        productTypeFk7: optionDetails.productTypeId7 == 0 ? null : optionDetails.productTypeId7,
        description7: optionDetails.productTypeId7 == 0 ? null : optionDetails.description7,
        productTypeFk8: optionDetails.productTypeId8 == 0 ? null : optionDetails.productTypeId8,
        description8: optionDetails.productTypeId8 == 0 ? null : optionDetails.description8,
        versionNo: models.sequelize.literal('versionNo + 1')
    }
    s3PathMap.forEach((value, key) => {
        data['imagePath' + key] = value;
    });

    for (var i = 5; i <= 8; i++) {
        const productTypeId = data[`productTypeFk${i}`];

        if (productTypeId == null) {
            data[`imagePath${i}`] = null;
        }
    }

    await models.homePageOption.update(data, {
        where: {
            id: 1
        }
    });
}


async function getHomePageOptions() {
    return await models.homePageOption.findOne({
        where: {
            id: 1
        }
    })
}

async function getHomePageBannerSection() {
    return await models.homePageBannerSection.findOne({
        where: {
            id: 1
        }
    })
}

async function createHomePageBannerSection(title, productTypeId, description, path) {
    return await models.homePageBannerSection.create({
        id: 1,
        title: title,
        productTypeFk: productTypeId,
        description: description,
        imagePath: path,
        deleteFl: false,
        versionNo: 1
    })
}

async function updateHomePageBannerSection(data) {
    await models.homePageBannerSection.update(data,
        {
            where: {
                id: 1
            }
        })
}

async function getHomePageMainBannerSection() {
    return await models.homePageMainBannerSection.findOne({
        where: {
            id: 1
        }
    })
}

async function createHomePageMainBannerSection(title, buttonText, description, path) {
    return await models.homePageMainBannerSection.create({
        id: 1,
        title: title,
        buttonText: buttonText,
        description: description,
        imagePath: path,
        deleteFl: false,
        versionNo: 1
    })
}

async function updateHomePageMainBannerSection(data) {
    await models.homePageMainBannerSection.update(data,
        {
            where: {
                id: 1
            }
        })
}

async function getTemplatesForSizeOptions(options) {

    return await models.sequelize.query('select t.*, o.name from templates t ' + 
                        ' inner join options o on t.sizeOptionFk = o.id ' + 
                        ' where t.deleteFl = false ' + 
                        ' and t.sizeOptionFk in (:options) ', 
                        {replacements: {options: options}, type: models.sequelize.QueryTypes.SELECT});
    
}

async function getTemplates() {
    return await models.sequelize.query('select t.*, o.name from templates t ' + 
                        ' inner join options o on t.sizeOptionFk = o.id ',
                        {type: models.sequelize.QueryTypes.SELECT});
}

async function getTemplate(id) {
    const result = await models.sequelize.query('select t.*, o.name from templates t ' + 
                        ' inner join options o on t.sizeOptionFk = o.id where t.id = :id',
                        {replacements:{id: id}, type: models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

async function getAvailableSizeOptionsForNewTemplate() {

    return await models.sequelize.query('select * from options o ' +
            ' where o.id not in (select sizeOptionFk from templates) ' +
            ' and o.optionTypeFk = 1 ', {type: models.sequelize.QueryTypes.SELECT});
}

async function createTemplate(body) {
    return await models.template.create(body);
}

async function updateTemplate(id, body) {

    await models.template.update(body, {
        where: {
            id: id
        }
    })
}

async function isProductInformationDetailsComplete(details) {

    const {name, productTypeFk, image1Path, description, subDescriptionTitle, subDescription, descriptionPoint1} = details;

    if(name === null || name === '')
        return false;

    const productType = await getProductTypeById(productTypeFk);
    if(productType === null)
        return false;

    if(image1Path === undefined || image1Path === null || image1Path === '')
        return false;

    if(description === undefined || description === null || description === '')
        return false;

    if(subDescriptionTitle === undefined || subDescriptionTitle === null || subDescriptionTitle === '')
        return false;

    if(subDescription === undefined || subDescription === null || subDescription === '')
        return false;

    if(descriptionPoint1 === undefined || descriptionPoint1 === null || descriptionPoint1 === '')
        return false;

    return true;
}

async function getQuantityGroupForProductId(productId) {
    return models.quantityGroup.findOne({
        where: {
            productFk: productId
        }
    });
}

async function getPriceMatrixDetailsForProductIdId(productId) {
    return models.priceMatrix.findOne({
        where: {
            productFk: productId,
        }
    })
};


async function verifyQuantities(productId, quantities) {
    
    const quantityGroup = await getQuantityGroupForProductId(productId);
    if(!quantityGroup) {
        return {valid: true, warning: false, message: false, create: true};
    }

    const exisitingQuantities = await getSelectedQuantitiesForProductById(productId);
    const existingQuantityIds = exisitingQuantities.map(q => q.id.toString());
    const quantitiesTheSame = utilityHelper.hasTheSameItems(quantities, existingQuantityIds);

    if(quantitiesTheSame) {
        return {valid: false, warning: false, message: 'No changes made.'};
    }

    const priceMatrix = await getPriceMatrixForProductId(productId);

    return {valid: true, create: false, warning: priceMatrix ? true : false, message: priceMatrix ? "Are you sure you wish to make this change? \nMaking this change will alter the existing 'Price' and 'Finishing' matrices and existing prices will be lost." : null};
    // check whether price matrix exists for product
    // TODO
    // check whether finishing matrix exists also

}

async function getFinishingMatrixRowQuantityPricesForProductIdAndOptionType(productId, optionType) {
    return models.sequelize.query('select distinct q.quantity, o.name as optionName, o.id as optionId, fmr.*, fq.*, fq.id as finishingMatrixRowQuantityPriceId from finishingMatrices fm ' + 
        ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id ' + 
        ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id ' + 
        ' inner join optionTypes ot on fm.optionTypeFk = ot.id ' +
        ' inner join quantities q on fq.quantityFk = q.id ' + 
        ' inner join options o on fmr.optionFK = o.id ' +
        ' where fm.productFk = :productId and ot.optionType = :optionType ' +
        ' and fm.deleteFl = false ' +
        ' and fmr.deleteFl = false ' + 
        ' and fq.deleteFl = false ' +
        ' order by fmr.orderNo asc', {replacements: {productId: productId, optionType: optionType},
    type: models.sequelize.QueryTypes.SELECT});
}

async function setQuantitiesForQuantityGroup(quantityGroup, quantities) {
    quantities.forEach(async quantityId => {
        await createQuantityGroupItem(quantityGroup.id, quantityId);
    })
}

async function removeAllQuantitesFromQuantityGroup(quantityGroup) { 
    await models.sequelize.query('delete from quantityGroupItems where quantityGroupFk = :id', 
    {replacements: {id: quantityGroup.id}, type: models.sequelize.QueryTypes.DELETE});
}

async function getQuantitiesForQuantityGroup(quantityGroupId) {
    return models.sequelize.query('select q.* from quantities q ' +
        ' inner join quantityGroupItems qgi on qgi.quantityFk = q.id ' + 
        ' where qgi.quantityGroupFk = :id ', {replacements: {id: quantityGroupId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getPriceMatrixRowsForQuantityGroup(quantityGroupId) {

    return models.sequelize.query('select pmr.* from priceMatrices pm ' +
        ' inner join quantityGroups qg on pm.quantityGroupFk = qg.id ' + 
        ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id ' +
        ' where pm.deleteFl = false ' +
        ' and pmr.deleteFl = false ' + 
        ' and qg.id = :id ', {replacements: {id: quantityGroupId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getFinishingMatrixRowsForQuantityGroup(quantityGroupId) {

    return models.sequelize.query('select fmr.* from finishingMatrices fm ' +
        ' inner join quantityGroups qg on fm.quantityGroupFk = qg.id ' + 
        ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id ' +
        ' where fm.deleteFl = false ' +
        ' and fmr.deleteFl = false ' + 
        ' and qg.id = :id ', {replacements: {id: quantityGroupId}, type: models.sequelize.QueryTypes.SELECT});
}

async function updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroupId, removedQuantities, addQuantities) {
    
    if(removedQuantities.length > 0) {
        await models.sequelize.query(' delete pq1 from priceMatrixRowQuantityPrices as pq1 ' + 
        ' inner join priceMatrixRowQuantityPrices as pq2 on pq1.id = pq2.id ' +
        ' inner join priceMatrixRows pmr on pq2.priceMatrixRowFk = pmr.id ' + 
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
        ' where pm.quantityGroupFk = :id ' +
        ' and pm.deleteFl = false ' +
        ' and pmr.deleteFl = false ' + 
        ' and pq2.deleteFl = false ' + 
        ' and pq2.quantityFk in (:removedQuantities)', {replacements: {id: quantityGroupId, removedQuantities:removedQuantities}, type: models.sequelize.QueryTypes.DELETE});

    }
    
    //get pricematrix rows not deleted
    const priceMatrixRows = await getPriceMatrixRowsForQuantityGroup(quantityGroupId);

    for(let i = 0; i < priceMatrixRows.length; i++) {

        const priceMatrixRow = priceMatrixRows[i];
        for(let j = 0; j < addQuantities.length; j++) {
            const addQuantity = addQuantities[j];

            await createPriceMatrixRowQuantityPrices(priceMatrixRow.id, addQuantity, null);
        }
    }
}

async function updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroupId, removedQuantities, addQuantities) {
    if(removedQuantities.length > 0) {
        await models.sequelize.query(' delete fq1 from finishingMatrixRowQuantityPrices as fq1 ' + 
        ' inner join finishingMatrixRowQuantityPrices as fq2 on fq1.id = fq2.id ' +
        ' inner join finishingMatrixRows fmr on fq2.finishingMatrixRowFk = fmr.id ' + 
        ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id ' +
        ' where fm.quantityGroupFk = :id ' +
        ' and fm.deleteFl = false ' +
        ' and fmr.deleteFl = false ' + 
        ' and fq2.deleteFl = false ' + 
        ' and fq2.quantityFk in (:removedQuantities)', {replacements: {id: quantityGroupId, removedQuantities:removedQuantities}, type: models.sequelize.QueryTypes.DELETE});
    }
    const finishingMatrixRows = await getFinishingMatrixRowsForQuantityGroup(quantityGroupId);

    for(let i = 0; i < finishingMatrixRows.length; i++) {

        const finishingMatrixRow = finishingMatrixRows[i];
        for(let j = 0; j < addQuantities.length; j++) {
            const addQuantity = addQuantities[j];

            await createFinishingMatrixRowQuantityPrice(finishingMatrixRow.id, addQuantity, null);
        }
    }
}

async function updateQuantitiesForQuantityGroup(quantityGroup, quantities) {

    const existingQuantities = await getQuantitiesForQuantityGroup(quantityGroup.id);
    const existingQuantityIds = existingQuantities.map(q => q.id.toString());
    const remove = [];
    const add = [];

    existingQuantityIds.forEach(existingQuantityId => {
        if(!quantities.includes(existingQuantityId))
            remove.push(existingQuantityId);
    });

    quantities.forEach(quantity => {

        if(!existingQuantityIds.includes(quantity))
            add.push(quantity);
    });

    await removeAllQuantitesFromQuantityGroup(quantityGroup);

    await setQuantitiesForQuantityGroup(quantityGroup, quantities);

    
    await updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroup.id, remove, add);
    await updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroup.id, remove, add);
    // update pricematrixrowquantityprices
    // update finisingmatrices


}

async function createQuantityGroupAndSetQuantities(productId, quantities) {
    const quantityGroup = await createQuantityGroup(productId);
    await setQuantitiesForQuantityGroup(quantityGroup, quantities);
}

async function createPrintingAttributes(productId, options, rows) {

    const isComplete = await isMatrixDetailsComplete(rows);
    const priceMatrix = await createPriceMatrix(productId, options, isComplete);
    await createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
}


async function getAttributeTypeByType(attributeType) {
    return models.attributeType.findOne({
        where: {
            attributeType
        }
    })
};

async function getPrintingAttributeType() {
    return getAttributeTypeByType('Printing');
}

async function getFinishingAttributeType() {
    return getAttributeTypeByType('Finishing');
}

async function deletePriceMatrixForProduct(productId) {

    await deletePriceMatrixRowQuantityPricesForPriceMatrixRow(productId);
    await deleteOptionGroupItemsForProduct(productId);
    await deletePriceMatrixRowsForProduct(productId);
    await deleteOptionGroupsForPriceMatrix(productId);
    await deleteOptionTypeGroupAndItemsForProductId(productId, 'Printing');

    await models.priceMatrix.update({
        deleteFl: true,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            productFk: productId,
            deleteFl: false
        }
    })
}

async function deletePriceMatrixRowQuantityPricesForPriceMatrixRow(productId) {
    await models.sequelize.query(
        'update priceMatrixRowQuantityPrices as pmrqr1 ' +
        ' inner join priceMatrixRowQuantityPrices as pmrqr2 on pmrqr1.id = pmrqr2.id ' +
        ' inner join priceMatrixRows pmr on pmrqr2.priceMatrixRowFk = pmr.id ' + 
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' + 
        ' inner join products p on pm.productFk = p.id ' +
        ' set pmrqr1.deleteFl = true, pmrqr1.versionNo = pmrqr1.versionNo + 1 ' + 
        ' where pm.deleteFl = false and p.id = :productId', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE})

}


async function deleteOptionGroupItemsForProduct(productId) {
    await models.sequelize.query('update optionGroupItems as ogi1 ' +
    ' inner join optionGroupItems as ogi2 on ogi1.id = ogi2.id ' +
    ' inner join priceMatrixRows pmr on pmr.optionGroupFk = ogi2.optionGroupFk ' + 
    ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' + 
    ' inner join products p on pm.productFk = p.id ' + 
    ' set ogi1.deleteFl = true, ogi1.versionNo = ogi1.versionNo + 1 ' + 
    ' where pm.deleteFl = false and p.id = :productId', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE})
}

async function deletePriceMatrixRowsForProduct(productId) {
    await models.sequelize.query('update priceMatrixRows as pmr1 ' +
    ' inner join priceMatrixRows as pmr2 on pmr1.id = pmr2.id ' + 
    ' inner join priceMatrices pm on pmr2.priceMatrixFk = pm.id ' +
    ' inner join products p on pm.productFk = p.id ' + 
    ' set pmr1.deleteFl = true, pmr1.versionNo = pmr1.versionNo + 1 ' + 
    ' where pm.deleteFl = false and p.id = :productId', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE})
}


async function deleteOptionGroupsForPriceMatrix(productId) {
    await models.sequelize.query('update optionGroups as og1 ' + 
    ' inner join optionGroups as og2 on og1.id = og2.id ' + 
    ' inner join priceMatrixRows as pmr on pmr.optionGroupFk = og2.id ' + 
    ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
    ' inner join products p on pm.productFk = p.id ' + 
    ' set og1.deleteFl = true, og1.versionNo = og1.versionNo + 1 ' + 
    ' where pm.deleteFl = false and p.id = :productId', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE})
}

async function deleteOptionTypeGroupAndItemsForProductId(productId, attributeType) {
     await models.sequelize.query(
        'update optionTypeGroupItems as otgi1 ' + 
        ' inner join optionTypeGroupItems as otgi2 on otgi1.id = otgi2.id ' +
        ' inner join optionTypeGroups otg on otgi2.optionTypeGroupFk = otg.id ' + 
        ' inner join attributeTypes a on otg.attributeTypeFk = a.id ' + 
        ' inner join products p on otg.productFk = p.id ' +
        ' set otgi1.deleteFl = true, otgi1.versionNo = otgi1.versionNo + 1 ' + 
        ' where otg.deleteFl = false and p.id = :productId ' + 
        ' and a.attributeType = :attributeType', {replacements: {productId: productId, attributeType: attributeType}, type: models.sequelize.QueryTypes.UPDATE});

    await models.optionTypeGroup.update({
        deleteFl: true,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            productFk: productId,
            deleteFl: false
        }
    })
    
}

async function getFinishingOptionTypesForProduct(productId) {

    return models.sequelize.query('select distinct ot.* from finishingMatrices fm ' +
    ' inner join optionTypeGroupItems otgi on otgi.optionTypeGroupFk = fm.optionTypeGroupFk ' + 
    ' inner join optionTypes ot on otgi.optionTypeFk = ot.id ' + 
    ' inner join products p on fm.productFk = p.id ' +
    ' where fm.deleteFl = false and p.id = :productId ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getOptionTypesNotUsedByFinishingMatrixForProduct(productId) {
    // get optionTypes For finishinmatrix

    return models.sequelize.query('select distinct * from optionTypes where id not in (select ot.id from finishingMatrices fm ' +
    ' inner join optionTypes ot on ot.id = fm.optionTypeFk ' + 
    ' inner join products p on fm.productFk = p.id ' +
    ' where fm.deleteFl = false and p.id = :productId) ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getOptionTypesNotUsedByPricingMatrixForProduct(productId) {
    // get optionTypes For finishinmatrix

    return models.sequelize.query('select distinct * from optionTypes where id not in (select ot.id from priceMatrices pm ' +
    ' inner join optionTypeGroupItems otgi on otgi.optionTypeGroupFk = pm.optionTypeGroupFk ' + 
    ' inner join optionTypes ot on otgi.optionTypeFk = ot.id ' + 
    ' inner join products p on pm.productFk = p.id ' +
    ' where pm.deleteFl = false and p.id = :productId) ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getFinishingMatricesForProductId(productId) {
    return models.finishingMatrix.findAll({
        where: {
            productFk: productId,
            deleteFl: false
        },
        order: [['orderNo', 'ASC']]
    })
}

async function getFinishingMatrixRowsForMatrix(matrixId) {
    const result = await models.sequelize.query('select distinct o.id as optionId, q.quantity, fmr.*, fq.*, fq.id as finishingMatrixRowQuantityPriceId from finishingMatrixRows fmr ' +
        ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id ' +
        ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id ' +
        ' inner join quantities q on fq.quantityFk = q.id ' +
        ' inner join options o on o.id = fmr.optionFk ' + 
        ' where fm.id = :matrixId ' +
        ' and fm.deleteFl = false order by fmr.orderNo asc', { replacements: { matrixId: matrixId }, type: models.sequelize.QueryTypes.SELECT });

    return result;
}

async function getFinishingMatricesDetailsForProductId(productId) {

    const finishingMatrices = await getFinishingMatricesForProductId(productId);
    const result = [];
    for(let i = 0; i < finishingMatrices.length; i++) {

        const finishingMatrix = finishingMatrices[i];

        const finishingMatrixRows = await getFinishingMatrixRowsForMatrix(finishingMatrix.id);

        const matrixDetails = {
            id: finishingMatrix.id,
            rows: finishingMatrixRows
        }

        result.push(matrixDetails);

    }
    return result;
        
}

async function createFinishingMatrix(productId, optionTypeId, orderNo, isComplete) {

    const quantityGroup = await getQuantityGroupForProductId(productId);
    return models.finishingMatrix.create({
        productFk: productId,
        orderNo,
        status: isComplete ? 'Complete' : 'Incomplete',
        optionTypeFk: optionTypeId,
        quantityGroupFk: quantityGroup.id,
        deleteFl: false,
        versionNo: 1
    })
}

async function getOptionTypeFromOptionId(optionId) {
    const optionTypes = await models.sequelize.query('select ot.* from options o ' + 
        ' inner join optionTypes ot on o.optionTypeFk = ot.id ' +
        ' where o.id = :id ', {replacements: {id: optionId}, type: models.sequelize.QueryTypes.SELECT});

    if(optionTypes.length === 0)
        return null;
    
    return optionTypes[0];
}

async function isMatrixDetailsComplete(matrix) {

    for(let i = 0; i < matrix.length; i++) {
        const row = matrix[i];
        const quantityGroup = row.quantityGroup;
        const pricesNotSet = quantityGroup.filter(q => q.price === '');

        if(pricesNotSet.length > 0) {
            return false;
        }
    };

    return true;
}

async function createFinishingMatrixRow(finishingMatrixId, optionId, orderNo) {
    return models.finishingMatrixRow.create({
        finishingMatrixFk: finishingMatrixId,
        optionFk: optionId,
        orderNo,
        deleteFl: false,
        versionNo: 1
    })
}

async function createFinishingMatrixRowQuantityPrice(finishingMatrixRowId, quantityId, price) {
    return models.finishingMatrixRowQuantityPrice.create({
        finishingMatrixRowFk: finishingMatrixRowId,
        quantityFk: quantityId,
        price: price === '' ? null : price,
        deleteFl: false,
        versionNo: 1
    })
}

async function createFinishingMatrices(productId, matrices) {

    for(let i = 0; i < matrices.length; i++) {

        const matrix = matrices[i];
        const isComplete = await isMatrixDetailsComplete(matrix);
        const optionType = await getOptionTypeFromOptionId(matrix[0].optionId[0]);
        const finishingMatrix = await createFinishingMatrix(productId, optionType.id, i + 1, isComplete);
        for(let j = 0; j < matrix.length; j++) {
            const row = matrix[j];
            const quantityGroup = row.quantityGroup;
            const optionId = row.optionId[0];
            const finishingMatrixRow = await createFinishingMatrixRow(finishingMatrix.id, optionId, j + 1);

        
            for(let k = 0; k < quantityGroup.length; k++) {

                const quantityItem = quantityGroup[k];

                await createFinishingMatrixRowQuantityPrice(finishingMatrixRow.id, quantityItem.id, quantityItem.price);
            }
        }
    }
}

async function deleteFinishingMatricesRowQuantitiesForProductId(productId) {

    await models.sequelize.query('update finishingMatrixRowQuantityPrices as fq1 ' + 
    ' inner join finishingMatrixRowQuantityPrices as fq2 on fq1.id = fq2.id ' +
    ' inner join finishingMatrixRows fmr on fq2.finishingMatrixRowFk = fmr.id ' +
    ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id ' +
    ' inner join products p on fm.productFk = p.id ' + 
    ' set fq1.deleteFl = true, fq1.versionNo = fq1.versionNo + 1 ' + 
    ' where fm.deleteFl = false ' + 
    ' and fq2.deleteFl =  false ' + 
    ' and fmr.deleteFl = false ' +
    ' and p.id = :productId ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE});
}

async function deleteFinishingMatricesRowsForProductId(productId) {

    await models.sequelize.query('update finishingMatrixRows as fmr1 ' +
    ' inner join finishingMatrixRows as fmr2 on fmr1.id = fmr2.id ' +
    ' inner join finishingMatrices fm on fmr2.finishingMatrixFk = fm.id ' +
    ' inner join products p on fm.productFk = p.id ' + 
    ' set fmr1.deleteFl = true, fmr1.versionNo = fmr1.versionNo + 1 ' + 
    ' where fm.deleteFl = false ' + 
    ' and fmr2.deleteFl = false ' +
    ' and p.id = :productId ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE});
}

async function deleteFinishingMatricesForProductId(productId) {
    await models.sequelize.query('update finishingMatrices as fm1 ' + 
    ' inner join finishingMatrices as fm2 on fm1.id = fm2.id ' +
    ' set fm1.deleteFl = true, fm1.versionNo = fm1.versionNo + 1 ' + 
    ' where fm2.productFk = :productId ' + 
    ' and fm2.deleteFl = false ', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.UPDATE});
}

async function deleteFinishingPriceMatricesForProduct(productId) {

    const transaction = await models.sequelize.transaction();
    try {
        await deleteFinishingMatricesRowQuantitiesForProductId(productId);
        await deleteFinishingMatricesRowsForProductId(productId);
        await deleteFinishingMatricesForProductId(productId);
        await transaction.commit();
    } catch(err) {
        console.log(err);
        await transaction.rollback();
    }   
}

async function isAllFinishingMatricesComplete(matrices) {

    for(let i = 0; i < matrices.length; i++) {
        const matrix = matrices[i];

        const isFinishingMatrixComplete = await isMatrixDetailsComplete(matrix);

        if(!isFinishingMatrixComplete)
            return false;
    }

    return true;
}

async function isProductValid(product) {

    const errors = await validateProductInformationDetails(product);
    if(!isEmpty(errors))
        return {isValid: false, page: 'page1'};

    const quantityGroup = await getQuantityGroupForProductId(product.id);
    if(!quantityGroup) 
        return {isValid: false, page: 'page2'};

    const priceMatrix = await getPriceMatrixForProductId(product.id);
    if(!priceMatrix)
        return {isValid: false, page: 'page3'};

    if(priceMatrix.status === 'Incomplete')
        return {isValid: false, page: 'page3'};

    const finishingMatrices = await getFinishingMatricesForProductId(product.id);

    const incompleteMatrices = finishingMatrices.filter(f => f.status === 'Incomplete');
    if(incompleteMatrices.length > 0) 
        return {isValid: false, page: 'page4'};

    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    if(productDeliveries.length === 0)
        return {isValid: false, page: 'page5'};


    // discounts    
    return {isValid: true};
}

async function deactivateProduct(productId, isComplete) {
    await models.product.update({
        deleteFl: true,
        status: isComplete ? 'Complete' : 'Incomplete',
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: productId
        }
    })
}

async function activateProduct(productId) {
    await models.product.update({
        deleteFl: false,
        versionNo: models.sequelize.literal('versionNo + 1'),
        status: 'Complete',
    }, {
        where: {
            id: productId
        }
    })
}

async function setProductStatusComplete(productId, isComplete) {
    const data = {
        versionNo: models.sequelize.literal('versionNo + 1'),
        status: isComplete ? 'Complete' : 'Incomplete',
    };

    if(!isComplete){
        data['deleteFl'] = true;
    }
    await models.product.update(data, {
        where: {
            id: productId
        }
    })
}

module.exports = {
    createPrintingAttributes,
    parseOptionTypesAndOption,
    getAllProductWithLowestPriceDetails,
    createPriceMatrixRowsAndQuantityPrices,
    createPriceMatrix,
    createProduct,
    uploadPictures,
    getOptionsForOptionTypeId,
    getPricingMatrixOptionTypesAndOptionsForProduct,
    getQuantityPriceTable,
    getAllQuantities,
    getAllOptionTypes,
    getLowestPriceWithQuantityForProductByProductId,
    getAllProductsByProductTypeId,
    getProductById,
    getProductByProductName,
    getAllProducts,
    getAllActiveProducts,
    getActiveProductTypeById,
    getProductTypeByType,
    getAllProductTypes,
    getAllActiveProductTypes,
    addAllOptionTypesToOptionTypesAndOptionJson,
    getSelectedQuantitiesForProductById,
    getPriceMatrixDetailsForProductId,
    updateProduct,
    updatePriceMatrixRowPrices,
    deletePriceMatrixForProduct,
    getAllProductTypesWithNumberOfProducts,
    updateProductType,
    getProductTypeById,
    getActiveProductsForProductTypeName,
    createOptionGroup,
    createOptionGroupItem,
    getOptionGroupItemsForOptionGroup,
    getQuantitiesForProduct,
    getOptionGroupById,
    getOptionGroupItemsByOptionGroupId,
    searchProductTypesByName,
    searchProductsByName,
    getOptionTypeById,
    getOptionByName,
    createOption,
    getAllOptionTypesWithOptions,
    getOptionTypeByName,
    createOptionType,
    getOptionByNameAndType,
    getNavigationBarHeaders,
    updateNavigationBarHeaders,
    getNavigationBarHeadersAndProducts,
    createProductType,
    setHomePageOptions5To8,
    setHomePageOptions1To4,
    getHomePageOptions,
    getHomePageBannerSection,
    createHomePageBannerSection,
    updateHomePageBannerSection,
    getHomePageMainBannerSection,
    createHomePageMainBannerSection,
    updateHomePageMainBannerSection,
    getTemplatesForSizeOptions,
    getTemplates,
    getAvailableSizeOptionsForNewTemplate,
    createTemplate,
    getTemplate,
    updateTemplate,
    isProductInformationDetailsComplete,
    validateProductInformationDetails,
    updateProductDetailsWithPicturesAndBulletPoints,
    getQuantityGroupForProductId,
    getPriceMatrixDetailsForProductIdId,
    verifyQuantities,
    setQuantitiesForQuantityGroup,
    updateQuantitiesForQuantityGroup,
    createQuantityGroupAndSetQuantities,
    getPriceMatrixDetailsForProductIdId,
    getOptionGroupForProductId,
    getPriceMatrixForProductId,
    getOptionTypesNotUsedByFinishingMatrixForProduct,
    getFinishingOptionTypesForProduct,
    getOptionTypesNotUsedByPricingMatrixForProduct,
    getFinishingMatricesForProductId,
    getFinishingMatrixOptionTypesAndOptionsForProduct,
    getFinishingMatricesDetailsForProductId,
    createFinishingMatrices,
    addAllOptionTypesToOptionTypesAndOptionToFinishingJson,
    deleteFinishingPriceMatricesForProduct,
    isMatrixDetailsComplete,
    isAllFinishingMatricesComplete,
    isProductValid,
    deactivateProduct,
    activateProduct,
    setProductStatusComplete
    
};