const axios = require('axios');

module.exports.upcLookupFun = async (upcNumber) =>{
  const upcbody= `{ \"upc\": \"${upcNumber}\" }`;
  const response = await axios.post('https://api.upcitemdb.com/prod/trial/lookup',upcbody);
  return response.data;
};

