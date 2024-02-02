exports.getCompanyDetails = function() {
    return {
        COMPANY_LOGO: process.env.COMPANY_LOGO,
        COMPANY_NAME: process.env.COMPANY_NAME,
        COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
        COMPANY_PHONE: process.env.COMPANY_PHONE,
        COMPANY_EMAIL: process.env.COMPANY_EMAIL
    }
}