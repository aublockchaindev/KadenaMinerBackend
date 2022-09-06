const Pact = require("pact-lang-api");
const API_HOST = "http://localhost:9001";
const KP = Pact.crypto.genKeyPair();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
var http = require('http');

app.use(
  cors({
    origin: "*",
  })
);
// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const mintContractService = async (req) => {
  console.log("mintContractService is called")
  try {
    const mintInput = req.body;
    //const mintInput = JSON.parse(req.body);
    const createdDate = new Date(mintInput.createdDate);
/*
    console.log("mintInput.ownerAddress", mintInput.ownerAddress);
    console.log("mintInput.createdDate", createdDate);
    console.log("mintInput.nftValue", mintInput.nftValue);
    console.log("mintInput.hashRate", mintInput.hashRate);
*/
    const cmdObj = {
      pactCode: Pact.lang.mkExp('kor-nft.set-values', mintInput.ownerAddress, mintInput.nftValue, createdDate, mintInput.hashRate),
      keyPairs: KP
    };

    Pact.fetch.send(cmdObj, API_HOST);
    return true;
  } catch (err) {
    console.log("err: " + err)
    return false;
  }
};
const distributeFunds = async () => {
  try {
      const payout = await fetch('https://poolflare.net/api/v1/coin/kda/account/da523a1830c62f68edc7ea7e95d544970f0c85dcd4b5300548c252ed467730f9/payouts');
      const payoutJsonArray = await payout.json(); //extract JSON from the poolflare response
      // Get payout figure from json and update Pact Table
      //console.log(payoutJson);
    const cmdObj = {
      pactCode: Pact.lang.mkExp('kor-nft.get-allvalues'),
      keyPairs: KP
    };
    Pact.fetch.send(cmdObj, API_HOST);

    const d = new Date();
    var dict = {}; 
    dict["created-date"] = d;
    fs.writeFileSync("../lastpayment.json", JSON.stringify(dict));
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
  if (minted) res.json({ status: "success" });
  else res.json({ status: "fail" });
});
app.get("/api/getMiners", async (req, res) => {
  const minerFile = "../files/miners.json";
  const rawData = fs.readFileSync(minerFile);
  const minerjson = JSON.parse(rawData);
  res.json(minerjson);
});
app.get("/api/lastPayment", async (req, res) => {
  const paymentFile = "../files/lastpayment.json";
  const payrawData = fs.readFileSync(paymentFile);
  const paymentjson = JSON.parse(payrawData);
  res.json(paymentjson);
});
app.get("/api/balanceHashrate", async (req, res) => {
  const balanceFile = "../files/balancehashrate.json";
  const balrawData = fs.readFileSync(balanceFile);
  const balancejson = JSON.parse(balrawData);
  res.json(balancejson);
});

http.createServer(app).listen(9092);
