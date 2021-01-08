const express = require('express')
const bodyParser = require('body-parser')
const csvtojson = require('csvtojson');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const app = express();

const PORT = 8080

app.use(bodyParser.json())

var array =  [
  'First Name,Last Name,Country,age',
  'Bob,"Sm,ith","United,States",24',
  'Alice,"Will,iams","Cana,da",23',
  'Malcolm,Jone,"Eng,land",22',
  '"Felix","Brown","USA",23',
  '"Alex","Cooper","Poland",23',
  '"Tod","Campbell","United States",22',
  '"Derek","Ward","Switzerland",25',
  '']

// algorithm for csv validation
function checkValidity(data) {

  const rows = data
  if(rows[rows.length-1] === "") rows.splice(rows.length-1);
  

  const firstRowLength = rows[0].split(',').length
  console.log(firstRowLength)
  let lengthArray = []

  rows.forEach((row, index) => {

    if(index == 0) return // exclude the headers

    const rowItems = row.split(',')
    console.log('rowItems ', rowItems)
    const firstValueInRow = rowItems[0];
    const hasQuote = firstValueInRow[0] == '"' && firstValueInRow[firstValueInRow.length-1] == '"'
    // console.log(firstValueInRow[firstValueInRow.length-1], ' ', hasQuote)

    if(hasQuote) {
      // console.log(row.split('",'))
      let splitWithQuote = row.split('",')
      // console.log('splitwithquote', splitWithQuote)
      splitWithQuote.forEach((item, index) => {
        console.log('item: ', item)
        if (item.includes(',')) {
          const splitItem = item.split(',')
          
          
          if(splitItem.every(value => Number.isFinite(Number(value)))) {
            console.log('splititem ', splitItem)
            splitWithQuote.splice(index, 1)
            splitWithQuote = [...splitWithQuote, ...splitItem]
          }
        }
      })
      lengthArray.push(splitWithQuote.length) // push number of values to lengthArray 
    } else {
      console.log('no ""')
      // console.log(row.split(','))
      let splitWithoutQuote = row.split(',')
      function recurse(i) {
        // console.log(splitWithoutQuote[i][splitWithoutQuote[i].length-1])
        if(i > splitWithoutQuote.length-1) return;
        if(splitWithoutQuote[i][0] == '"' && splitWithoutQuote[i][splitWithoutQuote[i].length-1] != '"') {
          splitWithoutQuote[i] += splitWithoutQuote[i+1]
          
          splitWithoutQuote.splice(i+1, 1)
          console.log('none')
          console.log(splitWithoutQuote[i])
          console.log(splitWithoutQuote)
          return recurse(i + 1)
        } else {
          recurse(i+1)
        }
      }

      recurse(0)

      lengthArray.push(splitWithoutQuote.length)
    }
  })

  // console.log('length: ', lengthArray)
  // return true if number of values for each row are the same. (same number of commas)
  // number of values for each row are stored in lengthArray
  // console.log(firstRowLength, lengthArray)
  console.log(lengthArray)
  return lengthArray.every(value => value == firstRowLength)
}

console.log(checkValidity(array))

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