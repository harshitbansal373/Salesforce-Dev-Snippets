// Defines fields visibility
// Runs a loop for each field - for Quotes and Quote lines.
// If false is returned, the field data is not visible on the quote line editor
export function isFieldVisibleForObject(fieldName, quoteOrLine, conn, objectName) {
    if (objectName === 'QuoteLine__c' && fieldName === 'SBQQ__PackageProductCode__c' ) {
        if (quoteOrLine.SBQQ__Quote__r.AccountIndustry__c === 'Electronics') {
            return false;
        }
    }
}

// Defines field Editability
// Runs a loop; same as above.
// If false is returned, the field is not editable on Quote line editor
// *** THIS PERMISSION DOES NOT APPLY ON THE PAGE LAYOUT ***
export function isFieldEditableForObject(fieldName, quoteOrLine, conn, objectName) {

    if (objectName === 'QuoteLine__c' && fieldName === 'SBQQ__PartnerDiscount__c' ) {
        if (quoteOrLine.SBQQ__Quote__r.AccountIndustry__c === 'Electronics' ) {
            return false;
        }
    }
}

// Runs before the Default calculations happen
export function onBeforeCalculate(quoteModel, quoteLineModels, conn){

    // Query data from SF
    return conn
    .query(
    "SELECT Id, SBQQ__Account__r.SLA__c From SBQQ__Quote__c WHERE Id = '"+ quoteModel.Id + "' "
    )
    .then((result) => {
        let AccSLA = result.records[0].SBQQ__Account__r.SLA__c;
        
        if(AccSLA == 'Platinum'){
            quoteModel.record['SBQQ__CustomerDiscount__c'] = 40;
        }else if(AccSLA == 'Gold'){
            quoteModel.record['SBQQ__CustomerDiscount__c'] = 30;
        }else if(AccSLA == 'Silver'){
            quoteModel.record['SBQQ__CustomerDiscount__c'] = 20;
        }else{
            quoteModel.record['SBQQ__CustomerDiscount__c'] = 10;
        }
        console.log("discount -> ", quoteModel.record['SBQQ__CustomerDiscount__c']);
        return Promise.resolve();
    });
};

// Runs after the default/standard calculations happen
export function onAfterCalculate(quoteModel, quoteLineModels) {
    if(quoteModel.record['Payment_Type__c'] == 'Installment'){
        quoteModel.record['Installment_Amount__c'] = quoteModel.record['SBQQ__NetAmount__c']/quoteModel.record['SBQQ__SubscriptionTerm__c'];
    }
    console.log('Installment_Amount__c -> ', quoteModel.record['Installment_Amount__c']);
    return Promise.resolve();
};
