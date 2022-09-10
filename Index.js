const Pact = require("pact-lang-api");
//const { v4: uuidv4 } = require('uuid');
const API_HOST = "https://api.testnet.chainweb.com/chainweb/0.0/testnet04/chain/1/pact";
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
const createdDate = new Date();

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
    //const nftId = uuidv4();
    console.log("I am here" + req);
    //const mintInput = JSON.parse(req);
    const mintInput = req.body;
    //console.log("I am here" + mintInput.ownerAddress);
    console.log("I am here" + mintInput.createdDate);
    const creationTime = () => Math.round((new Date).getTime() / 1000);
    //const createdDate = new Date(mintInput.created-date);
    console.log("time created" + mintInput.ownerAddress);
 const cmdObj = {
   keyPairs: KP,
  
    networkId: 'testnet04',
    pactCode: Pact.lang.mkExp('free.kor-create-nft.set-values', mintInput.ownerAddress,createdDate,mintInput.nftValue, mintInput.createdDate,mintInput.hashRate),
    keyPairs: {
      publicKey: '15772eb33c28728e94e6c5b8216ff440c22bf512f9085a359afcc6767c29e59c',
      secretKey: '1407d697ec2248e0aa7641d3f75af88fc8bf5b5da537b035128174460cf17829'
    },
    envData: {
            "kor-project-keyset-658453494": {
                "keys": [
                    "e6160a90a28ddd95fea7e0e7f2d3ce36fbdeac68be2057dbfc9da5162cac7ef5"
                ],
                "pred": "keys-any"
            }
      },
    meta: {
      creationTime: creationTime(),
      ttl: 28000,
      gasLimit: 65000,
      chainId: '1',
      gasPrice: 0.000001,
      sender: '15772eb33c28728e94e6c5b8216ff440c22bf512f9085a359afcc6767c29e59c'
    },
  }
console.log(cmdObj);

    //Pact.fetch.send(cmdObj, API_HOST);
    const response = await Pact.fetch.send(cmdObj, API_HOST);
    console.log(response);
    const reqKey = response.requestKeys[0];
          console.log("Request keys is: ", reqKey);
    return reqKey;
    //return true;
  } catch (err) {
    return false;
  }
};
const distributeFunds = async () => {
  try {const creationTime = () => Math.round((new Date).getTime() / 1000);

const cmdObj = {

    networkId: 'testnet04',
    pactCode: Pact.lang.mkExp('free.kor-create-nft.get-allvalues'),
    meta: Pact.lang.mkMeta('e6160a90a28ddd95fea7e0e7f2d3ce36fbdeac68be2057dbfc9da5162cac7ef5','1', 0.0001, 100000, creationTime(), 600)

  };

const response = await Pact.fetch.local(cmdObj, API_HOST);


const payout = await fetch('https://poolflare.net/api/v1/coin/kda/account/96f223435bbbfc2c68ca6887c60fa8dfe575a19930a7c86b9a4a9cf0d89a8868/payouts');
const payoutJsonArray = await payout.json(); //extract JSON from the poolflare response

const File = "./files/lastpayment.json";
const Data = fs.readFileSync(File);
const jsonTime = JSON.parse(Data);
const lastpaymenttime = jsonTime.date;
let amount =0.0;
let payouttimestamp = Number(payoutJsonArray.data.payouts[0].timestamp);
for (let i in payoutJsonArray.data.payouts){
    let timestamp = payoutJsonArray.data.payouts[i].timestamp;

    if (timestamp > lastpaymenttime ) {
        amount = amount + Number(payoutJsonArray.data.payouts[i].amount);
      }

    if(timestamp>payouttimestamp){
      payouttimestamp = timestamp;
    }
    

} 


let latestdate =0;

const totalhashrate = 100.10;
let totalcoin = Number(amount.toExponential(6));
const addrFile = "./files/adminaddress.json";
const addrData = fs.readFileSync(addrFile);
const jsonaddr = JSON.parse(addrData);
const publicKey = jsonaddr.public;
const secretKey = jsonaddr.secret;
const adwallet = jsonaddr.adminwallet;
    

for (let i in response.result.data){
    let customerhashrate = Number(response.result.data[i]["hash-rate"]);

    if (response.result.data[i]["created-date"]>lastpaymenttime){
        latestdate = Number(response.result.data[i]["created-date"]);
    }
    else{
        latestdate = Number(lastpaymenttime);
    }

    
    let numberofdays =  (payouttimestamp - latestdate);
    let paymentperiod = (payouttimestamp - lastpaymenttime);
    let owneraddress = response.result.data[i]["owner-address"];
    console.log(owneraddress);


    

    console.log(".............");
    console.log(totalhashrate);
   
    console.log(customerhashrate);
   
    console.log(totalcoin);
  
    console.log(numberofdays);
  
    console.log(paymentperiod);
   

    let hashrate = customerhashrate / totalhashrate;

    let period = numberofdays/paymentperiod ;

    let output = 0.74*totalcoin*period * hashrate;

    let coin = Number(output.toExponential(7));

    console.log(output);
    console.log(coin);

    const cmd = 
      {
        pactCode: Pact.lang.mkExp("coin.transfer",publicKey, owneraddress,coin),
        meta: {
            chainId: "1",
            sender: publicKey,
            gasLimit: 100000,
            gasPrice: 0.0000001,
            ttl: 600,
            creationTime: creationTime()
        },
        networkId: "testnet04",
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
const admincmd = 
      {
        pactCode: Pact.lang.mkExp("coin.transfer",publicKey, adwallet,admincoin),
        meta: {
            chainId: "1",
            sender: publicKey,
            gasLimit: 100000,
            gasPrice: 0.0000001,
            ttl: 600,
            creationTime: creationTime()
        },
        networkId: "testnet04",
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

var dict ={};
dict["date"]=payouttimestamp;

fs.writeFileSync("./files/lastpayment.json",JSON.stringify(dict));
   
  } catch (err) {
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
