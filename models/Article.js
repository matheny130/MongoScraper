var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
  title: {
    type: String,
    unique: true,
    require: true
  },
  link: {
    type: String,
    require: true
  },
  imgLink: {
    type: String,
    require: true
  },
  note: {
    type: Schema.Types.ObjectId,
    ref: "Note"
  },
  read: {
    type: Boolean,
    default: false
  }
});

var Article = mongoose.model("Article", ArticleSchema);

module.exports = Article;