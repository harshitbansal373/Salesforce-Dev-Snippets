public class CustomQuoteLine {
    public Id currentQuoteId{get;set;}
    public List<SBQQ__QuoteLine__c> quoteLineLst {get;set;}

    public List<SBQQ__QuoteLine__c> getQuoteLines(){     
        quoteLineLst = [SELECT Id, SBQQ__ProductCode__c, SBQQ__Quantity__c, SBQQ__ListPrice__c, Minimum_Price__c, Target_Price__c,
                                Optimum_Price__c, Contracted_Price__c, SBQQ__SubscriptionTerm__c, MGRC_Cost__c, Zilliant_Cost__c 
                        FROM SBQQ__QuoteLine__c 
                        WHERE SBQQ__Quote__c =: currentQuoteId];
        return quoteLineLst;
    }

}
