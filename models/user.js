"use strict";
const mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const user = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      required: true,
      // match: /^\S+@\S+\.\S+$/, // Regular expression for a basic email format
      // validate: {
      //   validator: async function (value) {
      //     // Custom validation logic to check the number of occurrences
      //     const count = await mongoose.model('user').countDocuments({ email: value });
      //     return count <= 6; // Allow the email to be used at most 7 times
      //   },
      //   message: props => `Email ${props.value} has already been used 7 times.`,
      // },
    },
    PhoneNumber: {
      type: String,
      trim: true,
      required: true,
      // validate: {
      //   validator: async function (value) {
      //     // Custom validation logic to check the number of occurrences
      //     const count = await mongoose.model('user').countDocuments({ PhoneNumber: value });
      //     return count <= 6; // Allow the phone number to be used at most 7 times
      //   },
      //   message: props => `Phone number ${props.value} has already been used 7 times.`,
      // },
    },
    walletaddress: { type: String, trim: true },
    Nominee: { type: String, trim: true },
    profileimg: { type: String, trim: true },
    address: { type: String, trim: true },
    Fullname: { type: String, default: null },
    username: { type: String, default: null, unique: true },
    leval: { type: Number, default: 0 },
    mystack: { type: Number, default: 0 },
    teamtotalstack: { type: Number, default: 0 },
    cbbteamtotalstack: { type: Number, default: 0 },
    Rank: { type: String, default: "Trainee" },
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
user.index(
  { createdAt: 1 },
  { expireAfterSeconds: 48 * 3600, partialFilterExpression: { isActive: false, isValid: false } }
);
user.pre("save", async function (next) {
  this.isModified("password") &&
    (this.password = await bcrypt.hash(this.password, 10));
  next();
});

// Function to remove records older than 2 days with mystack = 0
user.statics.removeOldRecords = async function () {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const condition = { createdAt: { $lt: twoDaysAgo }, mystack: 0 };

  try {
    const result = await this.deleteMany(condition);
    console.log(`${result.deletedCount} records removed.`);
  } catch (error) {
    console.error("Error removing records:", error);
  }
};

module.exports = mongoose.model("user", user);
