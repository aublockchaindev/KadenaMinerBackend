const fetch = require("node-fetch");
const Pact = require("pact-lang-api");
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const API_HOST = process.env.API_HOST;
const KP = Pact.crypto.genKeyPair();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
var http = require('http');
const netId = "TEST_NET_ID";
const NETWORK_ID = 'testnet04';
const CHAIN_ID = '1';
//const createdDate = new Date();
const creationTime = () => Math.round((new Date).getTime() / 1000);
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
    const cmdObj = {
        networkId: process.env.NETWORD_ID,
        pactCode: Pact.lang.mkExp('free.kor-create-nft.get-allvalues'),
        meta: Pact.lang.mkMeta(sender,process.env.CHAIN_ID, 0.0001, 100000, creationTime(), 600)

    };

    const response = await Pact.fetch.local(cmdObj, API_HOST);

    const payout = await fetch(process.env.POOLFLARE_URL);
    const payoutJsonArray = await payout.json();
    console.log ("poolflare data" + payout);

    const File = "./files/lastpayment.json";
    const Data = fs.readFileSync(File);
    const jsonTime = JSON.parse(Data);
    const lastpaymenttime = jsonTime.date;
    let amount =0.0;
    console.log("Payout Calculation Starts");
 
    let payouttimestamp = Number(payoutJsonArray.data.payouts[0].timestamp);
    console.log ("payouttimestamp value from array:" + payouttimestamp);

    for (let i in payoutJsonArray.data.payouts){
        let timestamp = payoutJsonArray.data.payouts[i].timestamp;

        if (timestamp > lastpaymenttime ) {
            amount = amount + Number(payoutJsonArray.data.payouts[i].amount);
        }

        if(timestamp>payouttimestamp){
            payouttimestamp = timestamp;
        }
 

    } 
    console.log("payout"+ amount);

    if (amount >0){

        let latestdate =0;
        let totalcoin = Number(amount.toExponential(6));
        const addrFile = "./files/adminaddress.json";
        const addrData = fs.readFileSync(addrFile);
        const jsonaddr = JSON.parse(addrData);
        const publicKey = jsonaddr.public;
        const secretKey = jsonaddr.secret;
        const adwallet = jsonaddr.adminwallet;
        const totalhashrate = jsonaddr.totalhashrate;
        
        console.log("details" + adwallet); 

        for (let i in response.result.data){
            let customerhashrate = Number(response.result.data[i]["hash-rate"]);

            if (response.result.data[i]["created-date"]>lastpaymenttime){
                latestdate = Number(response.result.data[i]["created-date"]);
            }
            else{
                latestdate = Number(lastpaymenttime);
            }

 
            let numberofdays = (payouttimestamp - latestdate);
            let paymentperiod = (payouttimestamp - lastpaymenttime);
            let owneraddress = response.result.data[i]["owner-address"];

            console.log("total hashrate:::::" +totalhashrate);
            console.log("total customer hashrate:::::" +customerhashrate); 
            console.log("total coin:::::" +totalcoin); 
            console.log("number of days:::::" +numberofdays);
            console.log("payment period" +paymentperiod);
 

            let hashrate = customerhashrate / totalhashrate;
            let period = numberofdays/paymentperiod ;
            let output = 0.74*totalcoin*period * hashrate;
            let coin = Number(output.toExponential(7));
            let senderkey = 'k:'+publicKey;

            console.log("coin to transfer::::" +coin);

            const cmd = {
                pactCode: Pact.lang.mkExp("coin.transfer",publicKey, owneraddress,coin),
                meta: {
                    chainId: process.env.CHAIN_ID,
                    sender: senderkey,
                    gasLimit: 100000,
                    gasPrice: 0.0000001,
                    ttl: 28800,
                    creationTime: creationTime()
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
                            publicKey,
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
 
            const response1 = await Pact.fetch.send(cmd, API_HOST); 

            console.log(response1 );

        }
        let admincoin=amount*0.25;
        admincoin= Number(admincoin.toExponential(6))
        console.log(admincoin)
        const admincmd = {
            pactCode: Pact.lang.mkExp("coin.transfer",publicKey, adwallet,admincoin),
            meta: {
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800,
                creationTime: creationTime()
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
                    publicKey,
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
 
        const response2 = await Pact.fetch.send(admincmd, API_HOST);

        console.log(response2 );

        let balancecoin=amount*0.99;
        balancecoin= Number(balancecoin.toExponential(6))
        console.log(balancecoin)

        const balancecmd = {
            pactCode: Pact.lang.mkExp("coin.transfer",publicKey, process.env.SYSADMIN_BALANCE_KEY,balancecoin),
            meta: {
                chainId: process.env.CHAIN_ID,
                sender: senderkey,
                gasLimit: 100000,
                gasPrice: 0.0000001,
                ttl: 28800,
                creationTime: creationTime()
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
                        publicKey,
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

        const balanceResponse = await Pact.fetch.send(balancecmd, API_HOST);

        console.log(balanceResponse );

        var dict ={};
        dict["date"]=payouttimestamp;
        fs.writeFileSync("./files/lastpayment.json",JSON.stringify(dict));
 
    } 
    else{
        console.log("Amount is not greater than 0")
    }
 }catch (err) {
    console.log("Error::::" );
    return false;
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

http.createServer(app).listen(9092);
