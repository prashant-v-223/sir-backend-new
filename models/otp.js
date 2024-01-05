const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var OtpSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },
  otp: Number,
  createdAt: { type: Date, expires: "10 m", default: Date.now },
});
module.exports = mongoose.model("otp", OtpSchema);
