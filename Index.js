const Pact = require("pact-lang-api");
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
    console.log("I am here" + req);
    //const mintInput = JSON.parse(req);
    const mintInput = req.body;
    console.log("I am here" + mintInput);
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
    return response;
    //return true;
  } catch (err) {
    return false;
  }
};
const distributeFunds = async () => {
  try {
    const payout = await fetch('https://poolflare.net/api/v1/coin/kda/account/96f223435bbbfc2c68ca6887c60fa8dfe575a19930a7c86b9a4a9cf0d89a8868/payouts');
const payoutJsonArray = await payout.json(); //extract JSON from the poolflare response

const File = "./files/lastpayment.json";
const Data = fs.readFileSync(File);
const jsonTime = JSON.parse(Data);
const time = jsonTime.date;
let amount =0;
for (let i in payoutJsonArray.data.payouts){
    let timestamp = payoutJsonArray.data.payouts[i].timestamp;

    if (timestamp > time) {
        amount = amount + Number(payoutJsonArray.data.payouts[i].amount);
      }
} 
const dateToday = new Date();
var timestamp = Math.floor(dateToday.getTime()/1000.0);
var dict ={};
dict["date"]=timestamp;
fs.writeFileSync("./files/lastpayment.json",JSON.stringify(dict));
const cmdObj1 = {
  pactCode: ('kor-nft.get-allvalues'),
  networkId: NETWORK_ID,
  keyPairs: KP,
  envData: {
   //'admin-ks': [KP['publicKey']]
   'admin-ks': {"keys": [e6160a90a28ddd95fea7e0e7f2d3ce36fbdeac68be2057dbfc9da5162cac7ef5], "pred": "keys-all"},
   account:  "k:e6160a90a28ddd95fea7e0e7f2d3ce36fbdeac68be2057dbfc9da5162cac7ef5",
        chain: "1",
 },
  meta: {
   creationTime: creationTime(),
   ttl: 28000,
   gasLimit: 65000,
   chainId: CHAIN_ID,
   gasPrice: 0.000001,
   sender: KP.publicKey // the account paying for gas
 }
 };
 const response = await Pact.fetch.send(cmdObj1, API_HOST);
    const cmdObj = {
      pactCode: Pact.lang.mkExp('kor-nft.get-allvalues'),
      keyPairs: KP
    };
    Pact.fetch.send(cmdObj, API_HOST);

    const d = new Date();
    var dict = {}; 
    dict["created-date"] = d;
    fs.writeFileSync("../files/lastpayment.json", JSON.stringify(dict));
    return true;
   
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
  const minted = mintContractService(req);
  const transactionId = minted.requestKeys[0];
  if (minted) res.json({ status: transactionId});
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
