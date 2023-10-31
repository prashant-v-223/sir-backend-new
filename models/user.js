"use strict";
const mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const user = new mongoose.Schema(
  {
    email: { type: String, trim: true },
    walletaddress: { type: String, trim: true },
    Nominee: { type: String, trim: true },
    profileimg: { type: String, trim: true },
    address: { type: String, trim: true },
    Fullname: { type: String, default: null },
    PhoneNumber: { type: String, default: null },
    username: { type: String, default: null, unique: true },
    leval: { type: Number, default: 0 },
    mystack: { type: Number, default: 0 },
    teamtotalstack: { type: Number, default: 0 },
    Rank: { type: String, default: "DIRECT" },
    password: { type: String, trim: true },
    isValid: { type: Boolean, default: false },
    STAKINGBOOSTER: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    iswalletActive: { type: Boolean, default: true },
    refId: String,
    mainId: String,
    supporterId: String,
    referred: {
      type: [String],
      default: [],
    },
    nextRefIndex: {
      type: Number,
      default: 0,
    },
    nextRefIdsToBeSkipped: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);
user.pre("save", async function (next) {
  this.isModified("password") &&
    (this.password = await bcrypt.hash(this.password, 10));
  next();
});
module.exports = mongoose.model("user", user);
