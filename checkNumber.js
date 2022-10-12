const Pact = require("pact-lang-api");
require('dotenv').config();
const creationtimeBlock = Math.floor(Date.now()/1000);
const API_HOST = process.env.API_HOST;
const SOURCE_API_HOST = process.env.SOURCE_API_HOST;


module.exports = {
    checkBadge: async function (ownerId, phoneNumber,senderkey) {
        try{
            const cmdObj = {
                networkId: process.env.NETWORD_ID,
                pactCode: Pact.lang.mkExp('free.kor-create-nft.get-allvalues'),
                meta:{
                    creationTime:creationtimeBlock,
                    chainId: process.env.SOURCE_CHAIN_ID,
                    sender: senderkey,
                    gasLimit: 100000,
                    gasPrice: 0.0000001,
                    ttl: 28800
                }

            };
            console.log("ownerId is ::::"+ownerId);
            console.log("phone number is ::::"+phoneNumber);
            const response = await Pact.fetch.local(cmdObj, SOURCE_API_HOST);
            let owner = "";
            let number="";
            for (let i in response.result.data){
                if (response.result.data[i]['phone-number'] == phoneNumber){
                    console.log("phone number exist::::");
                    return "Phone No exists"

                }
                
                else { 
                    if (response.result.data[i]['owner-address']==ownerId){
                        owner = "true";
                        if (response.result.data[i]['phone-number']==''){
                            number = "false"
                        }
                        else{
                            number = "true";
                        }
                    }
            
                    else{
                        if (owner!="true"){
                        owner = "false";
                        }
                    }
                }
            }
            if (owner == "true" && number == "false"){
                console.log("number doesnt exist::::");
                return "number doesnt exist"
            }
            else if (owner == "true" && number == "true"){
                console.log("different number exist::::");
                return "different number exist"

            }
            else if (owner == "false" ){
                console.log("owner not found::::");
                return "owner not found"

            }
            else{
                return "Error"
            }
        }
        catch(err){
            console.log("Error::::"+err);
            return "Error"
        }
    }
}
