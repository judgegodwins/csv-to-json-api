const express = require('express')
const bodyParser = require('body-parser')
const csvtojson = require('csvtojson');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const app = express();

const PORT = 8080

app.use(bodyParser.json())

function checkValidity(data) {

  const rows = data.split('\n')
  if(rows[rows.length-1] === "") rows.splice(rows.length-1);

  let lengthArray = []

  rows.forEach(row => {
    // check for number of commas
    const commas = row.replace(/[^,]/g, "")

    // push number to array for checking
    lengthArray.push(commas.length)
  })

  // return true if all values for each row are the same. (same number of commas)
  return lengthArray.every(value => value === lengthArray[0])
}

app.post('/to_json', (req, res) => {
  const payload = req.body;

  //query csv link
  axios.get(payload.csv.url)
    .then(function(response) {

      // check if csv is valid
      if (!checkValidity(response.data)) 
        return res.json({ error: 'invalid csv!' });

      csvtojson() // use csv to json to transform csv to json
        .fromString(response.data)
        .then(jsonObj => {
          const successResponse = () => res.json({
            conversion_key: uuidv4(), // universally unique identifier
            json: jsonObj
          })

          const { select_fields } = payload.csv

          if(!select_fields) return successResponse(); // if no fields are selected, return all

          jsonObj.forEach((obj, index) => { // iterate through each record
            const keys = Object.keys(obj); // record keys

            keys.forEach(key => { 
              if (!select_fields.includes(key)) { 
                // if key is not in select_fields, delete.
                delete obj[key];
              }
            })
          })

          successResponse();
        })
        .catch(error => {
          res.json({error: error})
        })

    })
    .catch((error) => {
      res.json({
        message: 'Something went wrong. Could not make request',
        suggestion: 'Check if link is valid'
      })
    })

})

app.listen(PORT, (port, hostname) => console.log('listening on port ', PORT))