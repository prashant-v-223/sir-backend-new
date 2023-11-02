var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
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
const cron = require("node-cron");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  validarionerrorResponse,
} = require("../middleware/response");
const Usermodal = require("../models/user");
const Walletmodal = require("../models/Wallet");
const Token = require("../models/Token");
const {
  token,
  tokenverify,
  Forgetpasswordtoken,
} = require("../middleware/token");
const Ticket = require("../models/Ticket");

const { ticketsend } = require("../services/sendOTP");
const e = require("express");
let transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@sirglobal.org",
    pass: "Sunny@123",
  },
});

async function getRef(refSelectedId, refId, id) {
  const refSelected = await Usermodal.findOne({ refId: refSelectedId });
  if (refSelected?.referred?.length < 5) {
    const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
      $set: {
        supporterId: refSelected.refId
      }
    });
    refSelected.referred.push(newRef.refId);
    refSelected.save();
  } else {
    await getRef(refSelected.referred[refSelected.nextRefIndex], refId, id);

    refSelected.nextRefIndex = refSelected.nextRefIndex + 1 > 4 ? 0 : refSelected.nextRefIndex + 1;
    let isExistsInNextRefIdsToBeSkipped = false;
    do {
      const index = refSelected.nextRefIdsToBeSkipped.indexOf(refSelected.referred[refSelected.nextRefIndex]);
      isExistsInNextRefIdsToBeSkipped = index !== -1;
      if (isExistsInNextRefIdsToBeSkipped) {
        refSelected.nextRefIdsToBeSkipped.splice(index, 1);
        refSelected.nextRefIndex = refSelected.nextRefIndex + 1 > 4 ? 0 : refSelected.nextRefIndex + 1;
      }
    } while (isExistsInNextRefIdsToBeSkipped);
    await refSelected.save();
  }
}

// const cronHandler = async () => {
//   const usersPendingRef = await Usermodal.find({
//     start: { $gt: 0 },
//     supporterId: null,
//   });

//   for (let i = 0; i < usersPendingRef.length; i++) {
//     const user = usersPendingRef[i];
//     const refExists = await Usermodal.findOne({ refId: user.mainId });
//     if (!refExists) return;
//     const id = user.refId;
//     const refId = user.mainId;

//     if (refExists.mainId === null) {
//       if (refExists.referred.length < 5) {
//         const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
//           $set: {
//             supporterId: refExists.supporterId || refExists.refId,
//           }
//         });
//         refExists.referred.push(newRef.refId);
//         await refExists.save();
//         // console.log("refIdExistsInReferred2", refIdExistsInReferred);
//         //   res.send(`added`);
//       } else {
//         await getRef(refExists.referred[refExists.nextRefIndex], refId, id);

//         refExists.nextRefIndex = refExists.nextRefIndex + 1 > 4 ? 0 : refExists.nextRefIndex + 1;

//         let isExistsInNextRefIdsToBeSkipped = false;
//         do {
//           const index = refExists.nextRefIdsToBeSkipped.indexOf(refExists.referred[refExists.nextRefIndex]);
//           isExistsInNextRefIdsToBeSkipped = index !== -1;
//           if (isExistsInNextRefIdsToBeSkipped) {
//             refExists.nextRefIdsToBeSkipped.splice(index, 1);
//             refExists.nextRefIndex = refExists.nextRefIndex + 1 > 4 ? 0 : refExists.nextRefIndex + 1;
//           }
//         } while (isExistsInNextRefIdsToBeSkipped);
//         await refExists.save();
//       }
//     } else {
//       await getRef(refId, refId, id);
//       const refIdExistsInReferred = await Usermodal.findOne({ referred: { $elemMatch: { $eq: refId } } });
//       if (refIdExistsInReferred) {
//         refIdExistsInReferred.nextRefIdsToBeSkipped.push(refId);
//         await refIdExistsInReferred.save();
//       }
//     }

//   }


// }

// cron.schedule("*/10 * * * *", () => {
//   cronHandler();
// });

exports.register = {
  signUp: async (req, res) => {
    try {
      let uniqueRefid = await Date.now().toString(16).slice(2);
      req.body.refferalId = uniqueRefid;
      req.body = decodeUris(req.body);
      var digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < 5; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      let usernumber = OTP;
      let finalusename = "SIR" + usernumber;



      const refId = req.body.refferalBy;
      const id = finalusename;
      if (!id) return res.send('Invalid id');
      const idAlreadyExists = await Usermodal.findOne({ refId: id });
      if (idAlreadyExists) return res.send('Invalid id, already exists');

      const isFirstRef = await Usermodal.countDocuments();
      if (!isFirstRef) {
        const newRef = await Usermodal.create({
          ...req.body,
          refId: id,
          mainId: null,
          supporterId: null,
          referred: [],
        });
      } else {
        if (!refId) return res.send('Invalid refId');
        const refExists = await Usermodal.findOne({ refId });
        console.log(refExists._id);
        const StakingData = await findAllRecord(Stakingmodal, {
          userId: refExists._id,
        });
        if (!StakingData.length > 0) return res.send('Invalid referral link');
        if (!refExists) return successResponse(res, {
          message:
            "Invalid referral link!",
        });
        await Usermodal.create({
          ...req.body,
          username: id,
          refId: id,
          mainId: refId,
          supporterId: null,
          referred: [],
        }).then(async (res) => {
          console.log(res._id);
          const profile = await Usermodal.findById(res._id).select({
            password: 0,
          });
          const accessToken = jwt.sign(
            { profile },
            "3700 0000 0000 002",
            {
              expiresIn: "1hr",
            }
          );
          ejs.renderFile(
            __dirname + "/mail.ejs",
            {
              name: "noreply@sirglobal.or",
              username: finalusename,
              action_url: `http://api.sirglobal.org/api/registration/signUp/varify:${accessToken}`,
            },
            async function (err, data) {
              const mailOptions = {
                from: "infinityai549@gmail.com", // Sender address
                to: req.body.email, // List of recipients
                subject: "verification by SIR", // Subject line
                html: data,
              };
              console.log(data);
              transport.sendMail(mailOptions, async function (err, info) {
                if (err) {
                  console.log(err);
                  // return badRequestResponse(res, {
                  //   message: `Email not send error something is wrong ${err}`,
                  // });
                } else {
                  console.log("done");
                }
              });
            }
          );
        })
        return successResponse(res, {
          message:
            "Verification link has been sent successfully on your email!",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  mailVarify: async (req, res) => {
    try {
      const { Token } = req.params;
      if (Token) {
        let { err, decoded } = await tokenverify(Token.split(":")[1]);
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          console.log(decoded.profile.username);
          await updateRecord(
            Usermodal,
            { username: decoded.profile.username },
            {
              isValid: true,
            }
          );
          ejs.renderFile(
            __dirname + "/welcome.ejs",
            {
              name: "noreply@sirglobal.or",
              username: decoded.profile.username,
              mainId: decoded.profile.mainId,
            },
            async function (err, data) {
              const DOMAIN = "donotreply.v4x.org";
              const mailOptions = {
                from: "noreply@sirglobal.or", // Sender address
                to: decoded.profile.email, // List of recipients
                subject: "verification by SIR", // Subject line
                html: data,
              };
              transport.sendMail(mailOptions, async function (err, info) {
                if (err) {
                  return badRequestResponse(res, {
                    message: `Email not send error something is wrong ${error}`,
                  });
                } else {
                  res.redirect("https://sir-amber.vercel.app/login?login");
                }
              });
            }
          );
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
  profile: async (req, res) => {
    try {
      const { Token } = req.params;
      if (Token) {
        let { err, decoded } = await tokenverify(Token.split(":")[1]);
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const user = await findOneRecord(Usermodal, { _id: decoded.profile._id });

          const accessToken = await token(Usermodal, user);
          return successResponse(res, {
            message: "Login successfully",
            token: accessToken.token,
            profile: user,
          });

        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  signIn: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { username: req.body.email });
      if (!user) {
        return notFoundResponse(res, { message: "User Not Found!" });
      } else {
        const match = await bcrypt.compare(req.body.password, user.password);
        if (
          !match &&
          user.password.toString() !== req.body.password.toString()
        ) {
          return badRequestResponse(res, { message: "Password is incorrect!" });
        } else {
          if (!user.isActive) {
            return badRequestResponse(res, {
              message: "Account is disabled. please contact support!",
            });
          } else {
            if (!user.isValid) {
              return badRequestResponse(res, {
                message: "please verify your account",
              });
            } else {
              console.log(user);
              const accessToken = await token(Usermodal, user);

              const Wallet = await findOneRecord(Walletmodal, {
                userId: user._id,
              });
              if (!Wallet) {
                await Walletmodal({ userId: user._id }).save();
              }
              return successResponse(res, {
                message: "Login successfully",
                token: accessToken.token,
                profile: user,
              });
            }
          }
        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { email: req.body.username });
      if (!user) {
        return notFoundResponse(res, { message: "User Not Found!" });
      } else {
        decoded = await cloneDeep(user);
        const accessToken = await Forgetpasswordtoken(Usermodal, decoded);
        let token = await Token.findOne({ userId: decoded._id });
        if (!token) {
          token = await new Token({
            userId: decoded._id,
            token: accessToken.token,
          }).save();
        } else {
          await updateRecord(
            Token,
            {
              userId: decoded._id,
            },
            {
              token: accessToken.token,
            }
          );
        }
        ejs.renderFile(
          __dirname + "/Forgetpassword.ejs",
          {
            from: "noreply@sirglobal.or",
            action_url: accessToken.token,
            username: decoded.username,
          },
          async function (err, data) {
            const mailOptions = {
              from: "noreply@sirglobal.or", // Sender address
              to: req.body.email, // List of recipients
              subject: "verification by SIR", // Subject line
              html: data,
            };
            transport.sendMail(mailOptions, async function (err, info) {
              if (err) {
                badRequestResponse(res, {
                  message: `Email not send error something is wrong ${err}`,
                });
              } else {
                successResponse(res, {
                  message:
                    "Verification link has been send to your email address..!!",
                });
              }
            });
            // transport.sendMail(mailOptions, async function (err, info) {
            //   if (err) {
            //     return badRequestResponse(res, {
            //       message: `Email not send error something is wrong ${error}`,
            //     });
            //   } else {
            //     return successResponse(res, {
            //       message:
            //         "varification link has been send to your email address..!!",
            //     });
            //   }
            // });
          }
        );
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  profileupdate: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          return notFoundResponse(res, {
            message: err,
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          await hardDeleteRecord(Token, {
            userId: decoded.profile._id,
          });
          updateRecord(
            Usermodal,
            { _id: decoded.profile._id },
            {
              ...req.body
              // Nominee: req.body.Nominee,
              // address: req.body.address,
              // profileimg: req.body.profileimg
            })
          return successResponse(res, {
            message: "profile update successfully",
          });

        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  changePassword: async (req, res) => {
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
          let token = await Token.findOne({ userId: decoded.profile._id });
          if (!token) {
            return badRequestResponse(res, {
              message: "token is expires.",
            });
          }
          const { password } = req.body;
          decoded = await cloneDeep(decoded);
          await hardDeleteRecord(Token, {
            userId: decoded.profile._id,
          });
          await bcrypt.hash(password, 8).then((pass) => {
            updateRecord(
              Usermodal,
              { _id: decoded.profile._id },
              {
                password: pass,
              }
            );
            hardDeleteRecord(Token, { _id: decoded.profile._id });
            return successResponse(res, {
              message: "password change successfully",
            });
          });
        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  addTicket: async (req, res) => {
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
          const data = {
            userId: decoded.profile._id,
            description: req.body.description,
            img: req.body.img,
          };
          await Ticket(data)
            .save()
            .then(async (r) => {
              console.log(r._id.toString());
              await ticketsend(
                decoded.profile.email,
                decoded.profile.username,
                decoded.profile._id.toString()
              );
              return successResponse(res, {
                message: "Support Ticket generate successfully",
              });
            });
        }
      }
    } catch (error) {
      return badRequestResponse(res, {
        message: "something went wrong",
      });
    }
  },
};
