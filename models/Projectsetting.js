const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Projectsetting = new Schema(
    {
        scbtotallevaldistribution: {
            type: Number,
            default: 0,
            required: true,
        },
        scbtPercentage: {
            type: [String],
            default: [],
        },
        ccbtotallevaldistribution: {
            type: Number,
            default: 0,
            required: true,
        },
        reffPercentage: {
            type: Number,
            default: 0,
            required: true,
        },
        ccbtPercentage: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Projectsetting", Projectsetting);
