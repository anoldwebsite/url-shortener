require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const mongoose = require('mongoose');
const dns = require('dns');
const URL = require('url').URL;//Utilities for URL resolution and parsing.

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const db = mongoose.connect(process.env.MONGO_URI, (err) => {
  if(err) console.error(err);
  console.log("Connected to the mongoDB successfully!");
});

const urlSchema = new mongoose.Schema(
  {
    original_url: String, //String is shorthand for {type: String}
    short_url: String
  }
);

const ShortUrl = mongoose.model('ShortUrl', urlSchema);
module.exports = ShortUrl;

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', function(req, res, next){
  const submittedUrl = req.body.url;
  const pattern = /^(http|https)(:\/\/)/;
  if(!pattern.test(submittedUrl)){
    console.error("Invalid pattern of URL detected! We will  not make a short URL!");
    return res.json({error: 'invalid url'});
  }

  try {
    const urlObj = new URL(submittedUrl);
    dns.lookup(urlObj.hostname, (err, address, family) => {
      if(err){
        console.error(`invalid url: ${submittedUrl}`);
        res.json({error: 'invalid url'});
      } else {
        const shortenedUrl = Math.floor(Math.random() * 100000).toString();//Generating a number randomly to represent a short cut for the original URL sent by the client.
        //Creating a new document/row in the mongoDB
        let doc = new ShortUrl(
          {
            original_url: submittedUrl,
            short_url: shortenedUrl
          }
        );
        //Save this document/Row to the mongoDB in a collection/table created according to our schema.
        doc.save((error, doc) => {
          if(error){
            console.error(error);
            res.end();
          }
        });
        //No error while saving the new doc/record to the collection/table. Send the object below to the client.
        res.json(
          {
            original_url: submittedUrl,
            short_url: shortenedUrl
          }
        );
      }
    });
  } catch (e) {
    if( e instanceof TypeError){
      console.error(`${submittedUrl} is an invlaid URL that does not follow the valid http://www.example.com or https://www.example.com format`);
      res.send({error: 'invalid url'});
    } else {
      throw e; //Because we don't know what the error is if it is not the case in the if() section above.
    }
  }
});

app.get('/api/shorturl/:short_url?', (req, res, next) => {
  console.log(`Short URL number received from client: ${req.params.short_url}`);
  const shortenedURL = req.params.short_url;
  //Search a record/doc in the mongoDB with this parameter
  ShortUrl.findOne({short_url: shortenedURL}, (err, data) => {
    if(err){
      console.error("Soemthing went wrong wile reading from the database!");
      res.send(err);
    } else if(data === null){
      console.log(`${shortenedURL} was not found in the database!`);
      res.send(`${shortenedURL} was not found in the database! ${data} was returned by the database.`);
    } else if (data && data.original_url){
      console.log(`Original URL to be used for re-direction: ${data.original_url}`);
      //Now we will redirect the user to the original URL 
      res.redirect(301, data.original_url);
    } else {
      console.error("Something went wrong!!!");
      console.log(data);
      res.end();
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});