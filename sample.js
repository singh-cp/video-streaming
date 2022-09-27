const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const app = express();
app.use(morgan("common"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/video", function (req, res) {
  // Getting headers
  const range = req.headers.range;
  //   If no headers then sending error
  if (!range) {
    res.status(404).json({ error: "Requires the range header" });
  } else {
    try {
      //   Getting the videopath
      const videoPath = "video.mp4";
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

app.listen(8000, function () {
  console.log("http://localhost:8000/");
});
