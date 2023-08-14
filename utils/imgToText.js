const vision = require('@google-cloud/vision');
const AppError = require('../utils/appError');
const path = require('path');

const CREDENTIALS = JSON.parse(JSON.stringify(process.env.GCLOUD_CREDENTIALS));

  const CONFIG = {
    credentials : {
        private_key: CREDENTIALS.private_key,
        client_email: CREDENTIALS.client_email
    }
  }
// Creates a client
const client = new vision.ImageAnnotatorClient(CONFIG);


module.exports.detectText = async (fileName)=>{
  let result;
  try{[result] = await client.textDetection(path.join(`./public/images/users/${fileName}`));}
  catch(err){console.log(err)};
  const detections = result.textAnnotations.map((detection)=>{
    return detection.description.toLowerCase();
  });
  return detections;
}

module.exports.getRequired=(stringArr,requiredLabel)=>{
  let resArr = [];
    const finalResult = stringArr
    .filter((str)=>{
      if(str.indexOf(requiredLabel)>-1)
        return true;
      else
        return false;
    })
    .map((str)=>{
      return str.substring(str.indexOf(requiredLabel));
    })
    .forEach((str)=>{
      const arr = str.replaceAll('\n',' ').replaceAll(requiredLabel,'').replaceAll(':','').split(',');
      resArr.push(...arr);
    });
    resArr = resArr.join(',').split('.')[0].split(',');   
    return resArr;
}