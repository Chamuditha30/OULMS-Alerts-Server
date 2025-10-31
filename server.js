require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

//middlewares
app.use(express.json());
app.use(bodyParser.json());

//routes
app.use("/scrap", require("./routes/scrapRoute"));

//run server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on ${process.env.PORT}`);
});
