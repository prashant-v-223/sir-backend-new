const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HoldCBB = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    leval: {
      type: Number,
      default: 0,
    },
    Amount: {
      type: Number,
      default: 0,
      required: true,
    },
    Active: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("HoldCBB", HoldCBB);
