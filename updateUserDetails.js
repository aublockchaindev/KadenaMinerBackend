const Pact = require("pact-lang-api");
require('dotenv').config();
const fs = require("fs");
const { encrypt, decrypt } = require('./crypt');
const creationtimeBlock = Math.floor(Date.now()/1000);
const creationTime = () => Math.round((new Date).getTime() / 1000)-60;
const API_HOST = process.env.API_HOST;
const SOURCE_API_HOST = process.env.SOURCE_API_HOST;
const { v4: uuidv4 } = require('uuid');

module.exports = {
    updateDetails: async function (ownerAddress, phoneNumber, publicKey, secretKey, senderkey) {
        try{
            console.log("get owner details:::"+ownerAddress);
        const getcmdObj = {
            networkId: process.env.NETWORD_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.get-allvalues'),
            meta:{
                creationTime: creationTime(),
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800
            }

        };
        const getresponse = await Pact.fetch.local(getcmdObj, API_HOST);
        //console.log("get owner details:::",getresponse);
        let nftID ="";

        for (let i in getresponse.result.data){
            if (getresponse.result.data[i]['owner-address'] == ownerAddress){
                if (getresponse.result.data[i]['og-badge'] && getresponse.result.data[i]['og-badge']!=''){
                    console.log("Existing OG badge ....",getresponse.result.data[i]['og-badge'] )
                    continue
                    
                }
                else{
                    if (getresponse.result.data[i]['nftid'] && getresponse.result.data[i]['nftid']!=''){
                        nftID = getresponse.result.data[i]['nftid'];
                        break;
                    }
                }
            }
        }
        
        console.log("nftId is :::::"+nftID);
        const ogBadge = uuidv4();
        console.log("OG badge is::::"+ogBadge);

        if (nftID){
            const enc_PhoneNumber = encrypt(phoneNumber).content;
            console.log("enc number::::",enc_PhoneNumber);
        const cmdObj = {
            networkId: process.env.NETWORD_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.update-ogdata', nftID ,ogBadge, enc_PhoneNumber),
            keyPairs: {
                publicKey: publicKey,
                secretKey: secretKey,
            },
            meta:{
                creationTime: creationTime(),
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800
            }

        };
        const response = await Pact.fetch.send(cmdObj, API_HOST);


        console.log(`update response for nft id ${nftID}::::`,response);

        const details = ownerAddress + "," + nftID + "," + phoneNumber +" \n";

        fs.copyFile("../KadenaMinerFrontend/public/images/og-badge.gif", "../KadenaMinerFrontend/build/nft/"+ogBadge+".gif", (err) => {
            if (err) {
                console.log("Error Found while copying file:", err);
            }
        });
            fs.copyFile("../KadenaMinerFrontend/public/images/og-badge.gif", "../KadenaMinerFrontend/public/nft/"+ogBadge+".gif", (err) => {
            if (err) {
                console.log("Error Found while copying file:", err);
            }
        });
            
        fs.appendFile('./files/details', details , err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        });
        return response      
        }
        else{
            console.log("nftId not found :::::");
            return "Error"
        }
    }

        catch(err){
            console.log("Error::::"+err);
            return "Error"
        }
       
  }
}
