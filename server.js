const express = require("express");
const fs = require("fs");
const app = express();
const path = require("path");
const morgan = require("morgan");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const cors = require("cors");
let MongoURL = process.env.MONGO_URL;
let db;
let port = process.env.PORT || 8000;
const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;

// MiddleWares
app.use(morgan("common"));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/shows", async (req, res) => {
  try {
    const shows = await db
      .collection("videos")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json({ shows: shows });
  } catch (e) {
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/show/:showId", async (req, res) => {
  const { showId } = req.params;
  try {
    const show = await db
      .collection("videos")
      .findOne({ id: Number(showId) }, { projection: { _id: 0 } });
    res.json({ show: show });
  } catch (e) {
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/stream/:showId", async function (req, res) {
  const { showId } = req.params;
  // Getting range
  const range = req.headers.range;
  //   If no headers then sending error
  if (!range) {
    res.status(400).json({ error: "Requires the range header" });
  } else {
    // Finding the appropriate video file information
    const show = await db
      .collection("videos")
      .findOne({ id: Number(showId) }, { projection: { _id: 0 } });
    try {
      // DataBase path where the video file is kept - Can be accessed in environment variable also
      const AWS_DIR = "./";
      //   Getting the video file name and making complete route
      const videoPath = path.join(AWS_DIR, show.video_file);
      //   Getting the size of the video in bytes
      const videoSize = fs.statSync(videoPath).size;
      //   Defining the chunk size which we want to send
      const CHUNK_SIZE = 10 ** 6; //1Mb
      //   Start of the range
      const start = Number(range.replace(/\D/g, ""));
      //   Ending byte of the file
      const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
      //   Length of the video
      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Range": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, headers);
      const videoStream = fs.createReadStream(videoPath, { start, end });
      videoStream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

MongoClient.connect(MongoURL, (err, client) => {
  if (err) {
    console.log(err);
  }
  db = client.db("videoStreaming");
  app.listen(port, () => {
    console.log(`Listing on port ${port}`);
  });
});
