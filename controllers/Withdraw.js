var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Usermodal = require("../models/user");
var ejs = require("ejs");
const jwt = require("jsonwebtoken");
const Stakingmodal = require("../models/Staking");
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  hardDeleteRecord,
  updateRecordValue,
  findAllRecord,
} = require("../library/commonQueries");
const Walletmodal = require("../models/Wallet");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
} = require("../middleware/response");
const Token = require("../models/Token");
const { tokenverify } = require("../middleware/token");
const V4Xpricemodal = require("../models/V4XLiveRate");
const otp = require("../models/otp");
const Mainwallatesc = require("../models/Mainwallate");
const withdrawalmodal = require("../models/withdrawalhistory");
const Ewallateesc = require("../models/Ewallate");
const env = require("../env");
const Web3 = require("web3");
const { ObjectId } = require("mongodb");

const infraUrl = env.globalAccess.rpcUrl;
const ContractAbi = env.contract.V4XAbi.abi;

const ContractAddress = env.globalAccess.V4XContract;

const ContractAbiForBUSD = env.contract.busdAbi.abi;

const ContractAddressForBUSD = env.globalAccess.busdContract;

const PrivateKey = env.privateKey;

const web3 = new Web3(infraUrl);
let transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "sirtoken21@gmail.com",
    pass: "qiebkwzdaaykswre",
  },
});
const init1 = async (to_address, token_amount) => {
  const myContract = new web3.eth.Contract(
    JSON.parse(ContractAbi),

    ContractAddress
  );

  const tx = myContract.methods.transfer(to_address, token_amount);

  try {
    const gas = 500000;

    const data = tx.encodeABI();

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        to: myContract.options.address,

        data,

        gas: gas,

        value: "0x0",
      },

      PrivateKey
    );

    console.log("Started");

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    console.log(`Transaction Hash :  ${receipt.transactionHash}`);

    console.log("End");

    return [true, receipt.transactionHash];
  } catch (error) {
    console.log(error);

    return [false, JSON.stringify(error)];
  }
};
exports.Withdraw = {
  Withdrawotpsend: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const data1 = await findOneRecord(Usermodal, {
            email: decoded.profile["email"],
            isActive: !false,
            isValid: !false,
          });
          console.log(data1._id);
          const otpdata = await findAllRecord(otp, {
            userId: data1._id,
          });
          console.log(otpdata.length === 0);
          if (otpdata.length === 0) {
            var digits = "0123456789";
            let OTP = "";
            for (let i = 0; i < 4; i++) {
              OTP += digits[Math.floor(Math.random() * 10)];
            }
            let data = {
              otp: OTP,
              userId: decoded.profile._id,
            };
            await otp(data).save();
            const mailOptions = {
              from: "noreply@sirglobal.or", // Sender address
              to: decoded.profile["email"], // List of recipients
              subject: `verification by SIR - (${decoded.profile["username"]})`, // Subject line
              html:
                "<h2>" +
                "withdrawal OTP for SIR" +
                "</h2>" +
                "<h4>" +
                "OTP To Validate Your SIR withdrawal is: " +
                "</h4>" +
                "<br/>" +
                `<h2  style="
                    letter-spacing: 4px">` +
                OTP +
                "</h2>" +
                "<h6>" +
                "If You Have Not Send This OTP Request , Kindly Contact Support" +
                "</h6>" +
                "<h6>" +
                "support@SIR.org" +
                "</h6>" +
                `<h6  style="display: flex">` +
                ` <a style="
                    padding: 3px"
                  href="https://twitter.com/V4XCOIN"
                  target="_blank"
                  ><img
                    alt="Twitter"
                    height="32"
                    src="https://firebasestorage.googleapis.com/v0/b/svdxv-xcv.appspot.com/o/twitter2x.png?alt=media&token=bd4e0369-e148-4243-8b8c-eb055093604d"
                    style="
                      display: block;
                      height: auto;
                      border: 0;
                    "
                    title="twitter"
                    width="32"
                /></a>` +
                `  <a  style="
                    padding: 3px"
                  href="https://www.facebook.com/profile.php?id=100091423535722"
                  target="_blank"
                  ><img
                    alt="Facebook"
                    height="32"
                    src="https://firebasestorage.googleapis.com/v0/b/svdxv-xcv.appspot.com/o/facebook2x.png?alt=media&token=c14dcec5-8af2-459f-8443-c7c3ac8b79d2"
                    style="
                      display: block;
                      height: auto;
                      border: 0;
                    "
                    title="facebook"
                    width="32"
                /></a>` +
                "<h6>" +
                "Visit Us At : www.sirglobal.org  " +
                "</h6>",
            };
            transport.sendMail(mailOptions, async function (err, info) {
              if (err) {
                return badRequestResponse(res, {
                  message: `Email not send error something is wrong ${err}`,
                });
              } else {
                return successResponse(res, {
                  message: "otp has been send to your email address..!!",
                });
              }
            });
          } else {
            return successResponse(res, {
              message: "otp already and in your mail plase check your email",
            });
          }
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  tranferotpsend: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(req.headers.authorization);
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          console.log(decoded);
          const data1 = await findOneRecord(Usermodal, {
            email: decoded.profile["email"],
            isActive: !false,
            isValid: !false,
          });
          console.log(data1._id);
          const otpdata = await findAllRecord(otp, {
            userId: data1._id,
          });
          console.log(otpdata.length === 0);
          if (otpdata.length === 0) {
            var digits = "0123456789";
            let OTP = "";
            for (let i = 0; i < 4; i++) {
              OTP += digits[Math.floor(Math.random() * 10)];
            }
            let data = {
              otp: OTP,
              userId: decoded.profile._id,
            };
            await otp(data).save();
            const mailOptions = {
              from: "noreply@sirglobal.or", // Sender address
              to: decoded.profile["email"], // List of recipients
              subject: "verification by SIR", // Subject line
              html:
                "<h2>" +
                "Transfer  OTP for SIR" +
                "</h2>" +
                "<h4>" +
                "OTP To Validate Your SIR Transfer is: " +
                "</h4>" +
                "<br/>" +
                `<h2  style="
                    letter-spacing: 4px">` +
                OTP +
                "</h2>" +
                "<h6>" +
                "If You Have Not Send This OTP Request , Kindly Contact Support" +
                "</h6>" +
                "<h6>" +
                "support@SIR.org" +
                "</h6>" +
                `<h6  style="display: flex">` +
                ` <a style="
                    padding: 3px"
                  href="https://twitter.com/V4XCOIN"
                  target="_blank"
                  ><img
                    alt="Twitter"
                    height="32"
                    src="https://firebasestorage.googleapis.com/v0/b/svdxv-xcv.appspot.com/o/twitter2x.png?alt=media&token=bd4e0369-e148-4243-8b8c-eb055093604d"
                    style="
                      display: block;
                      height: auto;
                      border: 0;
                    "
                    title="twitter"
                    width="32"
                /></a>` +
                `  <a  style="
                    padding: 3px"
                  href="https://www.facebook.com/profile.php?id=100091423535722"
                  target="_blank"
                  ><img
                    alt="Facebook"
                    height="32"
                    src="https://firebasestorage.googleapis.com/v0/b/svdxv-xcv.appspot.com/o/facebook2x.png?alt=media&token=c14dcec5-8af2-459f-8443-c7c3ac8b79d2"
                    style="
                      display: block;
                      height: auto;
                      border: 0;
                    "
                    title="facebook"
                    width="32"
                /></a>` +
                "<h6>" +
                "Visit Us At : www.sirglobal.org  " +
                "</h6>",
            };
            transport.sendMail(mailOptions, async function (err, info) {
              if (err) {
                return badRequestResponse(res, {
                  message: `Email not send error something is wrong ${err}`,
                });
              } else {
                return successResponse(res, {
                  message: "otp has been send to your email address..!!",
                });
              }
            });
          } else {
            return successResponse(res, {
              message: "otp already and in your mail plase check your email",
            });
          }
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  Withdrawotpcheck: async (req, res) => {
    try {
      const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          const StakingData = await Stakingmodal.find({
            userId: decoded.profile._id,
            leval: 0,
          });
          const withdrawalmodal1 = await withdrawalmodal.find({
            userId: decoded.profile._id,
          });
          let totalstaking = 0;
          let totalwithdrawalmodal = 0;
          console.log(withdrawalmodal1);
          for (let i = 0; i < StakingData.length; i++) {
            totalstaking += StakingData[i].Amount;
          }
          for (let i = 0; i < withdrawalmodal1.length; i++) {
            if (withdrawalmodal1[i].Remark === "Sir Wallate") {
              totalwithdrawalmodal += withdrawalmodal1[i].withdrawalAmount;
            }
          }
          console.log({ "Remark": req.body.Remark, "totalwithdrawalmodal": withdrawalmodal1 });
          console.log("StakingData", StakingData);
          if (StakingData.length > 0) {
            if (req.body.Remark === "Sir Income Wallate") {
              console.log(((totalstaking * 3) / 90) * SIRprice.price);
              console.log(totalwithdrawalmodal + req.body.Amount);
              let cout = totalwithdrawalmodal + req.body.Amount;
              console.log(((totalstaking * 3) / 90) * SIRprice.price - cout);
              if (((totalstaking * 3) / 90) * SIRprice.price - cout > 0) {
                if (req.body.Amount > 25) {
                  if (decoded.profile.iswalletActive) {
                    let data1 = await otp.find({
                      userId: decoded.profile._id,
                      otp: Number(req.body.otp),
                    });
                    if (data1.length !== 0) {
                      const WalletData = await findOneRecord(Walletmodal, {
                        userId: decoded.profile._id,
                      });
                      const to_address = req.body["walletaddress"];
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: decoded.profile._id,
                        },
                        {
                          incomeWallet:
                            WalletData.incomeWallet - req.body.Amount,
                        }
                      );
                      await withdrawalmodal({
                        userId: decoded.profile._id,
                        withdrawalAmount:
                          req.body.Amount,
                        Admincharges: 0,
                        Remark: req.body.Remark,
                        walletaddress: to_address,
                        balace: WalletData.incomeWallet,
                        transactionshsh: "",
                        Active: true,
                      }).save();
                      await Ewallateesc({
                        userId: decoded.profile._id,
                        Note: `withdrawal successfully`,
                        Amount: req.body.Amount,
                        type: 0,
                        balace: WalletData.incomeWallet,
                        Active: true,
                      }).save();
                      const mailOptions = {
                        from: "noreply@sirglobal.or", // Sender address
                        to: decoded.profile["email"], // List of recipients
                        subject: "verification by SIR", // Subject line
                        html:
                          "<h3>" +
                          "<b>" +
                          "GREETINGS FROM SIR Token" +
                          "</b>" +
                          "</h3>" +
                          "<h3>" +
                          "<b>" +
                          " (VICTORY FOR XTREME)" +
                          "</b>" +
                          "</h3>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "DEAR SIR Token USER" +
                          "</h4>" +
                          "<h4>" +
                          "YOU HAVE SUCCESSFULLY WITHDRAWN SIR Token TO FOLLOWING ADDRESS: (" +
                          to_address +
                          ")" +
                          "</h4>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "your SIR Token will send TO FOLLOWING ADDRESS:(" +
                          to_address +
                          ") within 24 hours" +
                          "</h4>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "TEAM SIR Token" +
                          "</h4>" +
                          "<h6>" +
                          "DISCLAMER: CRYPTOCURREENCY TRADING IS SUBJECT TO HIGH MARKET RISK. PLEASE BE AWARE OF PHISHING SITES AND ALWAYS MAKE SURE YOU ARE VISITING THE OFFICIAL SIR.ORG. PLEASE TRADE AND INVEST WITH CAUTION, WE WILL NOT BE RESPONSIBLE FOR YOUR ANY TYPE OF LOSSES.                    " +
                          "</h6>",
                      };
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      transport.sendMail(
                        mailOptions,
                        async function (err, info) {
                          if (err) {
                            console.log(err);
                          } else {
                            console.log("done");
                          }
                        }
                      );
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      return successResponse(res, {
                        message: "You have successfully withdrawan SIR Tokens",
                      });
                    } else {
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      return notFoundResponse(res, {
                        message: "Transaction failed",
                      });
                    }
                  } else {
                    return notFoundResponse(res, {
                      message: "plase enter valid otp.",
                    });
                  }
                } else {
                  return notFoundResponse(res, {
                    message: "minimum withdrawals limite 25 $",
                  });
                }
              } else {
                return notFoundResponse(res, {
                  message: "something went wrong please try again",
                });
              }
            } else {
              let totalwithdrawalmodal2 = 0
              for (let i = 0; i < withdrawalmodal1.length; i++) {
                if (withdrawalmodal1[i].Remark === "main wallate") {
                  totalwithdrawalmodal2 += withdrawalmodal1[i].withdrawalAmount;
                }
              }
              let cout = totalwithdrawalmodal2 + req.body.Amount;
              let data = ((totalstaking * 2) / 90) * SIRprice.price
              if (data - cout > 0) {
                if (req.body.Amount * 90 / SIRprice.price > 25) {
                  if (decoded.profile.iswalletActive) {
                    let data1 = await otp.find({
                      userId: decoded.profile._id,
                      otp: Number(req.body.otp),
                    });
                    if (data1.length !== 0) {
                      const WalletData = await findOneRecord(Walletmodal, {
                        userId: decoded.profile._id,
                      });
                      const to_address = req.body["walletaddress"];
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: decoded.profile._id,
                        },
                        {
                          mainWallet: WalletData.mainWallet - req.body.Amount,
                        }
                      );
                      await withdrawalmodal({
                        userId: decoded.profile._id,
                        withdrawalAmount: req.body.Amount,
                        Admincharges: 0,
                        Remark: req.body.Remark,
                        walletaddress: to_address,
                        balace: WalletData.mainWallet,
                        transactionshsh: "",
                        Active: true,
                      }).save();
                      await Mainwallatesc({
                        userId: decoded.profile._id,
                        Note: `withdrawal successfully`,
                        Amount: req.body.Amount,
                        type: 0,
                        balace: WalletData.mainWallet,
                        Active: true,
                      }).save();
                      const mailOptions = {
                        from: "noreply@sirglobal.or", // Sender address
                        to: decoded.profile["email"], // List of recipients
                        subject: "verification by SIR", // Subject line
                        html:
                          "<h3>" +
                          "<b>" +
                          "GREETINGS FROM SIR Token" +
                          "</b>" +
                          "</h3>" +
                          "<h3>" +
                          "<b>" +
                          " (VICTORY FOR XTREME)" +
                          "</b>" +
                          "</h3>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "DEAR SIR Token USER" +
                          "</h4>" +
                          "<h4>" +
                          "YOU HAVE SUCCESSFULLY WITHDRAWN SIR Token TO FOLLOWING ADDRESS: (" +
                          to_address +
                          ")" +
                          "</h4>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "your SIR Token will send TO FOLLOWING ADDRESS:(" +
                          to_address +
                          ") within 24 hours" +
                          "</h4>" +
                          "<br/>" +
                          "<br/>" +
                          "<h4>" +
                          "TEAM SIR Token" +
                          "</h4>" +
                          "<h6>" +
                          "DISCLAMER: CRYPTOCURREENCY TRADING IS SUBJECT TO HIGH MARKET RISK. PLEASE BE AWARE OF PHISHING SITES AND ALWAYS MAKE SURE YOU ARE VISITING THE OFFICIAL SIR.ORG. PLEASE TRADE AND INVEST WITH CAUTION, WE WILL NOT BE RESPONSIBLE FOR YOUR ANY TYPE OF LOSSES.                    " +
                          "</h6>",
                      };
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      transport.sendMail(
                        mailOptions,
                        async function (err, info) {
                          if (err) {
                            console.log(err);
                          } else {
                            console.log("done");
                          }
                        }
                      );
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      return successResponse(res, {
                        message: "You have successfully withdrawan SIR Tokens",
                      });
                    } else {
                      await otp.remove({
                        userId: decoded.profile._id,
                      });
                      return notFoundResponse(res, {
                        message: "Transaction failed",
                      });
                    }
                  } else {
                    return notFoundResponse(res, {
                      message: "plase enter valid otp.",
                    });
                  }
                } else {
                  return errorResponse(res, {
                    message: "minimum withdrawals limite 25 $",
                  });
                }
              } else {
                return notFoundResponse(res, {
                  message: "something went wrong please try again",
                });
              }
            }
          } else {
            return notFoundResponse(res, {
              message: "something went wrong please try again",
            });
          }
        } else {
          return notFoundResponse(res, {
            message: "withdrawal locked in fast 15 days.",
          });
        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  Withdrdatadatauser: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          console.log(decoded.profile._id);
          let data = await withdrawalmodal.aggregate([
            {
              $match: {
                userId: ObjectId(decoded.profile._id),
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "result",
              },
            },
            {
              $unwind: {
                path: "$result",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                email: "$result.email",
                username: "$result.username",
                withdrawalAmount: 1,
                walletaddress: 1,
                Admincharges: 1,
                transactionshsh: 1,
                Remark: 1,
                createdAt: 1,
              },
            },
          ]);
          return successResponse(res, {
            message: "otp verified successfully",
            data: data,
          });
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  Withdrdata: async (req, res) => {
    try {
      let data = await withdrawalmodal.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "result",
          },
        },
        {
          $unwind: {
            path: "$result",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            email: "$result.email",
            username: "$result.username",
            withdrawalAmount: 1,
            walletaddress: 1,
            Admincharges: 1,
            transactionshsh: 1,
            Remark: 1,
            createdAt: 1,
          },
        },
      ]);
      return successResponse(res, {
        message: "otp verified successfully",
        data: data,
      });
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  Withdrdata123: async (req, res) => {
    try {
      let data = await updateRecord(
        withdrawalmodal,
        {
          _id: req.body._id,
        },
        {
          transactionshsh: req.body.transactionshsh,
        }
      );
      return successResponse(res, {
        message: "otp verified successfully",
        data: data,
      });
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  MainWallet: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          let data = await findAllRecord(Mainwallatesc, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Mainwallatesc get successfully",
            data: data,
          });
        }
      } else {
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  V4xWallet: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          let data = await findAllRecord(Ewallateesc, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Mainwallatesc get successfully",
            data: data,
          });
        }
      } else {
        return errorResponse("error", res);
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
};
