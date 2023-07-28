const models = require('../../models');
const {Upload} = require("@aws-sdk/lib-storage");
const {S3Client} = require("@aws-sdk/client-s3");
const { Op } = require('sequelize');

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
    return await models.product.findAll();
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
    return await models.product.findOne({
        where: {
            id: id
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
            ' order by pmrqp.price asc limit 1', {replacements:{ productId: productId}, type: models.sequelize.QueryTypes.SELECT});

    if(result.length > 0)
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
    return await models.sequelize.query('select distinct ot.* from optiontypes ot ' +
        ' inner join options o on o.optionTypeFk = ot.id ',
        {type:models.sequelize.QueryTypes.SELECT});
}

async function getAllQuantities() {
    return await models.quantity.findAll({
        order: [['quantity', 'ASC']],
        where: {
            deleteFl: false
        }
    })
}

async function getQuantityPriceTable(options, productId) {

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

    return await models.sequelize.query(query, {replacements: replacements, type: models.sequelize.QueryTypes.SELECT});

}

async function getOptionTypesAndOptionsForProductByProductId(productId) {
    
    const results = await models.sequelize.query('SELECT distinct ot.id AS optionTypeId, ot.optionType, o.id AS optionId, o.name ' +
        ' FROM products p ' +
        ' INNER JOIN priceMatrices pm ON pm.productFk = p.id ' +
        ' INNER JOIN priceMatrixRows pmr ON pmr.priceMatrixFk = pm.id ' +
        ' INNER JOIN optionGroupItems ogi ON ogi.optionGroupFk = pmr.optionGroupFk ' +
        ' INNER JOIN options o ON ogi.optionFk = o.id ' +
        ' INNER JOIN optionTypes ot ON o.optionTypeFk = ot.id ' +
        ' WHERE p.id = :productId ' +
        ' and pm.deleteFl = false ', {replacements:{ productId: productId}, type: models.sequelize.QueryTypes.SELECT});
    
    if(results.length == 0)
        return null;

    var map = new Map();

    results.forEach(result => {

        const optionTypeId = result.optionTypeId;
        const optionType = result.optionType;
        const optionId = result.optionId;
        const name = result.name;

        if(!map.has(optionType)) {
            map.set(optionType, []);
        }

        var options = map.get(optionType);
        var option = {
            optionId: optionId,
            name: name,
            optionTypeId: optionTypeId
        }

        options.push(option);

        map.set(optionType, options);
    });

    const mapAsObject = Object.fromEntries(map);

    return mapAsObject;
}

async function getOptionsForOptionTypeId(optionTypeId) {

    return await models.option.findAll({
        where:{
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
        var extension = value.mimeType == 'image/jpeg' ? 'jpg' : 'png';
        var fileName = 'picture' + index;
        var s3Path = process.env.S3_BUCKET_PATH + '/' + folder + productName + '/' + date + '_' + encodeURIComponent(fileName) + '.' + extension;
        var params = {
            Bucket: process.env.S3_BUCKET,
            Body: blob,
            Key: folder + productName + '/' + date + '_' + fileName + '.' + extension,
            ACL:'public-read'
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

async function createProduct(productDetails, s3PathMap, bulletPoints) {
    
    // var imageCount = 1;
    s3PathMap.forEach((value, key) => {
        productDetails['image' + key + 'Path'] = value;
        // imageCount++;
    });

    var descriptionCount = 1;
    bulletPoints.forEach(bulletPoint => {
        productDetails['descriptionPoint' + descriptionCount] = bulletPoint;
        descriptionCount++;
    })

    return await models.product.create(productDetails);
}

async function createPriceMatrix(productId, options, quantities) {

    // from options list, u have the id
    // from the list of ids get the distinct optionType ids
    // create optiontypegroup
    // then optiontypegroupitems

    const optionTypeGroup = await createOptionTypeGroup();
    var optionsObject = await getOptionsByIds(options);
    var optionTypeIds = new Set();

    optionsObject.forEach(o => {
        optionTypeIds.add(o.optionTypeFk);
    });

    optionTypeIds.forEach(async optionTypeId => {
        await createOptionTypeGroupItem(optionTypeGroup.id, optionTypeId);
    })

    const quantityGroup = await createQuantityGroup();
    quantities.forEach(async quantityId => {
        await createQuantityGroupItem(quantityGroup.id, quantityId);
    })

    return models.priceMatrix.create({
        productFk: productId,
        optionTypeGroupFk: optionTypeGroup.id,
        quantityGroupFk: quantityGroup.id,
        deleteFl: false,
        verisonNo: 1
    })
}

async function createPriceMatrixRowsAndQuantityPrices(priceMatrixId, rows) {

    rows.forEach(async row => {
        const optionGroup = await createOptionGroup();
        const priceMatrixRow = await createPriceMatrixRow(priceMatrixId, optionGroup.id);
        const optionIds = row.optionIdGroup;
        optionIds.forEach(async optionId => {
            await createOptionGroupItem(optionGroup.id, optionId);
        });

        const quantities = row.quantityGroup;

        quantities.forEach(async quantity => {

            await createPriceMatrixRowQuantityPrices(priceMatrixRow.id, quantity.id, quantity.price);
        });
    })
}

 async function getAllProductWithLowestPriceDetails() {

    return await models.sequelize.query(' select distinct pq.price, pt.productType, p.* from priceMatrixRowQuantityPrices pq ' +
        ' inner join priceMatrixrows pr on pq.priceMatrixRowFk = pr.id ' +
        ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id ' +
        ' inner join products p on pm.productFk = p.id ' +
        ' inner join productTypes pt on p.productTypeFk = pt.id ' +
        ' where pq.id = ( ' +
        ' select pq2.id from priceMatrixRowQuantityPrices pq2 ' +
        ' inner join priceMatrixrows pr2 on pq2.priceMatrixRowFk = pr2.id ' +
        ' inner join priceMatrices pm2 on pr2.priceMatrixFk = pm2.id ' +
        ' where pm2.productFk = p.id ' +
        ' order by pq2.price asc limit 1 ) ' +
        ' and pm.deleteFl = false ', { type: models.sequelize.QueryTypes.SELECT});
}

async function createQuantityGroupItem(quantityGroupId, quantityId) {
    await models.quantityGroupItem.create({
        quantityGroupFk: quantityGroupId,
        quantityFk: quantityId,
        deleteFl: false,
        versionNo: 1
    });
}

async function createQuantityGroup() {
    return models.quantityGroup.create({
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

async function createOptionTypeGroup() {
    return await models.optionTypeGroup.create({
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

async function createPriceMatrixRow(priceMatrixId, optionGroupId) {
    return await models.priceMatrixRow.create({
        priceMatrixFk: priceMatrixId,
        optionGroupFk: optionGroupId,
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
        var typeIds = (optionTypeAndOption.map(o => { return o.optionTypeId}));
        typeIds.forEach(typeId => {
            optionTypeIds.add(typeId);
        })
    }

    optionTypeIds.forEach(optionTypeId => {
        
        for (var key in optionTypesAndOptions) {
            const optionTypeAndOption = optionTypesAndOptions[key];

            var items = optionTypeAndOption.filter(o => o.optionTypeId == optionTypeId)
                .map(o2 => {
                    return {name: o2.name, optionId: o2.optionId};
                });
            parsedOptionTypesAndOptions.push({optionTypeId, options: items});
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

async function getSelectedQuantitiesForProductById(productId) {

    var result = await models.sequelize.query('select distinct q.id, q.quantity from quantityGroupItems qi ' +
                ' inner join priceMatrices pm on pm.quantityGroupFk = qi.quantityGroupFk ' +
                ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id ' +
                ' inner join priceMatrixRowQuantityPrices pq on pq.priceMatrixRowFk = pmr.id ' +
                ' inner join quantities q on pq.quantityFk = q.id ' +
                ' where pm.productFk = :productId ' +
                ' and pm.deleteFl = false ' +
                ' order by q.quantity asc', {replacements:{productId: productId}, type: models.sequelize.QueryTypes.SELECT})
    
    return result;
}

async function getPriceMatrixForProduct(productId) {

    const result = await models.sequelize.query('select distinct q.quantity, pmr.*,pq.*, pq.id as priceMatrixRowQuantityPriceId from priceMatrixRows pmr ' +
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
        ' inner join priceMatrixRowQuantityPrices pq on pq.priceMatrixRowFk = pmr.id ' +
        ' inner join quantities q on pq.quantityFk = q.id ' +
        ' inner join optionGroupItems ogi on ogi.optionGroupFk = pmr.optionGroupFk ' +
        ' where pm.productFk = :productId ' +
        ' and pm.deleteFl = false',{replacements:{productId: productId}, type: models.sequelize.QueryTypes.SELECT});

    const optionGroupIds = Array.from(new Set(result.map(o => o.optionGroupFk)));
    var rows = [];
    for(var i = 0; i < optionGroupIds.length; i++) {
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

    return await models.sequelize.query('select o.name, o.id, ot.optionType from optionGroupitems ogi ' +
    ' inner join options o on ogi.optionFk = o.id ' + 
    ' inner join optionTypes ot on o.optionTypeFk = ot.id ' + 
    ' where ogi.optionGroupFk = :optionGroupId ',
        {replacements:{optionGroupId: optionGroupId}, type: models.sequelize.QueryTypes.SELECT});
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
        name: productDetails.productName,
        productTypeFk: productDetails.productTypeId,
        description: productDetails.description,
        subDescriptionTitle: productDetails.subDescriptionTitle,
        subDescription: productDetails.subDescription,
        deleteFl: productDetails.deleteFl,
        versionNo: models.sequelize.literal('versionNo + 1')
    };

    const s3PathMap = productDetails.s3PathMap;
    s3PathMap.forEach((value, path) => {
        data['image' + path + 'Path'] = value;
    });

    const bulletPoints = productDetails.bulletPoints;
    const numberOfPoints = bulletPoints.length;
    for(var i = 0; i < 6; i++) {

        if(i < numberOfPoints) {
            const bulletPoint = bulletPoints[i];
            data['descriptionPoint' + (i + 1)] = bulletPoint;
        } else {
            data['descriptionPoint' + (i + 1)] = null;
        }
    }

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

async function deletePriceMatrixForProduct(productId) {

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

async function getAllProductTypesWithNumberOfProducts() {
    return await models.sequelize.query('SELECT pt.id, pt.productType, COUNT(p.id) as numberOfProducts, pt.deleteFl ' +
                ' FROM productTypes pt ' +
                ' LEFT JOIN products p ON pt.id = p.productTypeFk ' +
                ' GROUP BY pt.id, pt.productType ', {type:models.sequelize.QueryTypes.SELECT});
}

async function updateProductType(productTypeDetails) {
    await models.productType.update({
        name: productTypeDetails.productTypeName,
        bannerPath: productTypeDetails.bannerPath,
        deleteFl: productTypeDetails.deleteFl,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: productTypeDetails.productTypeId
        }
    })
}

async function getActiveProductsForProductTypeName(productTypeName) {
    return await models.sequelize.query('select p.* from productTypes pt ' + 
                    ' inner join products p on p.productTypeFk = pt.id ' +
                    ' where pt.productType = :productTypeName ' + 
                    ' and p.deleteFl = false ', {replacements:{productTypeName: productTypeName}, type: models.sequelize.QueryTypes.SELECT});
}

async function getQuantitiesForProduct(productId) {
    return await models.sequelize.query('select q.* from products p ' +
                ' inner join priceMatrices pm on pm.productFk = p.id ' +
                ' inner join quantityGroupItems qgi on qgi.quantityGroupFk = pm.quantityGroupFk ' +
                ' inner join quantities q on qgi.quantityFk = q.id ' +
                ' where p.id = :productId ' +  
                ' and pm.deleteFl = false order by q.quantity asc', {replacements: {productId: productId}, type: models.sequelize.QueryTypes.SELECT});
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
                " where productType like :search " ,
                {replacements:{search: '%' + search + '%'}, type: models.sequelize.QueryTypes.SELECT});
}

async function searchProductsByName(search) {
    return await models.sequelize.query("select concat('/shop/', name) as link, name from products " +
                " where name like :search " ,
                {replacements:{search: '%' + search + '%'}, type: models.sequelize.QueryTypes.SELECT});
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

module.exports = {
    parseOptionTypesAndOption,
    getAllProductWithLowestPriceDetails,
    createPriceMatrixRowsAndQuantityPrices,
    createPriceMatrix,
    createProduct,
    uploadPictures,
    getOptionsForOptionTypeId,
    getOptionTypesAndOptionsForProductByProductId,
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
    getPriceMatrixForProduct,
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
    getOptionByNameAndType
  };