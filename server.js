const express = require('express')
const app = express()
const shortid = require("shortid")
const bodyParser = require("body-parser")
const cors = require('cors')

const mongoose = require('mongoose')
const { text } = require('body-parser')

process.env.DB_URI="mongodb+srv://paddison:sevenfl4tseven@cluster0-s6q3e.mongodb.net/cluster0?retryWrites=true&w=majority";
mongoose.connect(process.env.DB_URI, 
  { useNewUrlParser: true, useUnifiedTopology: true }, 
  () => console.log("Connected")
);

const Schema = mongoose.Schema;

const userSchema = new Schema ({
  _id: {
    type: String,
    default: shortid.generate
  },
  username: {
    type: String,
    required: true,
  },
  log: [{
    date: {
      type: Date,
      required: false,
    },
    duration: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }]
});

const User = mongoose.model("User", userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res) => {
  User.findOne({username: req.body.username}, (err, data) => {
    if (err) throw err;
    if (data) {
      res.json({error: "username already taken"});
    }else {
      User.create({username: req.body.username}, (err, data) => {
        if (err) throw err;
        res.json({
          _id: data._id,
          username: data.username
        });
      });
    }
  });
});

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
 
app.post("/api/exercise/add", (req, res) => {
  if (!req.body.date) req.body.date = new Date();
  User.findById(req.body.userId, (err, data) => {
    if (err) throw err;
    if(!data) res.json({error: "no user for id"});
      let date = new Date(req.body.date)
      data.log.push(
        {
          date: date,
          duration: parseInt(req.body.duration),
          description: req.body.description
        }
      );  
      data.save((err, data) => {
        if (err) res.type("txt").send(err.message);
        let formDate = days[date.getDay()] + " " + months[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear();
        res.json({
          username: data.username,
          description: req.body.description,
          duration: parseInt(req.body.duration),
          _id: data._id,
          date: formDate
      });      
    });
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) throw err;

    let users = data.map(val => {
      return {
        _id: val._id,
        username: val.username
      }
    });

    res.json(users);
  })
})

app.get("/api/exercise/log", (req, res) => {

  let userId = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date (req.query.to);
  var limit = parseInt(req.query.limit);

  User.findById(userId, (err, data) => {

    if (!data) res.send("User not found");

    let dates = data.log.map(val => val.date);

    if (isNaN(to.getTime())) {
      to = new Date(Math.max.apply(null, dates))
    }
    if (isNaN(from.getTime())) {
      from = new Date(Math.min.apply(null, dates))
    }

    let info = data.log
    .filter(val => {
      if (to >= val.date && val.date >= from) {
        return true
      }  
    })
    .map(val => {
      let date = days[val.date.getDay()] + " " + months[val.date.getMonth()] + " " + val.date.getDate() + " " + val.date.getFullYear()
      return {
        date: date,
        duration: val.duration,
        description: val.description
      }
    });

    if (limit) {
      info = info.slice(0, limit);
    }

    res.json({
      _id: data._id,
      username: data.username,
      count: info.length,
      log: info
    });
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

