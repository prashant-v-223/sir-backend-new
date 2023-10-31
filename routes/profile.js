const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile");

router.post("/supportertree", (req, res) => {
  return profileController.profile.mainTree(req, res);
});

router.post("/maintree", (req, res) => {
    return profileController.profile.viewTree(req, res);
  });

module.exports = router;
