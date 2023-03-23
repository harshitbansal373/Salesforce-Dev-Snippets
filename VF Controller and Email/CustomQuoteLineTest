@IsTest
public class CustomQuoteLineTest {
    @IsTest
    static void getDistanceWithshipToAndStartingAddress(){
        Account testAccount = new Account(Name='Test Account',Industry='Church');
        insert testAccount;

        Product2 testProduct = new Product2(Name='Test Product', IsActive=true);
        insert testProduct;

        PricebookEntry testPrice = new PricebookEntry(Pricebook2Id=Test.getStandardPricebookId(), Product2Id=testProduct.Id, UnitPrice=100, IsActive=true);
        insert testPrice;

        Opportunity testOpp = new Opportunity(Name='Test Opp',StageName='Discovery',Amount=1000,CloseDate = System.Today(),AccountId=testAccount.Id);
        insert testOpp;

        Address__c shipToAddress =new Address__c(Address__Street__s = 'Mall of Jaipur', Address__StateCode__s = 'RJ', Address__City__s = 'Jaipur', 
        Address__PostalCode__s = '302021', Address__CountryCode__s = 'IN', Account__c = testAccount.id);
        insert shipToAddress;
		
        SBQQ__Quote__c testQuote = new SBQQ__Quote__c(SBQQ__Account__c = testAccount.Id, SBQQ__Opportunity2__c = testOpp.Id, ShipTo_Address__c = shipToAddress.id,
        Starting_Address__Street__s = 'Birla Mandir', Starting_Address__City__s = 'Jaipur', Starting_Address__StateCode__s = 'RJ', Starting_Address__PostalCode__s = '302004', Starting_Address__CountryCode__s = 'IN',
                                                     MGRC_Transaction_Type__c = 'Rental', Rental_Results_Order_Type__c = 'Education Lease - EDLS');
        insert testQuote;
        
        SBQQ__QuoteLine__c testQuoteLine = new SBQQ__QuoteLine__c(SBQQ__Quote__c=testQuote.Id, SBQQ__Product__c=testProduct.Id ,SBQQ__Quantity__c =1);
        insert testQuoteLine;

        Test.startTest();
        List<SBQQ__QuoteLine__c> quoteLineLst = new List<SBQQ__QuoteLine__c>();
        CustomQuoteLine cql = new CustomQuoteLine();
        cql.currentQuoteId = testQuote.Id;
        quoteLineLst = cql.getQuoteLines();
		Test.stopTest();

        System.assertEquals(1, quoteLineLst.size());
        
    }

}
