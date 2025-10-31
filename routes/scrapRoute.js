const express = require("express");
const router = express.Router();
const cors = require("cors");

//create cors
router.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      const allowOrigins = ["http://localhost:3000", "http://localhost:3001"];
      if (allowOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Origine not allowed by CORS"));
      }
    },
  })
);

//scrap controllers
const { main } = require("../controllers/mainController");

//routes
//post
router.post("/main", main);

module.exports = router;
