const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: "sample.env" });

const MONGO_URI = process.env.MONGO_URI;
const User = require("./models/user");
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/", (req, res) => {
  res.send("Exercise Tracker API up and running!");
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json("Username required");
  }

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (error) {
    console.error("User was not saved", error);
    res.status(500).json({ error: "Could not save user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    console.error("Users were not found", error);
    res.status(500).json({ error: "Could not find users" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json("Description and Duration are required");
  }
  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const exercise = {
      description,
      duration,
      date: exerciseDate.toDateString(),
    };
    user.log.push(exercise);
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date,
      duration: Number(exercise.duration),
      description: exercise.description,
    });
  } catch (error) {
    console.error("Error adding exercise", error);
    res.status(500).json({ error: "Error adding exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let exercises = user.log;

    if (from) {
      const fromDate = new Date(from);
      exercises = exercises.filter(
        (exercise) => new Date(exercise.date) >= fromDate
      );
    }

    if (to) {
      const toDate = new Date(to);
      exercises = exercises.filter(
        (exercise) => new Date(exercise.date) <= toDate
      );
    }

    if (limit) {
      exercises = exercises.slice(0, parseInt(limit)); // Convert 'limit' to an integer
    }

    const response = {
      username: user.username,
      _id: user._id,
      count: exercises.length, // The count of exercises
      log: exercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date, // Should be a string already (if you use toDateString in the exercise model)
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("User not found", error);
    res.status(500).json({ error: "User not found" });
  }
});

mongoose.connect(MONGO_URI);

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.log("Error occurred", err);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
