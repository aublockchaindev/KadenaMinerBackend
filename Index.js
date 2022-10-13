const fetch = require("node-fetch");
const Pact = require("pact-lang-api");
const ogBadge = require("./checkNumber.js");
const updDetails = require("./updateUserDetails.js");
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const API_HOST = process.env.API_HOST;
const SOURCE_API_HOST = process.env.SOURCE_API_HOST;
const KP = Pact.crypto.genKeyPair();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
var http = require('http');
var AWS = require('aws-sdk');
AWS.config.update({region:'ap-southeast-2'});
const netId = "TEST_NET_ID";
const NETWORK_ID = 'testnet04';
const CHAIN_ID = '1';
//const createdDate = new Date();
const creationTime = () => Math.round((new Date).getTime() / 1000)-60;
const creationtimeBlock = Math.floor(Date.now()/1000)-60;
let pbkey = process.env.SYSADMIN_PUBLIC_KEY
let sender = 'k:'+pbkey;


app.use(
 cors({
 origin: "*",
 })
);
// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const mintContractService = async (req) => {
    try {
        const nftId = uuidv4();
        const mintInput = req.body;
        console.log("Created date:" + mintInput.createdDate);
        console.log("MintedTh:" + mintInput.hashRate);
        console.log("Owner Address:" + mintInput.ownerAddress);
        console.log("nftid is:" + nftId);
        console.log("creationTime:"+ creationtimeBlock);
        const createdDate = "" + mintInput.createdDate + "";
        console.log("EnvID:" + process.env.SYSADMIN_PUBLIC_KEY);
        const cmdObj = {
            networkId: process.env.NETWORD_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.set-values', mintInput.ownerAddress,nftId,mintInput.nftValue, mintInput.createdDate,mintInput.hashRate,mintInput.rarityModel),
            keyPairs: {
                publicKey: process.env.SYSADMIN_PUBLIC_KEY,
                secretKey: process.env.SYSADMIN_SECRET_KEY
            },

            meta: {
                creationTime: creationTime(),
                ttl: 28800,
                gasLimit: 65000,
                chainId: process.env.CHAIN_ID,
                gasPrice: 0.000001,
                sender: sender
            },
        }


        const response = await Pact.fetch.send(cmdObj, API_HOST);
        console.log(response);

        fs.copyFile("../KadenaMinerFrontend/public/images/"+mintInput.rarityModel+".gif", "../KadenaMinerFrontend/build/nft/"+nftId+".gif", (err) => {
            if (err) {
                console.log("Error Found while copying file:", err);
            }
        });
        fs.copyFile("../KadenaMinerFrontend/public/images/"+mintInput.rarityModel+".gif", "../KadenaMinerFrontend/public/nft/"+nftId+".gif", (err) => {
            if (err) {
                console.log("Error Found while copying file:", err);
            }
        });

        const balanceFile = "./files/balancehashrate.json";
        const balanceData = fs.readFileSync(balanceFile);
        const jsonBalance = JSON.parse(balanceData);
        let balance= jsonBalance.balance;
        let totalHashrate = Number(mintInput.hashRate);
        console.log(totalHashrate);
        let newBalance = (balance - totalHashrate);
        console.log(newBalance);
        var dict ={};
        dict["balance"]=newBalance;

        fs.writeFileSync(balanceFile,JSON.stringify(dict));

        const reqKey = response.requestKeys[0];
        console.log("Request keys is: ", reqKey);
        return reqKey;
        //return true;
    } catch (err) {
        console.log("Error Occurred ");
        return false;
    }
};


const distributeFunds = async () => {
    try {

        console.log("Inside Distribute Function");
        console.log("Creation Time :::::"+creationtimeBlock);
        const cmdObj = {
            networkId: process.env.NETWORD_ID,
            pactCode: Pact.lang.mkExp('free.kor-create-nft.get-allvalues'),
            meta: Pact.lang.mkMeta(sender,process.env.CHAIN_ID, 0.0001, 100000, creationtimeBlock, 600)

        };

        const response = await Pact.fetch.local(cmdObj, API_HOST);

        const balancecmdObj = {

          networkId: process.env.NETWORD_ID,
          pactCode: Pact.lang.mkExp('coin.get-balance', process.env.PAYMENT_WALLET),
          meta: Pact.lang.mkMeta(sender,process.env.SOURCE_CHAIN_ID, 0.0001, 100000, creationtimeBlock, 600)
     
        };
        const balanceResponse = await Pact.fetch.local(balancecmdObj, SOURCE_API_HOST);
        console.log("balance response is ::::",balanceResponse);
        console.log("balance response data is ::::"+balanceResponse.result.data.decimal);

        const File = "./files/lastpayment.json";
        const Data = fs.readFileSync(File);
        const jsonTime = JSON.parse(Data);
        const lastpaymenttime = jsonTime.date;
        let amount =0.0;
        let balanceAmount = 0.0;
        let admincoin = 0.0;
        let count =0;
        console.log("Payout Calculation Starts");
       
        let payouttimestamp = Math.round((new Date).getTime() / 1000);
       
        amount = 0.99*(balanceResponse.result.data.decimal);

       
        console.log("payout amount is ::::"+ amount);
        console.log("payout time stamp is ::::"+payouttimestamp);
        if (amount >0){
         
          const convertDecimal = (decimal) => {
                let dec;
                dec = decimal.toString();
                if (dec.includes('.')) { return decimal }
                if ((dec / Math.floor(dec)) === 1) {
                  decimal = (decimal - .000001);
                }
                return decimal
              }

            const addrFile = "./files/adminaddress.json";
            const addrData = fs.readFileSync(addrFile);
            const jsonaddr = JSON.parse(addrData);
            const publicKey = jsonaddr.public;
            const secretKey = jsonaddr.secret;
            const adwallet = jsonaddr.adminwallet;
            const senderkey = 'k:'+publicKey;

            let totalcoin = Number(amount.toExponential(6));

           // totalcoin = convertDecimal(totalcoin);

            let latestdate =0;
                   
            const totalhashrate = jsonaddr.totalhashrate;
 
            console.log("details::::" + adwallet);

            for (let i in response.result.data){
                if (response.result.data[i]["og-badge"] && response.result.data[i]["og-badge"]!=""){
                    count = count+1;
                }

            }

            console.log("total number of customers who own OG badge ::::" + count);

            for (let i in response.result.data)
            {
                let customerId = response.result.data[i]["nftid"]
                const nftImagePath = "../KadenaMinerFrontend/build/nft/"+customerId+".gif";
                console.log("the image path is"+nftImagePath)
                if (fs.existsSync(nftImagePath)) {
                    let customerhashrate = Number(response.result.data[i]["hash-rate"]);
                    let createdDate = Math.round(response.result.data[i]["created-date"]["int"]/1000);
                    if (createdDate>lastpaymenttime)
                    {
                        latestdate = createdDate;
                    }
                    else
                    {
                        latestdate = Number(lastpaymenttime);
                    }
                    let numberofdays = (payouttimestamp - latestdate);
                    let paymentperiod = (payouttimestamp - lastpaymenttime);
                    let owneraddress = response.result.data[i]["owner-address"];

                    console.log("total hashrate:::::" +totalhashrate);
                    console.log("total customer hashrate:::::" +customerhashrate);
                    console.log("total coin:::::" +totalcoin);
                    console.log("number of days:::::" +numberofdays);
                    console.log("payment period::::" +paymentperiod);
                                   
                    let hashrate = customerhashrate / totalhashrate;
                    let period = numberofdays/paymentperiod ;
                    let output = 0.74*totalcoin*period * hashrate;
                    let coin = Number(output.toExponential(7));
                    coin = convertDecimal(coin);
                                               
                    console.log("coin to transfer::::" +coin);
                    console.log("owner address::::" + owneraddress);
                    console.log("senderkey is"+senderkey);
                    console.log("key is"+secretKey);                          
                    owneraddress = 'k:'+owneraddress;
                    const cmd = {
                        pactCode: Pact.lang.mkExp("coin.transfer",senderkey, owneraddress,coin),
                        meta: {
                            creationTime:creationtimeBlock,
                            chainId: process.env.SOURCE_CHAIN_ID,
                            sender: senderkey,
                            gasLimit: 100000,
                            gasPrice: 0.0000001,
                            ttl: 28800
                        },
                        networkId: process.env.NETWORD_ID,
                        keyPairs: [
                        {
                            publicKey: publicKey,
                            secretKey: secretKey,
                            clist: [
                            {
                                name: "coin.TRANSFER",
                                args: [
                                    senderkey,
                                    owneraddress,
                                    coin
                                ]
                            },
                            {
                                name: "coin.GAS",
                                args: []
                            }
                            ]
                        }
                        ],
                        type: "exec"
                    }
 
                    const response1 = await Pact.fetch.send(cmd, SOURCE_API_HOST);
                    console.log("senderkey is"+senderkey);
                    console.log("coin tranfer response is ::::::",response1 );
                    if(i==0){
                        balanceAmount = (totalcoin - output);
                    }
                    else{
                        balanceAmount = (balanceAmount - output);
                    }

                    if (count>0){
                        admincoin=0.24*totalcoin*period * hashrate;
    
                    }
                    else{
                        admincoin=0.25*totalcoin*period * hashrate;
    
                    }

                    admincoin= Number(admincoin.toExponential(6));
                    admincoin = convertDecimal(admincoin);

                    console.log("admin pay amount fee:::"+ admincoin)
                    console.log("admin wallet:::"+adwallet)
                    const admincmd = {
                        pactCode: Pact.lang.mkExp("coin.transfer",senderkey, adwallet,admincoin),
                        meta: {
                            chainId: process.env.SOURCE_CHAIN_ID,
                            sender: senderkey,
                            gasLimit: 100000,
                            gasPrice: 0.0000001,
                            ttl: 28800,
                            creationTime:creationtimeBlock
                        },
                        networkId: process.env.NETWORD_ID,
                        keyPairs: [
                        {
                            publicKey: publicKey,
                            secretKey: secretKey,
                            clist: [
                            {
                                name: "coin.TRANSFER",
                                args: [
                                    senderkey,
                                    adwallet,
                                    admincoin
                                ]
                            },
                            {
                                name: "coin.GAS",
                                args: []
                            }
                            ]
                        }
                        ],
                        type: "exec"
                    }
       
                    const response2 = await Pact.fetch.send(admincmd, SOURCE_API_HOST);
   
                    console.log("admin coin transfer response is ::::",response2 );
                    balanceAmount = (balanceAmount - admincoin);
                    console.log("balance amount after coin transfer::::"+ balanceAmount);

                    if (count>0){
                        let ogCoin= (1/count)*totalcoin*period * hashrate;
                        ogCoin= Number(ogCoin.toExponential(6));
                        ogCoin = convertDecimal(ogCoin);
                      
                        console.log("OG coin:::"+ ogCoin);
                        
                        for (let i in response.result.data){
                            if (response.result.data[i]["og-badge"] && response.result.data[i]["og-badge"]!=""){
                                let ogAddress = response.result.data[i]["owner-address"];
                                console.log("OG user address :::"+ ogAddress);
                                const ogCmd = {
                                    pactCode: Pact.lang.mkExp("coin.transfer",senderkey, ogAddress,ogCoin),
                                    meta: {
                                        creationTime:creationtimeBlock,
                                        chainId: process.env.SOURCE_CHAIN_ID,
                                        sender: senderkey,
                                        gasLimit: 100000,
                                        gasPrice: 0.0000001,
                                        ttl: 28800
                                    },
                                    networkId: process.env.NETWORD_ID,
                                    keyPairs: [
                                    {
                                        publicKey: publicKey,
                                        secretKey: secretKey,
                                        clist: [
                                        {
                                            name: "coin.TRANSFER",
                                            args: [
                                                senderkey,
                                                ogAddress,
                                                ogCoin
                                            ]
                                        },
                                        {
                                            name: "coin.GAS",
                                            args: []
                                        }
                                        ]
                                    }
                                    ],
                                    type: "exec"
                                }
                      
                                const ogResponse = await Pact.fetch.send(ogCmd, SOURCE_API_HOST);
                                
                                console.log("OG coin tranfer response is ::::::",ogResponse);
                                balanceAmount = (balanceAmount - ogCoin);
                            }
                        }
                    }   
                }
                else{
                    console.log("User image not found.....")
                }

               
            }
               
           
            let balancecoin=balanceAmount*0.99;
            balancecoin= Number(balancecoin.toExponential(6));
            console.log("balance coin to be transferred::::"+ balancecoin);
            console.log("balance Key:::"+process.env.SYSADMIN_BALANCE_KEY);
            const balancecmd = {
                pactCode: Pact.lang.mkExp("coin.transfer",senderkey, process.env.SYSADMIN_BALANCE_KEY,balancecoin),
                meta: {
                    chainId: process.env.SOURCE_CHAIN_ID,
                    sender: senderkey,
                    gasLimit: 100000,
                    gasPrice: 0.0000001,
                    ttl: 28800,
                    creationTime:creationtimeBlock
                },
                networkId: process.env.NETWORD_ID,
                keyPairs: [
                {
                    publicKey: publicKey,
                    secretKey: secretKey,
                    clist: [
                    {
                        name: "coin.TRANSFER",
                        args: [
                            senderkey,
                            process.env.SYSADMIN_BALANCE_KEY,
                            balancecoin
                        ]
                    },
                    {
                        name: "coin.GAS",
                        args: []
                    }
                    ]
                }
                ],
                type: "exec"
            }
            const balanceResponse = await Pact.fetch.send(balancecmd, SOURCE_API_HOST);

            console.log("balance coin transfer response is :::::",balanceResponse );

            var dict ={};
            dict["date"]=payouttimestamp;
            fs.writeFileSync("./files/lastpayment.json",JSON.stringify(dict));                                                                      
           
        }
        else{
            console.log("Amount is not greater than 0....")
        }
    }
    catch (err) {
        console.log("Error::::"+err );
        return false;
    }
};

function myKeys() {
    const addrFile = "./files/adminaddress.json";
    const addrData = fs.readFileSync(addrFile);
    const jsonaddr = JSON.parse(addrData);
    const publicKey = jsonaddr.public;
    const secretKey = jsonaddr.secret;
    const senderkey = 'k:'+publicKey;
    return[publicKey,secretKey,senderkey]
  }

  const checkBadge = async (req) => {
    try {
      
       const input = req.body;
       const ownerAddress =input.ownerAddress;
       const phoneNumber =input.phoneNumber;
       const [publicKey, secretKey, senderkey] = myKeys();
  
       console.log("senderkey is:::::"+senderkey );

       const checkBadgeResponse = await ogBadge.checkBadge(ownerAddress,phoneNumber, senderkey);
       let checkBadgeResponse1 = await checkBadgeResponse;
       console.log("check badge response is:::::",checkBadgeResponse1);
       let status ="";

       if (checkBadgeResponse1=='Phone No exists'){
           status = "success";
       }
       else {
           status = "fail";
       }
       
       let res = { status: status,message: checkBadgeResponse1};
       console.log("returning response:::::",res);
       return res;
        
  
    } catch (err) {
        console.log("Error Occurred:::: "+err);
        return "Error";
    }
};

const updateDetails = async (req) => {
    try {
        

        const userDetails = req.body;
        console.log("Owner Id:" + userDetails.ownerAddress);
        console.log("phone number:" + userDetails.phoneNumber);
        const [publicKey, secretKey, senderkey] = myKeys();
        console.log("publicKey is:::::"+publicKey );
        console.log("secretKey is:::::"+secretKey );
        console.log("senderkey is:::::"+senderkey );
        const ownerAddress = userDetails.ownerAddress;
        const phoneNumber = userDetails.phoneNumber;

        const updateDetailsResponse = await updDetails.updateDetails(ownerAddress,phoneNumber, publicKey,secretKey, senderkey);
        let updateDetailsResponse1 = await updateDetailsResponse;
        console.log("response is:::::",updateDetailsResponse1);
        return updateDetailsResponse1;
  
    } catch (err) {
        console.log("Error Occurred "+err);
        return "Error";
    }
};

app.post("/api/distribute", async (req, res) => {
 console.log("=== distribute api is called ===");
 const distribute = distributeFunds();
 if (distribute) res.json({ status: "success" });
 else res.json({ status: "fail" });
});
app.post("/api/mintContract", async (req, res) => {
 console.log("=== mintContract api is called ===");
 const minted = await mintContractService(req);
 console.log("=== mintContract result" + minted);
 // const transactionId = minted.requestKeys[0];
 //console.log("Transaction Id" + transactionId);
 if (minted) res.json({ status: minted});
 //if (minted) res.json({ status: "Success"});
 else res.json({ status: "fail" });
});
app.post("/api/checkBadge", async (req, res) => {
    console.log("=== check Badge api is called ===");
    const checkDetails = await checkBadge(req);
    console.log("=== check badge result is ::::" + checkDetails);
    if (checkDetails) res.json({ checkDetails });
   
    else res.json({ status: "fail",message: "fail" });
   });
app.post("/api/updateDetails", async (req, res) => {
    console.log("=== updateDetails  api is called ===");
    const upDetails = await updateDetails(req);
    console.log("=== updateDetailsresult" +upDetails);
    if (upDetails) res.json({ status: upDetails});
  
    else res.json({ status: "fail"});
   });
app.get("/api/getMiners", async (req, res) => {
 const minerFile = "./files/miners.json";
 const rawData = fs.readFileSync(minerFile);
 const minerjson = JSON.parse(rawData);
 res.json(minerjson);
});
app.get("/api/lastPayment", async (req, res) => {
 const paymentFile = "./files/lastpayment.json";
 const payrawData = fs.readFileSync(paymentFile);
 const paymentjson = JSON.parse(payrawData);
 res.json(paymentjson);
});
app.get("/api/balanceHashrate", async (req, res) => {
 const balanceFile = "./files/balancehashrate.json";
 const balrawData = fs.readFileSync(balanceFile);
 const balancejson = JSON.parse(balrawData);
 res.json(balancejson);
});
app.post('/api/sendOtp', async (req, res) => {
    console.log("=== sendOtp api is called ===");
    var otp = Math.floor(100000 + Math.random() * 900000);
    const MESSAGE = `KOR Security: Your verification code for KOR OG Badge is ${otp}`;
    const SENDER = "KOR";

    console.log("Message = " + MESSAGE);
    console.log("Sender = " + SENDER);
    console.log("Number = " + req.body.number);

    var params = {
        Message: MESSAGE,
        PhoneNumber: '+' + req.body.number,
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                'DataType': 'String',
                'StringValue': SENDER
            },
            'AWS.SNS.SMS.SMSType': {
                'DataType': 'String',
                'StringValue': "Transactional"  
            }
        }
    };

    var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

    publishTextPromise.then(
        function (data) {
            console.log(data)
            res.end(JSON.stringify({ MessageID: data.MessageId, otp: otp, status: "success" }));
        }).catch(
            function (err) {
                console.log("Error: " + err)
                res.end(JSON.stringify({ Error: err, status: "fail" }));
            }
        );
});

http.createServer(app).listen(9092);
