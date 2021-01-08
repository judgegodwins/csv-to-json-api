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
  

  const firstRowLength = rows[0].split(',').length
  console.log(firstRowLength)
  let lengthArray = []

  rows.forEach((row, index) => {

    if(index == 0) return // exclude the headers

    const firstValueInRow = row.split(',')[0]
    const hasQuote = firstValueInRow[0] == '"' && firstValueInRow[firstValueInRow.length-1] == '"'
    console.log(row, ' ', hasQuote)

    if(hasQuote) {
      console.log(row.split('",'))
      lengthArray.push(row.split('",').length) // push number of values to lengthArray 
    } else {
      console.log(row.split(','))
      lengthArray.push(row.split(',').length)
    }
  })

  console.log('length: ', lengthArray)
  // return true if number of values for each row are the same. (same number of commas)
  // number of values for each row are stored in lengthArray
  return lengthArray.every(value => value == firstRowLength)
}



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