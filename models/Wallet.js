const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Wallet = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    mainWallet: {
      type: Number,
      default: 0,
    },
    incomeWallet: {
      type: Number,
      default: 0,
    },
    lockendamount: {
      type: Number,
      default: 0,
    },
    upcommingamount: {
      type: Number,
      default: 0,
    },
    Active: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", Wallet);
