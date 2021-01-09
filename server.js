const express = require('express')
const bodyParser = require('body-parser')
const csvtojson = require('csvtojson');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const app = express();

const PORT = 8080

app.use(bodyParser.json())

// algorithm for csv validation
function checkValidity(data) {

  const rows = data.split('\n')
  if(rows[rows.length-1] === "") rows.splice(rows.length-1);

  const lengthArray = []
  
  rows.forEach((row, index) => {
    const regex = /"[\p{L}\p{N}\p{P}\p{S}\s]*["]/gui // regex for getting quoted values

    let lengthInMatch = 0
    if(row.match(regex)) {
      console.log(row.match(regex))
      lengthInMatch = row.match(regex)[0].split('",').length - 1
      row = row.replace(regex, '')
    }
    row = row.trim().replace(/[^,]/gi, '')

    // console.log('row: ', row)
    
    lengthInMatch += row.length;
    lengthArray.push(lengthInMatch)
  })

  console.log(lengthArray)
  return lengthArray.every(value => value == lengthArray[0])
}

// console.log(checkValidity(array))

app.post('/', (req, res) => {

  try {

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

            const objPropertyCount = []

            jsonObj.forEach((obj, index) => { // iterate through each record
              const keys = Object.keys(obj); // record keys

              keys.forEach(key => { 
                if (!select_fields.includes(key)) { 
                  // if key is not in select_fields, delete.
                  delete obj[key];
                }
              })

              objPropertyCount.push(Object.keys(obj).length)

            })

            if (objPropertyCount.every(value => value == 0) && select_fields)
              return res.json({
                message: "The selected fields are not present in the csv.",
                suggestion: "Try changing selected fields to values present in the csv file"
              });
            
            successResponse();
          })
          .catch(error => {
            res.json({error: error})
          })

      })
      .catch((error) => {
        console.log(error)
        res.json({
          message: 'Something went wrong. Could not make request',
          suggestion: 'Check if link is valid'
        })
      })

  } catch(error) {
    res.json({
      error: true,
      message: "something went wrong"
    })
  }

})

app.listen(PORT, () => console.log('listening on port ', PORT))