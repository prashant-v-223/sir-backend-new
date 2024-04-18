const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  validarionerrorResponse,
} = require("../middleware/response");
// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return badRequestResponse(res, {
        message: "Invalid email or password",
      });
    }
    const match = await bcrypt.compare(password, admin.password);
    console.log("admin", match);
    if (
      match !== true
    ) {
      return badRequestResponse(res, { message: "Password is incorrect!" });
    } else {
      const token = jwt.sign({ email: admin.email }, 'XXX');
      return successResponse(res, {
        token: token,
        admin: admin,
      });
    }
  } catch (error) {
    return badRequestResponse(res, {
      message: "Internal server error",
      error: error,
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    admin = new Admin({ email, password: password });
    await admin.save();
    res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
