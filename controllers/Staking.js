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
const V4XpriceSchemaDetails = require("../models/TokenDetails");
const Royaltymodal = require("../models/Royalty");
const withdrawalmodal = require("../models/withdrawalhistory");
const { tokenverify } = require("../middleware/token");
const Stakingmodal = require("../models/Staking");
const Walletmodal = require("../models/Wallet");
const Usermodal = require("../models/user");
const Stakingbonus = require("../models/Stakingbonus");
const Transactionmodal = require("../models/Transaction");
const Communitymodal = require("../models/Community");
const Achivementmodal = require("../models/Achivement");
const Passivemodal = require("../models/Passive");
const V4Xpricemodal = require("../models/V4XLiveRate");
const Mainwallatesc = require("../models/Mainwallate");
const Ewallateesc = require("../models/Ewallate");
const env = require("../env");
const HoldCBB = require("../models/HoldCBB");
const Web3 = require("web3");
const otp = require("../models/otp");
const moment = require("moment/moment");
const Wallet = require("../models/Wallet");
const maxTimeDifference = 0.75 * 60 * 1000;
const infraUrl = env.globalAccess.rpcUrl;
const web3 = new Web3(infraUrl);

async function getRef(refSelectedId, refId, id) {
  const refSelected = await Usermodal.findOne({ refId: refSelectedId });
  const refSelected12 = await Usermodal.find({ supporterId: refSelected.username });
  if (refSelected12?.length < 5) {
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
const cronHandler = async (user) => {
  const usersPendingRef = await Usermodal.find({
    username: user,
    supporterId: null,
  });
  console.log("usersPendingRef", usersPendingRef);
  for (let i = 0; i < usersPendingRef.length; i++) {
    const user = usersPendingRef[i];
    const refExists = await Usermodal.findOne({ refId: user.mainId });
    if (!refExists) return;
    const id = user.refId;
    const refId = user.mainId;
    console.log(refExists);
    // if (refExists.mainId === null) {
    if (refExists.referred.length < 5) {
      const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
        $set: {
          supporterId: refExists.refId || refExists.supporterId,
        }
      });
      refExists.referred.push(newRef.refId);
      await refExists.save();
      // console.log("refIdExistsInReferred2", refIdExistsInReferred);
      //   res.send(`added`);
    } else {
      await getRef(refExists.referred[refExists.nextRefIndex], refId, id);

      refExists.nextRefIndex = refExists.nextRefIndex + 1 > 4 ? 0 : refExists.nextRefIndex + 1;

      let isExistsInNextRefIdsToBeSkipped = false;
      do {
        const index = refExists.nextRefIdsToBeSkipped.indexOf(refExists.referred[refExists.nextRefIndex]);
        isExistsInNextRefIdsToBeSkipped = index !== -1;
        if (isExistsInNextRefIdsToBeSkipped) {
          refExists.nextRefIdsToBeSkipped.splice(index, 1);
          refExists.nextRefIndex = refExists.nextRefIndex + 1 > 4 ? 0 : refExists.nextRefIndex + 1;
        }
      } while (isExistsInNextRefIdsToBeSkipped);
      await refExists.save();
    }
    console.log(refId, refId, id);
    // } else {
    //   await getRef(refId, refId, id);
    //   const refIdExistsInReferred = await Usermodal.findOne({ referred: { $elemMatch: { $eq: refId } } });
    //   if (refIdExistsInReferred) {
    //     refIdExistsInReferred.nextRefIdsToBeSkipped.push(refId);
    //     await refIdExistsInReferred.save();
    //   }
    // }

  }
}
const nowIST = new Date("2023-11-01T16:19:08.981+00:00");
nowIST.setUTCHours(nowIST.getUTCHours() + 5, nowIST.getUTCMinutes() + 30, 0, 0); // Convert to IST
const todayIST = new Date(nowIST);
const nextDayIST = new Date(todayIST);
nextDayIST.setDate(nextDayIST.getDate() + 1); // Add one day to get the next day
nextDayIST.setHours(0, 0, 0, 0); // Set the time to 00:00:00.000 for the next daymoment.tz.setDefault('Asia/Kolkata');

// Get the current date
const currentDate = moment();

// // Set the start time to 7:00 PM today
// const startOfDay = currentDate.clone().set({ hour: 19, minute: 0, second: 0, millisecond: 0 }).toDate();

// // Set the end time to 7:00 PM tomorrow
// const endOfDay  = currentDate.clone().add(1, 'day').set({ hour: 19, minute: 0, second: 0, millisecond: 0 }).toDate();
// console.log(startOfDay);
// console.log(endOfDay  );
let todayday = new Date().getDate()
const startOfDay = currentDate.clone().date(todayday - 1).set({ hour: 0, minute: 35, second: 0, millisecond: 0 }).toDate();
const endOfDay = currentDate.clone().date(todayday).set({ hour: 24, minute: 30, second: 0, millisecond: 0 }).toDate();

console.log('Start Time (15th):', new Date().getDate());
console.log('Start Time (15th):', startOfDay);
console.log('End Time (16th):', endOfDay);
const amountupdate = async (username) => {
  const Userdata = await findAllRecord(Usermodal, { username: username });
  for (const user of Userdata) {
    const SIRprice = await V4XpriceSchemaDetails.find({}).sort({ createdAt: -1 })
    const { _id: userId, username } = user;
    await Usermodal.aggregate([
      {
        $match: {
          username
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
        $lookup: {
          from: "stakings",
          localField: "refers_to._id",
          foreignField: "userId",
          as: "amount2",
          pipeline: [
            {
              $match: {
                Active: true,
                WalletType: { $in: ["main-Wallet", "DAPP-WALLET", "Main Wallet", "DAPP WALLET"] },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "stakings",
          localField: "_id",
          foreignField: "userId",
          as: "amount",
          pipeline: [
            {
              $match: {
                Active: true,
                WalletType: { $in: ["main-Wallet", "DAPP-WALLET", "Main Wallet", "DAPP WALLET"] },
              },
            },
          ],
        },
      },
      {
        $project: {
          total: {
            $reduce: {
              input: "$amount",
              initialValue: 0,
              in: {
                $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: [SIRprice[0].price, 90] }] }],
              },
            },
          },
          total1: {
            $reduce: {
              input: "$amount2",
              initialValue: 0,
              in: {
                $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: [SIRprice[0].price, 90] }] }],

              },
            },
          },
          email: 1,
          username: 1,
          level: 1,
          amount: 1
        },
      },
    ]).then(async (aggregatedUserData) => {
      console.log(username);
      // console.log(Math.round(aggregatedUserData[0].total + aggregatedUserData[0].total1 * 12.85 / 90));
      console.log(Math.round(aggregatedUserData[0].total));
      console.log(Math.round(aggregatedUserData[0].total1));
      // console.log(Math.round(aggregatedUserData[0].total + aggregatedUserData[0].total1 / 90 * SIRprice[0].price));
      console.log(SIRprice[0].price);
      if (aggregatedUserData.length > 0) {
        let data1 = await Usermodal.find({
          username: aggregatedUserData[0].username,
        });
        await Stakingmodal.updateMany(
          { userId: data1[0]._id, leval: data1[0].leval },
          {
            Active: true,
          }
        );
        await Usermodal.findOneAndUpdate(
          { _id: ObjectId(userId) },
          {
            teamtotalstack: Math.round(aggregatedUserData[0].total + aggregatedUserData[0].total1),
            mystack: Math.round(aggregatedUserData[0].total),
          }
        );
      } else {
        await Usermodal.findOneAndUpdate(
          { _id: ObjectId(userId) },
          {
            mystack: 0,
          }
        );
      }
    });
  }
}
console.log({ todayIST, nextDayIST });
exports.stack = {
  Buystack: async (req, res) => {
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
          decoded = await cloneDeep(decoded);
          const WalletData = await findOneRecord(Walletmodal, {
            userId: decoded.profile._id,
          })
          if (req.body.WalletType !== "dappwalletstacking") {
            let data1 = await otp.find({
              userId: decoded.profile._id,
              otp: Number(req.body.otp),
            });
            console.log(data1);
            if (data1.length !== 0) {
              await otp.remove({
                userId: decoded.profile._id,
              });
              if (
                WalletData.mainWallet >=
                req.body.Amount
              ) {
                console.log(decoded.profile.username);
                await cronHandler(decoded.profile.username).then(async (res) => {
                  const data = await findOneRecord(Usermodal, {
                    username: decoded.profile.username,
                  });
                  console.log("==================<<<", res);
                  const ReffData = await findOneRecord(Usermodal, {
                    username: data.supporterId,
                  });
                  const ReffData1 = await findOneRecord(Usermodal, {
                    username: data.mainId,
                  });
                  if (ReffData?._id !== null) {

                    const StakingData = await findAllRecord(Stakingmodal, {
                      userId: ReffData1._id,
                    });
                    if (StakingData.length > 0) {

                      const StakingData = await Stakingmodal.find({
                        userId: ReffData1._id,
                        leval: 0,
                      });
                      const withdrawalmodal1 = await Wallet.find({
                        userId: ReffData1._id,
                      });
                      let totalstaking = 0;
                      for (let i = 0; i < StakingData.length; i++) {
                        totalstaking += StakingData[i].Amount;
                      }
                      const data123 = await Stakingbonus.find({ Note: `You Got Refer and Earn Income From ${decoded.profile.username}` })
                      if (data123.length <= 0) {
                        await updateRecord(
                          Walletmodal,
                          {
                            userId: ReffData1._id,
                          },
                          {
                            $inc: {
                              incomeWallet:
                                (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                            },
                          }
                        )
                          .then(async (res) => {
                            await Ewallateesc({
                              userId: ReffData1?._id,
                              Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                              type: 1,
                              balace: res.incomeWallet,
                              Active: true,
                            }).save();
                            await Stakingbonus({
                              userId: ReffData1?._id,
                              ReffId: decoded.profile._id,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                              Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                              Active: true,
                            }).save();
                          });
                      }
                    }
                    const daat = await Usermodal.aggregate([
                      {
                        '$match': {
                          'mainId': ReffData.username
                        }
                      }, {
                        '$lookup': {
                          'from': 'stakings',
                          'localField': '_id',
                          'foreignField': 'userId',
                          'as': 'result'
                        }
                      }, {
                        '$match': {
                          '$expr': {
                            '$gt': [
                              {
                                '$size': '$result'
                              }, 0
                            ]
                          }
                        }
                      }
                    ])

                    await updateRecord(
                      Usermodal,
                      { username: ReffData.username },
                      {
                        leval: Number(daat.length === 0 ? 1 : daat.length + 1),
                      }
                    ).then(async (data) => {
                      const Refflevalncome = await findOneRecord(Usermodal, {
                        username: decoded.profile.username,
                        isValid: true,
                      });

                      console.log("==========================================================>", Refflevalncome);
                      // if (!Refflevalncome) {
                      //   return;
                      // }
                      const Refflevalncomex1 = await findOneRecord(Usermodal, {
                        username: Refflevalncome.mainId,
                        isValid: true,
                      });
                      // if (!Refflevalncomex1) {
                      //   return;
                      // }
                      console.log("Refflevalncome1==================================>>>>>>>>>>>>>", Refflevalncomex1);
                      if (Refflevalncomex1.leval >= 1) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex1._id,
                        });

                        if (StakingData.length > 0) {
                          const StakingData1 = await Stakingmodal.find({
                            userId: Refflevalncomex1._id,
                            leval: 0,
                          });
                          const withdrawalmodal1 = await Wallet.find({
                            userId: ReffData1._id,
                          });
                          let totalstaking = 0;
                          for (let i = 0; i < StakingData1.length; i++) {
                            totalstaking += StakingData1[i].Amount;
                          }

                          let data1 = {
                            userId: Refflevalncomex1._id,
                            Note: `You Got Level ${1} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                          };
                          const a1 = await Walletmodal.findOne({ userId: Refflevalncomex1._id })
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex1._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 3) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex1._id,
                              Note: `You Got Level ${1} Income`,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                              Usernameby: decoded.profile.username,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data1).save();
                        }
                        else {
                          await HoldCBB({
                            userId: Refflevalncomex1._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                            leval: 1,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex2 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex1.mainId,
                      });
                      if (!Refflevalncomex2) {
                        return;
                      }
                      if (Refflevalncomex2.leval >= 2) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex2._id,
                        });
                        if (StakingData.length > 0) {
                          let data2 = {
                            userId: Refflevalncomex2._id,
                            Note: `You Got Level ${2} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex2._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 2) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex2._id,
                              Note: `You Got Level ${2} Income`,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                              Usernameby: decoded.profile.username,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });

                          await Communitymodal(data2).save();
                          console.log("===============>22", {
                            Refflevalncomex2,
                            data2,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex2._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                            leval: 2,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex3 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex2.mainId,
                      });
                      if (!Refflevalncomex3) {
                        return;
                      }
                      if (Refflevalncomex3.leval >= 3) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex3._id,
                        });
                        if (StakingData.length > 0) {
                          let data3 = {
                            userId: Refflevalncomex3._id,
                            Note: `You Got Level ${3} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex3._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 2) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex3._id,
                              Note: `You Got Level ${3} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data3).save();

                          console.log("===============>33", {
                            Refflevalncomex3,
                            data3,
                          });
                        }
                        else {
                          await HoldCBB({
                            userId: Refflevalncomex3._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                            leval: 3,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex4 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex3.mainId,
                      });
                      if (!Refflevalncomex4) {
                        return;
                      }
                      if (Refflevalncomex4.leval >= 4) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex4._id,
                        });
                        if (StakingData.length > 0) {
                          let data4 = {
                            userId: Refflevalncomex4._id,
                            Note: `You Got Level ${4} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex4._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex4._id,
                              Note: `You Got Level ${4} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data4).save();

                          console.log("===============>44", {
                            Refflevalncomex4,
                            data4,
                          });

                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex4._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                            leval: 4,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex5 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex4.mainId,
                      });
                      if (!Refflevalncomex5) {
                        return;
                      }
                      if (Refflevalncomex5.leval >= 5) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex5._id,
                        });
                        if (StakingData.length > 0) {
                          let data5 = {
                            userId: Refflevalncomex5._id,
                            Note: `You Got Level ${5} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncome5?._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncome5?._id,
                              Note: `You Got Level ${5} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data5).save();

                          console.log("===============>55", {
                            Refflevalncomex5,
                            data5,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex5._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 5,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex6 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex5.mainId,
                      });
                      if (!Refflevalncomex6) {
                        return;
                      }
                      if (Refflevalncomex6.leval >= 6) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex6._id,
                        });

                        if (StakingData.length > 0) {
                          let data6 = {
                            userId: Refflevalncomex6._id,
                            Note: `You Got Level ${6} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex6._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex6._id,
                              Note: `You Got Level ${6} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data6).save();

                          console.log("===============>66", {
                            Refflevalncomex6,
                            data6,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex6._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 6,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex7 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex6.mainId,
                      });
                      if (!Refflevalncomex7) {
                        return;
                      }
                      if (Refflevalncomex7.leval >= 7) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex7._id,
                        });
                        if (StakingData.length > 0) {

                          let data7 = {
                            userId: Refflevalncomex7._id,
                            Note: `You Got Level ${7} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex7._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex7._id,
                              Note: `You Got Level ${7} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data7).save();

                          console.log("===============>77", {
                            Refflevalncomex7,
                            data7,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex7._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 7,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex8 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex7.mainId,
                      });
                      if (!Refflevalncome8) {
                        return;
                      }
                      if (Refflevalncomex8.leval >= 8) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex8._id,
                        });
                        if (StakingData.length > 0) {

                          let data8 = {
                            userId: Refflevalncomex8._id,
                            Note: `You Got Level ${8} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex8._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex8._id,
                              Note: `You Got Level ${8} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data8).save();

                          console.log("===============>88", {
                            Refflevalncomex8,
                            data8,
                          });
                        }

                        else {
                          await HoldCBB({
                            userId: Refflevalncomex8._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 8,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex9 = await findOneRecord(Usermodal, {
                        username: Refflevalncome8.mainId,
                      });
                      if (!Refflevalncomex9) {
                        return;
                      }
                      if (Refflevalncomex9.leval >= 9) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex9._id,
                        });
                        if (StakingData.length > 0) {


                          let data9 = {
                            userId: Refflevalncomex9._id,
                            Note: `You Got Level ${9} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex9._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex9._id,
                              Note: `You Got Level ${9} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data9).save();

                          console.log("===============>99", {
                            Refflevalncomex9,
                            data9,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex9._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 9,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex10 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex9.mainId,
                      });
                      if (!Refflevalncomex10) {
                        return;
                      }

                      if (Refflevalncomex10.leval >= 10) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex10._id,
                        });
                        if (StakingData.length > 0) {
                          let data10 = {
                            userId: Refflevalncomex10._id,
                            Note: `You Got Level ${10} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex10._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex10._id,
                              Note: `You Got Level ${10} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data10).save();

                          console.log("===============>1010", {
                            Refflevalncomex10,
                            data10,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex10._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 10,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex11 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex10.mainId,
                      });
                      if (!Refflevalncomex11) {
                        return;
                      }

                      if (Refflevalncomex11.leval >= 11) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex11._id,
                        });
                        if (StakingData.length > 0) {
                          let data11 = {
                            userId: Refflevalncomex11._id,
                            Note: `You Got Level ${11} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex11._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex11._id,
                              Note: `You Got Level ${11} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data11).save();

                          console.log("===============>1111", {
                            Refflevalncomex11,
                            data11,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex11._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 11,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex12 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex11.mainId,
                      });
                      if (!Refflevalncomex12) {
                        return;
                      }
                      if (Refflevalncomex12.leval >= 12) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex12._id,
                        });
                        if (StakingData.length > 0) {
                          let data12 = {
                            userId: Refflevalncomex12._id,
                            Note: `You Got Level ${12} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex12._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex12._id,
                              Note: `You Got Level ${12} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data12).save();

                          console.log("===============>1212", {
                            Refflevalncomex12,
                            data12,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex12._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 12,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex13 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex12.mainId,
                      });
                      if (!Refflevalncomex13) {
                        return;
                      }
                      if (Refflevalncomex13.leval >= 13) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex13._id,
                        });
                        if (StakingData.length > 0) {
                          let data13 = {
                            userId: Refflevalncomex13._id,
                            Note: `You Got Level ${13} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex13._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex13._id,
                              Note: `You Got Level ${13} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data13).save();

                          console.log("===============>1313", {
                            Refflevalncomex13,
                            data13,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex13._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 13,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex14 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex13.mainId,
                      });
                      if (!Refflevalncomex14) {
                        return;
                      }
                      if (Refflevalncomex14.leval >= 14) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex14._id,
                        });
                        if (StakingData.length > 0) {
                          let data14 = {
                            userId: Refflevalncomex14._id,
                            Note: `You Got Level ${14} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex14._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex14._id,
                              Note: `You Got Level ${14} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data14).save();

                          console.log("===============>1414", {
                            Refflevalncomex14,
                            data14,
                          });

                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex14._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                            leval: 14,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex15 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex14.mainId,
                      });
                      if (!Refflevalncomex15) {
                        return;
                      }
                      if (Refflevalncomex15.leval >= 15) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex15._id,
                        });
                        if (StakingData.length > 0) {

                          let data15 = {
                            userId: Refflevalncomex15._id,
                            Note: `You Got Level ${15} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex15._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex15._id,
                              Note: `You Got Level ${15} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data15).save();

                          console.log("===============>1515", {
                            Refflevalncomex15,
                            data15,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex15._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                            leval: 15,
                            Active: false
                          }).save()
                        }
                      }
                      const Refflevalncomex16 = await findOneRecord(Usermodal, {
                        username: Refflevalncomex15.mainId,
                      });
                      if (!Refflevalncomex16) {
                        return;
                      }
                      if (Refflevalncomex16.leval >= 16) {
                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: Refflevalncomex16._id,
                        });
                        if (StakingData.length > 0) {

                          let data16 = {
                            userId: Refflevalncomex16._id,
                            Note: `You Got Level ${16} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex16._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex16._id,
                              Note: `You Got Level ${16} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                              balace: res.incomeWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data16).save();

                          console.log("===============>1616", {
                            Refflevalncome16,
                            data16,
                          });


                        } else {
                          await HoldCBB({
                            userId: Refflevalncomex16._id,
                            Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                            leval: 15,
                            Active: false
                          }).save()
                        }
                      }
                    })
                    const Refflevalncome1 = await findOneRecord(Usermodal, {
                      username: data.supporterId,
                    });
                    console.log("Refflevalncome1============================>>>>>>>", Refflevalncome1);
                    if (Refflevalncome1) {
                      await Stakingmodal({
                        userId: Refflevalncome1?._id,
                        WalletType: `Level ${1} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 10) / 100 / 1000) * 2,
                        leval: 1,
                        bonusAmount: 200,
                        Amount: (req.body.Amount * 10) / 100,
                        TotalRewordRecived: (req.body.Amount * 10) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome1.leval >= 1,
                      }).save();
                    }
                    const Refflevalncome2 = await findOneRecord(Usermodal, {
                      username: Refflevalncome1?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome2============================>>>>>>>", Refflevalncome2);
                    if (Refflevalncome2) {
                      await Stakingmodal({
                        userId: Refflevalncome2?._id,
                        WalletType: `Level ${2} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 7) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 2,
                        Amount: (req.body.Amount * 7) / 100,
                        TotalRewordRecived: (req.body.Amount * 7) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome2.leval >= 2,
                      }).save();
                    }
                    const Refflevalncome3 = await findOneRecord(Usermodal, {
                      username: Refflevalncome2?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome3============================>>>>>>>", Refflevalncome3);
                    if (Refflevalncome3) {
                      await Stakingmodal({
                        userId: Refflevalncome3?._id,
                        WalletType: `Level ${3} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 5) / 100 / 1000) * 2,
                        leval: 3,
                        bonusAmount: 200,
                        Amount: (req.body.Amount * 5) / 100,
                        TotalRewordRecived: (req.body.Amount * 5) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome3.leval >= 3,
                      }).save();
                    }
                    const Refflevalncome4 = await findOneRecord(Usermodal, {
                      username: Refflevalncome3?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome4============================>>>>>>>", Refflevalncome4);
                    if (Refflevalncome4) {
                      await Stakingmodal({
                        userId: Refflevalncome4?._id,
                        WalletType: `Level ${4} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 4) / 100 / 1000) * 2,
                        leval: 4,
                        bonusAmount: 200,
                        Amount: (req.body.Amount * 4) / 100,
                        TotalRewordRecived: (req.body.Amount * 4) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome4.leval >= 4,
                      }).save();
                    }
                    const Refflevalncome5 = await findOneRecord(Usermodal, {
                      username: Refflevalncome4?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome5============================>>>>>>>", Refflevalncome5);
                    if (Refflevalncome5) {
                      await Stakingmodal({
                        userId: Refflevalncome5?._id,
                        WalletType: `Level ${5} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 3) / 100 / 1000) * 2,
                        leval: 5,
                        bonusAmount: 200,
                        Amount: (req.body.Amount * 3) / 100,
                        TotalRewordRecived: (req.body.Amount * 3) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome5.leval >= 5,
                      }).save();
                    }
                    const Refflevalncome6 = await findOneRecord(Usermodal, {
                      username: Refflevalncome5?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome6============================>>>>>>>", Refflevalncome6);
                    if (Refflevalncome6) {
                      await Stakingmodal({
                        userId: Refflevalncome6?._id,
                        WalletType: `Level ${6} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 2) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 6,
                        Amount: (req.body.Amount * 2) / 100,
                        TotalRewordRecived: (req.body.Amount * 2) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome6.leval >= 6,
                      }).save();
                    }
                    const Refflevalncome7 = await findOneRecord(Usermodal, {
                      username: Refflevalncome6?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome7============================>>>>>>>", Refflevalncome7);
                    if (Refflevalncome7) {
                      await Stakingmodal({
                        userId: Refflevalncome7?._id,
                        WalletType: `Level ${7} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 7,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome7.leval >= 7,
                      }).save();
                    }
                    const Refflevalncome8 = await findOneRecord(Usermodal, {
                      username: Refflevalncome7?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome8============================>>>>>>>", Refflevalncome8);
                    if (Refflevalncome8) {
                      await Stakingmodal({
                        userId: Refflevalncome8?._id,
                        WalletType: `Level ${8} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 8,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome8.leval >= 8,
                      }).save();
                    }
                    const Refflevalncome9 = await findOneRecord(Usermodal, {
                      username: Refflevalncome8?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome9============================>>>>>>>", Refflevalncome9);
                    if (Refflevalncome9) {
                      await Stakingmodal({
                        userId: Refflevalncome9?._id,
                        WalletType: `Level ${9} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 9,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome9.leval >= 9,
                      }).save();
                    }
                    const Refflevalncome10 = await findOneRecord(Usermodal, {
                      username: Refflevalncome9?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome10============================>>>>>>>", Refflevalncome10);
                    if (Refflevalncome10) {

                      await Stakingmodal({
                        userId: Refflevalncome10?._id,
                        WalletType: `Level ${10} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 10,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome10.leval >= 10,
                      }).save();
                    }
                    const Refflevalncome11 = await findOneRecord(Usermodal, {
                      username: Refflevalncome10?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome11============================>>>>>>>", Refflevalncome11);
                    if (Refflevalncome11) {
                      await Stakingmodal({
                        userId: Refflevalncome11?._id,
                        WalletType: `Level ${11} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 11,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome11.leval >= 11,
                      }).save();
                    }
                    const Refflevalncome12 = await findOneRecord(Usermodal, {
                      username: Refflevalncome11?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome12============================>>>>>>>", Refflevalncome12);
                    if (Refflevalncome12) {

                      await Stakingmodal({
                        userId: Refflevalncome12?._id,
                        WalletType: `Level ${12} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 12,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome12.leval >= 12,
                      }).save();
                    }

                    const Refflevalncome13 = await findOneRecord(Usermodal, {
                      username: Refflevalncome12?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome13============================>>>>>>>", Refflevalncome13);
                    if (Refflevalncome13) {
                      await Stakingmodal({
                        userId: Refflevalncome13?._id,
                        WalletType: `Level ${13} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 13,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome13.leval >= 13,
                      }).save();
                    }
                    const Refflevalncome14 = await findOneRecord(Usermodal, {
                      username: Refflevalncome13?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome14============================>>>>>>>", Refflevalncome14);
                    if (Refflevalncome14) {
                      await Stakingmodal({
                        userId: Refflevalncome14?._id,
                        WalletType: `Level ${14} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 2) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 14,
                        Amount: (req.body.Amount * 2) / 100,
                        TotalRewordRecived: (req.body.Amount * 2) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome14.leval >= 14,
                      }).save();
                    }
                    const Refflevalncome15 = await findOneRecord(Usermodal, {
                      username: Refflevalncome14?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome15============================>>>>>>>", Refflevalncome15);
                    if (Refflevalncome15) {
                      await Stakingmodal({
                        userId: Refflevalncome15?._id,
                        WalletType: `Level ${15} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 3) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 15,
                        Amount: (req.body.Amount * 3) / 100,
                        TotalRewordRecived: (req.body.Amount * 3) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome15.leval >= 15,
                      }).save();
                    }
                    const Refflevalncome16 = await findOneRecord(Usermodal, {
                      username: Refflevalncome15?.supporterId,
                      isValid: true,
                    });
                    console.log("Refflevalncome16============================>>>>>>>", Refflevalncome16);
                    if (Refflevalncome16) {
                      await Stakingmodal({
                        userId: Refflevalncome16?._id,
                        WalletType: `Level ${16} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 5) / 100 / 1000) * 2,
                        bonusAmount: 200,
                        leval: 16,
                        Amount: (req.body.Amount * 5) / 100,
                        TotalRewordRecived: (req.body.Amount * 5) / 100 * 2,
                        transactionHash: "",
                        Active: Refflevalncome16.leval >= 16,
                      }).save();
                    }
                  }
                  await Stakingmodal({
                    userId: decoded.profile._id,
                    WalletType: "main-Wallet",
                    DailyReword: Number(req.body.Amount / 1000) * 2,
                    bonusAmount: 200,
                    Amount: req.body.Amount,
                    TotalRewordRecived: req.body.Amount * 2,
                    transactionHash: "",
                  }).save();
                  await updateRecord(
                    Walletmodal,
                    { userId: decoded.profile._id },
                    { mainWallet: WalletData.mainWallet - req.body.Amount }
                  ).then(async (res) => {
                    await Mainwallatesc({
                      userId: decoded.profile._id,
                      Note: `Staking Charge`,
                      Amount: req.body.Amount,
                      balace: res.mainWallet,
                      type: 0,
                      Active: true,
                    }).save();
                  });
                })
                await amountupdate(decoded.profile.username)
                return successResponse(res, {
                  message: "You have successfully staked SIR Tokens",
                });
              } else {
                return validarionerrorResponse(res, {
                  message:
                    "please check your mian wallet balance do not have infoe amount to stake!",
                });
              }
            } else {
              await otp.remove({
                userId: decoded.profile._id,
              });
              return notFoundResponse(res, {
                message: "Transaction failed",
              });
            }
          } else {
            if (req.body.WalletType === "dappwalletstacking") {
              web3.eth
                .getTransactionReceipt(req.body.transactionHash)
                .then((transaction) => {
                  const blockNumber = transaction.blockNumber;
                  return web3.eth.getBlock(blockNumber);
                })
                .then(async (block) => {
                  const timestamp = block.timestamp; // This is the Unix timestamp of the block
                  const currentTimestamp = new Date().getTime();
                  const blockTimestamp = timestamp * 1000;
                  const timeDifference = currentTimestamp - blockTimestamp;
                  if (timeDifference <= maxTimeDifference) {
                    let data1 = await otp.find({
                      userId: decoded.profile._id,
                      otp: Number(req.body.otp),
                    });
                    if (data1.length !== 0) {
                      await otp.remove({
                        userId: decoded.profile._id,
                      });

                      await cronHandler(decoded.profile.username).then(async (res) => {
                        const data = await findOneRecord(Usermodal, {
                          username: decoded.profile.username,
                        });
                        console.log("==================<<<", res);
                        const ReffData = await findOneRecord(Usermodal, {
                          username: data.supporterId,
                        });
                        if (ReffData?._id !== null) {
                          // const StakingData = await findAllRecord(Stakingmodal, {
                          //   userId: ReffData._id,
                          // });
                          // if (StakingData.length > 0) {
                          const data123 = await Stakingbonus.find({ Note: `You Got Refer and Earn Income From ${decoded.profile.username}` })
                          if (data123.length <= 0) {
                            await updateRecord(
                              Walletmodal,
                              {
                                userId: ReffData._id,
                              },
                              {
                                $inc: {
                                  incomeWallet:
                                    (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                                },
                              }
                            )
                              .then(async (res) => {
                                await Ewallateesc({
                                  userId: ReffData?._id,
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Amount: (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                                  type: 1,
                                  balace: res.incomeWallet,
                                  Active: true,
                                }).save();
                                await Stakingbonus({
                                  userId: ReffData?._id,
                                  ReffId: decoded.profile._id,
                                  Amount: (req.body.Amount / 90 * SIRprice.price * 5) / 100,
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Active: true,
                                }).save();
                              });
                          }
                          // }
                          const daat = await Usermodal.aggregate([
                            {
                              '$match': {
                                'mainId': ReffData.username
                              }
                            }, {
                              '$lookup': {
                                'from': 'stakings',
                                'localField': '_id',
                                'foreignField': 'userId',
                                'as': 'result'
                              }
                            }, {
                              '$match': {
                                '$expr': {
                                  '$gt': [
                                    {
                                      '$size': '$result'
                                    }, 0
                                  ]
                                }
                              }
                            }
                          ])

                          await updateRecord(
                            Usermodal,
                            { username: ReffData.username },
                            {
                              leval: Number(daat.length === 0 ? 1 : daat.length + 1),
                            }
                          ).then(async (data) => {
                            const Refflevalncome = await findOneRecord(Usermodal, {
                              username: decoded.profile.username,
                              isValid: true,
                            });

                            console.log("==========================================================>", Refflevalncome);
                            // if (!Refflevalncome) {
                            //   return;
                            // }
                            const Refflevalncomex1 = await findOneRecord(Usermodal, {
                              username: Refflevalncome.mainId,
                              isValid: true,
                            });
                            // if (!Refflevalncomex1) {
                            //   return;
                            // }
                            console.log("Refflevalncome1==================================>>>>>>>>>>>>>", Refflevalncomex1);
                            if (Refflevalncomex1.leval >= 1) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex1._id,
                              });

                              if (StakingData.length > 0) {
                                const StakingData1 = await Stakingmodal.find({
                                  userId: Refflevalncomex1._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: ReffData1._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData1.length; i++) {
                                  totalstaking += StakingData1[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {

                                  let data1 = {
                                    userId: Refflevalncomex1._id,
                                    Note: `You Got Level ${1} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                                  };
                                  const a1 = await Walletmodal.findOne({ userId: Refflevalncomex1._id })
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex1._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 3) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex1._id,
                                      Note: `You Got Level ${1} Income`,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                                      Usernameby: decoded.profile.username,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data1).save();
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex1._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 3) / 100,
                                leval: 1,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex2 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex1.mainId,
                            });
                            if (!Refflevalncomex2) {
                              return;
                            }
                            if (Refflevalncomex2.leval >= 2) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex2._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData2 = await Stakingmodal.find({
                                  userId: Refflevalncomex2._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex2._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData2.length; i++) {
                                  totalstaking += StakingData2[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data2 = {
                                    userId: Refflevalncomex2._id,
                                    Note: `You Got Level ${2} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex2._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 2) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex2._id,
                                      Note: `You Got Level ${2} Income`,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                      Usernameby: decoded.profile.username,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });

                                  await Communitymodal(data2).save();
                                  console.log("===============>22", {
                                    Refflevalncomex2,
                                    data2,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex2._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                leval: 2,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex3 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex2.mainId,
                            });
                            if (!Refflevalncomex3) {
                              return;
                            }
                            if (Refflevalncomex3.leval >= 3) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex3._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData3 = await Stakingmodal.find({
                                  userId: Refflevalncomex3._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex3._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData3.length; i++) {
                                  totalstaking += StakingData3[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data3 = {
                                    userId: Refflevalncomex3._id,
                                    Note: `You Got Level ${3} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex3._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 2) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex3._id,
                                      Note: `You Got Level ${3} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data3).save();

                                  console.log("===============>33", {
                                    Refflevalncomex3,
                                    data3,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex3._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                leval: 3,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex4 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex3.mainId,
                            });
                            if (!Refflevalncomex4) {
                              return;
                            }
                            if (Refflevalncomex4.leval >= 4) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex4._id,
                              });
                              if (StakingData.length > 0) {

                                const StakingData4 = await Stakingmodal.find({
                                  userId: Refflevalncomex4._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex4._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData4.length; i++) {
                                  totalstaking += StakingData4[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data4 = {
                                    userId: Refflevalncomex4._id,
                                    Note: `You Got Level ${4} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex4._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex4._id,
                                      Note: `You Got Level ${4} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data4).save();

                                  console.log("===============>44", {
                                    Refflevalncomex4,
                                    data4,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex4._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                leval: 4,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex5 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex4.mainId,
                            });
                            if (!Refflevalncomex5) {
                              return;
                            }
                            if (Refflevalncomex5.leval >= 5) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex5._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData5 = await Stakingmodal.find({
                                  userId: Refflevalncomex5._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex5._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData5.length; i++) {
                                  totalstaking += StakingData5[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data5 = {
                                    userId: Refflevalncomex5._id,
                                    Note: `You Got Level ${5} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncome5?._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncome5?._id,
                                      Note: `You Got Level ${5} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data5).save();

                                  console.log("===============>55", {
                                    Refflevalncomex5,
                                    data5,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex5._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 5,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex6 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex5.mainId,
                            });
                            if (!Refflevalncomex6) {
                              return;
                            }
                            if (Refflevalncomex6.leval >= 6) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex6._id,
                              });

                              if (StakingData.length > 0) {
                                const StakingData6 = await Stakingmodal.find({
                                  userId: Refflevalncomex6._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex6._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData6.length; i++) {
                                  totalstaking += StakingData6[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data6 = {
                                    userId: Refflevalncomex6._id,
                                    Note: `You Got Level ${6} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex6._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex6._id,
                                      Note: `You Got Level ${6} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data6).save();

                                  console.log("===============>66", {
                                    Refflevalncomex6,
                                    data6,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex6._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 6,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex7 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex6.mainId,
                            });
                            if (!Refflevalncomex7) {
                              return;
                            }
                            if (Refflevalncomex7.leval >= 7) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex7._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData7 = await Stakingmodal.find({
                                  userId: Refflevalncomex7._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex7._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData7.length; i++) {
                                  totalstaking += StakingData7[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data7 = {
                                    userId: Refflevalncomex7._id,
                                    Note: `You Got Level ${7} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex7._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex7._id,
                                      Note: `You Got Level ${7} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data7).save();

                                  console.log("===============>77", {
                                    Refflevalncomex7,
                                    data7,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex7._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 7,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex8 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex7.mainId,
                            });
                            if (!Refflevalncome8) {
                              return;
                            }
                            if (Refflevalncomex8.leval >= 8) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex8._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData8 = await Stakingmodal.find({
                                  userId: Refflevalncomex8._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex8._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData8.length; i++) {
                                  totalstaking += StakingData8[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data8 = {
                                    userId: Refflevalncomex8._id,
                                    Note: `You Got Level ${8} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex8._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex8._id,
                                      Note: `You Got Level ${8} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data8).save();

                                  console.log("===============>88", {
                                    Refflevalncomex8,
                                    data8,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex8._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 8,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex9 = await findOneRecord(Usermodal, {
                              username: Refflevalncome8.mainId,
                            });
                            if (!Refflevalncomex9) {
                              return;
                            }
                            if (Refflevalncomex9.leval >= 9) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex9._id,
                              });
                              if (StakingData.length > 0) {

                                const StakingData9 = await Stakingmodal.find({
                                  userId: Refflevalncomex9._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex9._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData9.length; i++) {
                                  totalstaking += StakingData9[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data9 = {
                                    userId: Refflevalncomex9._id,
                                    Note: `You Got Level ${9} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex9._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex9._id,
                                      Note: `You Got Level ${9} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data9).save();

                                  console.log("===============>99", {
                                    Refflevalncomex9,
                                    data9,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex9._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 9,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex10 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex9.mainId,
                            });
                            if (!Refflevalncomex10) {
                              return;
                            }

                            if (Refflevalncomex10.leval >= 10) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex10._id,
                              });
                              if (StakingData.length > 0) {

                                const StakingData10 = await Stakingmodal.find({
                                  userId: Refflevalncomex10._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex10._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData10.length; i++) {
                                  totalstaking += StakingData10[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data10 = {
                                    userId: Refflevalncomex10._id,
                                    Note: `You Got Level ${10} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex10._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex10._id,
                                      Note: `You Got Level ${10} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data10).save();

                                  console.log("===============>1010", {
                                    Refflevalncomex10,
                                    data10,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex10._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 10,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex11 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex10.mainId,
                            });
                            if (!Refflevalncomex11) {
                              return;
                            }

                            if (Refflevalncomex11.leval >= 11) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex11._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData11 = await Stakingmodal.find({
                                  userId: Refflevalncomex11._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex11._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData11.length; i++) {
                                  totalstaking += StakingData11[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data11 = {
                                    userId: Refflevalncomex11._id,
                                    Note: `You Got Level ${11} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex11._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex11._id,
                                      Note: `You Got Level ${11} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data11).save();

                                  console.log("===============>1111", {
                                    Refflevalncomex11,
                                    data11,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex11._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 11,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex12 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex11.mainId,
                            });
                            if (!Refflevalncomex12) {
                              return;
                            }
                            if (Refflevalncomex12.leval >= 12) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex12._id,
                              });
                              if (StakingData.length > 0) {


                                const StakingData12 = await Stakingmodal.find({
                                  userId: Refflevalncomex12._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex12._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData12.length; i++) {
                                  totalstaking += StakingData12[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data12 = {
                                    userId: Refflevalncomex12._id,
                                    Note: `You Got Level ${12} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex12._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex12._id,
                                      Note: `You Got Level ${12} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data12).save();

                                  console.log("===============>1212", {
                                    Refflevalncomex12,
                                    data12,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex12._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 12,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex13 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex12.mainId,
                            });
                            if (!Refflevalncomex13) {
                              return;
                            }
                            if (Refflevalncomex13.leval >= 13) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex13._id,
                              });
                              if (StakingData.length > 0) {


                                const StakingData12 = await Stakingmodal.find({
                                  userId: Refflevalncomex13._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex13._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData12.length; i++) {
                                  totalstaking += StakingData12[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data13 = {
                                    userId: Refflevalncomex13._id,
                                    Note: `You Got Level ${13} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex13._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex13._id,
                                      Note: `You Got Level ${13} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data13).save();

                                  console.log("===============>1313", {
                                    Refflevalncomex13,
                                    data13,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex13._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                leval: 13,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex14 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex13.mainId,
                            });
                            if (!Refflevalncomex14) {
                              return;
                            }
                            if (Refflevalncomex14.leval >= 14) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex14._id,
                              });
                              if (StakingData.length > 0) {


                                const StakingData12 = await Stakingmodal.find({
                                  userId: Refflevalncomex14._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex14._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData12.length; i++) {
                                  totalstaking += StakingData12[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data14 = {
                                    userId: Refflevalncomex14._id,
                                    Note: `You Got Level ${14} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex14._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex14._id,
                                      Note: `You Got Level ${14} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data14).save();

                                  console.log("===============>1414", {
                                    Refflevalncomex14,
                                    data14,
                                  });
                                }
                              } else {
                                await HoldCBB({
                                  userId: Refflevalncomex14._id,
                                  Amount: (req.body.Amount / 90 * SIRprice.price * 0.5) / 100,
                                  leval: 14,
                                  Active: false
                                }).save()
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex14._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 2) / 100,
                                leval: 16,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex15 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex14.mainId,
                            });
                            if (!Refflevalncomex15) {
                              return;
                            }
                            if (Refflevalncomex15.leval >= 15) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex15._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData12 = await Stakingmodal.find({
                                  userId: Refflevalncomex15._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex15._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData12.length; i++) {
                                  totalstaking += StakingData12[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data15 = {
                                    userId: Refflevalncomex15._id,
                                    Note: `You Got Level ${15} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex15._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex15._id,
                                      Note: `You Got Level ${15} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data15).save();

                                  console.log("===============>1515", {
                                    Refflevalncomex15,
                                    data15,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex15._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                leval: 15,
                                Active: false
                              }).save()
                            }
                            const Refflevalncomex16 = await findOneRecord(Usermodal, {
                              username: Refflevalncomex15.mainId,
                            });
                            if (!Refflevalncomex16) {
                              return;
                            }
                            if (Refflevalncomex16.leval >= 16) {
                              const StakingData = await findAllRecord(Stakingmodal, {
                                userId: Refflevalncomex16._id,
                              });
                              if (StakingData.length > 0) {
                                const StakingData12 = await Stakingmodal.find({
                                  userId: Refflevalncomex16._id,
                                  leval: 0,
                                });
                                const withdrawalmodal1 = await Wallet.find({
                                  userId: Refflevalncomex16._id,
                                });
                                let totalstaking = 0;
                                for (let i = 0; i < StakingData12.length; i++) {
                                  totalstaking += StakingData12[i].Amount;
                                }
                                if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
                                  let data16 = {
                                    userId: Refflevalncomex16._id,
                                    Note: `You Got Level ${16} Income`,
                                    Usernameby: decoded.profile.username,
                                    Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                  };
                                  await updateRecord(
                                    Walletmodal,
                                    {
                                      userId: Refflevalncomex16._id,
                                    },
                                    { $inc: { incomeWallet: (req.body.Amount / 90 * SIRprice.price * 1) / 100 } }
                                  ).then(async (res) => {
                                    await Ewallateesc({
                                      userId: Refflevalncomex16._id,
                                      Note: `You Got Level ${16} Income`,
                                      Usernameby: decoded.profile.username,
                                      Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                      balace: res.incomeWallet,
                                      type: 1,
                                      Active: true,
                                    }).save();
                                  });
                                  await Communitymodal(data16).save();

                                  console.log("===============>1616", {
                                    Refflevalncome16,
                                    data16,
                                  });
                                }
                              }
                            } else {
                              await HoldCBB({
                                userId: Refflevalncomex15._id,
                                Amount: (req.body.Amount / 90 * SIRprice.price * 1) / 100,
                                leval: 15,
                                Active: false
                              }).save()
                            }
                          })
                          const Refflevalncome1 = await findOneRecord(Usermodal, {
                            username: data.supporterId,
                          });
                          console.log("Refflevalncome1============================>>>>>>>", Refflevalncome1);
                          if (Refflevalncome1) {
                            await Stakingmodal({
                              userId: Refflevalncome1?._id,
                              WalletType: `Level ${1} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 10) / 100 / 1000) * 2,
                              leval: 1,
                              bonusAmount: 200,
                              Amount: (req.body.Amount * 10) / 100,
                              TotalRewordRecived: (req.body.Amount * 10) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome1.leval >= 1,
                            }).save();
                          }
                          const Refflevalncome2 = await findOneRecord(Usermodal, {
                            username: Refflevalncome1?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome2============================>>>>>>>", Refflevalncome2);
                          if (Refflevalncome2) {
                            await Stakingmodal({
                              userId: Refflevalncome2?._id,
                              WalletType: `Level ${2} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 7) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 2,
                              Amount: (req.body.Amount * 7) / 100,
                              TotalRewordRecived: (req.body.Amount * 7) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome2.leval >= 2,
                            }).save();
                          }
                          const Refflevalncome3 = await findOneRecord(Usermodal, {
                            username: Refflevalncome2?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome3============================>>>>>>>", Refflevalncome3);
                          if (Refflevalncome3) {
                            await Stakingmodal({
                              userId: Refflevalncome3?._id,
                              WalletType: `Level ${3} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 5) / 100 / 1000) * 2,
                              leval: 3,
                              bonusAmount: 200,
                              Amount: (req.body.Amount * 5) / 100,
                              TotalRewordRecived: (req.body.Amount * 5) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome3.leval >= 3,
                            }).save();
                          }
                          const Refflevalncome4 = await findOneRecord(Usermodal, {
                            username: Refflevalncome3?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome4============================>>>>>>>", Refflevalncome4);
                          if (Refflevalncome4) {
                            await Stakingmodal({
                              userId: Refflevalncome4?._id,
                              WalletType: `Level ${4} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 4) / 100 / 1000) * 2,
                              leval: 4,
                              bonusAmount: 200,
                              Amount: (req.body.Amount * 4) / 100,
                              TotalRewordRecived: (req.body.Amount * 4) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome4.leval >= 4,
                            }).save();
                          }
                          const Refflevalncome5 = await findOneRecord(Usermodal, {
                            username: Refflevalncome4?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome5============================>>>>>>>", Refflevalncome5);
                          if (Refflevalncome5) {
                            await Stakingmodal({
                              userId: Refflevalncome5?._id,
                              WalletType: `Level ${5} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 3) / 100 / 1000) * 2,
                              leval: 5,
                              bonusAmount: 200,
                              Amount: (req.body.Amount * 3) / 100,
                              TotalRewordRecived: (req.body.Amount * 3) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome5.leval >= 5,
                            }).save();
                          }
                          const Refflevalncome6 = await findOneRecord(Usermodal, {
                            username: Refflevalncome5?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome6============================>>>>>>>", Refflevalncome6);
                          if (Refflevalncome6) {
                            await Stakingmodal({
                              userId: Refflevalncome6?._id,
                              WalletType: `Level ${6} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 2) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 6,
                              Amount: (req.body.Amount * 2) / 100,
                              TotalRewordRecived: (req.body.Amount * 2) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome6.leval >= 6,
                            }).save();
                          }
                          const Refflevalncome7 = await findOneRecord(Usermodal, {
                            username: Refflevalncome6?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome7============================>>>>>>>", Refflevalncome7);
                          if (Refflevalncome7) {
                            await Stakingmodal({
                              userId: Refflevalncome7?._id,
                              WalletType: `Level ${7} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 7,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome7.leval >= 7,
                            }).save();
                          }
                          const Refflevalncome8 = await findOneRecord(Usermodal, {
                            username: Refflevalncome7?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome8============================>>>>>>>", Refflevalncome8);
                          if (Refflevalncome8) {
                            await Stakingmodal({
                              userId: Refflevalncome8?._id,
                              WalletType: `Level ${8} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 8,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome8.leval >= 8,
                            }).save();
                          }
                          const Refflevalncome9 = await findOneRecord(Usermodal, {
                            username: Refflevalncome8?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome9============================>>>>>>>", Refflevalncome9);
                          if (Refflevalncome9) {
                            await Stakingmodal({
                              userId: Refflevalncome9?._id,
                              WalletType: `Level ${9} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 9,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome9.leval >= 9,
                            }).save();
                          }
                          const Refflevalncome10 = await findOneRecord(Usermodal, {
                            username: Refflevalncome9?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome10============================>>>>>>>", Refflevalncome10);
                          if (Refflevalncome10) {

                            await Stakingmodal({
                              userId: Refflevalncome10?._id,
                              WalletType: `Level ${10} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 10,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome10.leval >= 10,
                            }).save();
                          }
                          const Refflevalncome11 = await findOneRecord(Usermodal, {
                            username: Refflevalncome10?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome11============================>>>>>>>", Refflevalncome11);
                          if (Refflevalncome11) {
                            await Stakingmodal({
                              userId: Refflevalncome11?._id,
                              WalletType: `Level ${11} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 11,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome11.leval >= 11,
                            }).save();
                          }
                          const Refflevalncome12 = await findOneRecord(Usermodal, {
                            username: Refflevalncome11?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome12============================>>>>>>>", Refflevalncome12);
                          if (Refflevalncome12) {

                            await Stakingmodal({
                              userId: Refflevalncome12?._id,
                              WalletType: `Level ${12} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 12,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome12.leval >= 12,
                            }).save();
                          }

                          const Refflevalncome13 = await findOneRecord(Usermodal, {
                            username: Refflevalncome12?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome13============================>>>>>>>", Refflevalncome13);
                          if (Refflevalncome13) {
                            await Stakingmodal({
                              userId: Refflevalncome13?._id,
                              WalletType: `Level ${13} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 1) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 13,
                              Amount: (req.body.Amount * 1) / 100,
                              TotalRewordRecived: (req.body.Amount * 1) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome13.leval >= 13,
                            }).save();
                          }
                          const Refflevalncome14 = await findOneRecord(Usermodal, {
                            username: Refflevalncome13?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome14============================>>>>>>>", Refflevalncome14);
                          if (Refflevalncome14) {
                            await Stakingmodal({
                              userId: Refflevalncome14?._id,
                              WalletType: `Level ${14} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 2) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 14,
                              Amount: (req.body.Amount * 2) / 100,
                              TotalRewordRecived: (req.body.Amount * 2) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome14.leval >= 14,
                            }).save();
                          }
                          const Refflevalncome15 = await findOneRecord(Usermodal, {
                            username: Refflevalncome14?.supporterId,
                            isValid: true,
                          });
                          console.log("Refflevalncome15============================>>>>>>>", Refflevalncome15);
                          if (Refflevalncome15) {
                            await Stakingmodal({
                              userId: Refflevalncome15?._id,
                              WalletType: `Level ${15} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 3) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 15,
                              Amount: (req.body.Amount * 3) / 100,
                              TotalRewordRecived: (req.body.Amount * 3) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome15.leval >= 15,
                            }).save();
                          }
                          const Refflevalncome16 = await findOneRecord(Usermodal, {
                            username: Refflevalncome15?.supporterId,
                            isValid: true,
                          }); console.log("Refflevalncome16============================>>>>>>>", Refflevalncome16);
                          if (Refflevalncome16) {
                            await Stakingmodal({
                              userId: Refflevalncome16?._id,
                              WalletType: `Level ${16} plan (${decoded.profile.username})`,
                              DailyReword: Number((req.body.Amount * 5) / 100 / 1000) * 2,
                              bonusAmount: 200,
                              leval: 16,
                              Amount: (req.body.Amount * 5) / 100,
                              TotalRewordRecived: (req.body.Amount * 5) / 100 * 2,
                              transactionHash: "",
                              Active: Refflevalncome16.leval >= 16,
                            }).save();
                          }
                        }
                        await Stakingmodal({
                          userId: decoded.profile._id,
                          WalletType: "DAPP-Wallet",
                          DailyReword: Number(req.body.Amount / 1000) * 2,
                          bonusAmount: 200,
                          Amount: req.body.Amount,
                          TotalRewordRecived: req.body.Amount * 2,
                          transactionHash: "",
                        }).save();
                      })
                      await amountupdate(decoded.profile.username)
                      return successResponse(res, {
                        message: "You have successfully staked SIR Tokens",
                      });
                    } else {
                      return validarionerrorResponse(res, {
                        message:
                          "please check your mian wallet balance do not have infoe amount to stake!",
                      });
                    }
                  }
                })
                .catch((err) => {
                  console.log(err);
                });

            } else {
              return badRequestResponse(res, {
                message: "something went to wrong please try again",
              });
            }
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
  gelallstack: async (req, res) => {
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
          // const StakingData = await findAllRecord(Stakingmodal, {
          //   userId: decoded.profile._id,
          // });
          const StakingData = await Stakingmodal.aggregate([
            {
              $match: {
                userId: ObjectId(decoded.profile._id),
              },
            },
            {
              $lookup: {
                from: "users",
                let: {
                  walletType: {
                    $split: ["$WalletType", "("],
                  },
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$username",
                          {
                            $cond: {
                              if: {
                                $eq: [
                                  { $size: "$$walletType" },
                                  1,
                                ],
                              },
                              then: "$$walletType",
                              else: {
                                $trim: {
                                  input: {
                                    $arrayElemAt: [
                                      "$$walletType",
                                      1,
                                    ],
                                  },
                                  chars: ")",
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
                as: "result",
              },
            },
          ])
          // console.log(StakingData1);
          console.log(StakingData);
          const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            SIRprice: SIRprice.price
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
  gelUserWallate: async (req, res) => {
    try {
      const todayIST = startOfDay; // Start of the user's day
      const nextDayIST = endOfDay; // End of the user's day
      if (!req.headers.authorization) {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }

      const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });
      const token = req.headers.authorization.split(" ")[1];
      const { err, decoded } = await tokenverify(token);

      if (err) {
        return notFoundResponse(res, {
          message: "User not found",
        });
      }

      if (!decoded) {
        return notFoundResponse(res, {
          message: "Decoded token is missing",
        });
      }

      const { profile: { _id: userId, username, leval } } = decoded;
      console.log(leval);
      const [
        stakingData,
        WalletData,
        userData,
        aggregatedUserData,
        data1,
        data22,
        data,
        data123,
      ] = await Promise.all([
        findAllRecord(Stakingmodal, {
          userId: userId,
        }),
        findAllRecord(Walletmodal, {
          userId: userId,
        }),
        findAllRecord(Usermodal, {
          _id: userId,
        }),
        Usermodal.aggregate([
          {
            $match: {
              username,
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
            $lookup: {
              from: "stakings",
              localField: "refers_to._id",
              foreignField: "userId",
              pipeline: [
                {
                  $match: {
                    leval: 0,
                  },
                },
              ],
              as: "amount2",
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              pipeline: [
                {
                  $match: {
                    leval: 0,
                  },
                },
              ],
              as: "amount",
            },
          },
          {
            $project: {
              total: {
                $reduce: {
                  input: "$amount",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              },
              total1: {
                $reduce: {
                  input: "$amount2",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              },
              total2: {
                $reduce: {
                  input: "$amount",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $divide: ["$$this.Amount", "$$this.V4xTokenPrice"],
                      },
                    ],
                  },
                },
              },
              email: 1,
              username: 1,
              level: 4,
            },
          },
        ]),
        Usermodal.aggregate([
          {
            $match: {
              supporterId: username,
            },
          },
          {
            $project: {
              // Exclude unnecessary fields
              referredUser: 0,
              walletaddress: 0,
              profileimg: 0,
              password: 0,
              isActive: 0,
              isValid: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
              referredUser: 0,
              AirdroppedActive: 0,
              Airdropped: 0,
            },
          },
        ]),
        Usermodal.aggregate([
          {
            $match: {
              mainId: username,
            },
          },
          {
            $project: {
              // Exclude unnecessary fields
              referredUser: 0,
              walletaddress: 0,
              profileimg: 0,
              password: 0,
              isActive: 0,
              isValid: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
              referredUser: 0,
              AirdroppedActive: 0,
              Airdropped: 0,
            },
          },
        ]),
        Usermodal.aggregate([
          {
            $match: {
              username,
            },
          },
          {
            $graphLookup: {
              from: "users",
              startWith: "$username",
              connectFromField: "username",
              connectToField: "refferalBy",
              as: "referBY",
            },
          },
          {
            $project: {
              referBYCount: { $size: "$referBY" },
              mystack: 1,
              teamtotalstack: 1,
            },
          },
        ]),
        Usermodal.aggregate([
          {
            $match: {
              username,
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amount2",
            },
          },
          {
            $lookup: {
              from: "holdcbbs",
              localField: "_id",
              foreignField: "userId",
              as: "holdcbbamout",
              pipeline: [
                {
                  $match: {
                    Active: false,
                  },
                },
              ],
            },
          }, {
            $lookup: {
              from: "users",
              localField: "username",
              foreignField: "supporterId",
              as: "refers_to",
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amountupcoming11",
              pipeline: [
                {
                  $match: {
                    Active: { $ne: false }, // Active is not false
                    leval: { $gt: 0 } // leval is greater than 0
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amountupcoming11233",
              pipeline: [
                {
                  $match: {
                    Active: { $ne: false }, // Active is not false
                    leval: { $lt: 1 } // leval is greater than 0
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amount211",
              pipeline: [
                {
                  $match: {
                    Active: true,
                    WalletType: {
                      $not: {
                        $in: [
                          "main-Wallet",
                          "DAPP-WALLET",
                          "Main Wallet",
                          "DAPP WALLET",
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "refers_to._id",
              foreignField: "userId",
              as: "amountupcoming",
              pipeline: [
                {
                  $match: {
                    Active: false,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amountupcoming1",
              pipeline: [
                {
                  $match: {
                    Active: false,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "ewallates",
              localField: "_id",
              foreignField: "userId",
              as: "amount13",
            },
          },
          {
            $lookup: {
              from: "mainwallates",
              localField: "_id",
              foreignField: "userId",
              as: "amount131",
            },
          }, {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amount13123456",
            },
          },
          {
            $lookup: {
              from: "stakingbonus",
              localField: "_id",
              foreignField: "userId",
              as: "amount3",
            },
          },
          {
            $lookup: {
              from: "communities",
              localField: "_id",
              foreignField: "userId",
              as: "amount32",
            },
          },
          {
            $lookup: {
              from: "passives",
              localField: "_id",
              foreignField: "userId",
              as: "passives",
            },
          },
          {
            $lookup: {
              from: "achivements",
              localField: "_id",
              foreignField: "userId",
              as: "achivements",
            },
          },
          {
            $lookup: {
              from: "royalties",
              localField: "_id",
              foreignField: "userId",
              as: "Royalty1",
            },
          },
          {
            $project: {
              Royalty: {
                $reduce: {
                  input: "$Royalty1",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              },
              total1: {
                $reduce: {
                  input: "$amount211",
                  initialValue: 0,
                  in: {
                    $add: ["$$value",
                      "$$this.TotalRewordRecived"],
                  },
                },
              },
              total2: {
                $reduce: {
                  input: "$amount211",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      "$$this.TotalRewordRecived",
                    ],
                  },
                },
              },
              amountupcomming: {
                $reduce: {
                  input: "$amountupcoming11",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $subtract: [
                          {
                            $divide: [
                              { $multiply: ["$$this.Amount", "$$this.bonusAmount"] },
                              100
                            ]
                          },
                          { $multiply: ["$$this.Totalsend", "$$this.DailyReword"] }
                        ]
                      }
                    ]
                  },
                },
              },
              amountupcommin1: {
                $reduce: {
                  input: "$amountupcoming11233",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $subtract: [
                          {
                            $divide: [
                              { $multiply: ["$$this.Amount", "$$this.bonusAmount"] },
                              100
                            ]
                          },
                          { $multiply: ["$$this.Totalsend", "$$this.DailyReword"] }
                        ]
                      }
                    ]
                  },
                },
              }
              , holdincome: {
                $reduce: {
                  input: "$amountupcoming1",
                  initialValue: 0,
                  in: {
                    $add: ["$$value",
                      "$$this.TotalRewordRecived"],
                  },
                },
              },
              StakingBonusIncome: {
                $reduce: {
                  input: "$amount131",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $cond: {
                          if: {
                            $eq: [
                              "$$this.Note",
                              "You Got Staking Bonus Income.",
                            ],
                          },
                          then: "$$this.Amount",
                          else: 0,
                        },
                      },
                    ],
                  },
                },
              },
              ReferandEarn: {
                $reduce: {
                  input: "$amount13",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $cond: {
                          if: {
                            $eq: [
                              {
                                $substr: [
                                  "$$this.Note",
                                  0,
                                  29,
                                ],
                              },
                              "You Got Refer and Earn Income",
                            ],
                          },
                          then: "$$this.Amount",
                          else: 0,
                        },
                      },
                    ],
                  },
                },
              },
              // TodaStakingBonusIncome: {
              //   $reduce: {
              //     input: {
              //       $reduce: {
              //         input: "$amount13123456",
              //         as: "item",
              //       },
              //     },
              //     in: {
              //       $add: ["$$value", "$$this.Amount"],
              //     },
              //   },
              // },
              TodaStakingBonusIncome: {
                $reduce: {
                  input: "$amount13123456",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.DailyReword"],
                  },
                },
              },
              communities: {
                $reduce: {
                  input: "$amount32",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $cond: {
                          if: {
                            $eq: [
                              {
                                $substr: [
                                  "$$this.Note",
                                  0,
                                  13,
                                ],
                              },
                              "You Got Level",
                            ],
                          },
                          then: "$$this.Amount",
                          else: 0,
                        },
                      },
                    ],
                  },
                },
              },
              passives: {
                $reduce: {
                  input: "$passives",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $cond: {
                          if: {
                            $eq: [
                              "$$this.Note",
                              "USDT Token WILL BE CREDITED IN PASSIVE CLUB WALLET",
                            ],
                          },
                          then: "$$this.Amount",
                          else: 0,
                        },
                      },
                    ],
                  },
                },
              },
              achivements: {
                $reduce: {
                  input: "$achivements",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              },
              holdcbbamout: {
                $reduce: {
                  input: "$holdcbbamout",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      "$$this.Amount",
                    ],
                  },
                },
              }
            },
          },
        ]),
        findAllRecord(V4Xpricemodal, {}),
      ]);
      return successResponse(res, {
        message: "Wallet data retrieved successfully",
        data: WalletData,
        profile: userData,
        lockeddate: 0,
        mystack: aggregatedUserData[0].total,
        lockamount: aggregatedUserData[0].total2,
        teamtotalstack: aggregatedUserData[0].total1 + aggregatedUserData[0].total / 90 * SIRprice.price,
        ReffData: data[0].referBYCount,
        ReffData1: data1,
        ReffData2: data22,
        income: data123,
        SIRprice: SIRprice.price
      });
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  getstackbouns: async (req, res) => {
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
          const StakingData = await Stakingbonus.aggregate([
            {
              $match: {
                userId: ObjectId(decoded.profile._id),
              },
            },
            {
              $project: {
                rewordId: 0,
                updatedAt: 0,
                V4xTokenPrice: 0,
                ReffId: 0,
                __v: 0,
              },
            },
          ]);
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            profile: decoded.profile, SIRprice: 12.85
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
  Transfercoin: async (req, res) => {
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
          let data = await findOneRecord(Walletmodal, {
            userId: decoded.profile._id,
          });
          if (req.body.Amount > 0) {
            let data1 = await otp.find({
              userId: decoded.profile._id,
              otp: Number(req.body.otp),
            });
            if (data1.length !== 0) {
              if (req.body.Wallet === "Main Wallet") {
                if (data.mainWallet >= req.body.Amount) {
                  let amount = Number(data.mainWallet - req.body.Amount);

                  if (req.body.Username !== "") {

                    let abc = await Usermodal.find({
                      username: req.body.Username,
                    });
                    let abc1 = await Walletmodal.find({
                      userId: abc[0]._id,
                    });
                    console.log(abc1);
                    let tdata = {
                      userId: decoded.profile._id,
                      tranforWallet: req.body.Wallet,
                      fromaccountusername: abc[0]._id,
                      Amount: Number(req.body.Amount),
                    };
                    await Transactionmodal(tdata).save();
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: decoded.profile._id,
                      },
                      {
                        mainWallet: amount,
                      }
                    ).then(async (res) => {
                      await Mainwallatesc({
                        userId: decoded.profile._id,
                        Note: `You Transfer coin from ${abc[0].username}`,
                        Amount: req.body.Amount,
                        balace: res?.mainWallet,
                        type: 0,
                        Active: true,
                      }).save();
                    });
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: abc[0]._id,
                      },
                      { $inc: { mainWallet: req.body.Amount } }
                    )
                    await Mainwallatesc({
                      userId: abc[0]._id,
                      Note: `You have received coin from ${abc[0].username}`,
                      Amount: req.body.Amount,
                      balace: abc1[0]?.mainWallet,
                      type: 1,
                      Active: true,
                    }).save();
                    await otp.remove({
                      userId: decoded.profile._id,
                    });
                    return successResponse(res, {
                      message: "transactions have been sent successfully",
                    });
                  }
                } else {
                  return validarionerrorResponse(res, {
                    message:
                      "please check your mian wallet balance do not have infoe amount to Transfer!",
                  });
                }
              } else {
                if (data.incomeWallet >= req.body.Amount) {
                  let amount = Number(data.incomeWallet - req.body.Amount);

                  if (req.body.Username !== "") {

                    let abc = await Usermodal.find({
                      username: req.body.Username,
                    });
                    let abc1 = await Walletmodal.find({
                      userId: abc[0]._id,
                    });
                    console.log(abc);
                    let tdata = {
                      userId: decoded.profile._id,
                      tranforWallet: req.body.Wallet,
                      fromaccountusername: abc[0]._id,
                      Amount: Number(req.body.Amount),
                    };
                    await Transactionmodal(tdata).save();
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: decoded.profile._id,
                      },
                      {
                        incomeWallet: amount,
                      }
                    ).then(async (res) => {
                      await Ewallateesc({
                        userId: decoded.profile._id,
                        Note: `You Transfer coin from ${abc[0].username}`,
                        Amount: req.body.Amount,
                        balace: res?.incomeWallet,
                        type: 0,
                        Active: true,
                      }).save();
                    });
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: abc[0]._id,
                      },
                      { $inc: { incomeWallet: req.body.Amount } }
                    )
                    await Ewallateesc({
                      userId: abc[0]._id,
                      Note: `You have received coin from ${abc[0].username}`,
                      Amount: req.body.Amount,
                      balace: abc1[0]?.incomeWallet,
                      type: 1,
                      Active: true,
                    }).save();
                    await otp.remove({
                      userId: decoded.profile._id,
                    });
                    return successResponse(res, {
                      message: "transactions have been sent successfully",
                    });
                  }
                } else {

                  return validarionerrorResponse(res, {
                    message:
                      "please check your mian wallet balance do not have infoe amount to Transfer!",
                  });
                }
                // if (data.v4xWallet >= req.body.Amount) {
                //   let amount = Number(data.v4xWallet - req.body.Amount);
                //   let tdata = {
                //     userId: new ObjectId(decoded.profile._id),
                //     tranforWallet: req.body.Wallet,
                //     fromaccountusername: new ObjectId(req.body.Username),
                //     Amount: Number(req.body.Amount),
                //   };

                //   if (req.body.Username1 !== "") {
                //     // E-waallate
                //     // await Mainwallatesc({
                //     //   userId: decoded.profile._id,
                //     //   Note: `Transfer coins from ${decoded.profile.username}`,
                //     //   Amount: req.body.Amount,
                //     //   type: 0,
                //     //   Active: true,
                //     // }).save();

                //     let abc = await Usermodal.find({
                //       username: req.body.Username1,
                //     });
                //     await Transactionmodal(tdata).save();

                //     await updateRecord(
                //       Walletmodal,
                //       {
                //         userId: decoded.profile._id,
                //       },
                //       {
                //         v4xWallet: amount,
                //       }
                //     ).then(async (res) => {
                //       await Ewallateesc({
                //         userId: decoded.profile._id,
                //         Note: `You Transfer coin from ${abc[0].username}`,
                //         Amount: req.body.Amount,
                //         balace: res?.v4xWallet,
                //         type: 0,
                //         Active: true,
                //       }).save();
                //     });
                //     await updateRecord(
                //       Walletmodal,
                //       {
                //         userId: abc[0]._id,
                //       },
                //       { $inc: { v4xWallet: req.body.Amount } }
                //     ).then(async (res) => {
                //       await Ewallateesc({
                //         userId: abc[0]._id,
                //         Note: `You Received Coins from ${decoded.profile.username}`,
                //         Amount: req.body.Amount,
                //         balace: res?.v4xWallet,
                //         type: 1,
                //         Active: true,
                //       }).save();
                //     });
                //     return successResponse(res, {
                //       message: "transactions have been sent successfully",
                //     });
                //   }
                // } else {
                //   return validarionerrorResponse(res, {
                //     message:
                //       "please check your Infinity.AI wallet balance do not have infoe amount to Transfer!",
                //   });
                // }
              }
            } else {
              await otp.remove({
                userId: decoded.profile._id,
              });
              return notFoundResponse(res, {
                message: "Transaction failed",
              });
            }
          } else {
            return badRequestResponse(res, {
              message: "plase enter valid amount.",
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
  getCommunityincome: async (req, res) => {
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
          let data = await findAllRecord(Communitymodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Community Building Programe Income get successfully",
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
  getTransfercoinasync: async (req, res) => {
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
          const ReffData = await findAllRecord(Usermodal, {
            _id: decoded.profile._id,
          });
          let data = await Transactionmodal.aggregate([
            {
              $match: {
                userId: ReffData[0]._id,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "fromaccountusername",
                foreignField: "_id",
                as: "username",
              },
            },
            {
              $project: {
                tranforWallet: 1,
                Amount: 1,
                "username.username": 1,
                createdAt: 1,
              },
            },
          ]);

          let reciveddata = await Transactionmodal.aggregate([
            {
              $match: {
                fromaccountusername: ReffData[0]._id,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "username",
              },
            },
            {
              $project: {
                tranforWallet: 1,
                Amount: 1,
                "username.username": 1,
                createdAt: 1,
              },
            },
          ]);
          console.log("reciveddata", reciveddata);
          return successResponse(res, {
            message: "Transfer data get successfully",
            data: data,
            reciveddata: reciveddata,
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
  getAchievementincome: async (req, res) => {
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
          let data = await findAllRecord(Achivementmodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Achievement Income get successfully",
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
  getRoyalty: async (req, res) => {
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
          let data = await findAllRecord(Royaltymodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Royalty Income get successfully",
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
  gePassiveincome: async (req, res) => {
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
          let data = await findAllRecord(Passivemodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Achievement Income get successfully",
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
  indaireactteam: async (req, res) => {
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
          let data = await Usermodal.aggregate([
            {
              $match: {
                mainId: decoded.profile.username,
              },
            },
            {
              $lookup: {
                from: "stakings",
                localField: "_id",
                foreignField: "userId",
                as: "result",
              },
            },
            {
              $project: {
                referredUser: 0,
                password: 0,
                _id: 0,
                userId: 0,
                AirdroppedActive: 0,
                isActive: 0,
                teamtotalstack: 0,
                refferalId: 0,
                iswalletActive: 0,
                leval: 0,
                note: 0,
                isValid: 0,
                updatedAt: 0,
                __v: 0,
                referredUser: 0,
                Airdropped: 0,
              },
            },
          ]);
          return successResponse(res, {
            message: "wallet data get successfully",
            ReffData: data,
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
  CBBteam: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization
        );
        if (err) {
          return notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          let data = await Usermodal.aggregate([
            {
              $match: {
                username: decoded.profile.username,
              },
            },
            {
              $graphLookup: {
                from: "users",
                startWith: "$username",
                connectFromField: "username",
                depthField: "depthleval",
                connectToField: "mainId",
                as: "referBY",
              },
            },
            {
              $lookup: {
                from: "stakings",
                localField: "referBY._id",
                foreignField: "userId",
                as: "result",
              },
            },
            {
              $addFields: {
                referBY: {
                  $map: {
                    input: "$referBY",
                    as: "user",
                    in: {
                      $mergeObjects: [
                        "$$user",
                        {
                          stakingData: {
                            $filter: {
                              input: "$result",
                              as: "staking",
                              cond: {
                                $eq: ["$$staking.userId", "$$user._id"]
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            {
              $project: {
                result: 0 // Exclude the original staking data array if needed
              }
            }
          ]);
          return successResponse(res, {
            message: "wallet data get successfully",
            ReffData: data,
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
  daireactteam: async (req, res) => {
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
          let data = await Usermodal.aggregate([
            {
              $match: {
                username: decoded.profile.username,
              },
            },
            {
              $graphLookup: {
                from: "users",
                startWith: "$username",
                connectFromField: "username",
                depthField: "depthleval",
                connectToField: "supporterId",
                as: "referBY",
              },
            },
            {
              $project: {
                referredUser: 0,
                walletaddress: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
                "referBY.password": 0,
                "referBY._id": 0,
                "referBY.userId": 0,
                "referBY.referredUser": 0,
                "referBY.AirdroppedActive": 0,
                "referBY.teamtotalstack": 0,
                "referBY.refferalId": 0,
                "referBY.iswalletActive": 0,
                "referBY.isValid": 0,
                "referBY.isActive": 0,
                "referBY.leval": 0,
                "referBY.note": 0,
                "referBY.updatedAt": 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
                email: 0,
                referredUser: 0,
                AirdroppedActive: 0,
                Airdropped: 0,
              },
            },
          ]);
          return successResponse(res, {
            message: "wallet data get successfully",
            ReffData: data,
          });
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided!",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  finduserdata: async (req, res) => {
    try {

      let data = await Usermodal.aggregate([
        {
          $match: {
            username: req.params.username,
          },
        }
      ]);
      return successResponse(res, {
        message: "wallet data get successfully",
        data: data,
      });

    } catch (error) {
      return errorResponse(error, res);
    }
  },
  allincome: async (req, res) => {
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
          const StakingData = await findOneRecord(Usermodal, {
            username: decoded.profile.username
          });
          let data1 = await Communitymodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data2 = await Achivementmodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data3 = await Passivemodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data4 = await Passivemodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          const data = data1.concat(data2, data3, data4);
          return successResponse(res, {
            message: "wallet data get successfully",
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
  userallincome: async (req, res) => {
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
          const StakingData = await findOneRecord(Usermodal, {
            username: decoded.profile.username
          });
          let data1 = await Communitymodal.find({});
          let data2 = await Achivementmodal.find({});
          let data3 = await Passivemodal.find({});
          let data4 = await Passivemodal.find({});
          const data = data1.concat(data2, data3, data4);
          return successResponse(res, {
            message: "wallet data get successfully",
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
  livaprice: async (req, res) => {
    try {
      const price = await findAllRecord(V4Xpricemodal, {});
      return successResponse(res, {
        message: "wallet data get successfully",
        data: price,
      });
    } catch (error) {
      return badRequestResponse(res, {
        message: "error.",
      });
    }
  },
};
