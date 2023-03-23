//QCP with dummy zilliant data
//current working script with latest fixes
export function isFieldEditable(fieldName, line) {
    if (line.SBQQ__Quote__r.MGRC_Transaction_Type__c === "Sale") {
      if (fieldName === "BillHow__c") return false;
    }
  
    if (line.BillHow__c === "RENT") {
      if (fieldName === "BillHow__c") return false;
    }
  
    if (line.Rental_Sale__c === "Sale") {
      if (fieldName === "BillHow__c") return false;
    }
  
    return null;
  }
  
  export function onInit(quoteLineModels) {
    return Promise.resolve();
  }
  
  export function onBeforeCalculate(quoteModel, linesModel, conn) {
    console.log("onBeforeCalculate");
    let productIds = [];
    let bundleProductIds = [];
    let quoteLineToProductMap = new Map();
    for (let line of linesModel) {
      if (line.record["SBQQ__ProductCode__c"] === "Locks" || line.record["Rental_Sale__c"] === "Rental") {
        line.record["BillHow__c"] = "RENT";
        if (
          quoteModel.record["MGRC_Transaction_Type__c"] === "Rental" &&
          line.record["Rental_Sale__c"] === "Sale"
        ) {
          line.record["BillHow__c"] = "IB";
        } else if (quoteModel.record["MGRC_Transaction_Type__c"] === "Sale") {
          line.record["BillHow__c"] = "IB";
        }
      } else if (
        //line.record["BillHow__c"] === "Rental" &&
        line.record["Rental_Sale__c"] === "Sale"
      ) {
        line.record["BillHow__c"] = "IB";
      } 
      //else if (line.record["Rental_Sale__c"] === "Rental"){
        //line.record["BillHow__c"] = "RENT";
      //} 
      else if (quoteModel.record["MGRC_Transaction_Type__c"] === "Sale") {
        line.record["BillHow__c"] = "IB";
      } else if (
        line.record["SBQQ__ProductCode__c"] === "Cleaning.Fee" &&
        (line.record["Bundle_Name__c"] === "PS Offices Container Bundle" ||
          line.record["Bundle_Name__c"] === "PS Combo Container Bundle")
      ) {
        line.record["BillHow__c"] = "FB";
      }
  
      if (
        line.record["SBQQ__Product__c"] &&
        !productIds.includes(line.record["SBQQ__Product__c"])
      ) {
        productIds.push(line.record["SBQQ__Product__c"]);
      }
  
      if (line.record["SBQQ__Bundle__c"] === true && !line.parentItem) {
        bundleProductIds.push(line.record["SBQQ__Product__c"]);
      }
  
      quoteLineToProductMap.set(line.key, line.record["SBQQ__Product__c"]);
      //console.log()
    }
  
    return conn.query(
        "select Id, SBQQ__ConfiguredSKU__c from SBQQ__ProductFeature__c where SBQQ__Number__c = 1 and SBQQ__ConfiguredSKU__c in " +
          "('" +
          bundleProductIds.join("', '") +
          "')"
      ).then((res) => {
        //console.log('bundle products ids ->' + bundleProductIds);
        let bundleToFirstFeatureMap = new Map();
        for (let f of res.records) {
          //console.log('found records from bundle products ids ->' + bundleProductIds);
          bundleToFirstFeatureMap.set(f.SBQQ__ConfiguredSKU__c, f.Id);
        }
        //console.log('bundle to first feature map ->' + JSON.stringify(bundleToFirstFeatureMap));
        let firstFeatureOptionProducts = [];
        let bundleToFirstFeatureProductId = new Map();
        let bundleIdToModelJSONMap = new Map();
        let firstFeatureLineIds = [];
        for (let line of linesModel) {
          //console.log('line key ->' + line.key);
          //console.log('line to parent item ->' + line.parentItem);
          //console.log('line to parent item key->' + line.parentItem.key);
          if (line.parentItem && quoteLineToProductMap.has(line.parentItem.key)) {
            //console.log('line has parent item ->' + line.parentItem);
            let bundleProductId = quoteLineToProductMap.get(line.parentItem.key);
            //console.log('bundleproduct id ->' + bundleProductId);
            if (bundleToFirstFeatureMap.has(bundleProductId)) {
              //console.log('bundle has first feature map');
              let firstFeatureId = bundleToFirstFeatureMap.get(bundleProductId);
              //console.log('first feature id ->' + firstFeatureId);
              //console.log('product option ->' + line.record["SBQQ__ProductOption__c"]);
              if (
                (line.record["SBQQ__ProductOption__c"] && line.record["SBQQ__ProductFamily__c"] === "Model") || 
                (line.record["SBQQ__DynamicOptionId__c"] && line.record["SBQQ__DynamicOptionId__c"].startsWith(
                  firstFeatureId + ":" )
                )
              ) {
                console.log('inside if of features id');
                firstFeatureOptionProducts.push(
                  line.record["SBQQ__ProductCode__c"]
                );
                bundleToFirstFeatureProductId.set(
                  bundleProductId,
                  line.record["SBQQ__Product__c"]
                );
                if(line.record["SBQQ__ProductFamily__c"] === "Model"){
                  console.log('inside model');
                    let modelJSON = {
                        Perimeter_of_unit : line.record["Perimeter_of_Unit__c"],
                        Freight_Type : line.record["Freight_Type__c"],
                        Number_of_Floors : line.record["Number_of_Floors__c"]
                    };
                    bundleIdToModelJSONMap.set(line.record["SBQQ__Number__c"]-1, modelJSON);
                    console.log('bundleIdToModelJSONMap ---> ' , bundleIdToModelJSONMap);
                }
                firstFeatureLineIds.push(line.key);
              }
            }
          }
        }
        for (let line of linesModel) {
            if(bundleIdToModelJSONMap.has(line.record["SBQQ__Number__c"])){
                let modelJSON = bundleIdToModelJSONMap.get(line.record["SBQQ__Number__c"]);
                line.record["Perimeter_of_Unit__c"] = modelJSON.Perimeter_of_unit;
                line.record["Freight_Type__c"] = modelJSON.Freight_Type;
                line.record["Number_of_Floors__c"] = modelJSON.Number_of_Floors;
            }
        }
  
        return conn
          .query(
            "select Number__c, Table__c, Column_Name__c from Derationalization_Lookup_Key__mdt order by Number__c asc"
          )
          .then((res) => {
            let keyColumns = [];
            let keyPartByNumberMap = new Map();
            let productFields = [
              "Id",
              "Name",
              "ProductCode",
              "Item_Code__c",
              "Derationalization_Key_Type__c"
            ];
            for (let p of res.records) {
              keyPartByNumberMap.set(p.Number__c, p);
              keyColumns.push(p);
              if (
                p.Table__c == "Product" &&
                p.Column_Name__c &&
                !productFields.includes(p.Column_Name__c)
              ) {
                productFields.push(p.Column_Name__c);
              }
            }
            //console.log('passed 1');
            //console.log(productFields);
            //console.log( productIds);
            return conn
              .query(
                "select " +
                  productFields.join(", ") +
                  " from Product2 where Id in " +
                  "('" +
                  productIds.join("', '") +
                  "')"
              )
              .then((res) => {
                //console.log('inside response of query');
                let productsMap = new Map();
                for (let p of res.records) {
                  productsMap.set(p.Id, p);
                }
  
                let firstFeatureLineWithEmptyPrimaryModelIds = [];
                let firstFeatureLineKeys = [];
                let bundleIdToPrimaryModelMap = new Map();
                //console.log('first feature line ids ->' + firstFeatureLineIds);
                for (let line of linesModel) {
                  if(line.parentItem){
                    if(line.parentItem.record["Model_Item__c"]){
                      console.log('continuing');
                      continue;
                    }
                  }
                  
                  //console.log('inside for');
                  if (firstFeatureLineIds.includes(line.key)) {
                    //console.log('inside if of for');
                    let p = productsMap.get(line.record["SBQQ__Product__c"]);
                    if (p.Item_Code__c) {
                      line.record["Primary_Model__c"] = p.Item_Code__c;
                      bundleIdToPrimaryModelMap.set(
                        line.parentItem.key,
                        line.record["Primary_Model__c"]
                      );
                    } else {
                      firstFeatureLineWithEmptyPrimaryModelIds.push(line.key);
                      let key = getQuoteLineKey(
                        line,
                        quoteModel,
                        productsMap,
                        keyPartByNumberMap
                      );
                      firstFeatureLineKeys.push(key);
                      line.record["key"] = key;
                    }
                  }
                }
                //console.log('passed 2 with key ->' + JSON.stringify(firstFeatureLineKeys));
                return conn
                  .query(
                    "select MGRC_Item_Number__c, Key__c, Name from MGRC_Derationalize__c where Key__c in " +
                      "('" +
                      firstFeatureLineKeys.join("', '") +
                      "')"
                  )
                  .then((res) => {
                   // console.log('getting data');
                    let firstFeatureKeyToDeratMap = new Map();
                    for (let p of res.records) {
                     // console.log('setting key to item number map');
                      firstFeatureKeyToDeratMap.set(
                        p.Key__c,
                        p.MGRC_Item_Number__c
                      );
                    }
                    //console.log('firstFeatureKeyToDeratMap ->' + JSON.stringify(firstFeatureKeyToDeratMap));
                    //console.log([...firstFeatureKeyToDeratMap.entries()]);
                    //console.log('derat map ->' + firstFeatureKeyToDeratMap);
                    for (let line of linesModel) {
                      if(line.parentItem){
                        if(line.parentItem.record["Model_Item__c"]){
                          console.log('continuing');
                          continue;
                        }
                      }
                      if (
                        firstFeatureLineWithEmptyPrimaryModelIds.includes(
                          line.key
                        )
                      ) {
                        console.log('why in this if it continued');
                        let p = productsMap.get(line.record["SBQQ__Product__c"]);
                        let primaryModel;
                        if (p.Item_Code__c) {
                          console.log('setting p item code');
                          primaryModel = p.Item_Code__c;
                        } else if (
                          line.record["key"] &&
                          firstFeatureKeyToDeratMap.has(line.record["key"])
                        ) {
                          //console.log('inside else if');
                          //console.log('setting value' + firstFeatureKeyToDeratMap.get(line.record["key"]));
                          primaryModel = firstFeatureKeyToDeratMap.get(
                            line.record["key"]
                          );
                        }
  
                        if (primaryModel) {
                          console.log('setting primary model on quote line');
                          line.record["Primary_Model__c"] = primaryModel;
                          bundleIdToPrimaryModelMap.set(
                            line.parentItem.key,
                            primaryModel
                          );
                        }
                      }
                    }
  
                    for (let line of linesModel) {
                      if(line.parentItem){
                        if(line.parentItem.record["Model_Item__c"]){
                          console.log('continuing');
                          continue;
                        }
                      }
                      let parentKey = getTopParentKey(line);
                      if (bundleIdToPrimaryModelMap.has(parentKey)) {
                        line.record["Primary_Model__c"] =
                          bundleIdToPrimaryModelMap.get(parentKey);
                      }
                    }
  
                    let keys = [];
                    for (let line of linesModel) {
                      let key = getQuoteLineKey(
                        line,
                        quoteModel,
                        productsMap,
                        keyPartByNumberMap
                      );
                      keys.push(key);
                      line.record["key"] = key;
                    }
                    //console.log('keys' + keys);
                    return conn
                      .query(
                        "select MGRC_Item_Number__c, Key__c, Name from MGRC_Derationalize__c where Key__c in " +
                          "('" +
                          keys.join("', '") +
                          "')"
                      )
                      .then((res) => {
                        //console.log('passed in between');
                        let keyToDeratMap = new Map();
                        for (let p of res.records) {
                          keyToDeratMap.set(p.Key__c, p.MGRC_Item_Number__c);
                        }
                        //console.log('passed 4');
                        for (let line of linesModel) {
                          let p = productsMap.get(
                            line.record["SBQQ__Product__c"]
                          );
                          if (p.Item_Code__c) {
                            line.record["MGRC_Derationalize__c"] = p.Item_Code__c;
                            //line.record["Key__c"] = line.record["key"];
                          } else if (
                            line.record["key"] &&
                            keyToDeratMap.has(line.record["key"])
                          ) {
                            //console.log('passed 5');
                            line.record["MGRC_Derationalize__c"] =
                            keyToDeratMap.get(line.record["key"]);
                            //line.record["Key__c"] = line.record["key"];
                            //console.log('passed 6');
                          }
                          line.record["Key__c"] = line.record["key"];
                        }
                        //console.log('passed 7');
                        //debugger;
                        return Promise.resolve();
                      });
                  });
              });
          });
      });
  }
  
  function getQuoteLineKey(line, quote, productsMap, keyPartByNumberMap) {
    let keyValues = [];
    let p = productsMap.get(line.record["SBQQ__Product__c"]);
    let keyParts = [];
    if (p.Derationalization_Key_Type__c) {
      keyParts = p.Derationalization_Key_Type__c.split(",").map((v) =>
        parseInt(v)
      );
    }
    for (let i of keyParts) {
      let k = keyPartByNumberMap.get(i);
      if (k.Table__c == "Quote Line") {
        if (k.Column_Name__c && k.Column_Name__c == "SBQQ__RequiredBy__c") {
          keyValues.push(line.parentItem.record["SBQQ__ProductCode__c"]);
        } else if (k.Column_Name__c && line.record[k.Column_Name__c]) {
          keyValues.push(line.record[k.Column_Name__c]);
        } else {
          keyValues.push("0");
        }
      } else if (k.Table__c == "Quote") {
        if (k.Column_Name__c && quote.record[k.Column_Name__c]) {
          keyValues.push(quote.record[k.Column_Name__c]);
        } else {
          keyValues.push("0");
        }
      } else {
        //Product
        if (k.Column_Name__c && p[k.Column_Name__c]) {
          keyValues.push(p[k.Column_Name__c]);
        } else {
          keyValues.push("0");
        }
      }
    }
    let key = keyValues.join("_");
    return key;
  }
  
  function getTopParentKey(line) {
    if (!line.parentItem) {
      return null;
    }
    let parent = line.parentItem;
    while (true) {
      if (parent.parentItem) {
        parent = parent.parentItem;
      } else {
        break;
      }
    }
  
    return parent.key;
  }
  
  //execute Zilliant Script Below
  //Temporary dummy data until Zilliant script is in place
  const PATH = "/services/apexrest/zpq/zilliantguidancelookup/";
  export function onBeforePriceRules(quoteModel, linesModel, conn) {
  var flagForExpirationDate = 0;
  
  for (let line of linesModel) {
    if(line.record["Primary_Model__c"] && line.record["MGRC_Derationalize__c"]){
      line.record["Zilliant_Minimum__c"] = 5;
      line.record["Zilliant_Target__c"] = 10;
      line.record["Zilliant_Optimum__c"] = 15;
      line.record["Zilliant_Cost__c"] = 7.5;
    }
    if(quoteModel.record["CPL_Id__c"]){
      line.record["Zilliant_Contracted__c"] = 1;
    }
  
    let todayDate = new Date().toJSON().slice(0, 10);
    
    if(line.record["Guidance_Locked__c"] == true && (line.record["PV_BillHow__c"] != line.record["BillHow__c"] || line.record["PV_MGRC_Cost__c"] != line.record["MGRC_Cost__c"] || line.record["PV_MGRC_Derationalize__c"] != line.record["MGRC_Derationalize__c"] || line.record["PV_Pilot_Permit_Tier__c"] != line.record["Pilot_Permit_Tier__c"] || line.record["PV_Primary_Model__c"] != line.record["Primary_Model__c"] || line.record["PV_Subscription_Term__c"] != quoteModel.record["SBQQ__SubscriptionTerm__c"] || line.record["PV_Transportation_Distance__c"] != quoteModel.record["Transportation_Distance__c"] || line.record["PV_Transportation_Type__c"] != line.record["Transportation_Type__c"] )
    ){
        console.log('inside 1st if of guidance locked');
        line.record.Guidance_Locked__c = false;
    } 
    
    if(line.record["Guidance_Locked__c"] == true && !quoteModel.record["SBQQ__ExpirationDate__c"] ){
        console.log('inside else if of guidance locked');
        line.record.Guidance_Locked__c = false;
    }
    else if(line.record["Guidance_Locked__c"] == true && quoteModel.record["SBQQ__ExpirationDate__c"] < todayDate ){
        console.log('inside 2nd else if of guidance locked');
        line.record.Guidance_Locked__c = false;
        flagForExpirationDate = 1;
    }

    // else if(line.record["Guidance_Locked__c"] == true && !quoteModel.record["SBQQ__ExpirationDate__c"] ){
    //     console.log('inside else if of guidance locked');
    //     line.record.Guidance_Locked__c = false;
    // }
    // else if(line.record["Guidance_Locked__c"] == true && quoteModel.record["SBQQ__ExpirationDate__c"] < todayDate ){
    //     console.log('inside 2nd else if of guidance locked');
    //   line.record.Guidance_Locked__c = false;
    //   flagForExpirationDate = 1;
    // }

    // if(quoteModel.record["Created_from_Clone__c"] == true && quoteModel.record["SBQQ__ExpirationDate__c"] < todayDate){
    //     console.log('inside if of expiration null');
    //     flagForExpirationDate = 1;

    // }
  
    else if(line.record["Guidance_Locked__c"] == false){
        line.record["Contracted_Price__c"] = line.record["Zilliant_Contracted__c"];
        line.record["Minimum_Price__c"] = line.record["Zilliant_Minimum__c"];
        line.record["Target_Price__c"] = line.record["Zilliant_Target__c"];
        line.record["Optimum_Price__c"] = line.record["Zilliant_Optimum__c"];
        line.record["Applied_Zilliant_Cost__c"] = line.record["Zilliant_Cost__c"];
    }
    //var oldListPrice = line.record["SBQQ__ListPrice__c"];
    if(!line.record["Id"] || (line.record["Guidance_Locked__c"] == false && 
(line.record["PV_BillHow__c"] != line.record["BillHow__c"] || line.record["PV_MGRC_Cost__c"] != line.record["MGRC_Cost__c"] || line.record["PV_MGRC_Derationalize__c"] != line.record["MGRC_Derationalize__c"] || line.record["PV_Pilot_Permit_Tier__c"] != line.record["Pilot_Permit_Tier__c"] || line.record["PV_Primary_Model__c"] != line.record["Primary_Model__c"] || line.record["PV_Subscription_Term__c"] != quoteModel.record["SBQQ__SubscriptionTerm__c"] || line.record["PV_Transportation_Distance__c"] != quoteModel.record["Transportation_Distance__c"] || line.record["PV_Transportation_Type__c"] != line.record["Transportation_Type__c"] ))){
        if(!line.record["Contracted_Price__c"] || line.record["Contracted_Price__c"] == 0 ){
            line.record["SBQQ__ListPrice__c"] = line.record["Target_Price__c"];
        }else{
          line.record["SBQQ__ListPrice__c"] = line.record["Contracted_Price__c"];
        }
  
        if(line.record["Division__c"] == "MM" || line.record["Division__c"] == "PS"){
          line.record["Monthly_Price__c"] = line.record["SBQQ__ListPrice__c"] * 30;
        }
    }

    //Removing temporarily below code for bug fix W-107371, if in regression something breaks we probably need to see why this code was written, 
    //because in the above logic monthly price is being set, then list price is being divided. Doesnt make much sense
    // if(line.record["Division__c"] == "MM" || line.record["Division__c"] == "PS"){
    //   line.record["SBQQ__ListPrice__c"] = line.record["Monthly_Price__c"] / 30;
    // }
}

  
  if(flagForExpirationDate != 0){
    console.log('should set expiration null here');
    quoteModel.record["SBQQ__ExpirationDate__c"] = null;
  }
  
  let lineIds = [];
  let productIds = [];
  linesModel.forEach(line => {
    lineIds.push(line.record.Id);
    productIds.push(line.record["SBQQ__Product__c"]);
  });
  
  return conn
    .query(
    "SELECT Id, SBQQ__Quote__r.SBQQ__Account__r.Industry, SBQQ__Product__r.Asset_Classification__c, SBQQ__Product__c From SBQQ__QuoteLine__c WHERE Id in " + "('" + lineIds.join("', '") + "')"
    )
    .then((result) => {
        console.log('account result ->' + JSON.stringify(result));
    var idWithLineDataMap = new Map();
    for (let q of result.records) {
      console.log("Account industry -> ", q.SBQQ__Quote__r.SBQQ__Account__r.Industry);
      var lineData = {
                  AccIndustry : q.SBQQ__Quote__r.SBQQ__Account__r.Industry,  
                  AssetClassification : q.SBQQ__Product__r.Asset_Classification__c,
                  lineProduct : q.SBQQ__Product__c
                };
      idWithLineDataMap.set(q.Id, lineData);
    }
  
    //lookupData query
    return conn
      .query(
        "SELECT Id, Fee_Percentage__c, Fee_Flat_Rate__c, State__c, SBQQ__Product__c FROM SBQQ__LookupData__c WHERE SBQQ__Product__c IN " + "('" + productIds.join("', '") + "')"
      )
      .then((result) => {
      let productIdToFeePercentageMap  = new Map();
      for (let res of result.records) {
        let mapKey;
        var lookupData = {
          feePercentage : res.Fee_Percentage__c,  
          feeFlatRate : res.Fee_Flat_Rate__c,
          DeliveryState : res.State__c
        };

        if(res.State__c){
            mapKey = res.SBQQ__Product__c + res.State__c;
        } else{
            mapKey = res.SBQQ__Product__c
        }
        console.log('mapKey ->' + mapKey);
        productIdToFeePercentageMap.set(mapKey, lookupData);
      }
  
      var ModelListPrice;
      for (let line of linesModel) {
        let mapKeyToGet = line.record.SBQQ__Product__c + quoteModel.record["Delivery_State__c"];
        console.log('mapkeytoget -> ' + mapKeyToGet);
        console.log('key found ->' + productIdToFeePercentageMap.has(mapKeyToGet));
        //fetch the Quote Line in the bundle, where the product family = Model
        if(line.record["SBQQ__ProductFamily__c"] == "Model"){
          ModelListPrice = line.record["SBQQ__ListPrice__c"];
        }
  
        // Fee Percentage
        if(quoteModel.record["Division__c"] == "MM" && line.record["SBQQ__ProductCode__c"] == "Fee.License.RegistrationforSale"){
          console.log('setting value here ->' + ModelListPrice * line.record["Fee_Percentage__c"]/100);
          line.record["SBQQ__ListPrice__c"] = ModelListPrice * line.record["Fee_Percentage__c"]/100;
        }
  
        // PPE for PS and Personal Property Expense for MM, both products referred to as “PPE” product in these instructions
        if((line.record["Division__c"] == "MM" || line.record["Division__c"] == "PS") && (line.record["SBQQ__ProductCode__c"] == "Personal.Property.Expense" || line.record["SBQQ__ProductCode__c"] == "PPE")){
          console.log('inside ppe if');
          console.log('one time PR Fired' + line.record["One_Time_PR_Fired__c"]);
            if(line.record["One_Time_PR_Fired__c"] == false || (line.record["One_Time_PR_Fired__c"] == true && line.record["PV_Primary_Model__c"] != line.record["Primary_Model__c"])){
                console.log('inside ppe if 2');
                console.log('account industry inside if->' + quoteModel.record["Account_Industry__c"]);
                console.log('quote state->' + quoteModel.record["Delivery_State__c"]);
                if(idWithLineDataMap.has(line.record["Id"]) && idWithLineDataMap.get(line.record["Id"]).AccIndustry == "Government - Federal"){
                    
                    line.record["Fee_Percentage__c"] = 0;
                }else if((quoteModel.record["Delivery_State__c"] == "CA" || quoteModel.record["Delivery_State__c"] == "California") && (quoteModel.record["Account_Industry__c"] == "Government - Federal" || quoteModel.record["Account_Industry__c"] == "Government - Local" || quoteModel.record["Account_Industry__c"] == "Government - City" || quoteModel.record["Account_Industry__c"] == "Government - State")){
                    console.log('it should be here');
                     line.record["Fee_Percentage__c"] = 0;
                
                // else if((quoteModel.record["Delivery_State__c"] == "CA" || quoteModel.record["Delivery_State__c"] == "California") && idWithLineDataMap.has(line.record["Id"]) && (idWithLineDataMap.get(line.record["Id"]).AccIndustry == "Government - Federal" || idWithLineDataMap.get(line.record["Id"]).AccIndustry == "Government - Local" || idWithLineDataMap.get(line.record["Id"]).AccIndustry == "Government - City" || idWithLineDataMap.get(line.record["Id"]).AccIndustry == "Government - State")){
                //     console.log('it should be here');
                //      line.record["Fee_Percentage__c"] = 0;
                }else if(idWithLineDataMap.has(line.record["Id"]) && idWithLineDataMap.get(line.record["Id"]).AssetClassification != null && idWithLineDataMap.get(line.record["Id"]).AssetClassification.includes("DSA")){
                    
                    line.record["Fee_Percentage__c"] = 0;
                }else if(productIdToFeePercentageMap.has(mapKeyToGet)){ 

                    console.log('for ppe setting fee percentage here ->' + productIdToFeePercentageMap.get(mapKeyToGet).feePercentage);
                    line.record["Fee_Percentage__c"] = productIdToFeePercentageMap.get(mapKeyToGet).feePercentage;
                } 
            }
        } 
        var oldListPrice = line.record["SBQQ__ListPrice__c"];
        if(line.record["Fee_Percentage__c"] != null){
            console.log('ModelListPrice ->' + ModelListPrice);
          console.log('resetting value here defualr->' + (ModelListPrice * (line.record["Fee_Percentage__c"]/100) * 10));
          console.log('resetting value here with ceiling ->' + Math.ceil(ModelListPrice * (line.record["Fee_Percentage__c"]/100) * 10));
          console.log('rcomplete value' + Math.ceil(ModelListPrice * (line.record["Fee_Percentage__c"]/100) * 10)/10);
          line.record["SBQQ__ListPrice__c"] = Math.ceil(ModelListPrice * (line.record["Fee_Percentage__c"]/100) * 10)/10;
        }
  
        if(oldListPrice != line.record["SBQQ__ListPrice__c"]){
          line.record["Fee_Override__c"] = true;
        }else{
          line.record["Fee_Override__c"] = false;
        }    
  
        // Damage Waiver  for PS (this is only for Portable Storage)
        if(line.record["Division__c"] == "PS" && line.record["SBQQ__ProductCode__c"] == "DamageWaiver"){
          if(line.record["One_Time_PR_Fired__c"] == false || (line.record["One_Time_PR_Fired__c"] == true && line.record["PV_Primary_Model__c"] != line.record["Primary_Model__c"])){
            if(productIdToFeePercentageMap.has(line.record.SBQQ__Product__c)){
                line.record["Fee_Percentage__c"] = productIdToFeePercentageMap.get(line.record.SBQQ__Product__c).feePercentage;
            }
          }
        }
  
        var oldListPrice = line.record["SBQQ__ListPrice__c"];
        if(line.record["Fee_Percentage__c"]){
            console.log('updating the price here');
          line.record["SBQQ__ListPrice__c"] = Math.ceil(ModelListPrice * (line.record["Fee_Percentage__c"]/100) * 10)/10;
        }
  
        if(oldListPrice != line.record["SBQQ__ListPrice__c"]){
          line.record["Fee_Override__c"] = true;
        }else{
          line.record["Fee_Override__c"] = false;
        }
  
        // Damage Waiver  for MM  (this is only for Mobile Modular)
        if(line.record["Division__c"] == "MM" && line.record["SBQQ__ProductCode__c"] == "Damage.Waiver"){
            console.log('inside damage waiver PR fired ->' + line.record["One_Time_PR_Fired__c"]);
          if(line.record["One_Time_PR_Fired__c"] == false || (line.record["One_Time_PR_Fired__c"] == true && line.record["PV_Primary_Model__c"] != line.record["Primary_Model__c"])){
            if(quoteModel.record["Delivery_State__c"] == "CA" || quoteModel.record["Delivery_State__c"] == "TX" || quoteModel.record["Delivery_State__c"] == "FL" || quoteModel.record["Delivery_State__c"] == "NV" || quoteModel.record["Delivery_State__c"] == "SC" || quoteModel.record["Delivery_State__c"] == "TN" || quoteModel.record["Delivery_State__c"] == "DC"){
                if(productIdToFeePercentageMap.has(line.record.SBQQ__Product__c)){
                    line.record["SBQQ__ListPrice__c"] = productIdToFeePercentageMap.get(line.record.SBQQ__Product__c).Fee_Flat_Rate__c;
                }
            } else{
                console.log('inside damage waiver setting value 0 for state  ->' + quoteModel.record["Delivery_State__c"]);
                line.record["SBQQ__ListPrice__c"] = 0;
            }
          }
        }
  
      } 
      return Promise.resolve();
    });    
  });
  }
  
  const PATHVERTEX = "/services/apexrest/vertextax/";
  export function onAfterCalculate(quote, linesModel, conn) {
    for (let line of linesModel) {
        if(line.record["One_Time_PR_Fired__c"] == false){
            line.record["One_Time_PR_Fired__c"] = true;
        }
        
    }
    const baseUrl = conn.instanceUrl + PATHVERTEX;
    const url = baseUrl.replace("--sbqq.visualforce", ".my.salesforce");
    let dummyIndex = 0;
    const transmittableQuoteLineRecords = linesModel.reduce((accumulator, line, index) => {
      let lineJSON = {};
      linesModel[index].record["dummyId"] = -1;
      if(line.record["SBQQ__ListPrice__c"]){
        lineJSON["Id"] = line.record["Id"];
        lineJSON["SBQQ__ListPrice__c"] = line.record["SBQQ__ListPrice__c"];
        lineJSON["SBQQ__Quantity__c"] = line.record["SBQQ__Quantity__c"];
        lineJSON["SBQQ__ProductCode__c"] = line.record["SBQQ__ProductCode__c"];
        console.log('setting dummy id for index ->' + index);
        linesModel[index].record["dummyId"] = dummyIndex;
        dummyIndex++;
        accumulator.push(lineJSON);
      }
      return accumulator;
    }, []);
  
  
    const body = {
      strQuoteId: quote.record["Id"],
      quoteLines : [...new Set(transmittableQuoteLineRecords)]
    };
  
    return conn
        .requestPost(url, body)
        .then(res => {
            const taxResponse = JSON.parse(res);
            const vertexResponse = taxResponse.VertexTaxResponse;
            console.log('vertexResponse ->' + JSON.stringify(vertexResponse));
            console.log('PostalCode ->' + vertexResponse.PostalCode);
            if(vertexResponse.PostalCode){
                const lineItems = vertexResponse.LineItems;
                const lineItemArray = lineItems.LineItem;
                for (let j = 0; j < lineItemArray.length; j++) {
                    for(let i = 0; i < linesModel.length; i++){
                        if(linesModel[i].record["dummyId"] == lineItemArray[j].LineItemId){
                            //linesModel[i].record["Tax_Amount__c"] = lineItemArray[j].TotalTax;
                            linesModel[i].record["Tax_Amount__c"] = linesModel[i].record["SBQQ__Quantity__c"] * parseFloat(lineItemArray[j].TotalTax);
                        }
                    }
                }
            }else{
                for(let i = 0; i < linesModel.length; i++){
                    linesModel[i].record["Tax_Amount__c"] = 0;
                }
            }
            
       })
        .catch(err => {
            console.log('Vertex Error -> ' + err);
        })
  }


// Quote Fields -> MGRC_Transaction_Type__c
//                 MGRC_Special_Price_Type__c
//                 CPL_Id__c
//                 SBQQ__ExpirationDate__c
//                 SBQQ__SubscriptionTerm__c
//                 Transportation_Distance__c
//                 Delivery_State__c


// Quote line fields ->    BillHow__c
//                         SBQQ__Quote__c
//                         SBQQ__Product__c
//                         SBQQ__ProductCode__c
//                         Bundle_Name__c
//                         MGRC_Derationalize__c
//                         Rental_Sale__c
//                         Drawings_Type__c
//                         SBQQ__DynamicOptionId__c
//                         SBQQ__RequiredBy__c
//                         SBQQ__Bundle__c
//                         Primary_Model__c
//                         Transportation_Type__c
//                         Depot_Fee__c
//                         Delivery_Return__c
//                         Charge_No_Charge__c
//                         BillHow__c
//                         Advisory_Type__c
//                         Id
//                         Guidance_Locked__c
//                         PV_BillHow__c
//                         PV_MGRC_Cost__c
//                         MGRC_Cost__c
//                         PV_MGRC_Derationalize__c
//                         PV_Primary_Model__c
//                         PV_Subscription_Term__c
//                         PV_Transportation_Distance__c
//                         PV_Transportation_Type__c
//                         Division__c
//                         One_Time_PR_Fired__c
//                         MGRC_Special_Price_Type__c
//                         Pilot_Permit_Tier__c
//                         PV_Pilot_Permit_Tier__c
