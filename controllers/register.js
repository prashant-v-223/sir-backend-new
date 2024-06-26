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
const { default: axios } = require("axios");
const otp = require("../models/otp");
let transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "sirtoken21@gmail.com",
    pass: "qiebkwzdaaykswre",
  },
});
let transport2 = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "sirtoken21@gmail.com",
    pass: "qiebkwzdaaykswre",
  },
});

// let transport1 = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "sirtoken21@gmail.com",
//     pass: "qiebkwzdaaykswre",
//   },
// });

// async function getRef(refSelectedId, refId, id) {
//   const refSelected = await Usermodal.findOne({ refId: refSelectedId });
//   if (refSelected?.referred?.length < 5) {
//     const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
//       $set: {
//         supporterId: refSelected.refId
//       }
//     });
//     refSelected.referred.push(newRef.refId);
//     refSelected.save();
//   } else {
//     await getRef(refSelected.referred[refSelected.nextRefIndex], refId, id);

//     refSelected.nextRefIndex = refSelected.nextRefIndex + 1 > 4 ? 0 : refSelected.nextRefIndex + 1;
//     let isExistsInNextRefIdsToBeSkipped = false;
//     do {
//       const index = refSelected.nextRefIdsToBeSkipped.indexOf(refSelected.referred[refSelected.nextRefIndex]);
//       isExistsInNextRefIdsToBeSkipped = index !== -1;
//       if (isExistsInNextRefIdsToBeSkipped) {
//         refSelected.nextRefIdsToBeSkipped.splice(index, 1);
//         refSelected.nextRefIndex = refSelected.nextRefIndex + 1 > 4 ? 0 : refSelected.nextRefIndex + 1;
//       }
//     } while (isExistsInNextRefIdsToBeSkipped);
//     await refSelected.save();
//   }
// }

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
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${"6LfQRgkpAAAAAAB8WWCk8T-GK0olBixPzj4ayHzx"}&response=${req.body.ReCAPTCHA}`
      );
      if (response.data.success) {

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
          console.log(refExists);
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
          }).then(async (res1) => {
            console.log(res1._id);

            const otpdata = await findAllRecord(otp, {
              userId: res1._id,
            });
            console.log(otpdata.length === 0);
            if (otpdata.length === 0) {
              var digits = "0123456789";
              let OTP = "";
              for (let i = 0; i < 6; i++) {
                OTP += digits[Math.floor(Math.random() * 10)];
              }
              let data = {
                otp: OTP,
                userId: res1._id,
              };
              await otp(data).save();
              const mailOptions = {
                from: "otp@sirglobal.org", // Sender address
                to: res1["email"], // List of recipients
                subject: "verification by SIR", // Subject line
                html: `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sign Up Verification Code</title>
                </head>
                <body>
                    <p>Dear Name (${finalusename}),</p>
                
                    <p>Thank you for signing up with SIR Global Academy. Your one-time verification code for completing your sign-up process is:</p>
                
                    <h2>Verification Code: <span style="font-weight: normal;">${OTP}</span></h2>
                
                    <p>Please use this code to complete your registration process. Do not share this code with anyone.</p>
                
                    <p>Regards,</p>
                    <p>Support Team,</p>
                    <p>SIR Global Academy</p>
                    <a href="https://www.sirglobal.org">www.sirglobal.org</a>
                
                    <p>The information shared in this mail may be confidential and/or privileged. If you are not the intended recipient, you are hereby notified that you have received this message in error; any review, dissemination, distribution, sharing, or copying of this transmittal is strictly prohibited. If you have received this transmittal and/or attachment(s) in error, please notify the sender immediately by email and immediately delete this message and all of its attachments, without retaining any copies. Thank you.</p>
                </body>
                </html>
                `
              };
              transport.sendMail(mailOptions, async function (err, info) {
              });
              return successResponse(res, {
                message:
                  "Verification code has been sent successfully on your email!",
                data: res1,
              });
            } else {
              return successResponse(res, {
                message: "otp already and in your mail plase check your email",
              });
            }

            // const profile = await Usermodal.findById(res._id).select({
            //   password: 0,
            // });
            // const accessToken = jwt.sign(
            //   { profile },
            //   "3700 0000 0000 002",
            //   {
            //     expiresIn: "1hr",
            //   }
            // );
            // ejs.renderFile(
            //   __dirname + "/mail.ejs",
            //   {
            //     name: "noreply@sirglobal.or",
            //     username: finalusename,
            //     action_url: `http://api.sirglobal.org/api/registration/signUp/varify:${accessToken}`,
            //   },
            //   async function (err, data) {
            //     const mailOptions = {
            //       from: "infinityai549@gmail.com", // Sender address
            //       to: req.body.email, // List of recipients
            //       subject: "verification by SIR", // Subject line
            //       html: data,
            //     };
            //     console.log(data);
            //     transport.sendMail(mailOptions, async function (err, info) {
            //       if (err) {
            //         console.log(err);
            //         // return badRequestResponse(res, {
            //         //   message: `Email not send error something is wrong ${err}`,
            //         // });
            //       } else {
            //         console.log("done");
            //       }
            //     });
            //   }
            // );
          })
        }
      } else {
        return notFoundResponse(res, {
          message:
            "invalid recaptcha",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  }, signUp2: async (req, res) => {
    try {
      console.log(req.body.username);
      // const response = await axios.post(
      //   `https://www.google.com/recaptcha/api/siteverify?secret=${"6LfQRgkpAAAAAAB8WWCk8T-GK0olBixPzj4ayHzx"}&response=${req.body.ReCAPTCHA}`
      // );
      // if (response.data.success) {
      await Usermodal.findOne({ username: req.body.username }).
        then(async (res1) => {
          console.log("res1", res1);
          const otpdata = await findAllRecord(otp, {
            userId: res1._id,
          });
          var digits = "0123456789";
          let OTP = "";
          for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
          }
          let data = {
            otp: OTP,
            userId: res1._id,
          };
          await otp(data).save();
          const mailOptions = {
            from: "otp@sirglobal.org", // Sender address
            to: res1["email"], // List of recipients
            subject: "verification by SIR", // Subject line
            html:
              `<img src="https://firebasestorage.googleapis.com/v0/b/doubtq-student.appspot.com/o/icon2.png?alt=media&token=7e933aff-37ab-46ae-a0c1-8180c2eaf931&_gl=1*10gdqfi*_ga*OTgwMjYzMTIyLjE2ODM5NTgxMTM.*_ga_CW55HF8NVT*MTY5NzE3NjcxMi4xMC4xLjE2OTcxNzY3NTguMTQuMC4w" height="100" class="img-fluid" width="100">` +
              "<h2>" +
              "SIR GLOBAL TO ACADEMY" +
              "</h2>" +
              "<h2>" +
              "Hello" + "(" + res1.username + ")" +
              "</h2>" +
              "<h4>" +
              "Thank you for choosing SIR GLOBAL Aeadery. the this OTP to complete your signup procedures and verify your account" +
              "</h4>" +
              "<br/>" +
              `<h2  style="
                    letter-spacing: 4px">` +
              OTP +
              "</h2>" +
              "<h6>" +
              "If you didn't request this, you can ignore this email or let us know to support esirglades" +
              "</h6>" +
              "<br/>" +
              "<h6>" +
              "thank you" +
              "</h6>" +
              "<h6>" +
              "support@SIR.org" +
              "</h6>" +
              `<h6  style="display: flex">` +
              ` <a style="
                    padding: 3px"
                  href="https://twitter.com/"
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
                  href="https://www.facebook.com/"
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
              "</h6>" +
              "<h6>" +
              "Visit Us At : www.sirglobal.org  " +
              "</h6>",
          };
          transport.sendMail(mailOptions, async function (err, info) {
            if (err) {
              return badRequestResponse(res, {
                message: `Email not send error something is wrong ${error}`,
              });
            } else {
              return successResponse(res, {
                message:
                  "varification link has been send to your email address..!!",
              });
            }
          });


        })
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  mailVarify: async (req, res) => {
    try {
      const data12 = await Usermodal.find({ username: req.body.username })
      console.log(data12);
      let data1 = await otp.find({
        userId: data12[0]._id,
        otp: Number(req.body.otp),
      });
      if (data1.length !== 0) {
        await updateRecord(
          Usermodal,
          { username: req.body.username },
          {
            isValid: true,
          }
        );
        const Wallet = await findOneRecord(Walletmodal, {
          userId: data12[0]._id,
        });
        if (!Wallet) {
          await Walletmodal({ userId: data12[0]._id }).save();
        }
        ejs.renderFile(
          __dirname + "/welcome.ejs",
          {
            name: "noreply@sirglobal.or",
            username: req.body.username,
            mainId: data12[0].mainId,
          },
          async function (err, data) {
            const DOMAIN = "donotreply.v4x.org";
            const mailOptions = {
              from: "support@sirglobal.org", // Sender address
              to: data12[0].email, // List of recipients
              subject: "verification by SIR", // Subject line

              html: `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Welcome to SIR Global Academy</title>
              </head>
              <body>
                  <p>Dear ${data12[0]['Fullname']}</p>
              
                  <p>Welcome to SIR Global Academy and thank you for signing up with us. All information you shared with us is safe and we will keep it strictly confidential.</p>
              
                  <p>Please find your login details below:</p>
              
                  <ul>
                      <li>Your Username: ${data12[0]['username']}</li>
                  </ul>
              
                  <p>You can login using your User Name. You can change your password anytime from your account.</p>
              
                  <p>We would like to share our exciting offers, special news, and tasks with you. This is an endless journey we are going to start from now.</p>
              
                  <p>Regards,</p>
                  <p>Support Team,</p>
                  <p>SIR Global Academy</p>
                  <a href="https://www.sirglobal.org">www.sirglobal.org</a>
              
                  <p>The information shared in this mail may be confidential and/or privileged. If you are not the intended recipient, you are hereby notified that you have received this message in error; any review, dissemination, distribution, sharing, or copying of this transmittal is strictly prohibited. If you have received this transmittal and/or attachment(s) in error, please notify the sender immediately by email and immediately delete this message and all of its attachments, without retaining any copies. Thank you.</p>
              </body>
              </html>
              `,
            };
            transport2.sendMail(mailOptions, async function (err, info) {
              if (err) {
                return badRequestResponse(res, {
                  message: `Email not send error something is wrong ${error}`,
                });
              } else {
                await otp.remove({
                  userId: data12[0]._id,
                });
                return successResponse(res, {
                  message: `Acoount have been verify successfully`,
                });
              }

            });
          }
        );
      } else {
        return badRequestResponse(res, { message: "otp is incorrect!" });
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
        // const response = await axios.post(
        //   `https://www.google.com/recaptcha/api/siteverify?secret=${"6LfQRgkpAAAAAAB8WWCk8T-GK0olBixPzj4ayHzx"}&response=${req.body.ReCAPTCHA}`
        // );
        // if (response.data.success) {
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
        //   } else {
        //     return notFoundResponse(res, {
        //       message:
        //         "invalid recaptcha",
        //     });
        //   }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { username: req.body.email });
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
              from: "support@sirglobal.org", // Sender address
              to: decoded.email, // List of recipients
              subject: "verification by SIR", // Subject line
              html: `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Password Reset Request</title>
              </head>
              <body>
                  <p>Dear Name (${decoded.username}),</p>
              
                  <p>We received a request to reset your SIR Global Academy password. No changes have been made to your account yet.</p>
              
                  <p>You can reset your password by clicking the link below:</p>
              
                  
                  <p><a href="https://sirglobal.org/reset-password/${accessToken.token}">Click Here</a></p>
              
                  <p>If you didn't forget your password, you can safely ignore this email.</p>
              
                  <p>Regards,</p>
                  <p>Support Team,</p>
                  <p>SIR Global Academy</p>
                  <a href="https://www.sirglobal.org">www.sirglobal.org</a>
              
                  <p>The information shared in this mail may be confidential and/or privileged. If you are not the intended recipient, you are hereby notified that you have received this message in error; any review, dissemination, distribution, sharing, or copying of this transmittal is strictly prohibited. If you have received this transmittal and/or attachment(s) in error, please notify the sender immediately by email and immediately delete this message and all of its attachments, without retaining any copies. Thank you.</p>
              </body>
              </html>
              `,
            };
            transport2.sendMail(mailOptions, async function (err, info) {
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
              walletaddress: decoded.profile.walletaddress ? req.body.walletaddress : req.body.walletaddress,
              ...req.body
              // Other fields you want to update
            }
          );
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
