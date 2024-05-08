const { Types } = require("mongoose");
const { ObjectId } = Types;
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  findAllRecord,
} = require("../library/commonQueries");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  validarionerrorResponse,
} = require("../middleware/response");
const { tokenverify } = require("../middleware/token");
const Usermodal = require("../models/user");
const env = require("../env");
const Web3 = require("web3");

exports.profile = {
  viewTree: async (req, res) => {
    try {

      let username = req.body.username;
      let data1 = await Usermodal.aggregate([
        {
          $match: {
            username: username,
          },
        },

      ]);
      let data = await Usermodal.aggregate([
        {
          $match: {
            mainId: username,
          },
        },
        {
          $graphLookup: {
            from: "users",
            startWith: "$username",
            connectFromField: "username",
            connectToField: "mainId",
            maxDepth: 0,
            as: "refers_to",
          },
        },
        {
          $project: {
            Fullname: 1,
            refId: 1,
            username: 1,
            leval: 1,
            mainId: 1,
            supporterId: 1,
            createdAt: 1,
            mystack: 1,
            teamtotalstack: 1,
            cbbteamtotalstack: 1,
            scbleval: { $size: "$refers_to" },
          },
        },
        {
          "$sort": {
            "createdAt": 1
          }
        }
      ]);
      console.log(data);
      return successResponse(res, {
        message: "My Supporters Are here",
        data: data,
        usernama: username,
        usernama1: data1
      });

    } catch (error) {
      return errorResponse(error, res);
    }
  },

  mainTree: async (req, res) => {
    try {

      let username = req.body.username;

      if (!username) return res.send('username');

      let data1 = await Usermodal.aggregate([
        {
          $match: {
            username: username,
          },
        },

      ]);
      let data = await Usermodal.aggregate([
        {
          $match: {
            supporterId: username,
          },
        },
        {
          $graphLookup: {
            from: "users",
            startWith: "$username",
            connectFromField: "username",
            connectToField: "supporterId",
            as: "refers_to",
          },
        },
        {
          $project: {
            Fullname: 1,
            username: 1,
            refId: 1,
            leval: 1,
            createdAt: 1,
            mainId: 1,
            supporterId: 1,
            mystack: 1,
            teamtotalstack: 1,
            cbbteamtotalstack: 1,
            scbleval: { $size: "$refers_to" },
          },
        },
        {
          "$sort": {
            "createdAt": 1
          }
        }
      ]);
      console.log("My Supporters Are hereMy Supporters Are here", data);
      return successResponse(res, {
        message: "My Supporters Are here",
        data: data,
        usernama: username,
        usernama1: data1
      });

    } catch (error) {
      return errorResponse(error, res);
    }
  },
}