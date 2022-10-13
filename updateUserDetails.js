const Pact = require("pact-lang-api");
require('dotenv').config();
const creationtimeBlock = Math.floor(Date.now()/1000);
const API_HOST = process.env.API_HOST;
const SOURCE_API_HOST = process.env.SOURCE_API_HOST;
const { v4: uuidv4 } = require('uuid');

module.exports = {
    updateDetails: async function (ownerAddress, phoneNumber, publicKey, secretKey, senderkey) {
        try{

        const getcmdObj = {
            networkId: process.env.NETWORD_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.get-ownedby',ownerAddress ),
            meta:{
                creationTime:creationtimeBlock,
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800
            }

        };
        const getresponse = await Pact.fetch.local(getcmdObj, API_HOST);
        console.log("get owner details:::",getresponse);
        

        const nftID = getresponse.result.data[0]["nftid"];
        console.log("nftId is :::::"+nftID);

        const ogBadge = uuidv4();
        console.log("OG badge is::::"+ogBadge);

        const cmdObj = {
            networkId: NETWORK_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.update-ogdata', nftID ,ogBadge, phoneNumber),
            keyPairs: {
                publicKey: publicKey,
                secretKey: secretKey,
            },
            meta:{
                creationTime:creationtimeBlock,
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800
            }

        };
        const response = await Pact.fetch.send(cmdObj, API_HOST);


        console.log("update response::::",response);
        return response

       
        }
        catch(err){
            console.log("Error::::"+err);
            return "Error"
        }
        
  }
}
