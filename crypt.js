const crypto = require('crypto')
require('dotenv').config();

const algorithm = process.env.ALGORITHM;
const secretKey = process.env.CRYPT_SECRETKEY;
const secret_iv =process.env.CRYPT_SECRET_IV;


//var iv = secretKey.substring(0,16);
var iv = crypto.createHash('sha512').update(secret_iv, 'utf-8').digest('hex').substring(0,16);

var key = crypto.createHash('sha512').update(secretKey, 'utf-8').digest('hex').substring(0,32);



const encrypt = text => {

  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key),iv)

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])


  return {
    content: encrypted.toString('hex')
  }
}
