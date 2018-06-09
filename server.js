var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
var method = require("method-override");
var request = require("request");

var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();


app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

var database_URI = "mongodb://localhost/hpdb"
var MONGODB_URI = "mongodb://www.heroku.com/evening-crag-56827"
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
} else {
  mongoose.connect(database_URI);
}

var connect = mongoose.connection;

connect.on("error", function (err) {
  console.log("Mongoose error: ", err)
});

connect.once("open", function () {
  console.log("Mongoose connection successful");
});



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
  request("https://www.huffingtonpost.com/section/world-news", function (error, response, html) {
    var $ = cheerio.load(html);

    $(".card__headline__text").each(function (i, element) {
      var title = $(element).children("a").text();
      //var link = $(element).children("a").attr("href");
      var imgLink = $(element).children("img").attr("src");
      var link = "https://www.huffingtonpost.com" + $(element).children().attr("href")
      //result.title = $(this).text();
      //result.imgLink = $(this)
        //.parent()
        //.parent()
        //.parent()
        //.parent()
        //.parent()
        //.find("img").attr("src");
      //result.link = "https://www.huffingtonpost.com" + $(this)
        //.parent()
        //.attr("href");


      console.log("image: " + imgLink)

      console.log("full result: " + element);

      db.Article.create(element)
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
  console.log("App running on port " + PORT + "!");
});
