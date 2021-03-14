const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
var axios = require("axios");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Order = require("./models/Order");


mongoose
  .connect(
    "mongodb+srv://sagar:sagar2019.@cluster0.nxqpo.mongodb.net/WebDevWorkshop?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    }
  )
  .then(() => {
    console.log("connected to db!");
  })
  .catch((err) => {
    console.log("error", err);
  });

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({ secret: "keepABetterSecretThanThis", resave: false, saveUninitialized: true }));

const isLogin = (req,res,next) => {
    if(!req.session.userId)
        res.redirect("/login");
    else
        next();
};

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("signup");
});

app.post("/register", async (req, res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const user = new User({firstName, lastName, email, password});
    await user.save();
    req.session.userId = user._id;
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.render("signup");
});

app.get("/dashboard", (req, res) => {
//   axios
//     .get("http://localhost:3000/api/users")
//     .then(function (response) {
//       res.render("admin", { users: response.data });
//     })
//     .catch((err) => {
//       res.send(err);
//     });
    const allOrders = Order.find({});

    allOrders.exec(function (err, response) {
      if (err) throw err;
      res.render("admin", { allData: response });
    });
});

app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const foundUser = await User.findAndValidate(email, password);
   
    if (foundUser) {
        req.session.userId = foundUser._id;
        if (email === "admin@test.com" && password === "123456") {
            res.redirect("/dashboard")
        }
        else {
            res.redirect("/orders");
        }
    } else {
      res.redirect("/");
    }
});

app.get("/orders", (req, res, next) => {
    const individualOrder = Order.find({ emailID: "test@test.com" });

    individualOrder.exec(function (err, data){
        if (err) throw err;
        res.render("orders", { records: data });
    });
});

app.get("/placeOrder", (req, res) => {
    if (req.session.userId) {
        res.render("placeOrder");
    }
});

app.post("/placeOrder", async (req, res) => {
    const Date = req.body.date;
    const Pricing = req.body.pricing;
    const PickupState = req.body.pickupstate;
    const PickupCity = req.body.pickupcity;
    const DropState = req.body.dropstate;
    const DropCity = req.body.dropcity;
    const firstandlastname = req.body.bf_name;
    const emailID = req.body.bf_email;
    const extraMessages = req.body.bf_extraMessages;

    try {
        const order = new Order({
          Date,
          Pricing,
          PickupState,
          PickupCity,
          DropState,
          DropCity,
          firstandlastname,
          emailID,
          extraMessages,
        });
        await order.save();
        res.render("hello");
    } catch(e) {
        console.log(e);
    }    
});

app.get("/add-user", (req, res) => {
  res.render("add_user");
});

app.get("/update-user", (req, res) => {
  axios
    .get("http://localhost:8080/api/users", {
      params: {
        id: req.query.id,
      },
    })
    .then((userdata) => {
      // console.log(userdata.data);
      res.render("update_user", { user: userdata.data });
      
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/api/users", (req, res) => {
  if (req.query.id) {
    const id = req.query.id;

    // res.send({"good":"morning"})

    Order.findById(id)
      .then((data) => {
        res.send(data);
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: "Error retrieving user with id " + id });
      });
  } else {
    Order.find()
      .then((user) => {
        res.send(user);
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Error Occurred while retriving user information",
        });
      });
  }
});

// API
app.post("/api/users", (req, res) => {
  // validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be emtpy!" });
    return;
  }
  const Date = req.body.date;
  const Pricing = req.body.pricing;
  const PickupState = req.body.PickupState;
  const PickupCity = req.body.PickupCity;
  const DropState = req.body.DropState;
  const DropCity = req.body.DropCity;
  const firstandlastname = req.body.name;
  const emailID = req.body.emailid;
  const extraMessages = req.body.messages;

  // new user
  const order = new Order({
    Date,
    Pricing,
    PickupState,
    PickupCity,
    DropState,
    DropCity,
    firstandlastname,
    emailID,
    extraMessages,
  });

  // save user in the database
  order
    .save(order)
    .then((data) => {
      //res.send(data)
      res.redirect("/dashboard");
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while creating a create operation",
      });
    });
});


app.put("/api/users/:id", (req, res) => {
  if (!req.body) {
    return res.status(400).send({ message: "Data to update can not be empty" });
  }

  const id = req.params.id;
  Order.updateOne(
    { _id: id },
    { $set: req.body },
    {
      upsert: true,
    }
  )
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot Update user with ${id}. Maybe user not found!`,
        });
      } else {
        res.send(data);
      }
    })
    .catch((err) => {
      res.status(500).send({ message: "Error Update user information" });
    });
});

app.delete("/api/users/:id", (req, res) => {
  const id = req.params.id;
  console.log(id);
  Order.findByIdAndDelete(id)
    .then((data) => {
      if (!data) {
        res
          .status(404)
          .send({ message: `Cannot Delete with id ${id}. Maybe id is wrong` });
      } else {
        res.send({
          message: "User was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete User with id=" + id,
      });
    });
});

app.post("/logout",(req,res)=>{
    req.session.userId = null;
    res.redirect("/login")
})

const PORT = 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });