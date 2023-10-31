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
      let data = await findAllRecord(Usermodal, {
        mainId: username,
      });
      console.log(data);
      return successResponse(res, {
        message: "My Supporters Are here",
        data: data,
        usernama: username
      });

    } catch (error) {
      return errorResponse(error, res);
    }
  },

  mainTree: async (req, res) => {
    try {

      let username = req.body.username;

      if (!username) return res.send('username');
      let data = await findAllRecord(Usermodal, {
        supporterId: username,
      });
      console.log(data);
      return successResponse(res, {
        message: "My Supporters Are here",
        data: data,
        usernama: username
      });

    } catch (error) {
      return errorResponse(error, res);
    }
  },
}