var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
var method = require("method-override");

var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();


app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

var MONGODB_URI = process.env.MONGODB_URI || "https://evening-crag-56827.herokuapp.com/";

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

app.use(method("_method"));
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//Display handlebars main page
app.get("/", function (req, res) {
  db.Article.find({}, null, { sort: { created: -1 } }, function (err, data) {
    res.render("index", { articles: data });
  })
});

//Scrape articles from huffpost and add to db
app.get("/scrape", (req, res) => {
  axios.get("https://www.huffingtonpost.com/section/world-news").then(function (response) {
    var $ = cheerio.load(response.data);

    $(".card__headline__text").each(function (i, element) {
      var result = {};

      result.title = $(this).text();
      result.imgLink = $(this)
        .parent()
        .parent()
        .parent()
        .parent()
        .parent()
        .find("img").attr("src");
      result.link = "https://www.huffingtonpost.com" + $(this)
        .parent()
        .attr("href");


      console.log("image: " + result.imgLink)

      console.log("full result: " + result);

      db.Article.create(result)
        .then(function (dbArticle) {
          console.log(dbArticle);
        })
        .catch(function (err) {
          return res.json(err);
        });
    });

    res.redirect("/");
  });
});

//Grab all articles
app.get("/articles", (req, res) => {
  db.Article.find({})
    .then((dbArticle) => {
      res.json(dbArticle);
    })
    .catch((err) => {
      res.json(err);
    });
});

//Grab only the saved articles
app.get("/saved", (req, res) => {
  db.Article.find({ "read": true })
    .populate("note")
    .then(data => {
      var hbsObject = {
        articles: data
      }
      console.log("saved data: ", data);
      res.render("saved", { articles: data });
    });
});

//Get an article by its specific ID, populate it with a note
app.get("/articles/:id", (req, res) => {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//Save a note for an article
app.post("/articles/:id", (req, res) => {
  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//Save an ID
app.post("/articles/save/:id", (req, res) => {
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "read": true })
    .exec((err, doc) => {
      if (err) {
        console.log(err);
      }
      else {
        res.send(doc);
      }
    });
});

//Delete an article from saved
app.post("/articles/delete/:id", (req, res) => {
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "read": false })
    .exec((err, doc) => {
      if (err) {
        console.log(err);
      }
      else {
        res.send(doc);
      }
    });
});

app.listen(PORT, () => {
  console.log("App running on port " + PORT);
});


