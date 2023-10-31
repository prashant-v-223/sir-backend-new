const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Staking = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    WalletType: {
      type: String,
      default: 0,
      required: true,
    },
    leval: {
      type: Number,
      default: 0,
    },
    TotaldaysTosendReword: {
      type: Number,
      default: 1000,
      required: true,
    },
    DailyReword: {
      type: Number,
      required: true,
    },
    Amount: {
      type: Number,
      default: 0,
      required: true,
    },
    TotalRewordRecived: {
      type: Number,
      default: 0,
      required: true,
    },
    TotalRewordsend: {
      type: Number,
      default: 0,
      required: true,
    },
    Totalsend: {
      type: Number,
      default: 0,
      required: true,
    },
    Active: {
      type: Boolean,
      default: true,
      required: true,
    },
    bonusAmount: {
      type: Number,
      default: 200,
      required: true,
    },
    transactionHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staking", Staking);
