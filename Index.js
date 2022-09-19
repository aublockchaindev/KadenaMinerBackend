const fetch = require("node-fetch");
const Pact = require("pact-lang-api");
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
        let balanceAmount = 0.0;
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

            //first transfer the amount to the admin account from source chain to target chain


            const convertDecimal = (decimal) => {
                let dec;
                dec = decimal.toString();
                if (dec.includes('.')) { return decimal }
                if ((dec / Math.floor(dec)) === 1) {
                  decimal = (decimal - .000001);
                }
                return decimal
              }
            
            
              const mkReq = (cmd) => {
                return {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify(cmd)
                };
            };
            
            async function wait(ms = 1000) {
              return new Promise(resolve => {
                setTimeout(resolve, ms);
              });
            }

            const addrFile = "./files/adminaddress.json";
            const addrData = fs.readFileSync(addrFile);
            const jsonaddr = JSON.parse(addrData);
            const publicKey = jsonaddr.public;
            const secretKey = jsonaddr.secret;
            const adwallet = jsonaddr.adminwallet;
            const senderkey = 'k:'+publicKey;

            let totalcoin = Number(amount.toExponential(6)); 

            totalcoin = convertDecimal(totalcoin);

            let pactCode = '(coin.transfer-crosschain \"'+senderkey +'\" \"'+senderkey +'\" (read-keyset \"ks\") \"'+process.env.CHAIN_ID+'\"' + totalcoin +' )';


            const cmd = Pact.simple.exec.createCommand({
                publicKey: publicKey,
                secretKey: secretKey,
                clist: [
                    {
                        name: "coin.GAS", args: []
                    }, 
                    {
                        name: "coin.TRANSFER_XCHAIN", 
                        args: [senderkey, 
                            senderkey, totalcoin,process.env.CHAIN_ID]}]},
                JSON.stringify(new Date()),
                pactCode,
                {"ks": {
                  "keys": [publicKey],
                  "pred": "keys-all"
                    }
                },
                Pact.lang.mkMeta(senderkey,process.env.SOURCE_CHAIN_ID , 0.00001, 1800, creationTime(), 28800),
                process.env.NETWORD_ID
              )
          
            const txRes = await fetch(`${SOURCE_API_HOST}/api/v1/send`, mkReq(cmd));
            //console.log(transactionRes)
            if (txRes.ok) 
            {
                console.log("Successfully submitted the source chain request")
                let res = await txRes.json();
                fetch(`${SOURCE_API_HOST}/api/v1/listen`, mkReq({"listen": res.requestKeys[0]}))
                .then(res =>{
                    return res.json()
                })
                .then(async res => 
                {
                    if (res.result.status==="failure"){
                        console.log("failed while listening::::"+JSON.stringify(res.result.error));
                    } 
                    else {
                        if (res.continuation){
                            console.log("continuation");
                            console.log(res)
                            const pactId = res.continuation.pactId;
                            const targetChainId = res.continuation.yield.provenance.targetChainId;
                            const spvCmd = {"targetChainId": targetChainId, "requestKey": pactId };
                            let proof;
                            while (!proof){
                                await wait(10000);
                                const res = await fetch(`${SOURCE_API_HOST}/spv`, mkReq(spvCmd));
                                let spvres = await res;
                                if (spvres.ok){
                                    proof = await res.json();
                                    console.log("Received the proof")
                                }
                                else{
                                    console.log("Proof not received, will be retrying")
                                }
                            }
          
               
                            const m = Pact.lang.mkMeta(senderkey, process.env.CHAIN_ID, 0.00000001, 750, creationTime(), 28800);
                            const contCmd = {type: "cont",
                            keyPairs:{
                              publicKey: publicKey,
                              secretKey: secretKey
                            },
                            pactId: pactId, rollback: false, step: 1, meta: m, proof: proof, networkId: NETWORK_ID};
                            const cmd = Pact.simple.cont.createCommand( contCmd.keyPairs,  JSON.stringify(new Date()), contCmd.step, contCmd.pactId,
                                                                    contCmd.rollback, contCmd.envData, contCmd.meta, contCmd.proof, contCmd.networkId);
          
                            fetch(`${API_HOST}/api/v1/send`, mkReq(cmd))
                            .then(async txRes => {
                                if (txRes.ok) {
                                    console.log("Target chain transfer submitted successfully");
                                    let res = await txRes.json();
                                    fetch(`${API_HOST}/api/v1/listen`, mkReq({"listen": res.requestKeys[0]}))
                                    .then(res =>{
                                        return res.json();
                                    })
                                    .then(async res => {
                                        if (res.result.status==="failure"){
                                            console.log("Transfer Failed::::"+JSON.stringify(res.result.error));}
                                        else
                                        {
                                            console.log("Transfer Succeeded::::"+JSON.stringify(res.result.data));
                                            let latestdate =0;
            
          
                                            const totalhashrate = jsonaddr.totalhashrate;
 
                                            console.log("details" + adwallet); 

                                            for (let i in response.result.data)
                                            {
                                                let customerId = response.result.data[i]["nftid"]
                                                const nftImagePath = "../KadenaMinerFrontend/public/nft/"+customerId+".gif";
                                                if (fs.existsSync(nftImagePath)) {
                                                    let customerhashrate = Number(response.result.data[i]["hash-rate"]);
                                                    let createdDate = Math.round(response.result.data[i]["created-date"]["int"]/1000);
                                                    if (response.result.data[i]["created-date"]>lastpaymenttime)
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
                                                    console.log("payment period" +paymentperiod);
                                    

                                                    let hashrate = customerhashrate / totalhashrate;
                                                    let period = numberofdays/paymentperiod ;
                                                    let output = 0.74*totalcoin*period * hashrate;
                                                    let coin = Number(output.toExponential(7));
                                                

                                                    console.log("coin to transfer::::" +coin);
                                                 
                                                    owneraddress = 'k:'+owneraddress;
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
                                                    if(i==0){
                                                        balanceAmount = (totalcoin - output);
                                                    }
                                                    else{
                                                        balanceAmount = (balanceAmount - output);
                                                    }
                                                }
                                                else{
                                                    console.log("User image not found.....")
                                                }
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
                                                balanceAmount = (balanceAmount - admincoin);

            

                                            let balancecoin=balanceAmount*0.99;
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
                                    })
                                }
                                else{
                                    let res = await txRes.text();
                                    console.log("Target send request Failed:::::" + res);
                                    }
                                })
                                                        
                            } 
                        else 
                        {
                            console.log( JSON.stringify(res.result.data));
                        }
                    }
                })
            } 
            else 
            {
                let res = await txRes.text();
                console.log(" Send request failed:::::" + res)
            }
 
        } 
        else{
            console.log("Amount is not greater than 0")
        }
    }
    catch (err) {
        console.log("Error::::"+err );
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
