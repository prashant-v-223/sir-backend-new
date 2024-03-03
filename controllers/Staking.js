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
const holdcbbs = require("../models/HoldCBB");
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
const nowIST = new Date();
nowIST.setUTCHours(nowIST.getUTCHours(), nowIST.getUTCMinutes(), 0, 0); // Convert to IST

const todayIST = new Date(nowIST);
todayIST.setHours(0, 0, 0, 0);

const nextDayIST = new Date(todayIST);
nextDayIST.setDate(nextDayIST.getDate() + 1);
nextDayIST.setHours(0, 0, 0, 0);
// Get the current date
const currentDate = moment();

// // Set the start time to 7:00 PM today
// const startOfDay = currentDate.clone().set({ hour: 19, minute: 0, second: 0, millisecond: 0 }).toDate();

// // Set the end time to 7:00 PM tomorrow
// const endOfDay  = currentDate.clone().add(1, 'day').set({ hour: 19, minute: 0, second: 0, millisecond: 0 }).toDate();
// console.log(startOfDay);
// console.log(endOfDay  );

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
      }, {
        $graphLookup: {
          from: "users",
          startWith: "$username",
          connectFromField: "username",
          connectToField: "mainId",
          as: "refers_to123",
        },
      },
      {
        $lookup: {
          from: "stakings",
          localField: "refers_to123._id",
          foreignField: "userId",
          as: "amountaa2",
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
          }, cbbtotal1: {
            $reduce: {
              input: "$amountaa2",
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
            cbbteamtotalstack: Math.round(aggregatedUserData[0].total + aggregatedUserData[0].cbbtotal1),
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

const SCBupdate = async ({ decoded, daat, ReffData1 }) => {
  await updateRecord(
    Usermodal,
    { username: ReffData1.username },
    {
      leval: Number(decoded.profile.mystack === 0 ? daat.length + 1 : daat.length),
    }
  ).then(async (data) => {
    const Refflevalncome = await findOneRecord(Usermodal, {
      username: decoded.profile.username,
      isValid: true,
    });

    console.log("==========================================================>daatdaat", daat);
    // if (!Refflevalncome) {
    //   return;
    // }
    const Refflevalncomex1 = await findOneRecord(Usermodal, {
      username: Refflevalncome.mainId,
      isValid: true,
    });
    await amountupdate(Refflevalncomex1.username)
    // if (!Refflevalncomex1) {
    //   return;
    // }
    console.log("Refflevalncome1==================================>>>>>>>>>>>>>", Math.ceil(req.body.Amount / 90 * SIRprice.price));
    if (Refflevalncomex1.leval >= 1) {
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: Refflevalncomex1._id,
      });

      if (StakingData.length > 0) {
        const StakingData1 = await Stakingmodal.find({
          userId: Refflevalncomex1._id,
          leval: 0,
        });
        let totalstaking = 0;
        for (let i = 0; i < StakingData1.length; i++) {
          totalstaking += StakingData1[i].Amount;
        }

        let data1 = {
          userId: Refflevalncomex1._id,
          Note: `You Got Level ${1} Income`,
          Usernameby: decoded.profile.username,
          Amount: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 3) / 100,
        };
        const a1 = await Walletmodal.findOne({ userId: Refflevalncomex1._id })
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex1._id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 3) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex1._id,
            Note: `You Got Level ${1} Income`,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 3) / 100),
            Usernameby: decoded.profile.username,
            balace: res.incomeWallet,
            type: 1,
            Active: true,
          }).save();
        });
        await Communitymodal(data1).save();
      }
    } else {
      await HoldCBB({
        userId: Refflevalncomex1._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 3) / 100),
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
        let data2 = {
          userId: Refflevalncomex2._id,
          Note: `You Got Level ${2} Income`,
          Usernameby: decoded.profile.username,
          Amount: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 2) / 100,
        };
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex2._id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 2) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex2._id,
            Note: `You Got Level ${2} Income`,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 2) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex2._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 2) / 100),
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
        let data3 = {
          userId: Refflevalncomex3._id,
          Note: `You Got Level ${3} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex3._id,
          },
          { $inc: { incomeWallet: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1.5) / 100 } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex3._id,
            Note: `You Got Level ${3} Income`,
            Usernameby: decoded.profile.username,
            Amount: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1.5) / 100,
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
    else {
      await HoldCBB({
        userId: Refflevalncomex3._id,
        Usernameby: decoded.profile.username,
        Amount: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1.5) / 100,
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
        let data4 = {
          userId: Refflevalncomex4._id,
          Note: `You Got Level ${4} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex4._id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex4._id,
            Note: `You Got Level ${4} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex4._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
      let id = await Refflevalncomex5._id
      console.log("Refflevalncomex5===>>",);
      if (StakingData.length > 0) {
        let data5 = {
          userId: Refflevalncomex5._id,
          Note: `You Got Level ${5} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${5} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex5._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
        let data6 = {
          userId: Refflevalncomex6._id,
          Note: `You Got Level ${6} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex6._id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex6._id,
            Note: `You Got Level ${6} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex6._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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

        let data7 = {
          userId: Refflevalncomex7._id,
          Note: `You Got Level ${7} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: Refflevalncomex7._id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: Refflevalncomex7._id,
            Note: `You Got Level ${7} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex7._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        leval: 7,
        Active: false
      }).save()
    }
    const Refflevalncomex8 = await findOneRecord(Usermodal, {
      username: Refflevalncomex7.mainId,
    });
    if (!Refflevalncomex8) {
      return;
    }
    if (Refflevalncomex8.leval >= 8) {
      let id = await Refflevalncomex8._id;
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {

        let data8 = {
          userId: id,
          Note: `You Got Level ${8} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal, {
          userId: id,
        }, {
          $inc: {
            incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100)
          }
        }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${8} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    else {
      let id = await Refflevalncomex8._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        leval: 8,
        Active: false
      }).save()
    }
    const Refflevalncomex9 = await findOneRecord(Usermodal, {
      username: Refflevalncomex8.mainId,
    });
    if (!Refflevalncomex9) {
      return;
    }
    if (Refflevalncomex9.leval >= 9) {
      let id = await Refflevalncomex9._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {


        let data9 = {
          userId: id,
          Note: `You Got Level ${9} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${9} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      let id = await Refflevalncomex9._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
      let id = await Refflevalncomex10._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data10 = {
          userId: id,
          Note: `You Got Level ${10} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          let id = await Refflevalncomex10._id
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${10} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      let id = await Refflevalncomex10._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
      let id = await Refflevalncomex11._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data11 = {
          userId: id,
          Note: `You Got Level ${11} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${11} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      let id = await Refflevalncomex11._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
      let id = await Refflevalncomex12._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data12 = {
          userId: id,
          Note: `You Got Level ${12} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${12} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
    } else {
      let id = await Refflevalncomex12._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 0.5) / 100),
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
      let id = await Refflevalncomex13._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data13 = {
          userId: id,
          Note: `You Got Level ${13} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${13} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
    } else {
      let id = await Refflevalncomex13._id
      await HoldCBB({
        userId: id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
      let id = await Refflevalncomex14._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data14 = {
          userId: id,
          Note: `You Got Level ${14} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${14} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        leval: 14,
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
      let id = await Refflevalncomex15._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {

        let data15 = {
          userId: id,
          Note: `You Got Level ${15} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100 } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${15} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
    } else {
      await HoldCBB({
        userId: Refflevalncomex15._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        leval: 16,
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
      let id = await Refflevalncomex16._id
      const StakingData = await findAllRecord(Stakingmodal, {
        userId: id,
      });
      if (StakingData.length > 0) {
        let data16 = {
          userId: id,
          Note: `You Got Level ${16} Income`,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        };
        await updateRecord(
          Walletmodal,
          {
            userId: id,
          },
          { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100) } }
        ).then(async (res) => {
          await Ewallateesc({
            userId: id,
            Note: `You Got Level ${16} Income`,
            Usernameby: decoded.profile.username,
            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
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
        let id = await Refflevalncomex16._id
        await HoldCBB({
          userId: id,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
          leval: 15,
          Active: false
        }).save()
      }
    } else {
      await HoldCBB({
        userId: Refflevalncomex16._id,
        Usernameby: decoded.profile.username,
        Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 1) / 100),
        leval: 15,
        Active: false
      }).save()
    }
  })
}
const CCBupdate = async ({ data }) => {
  const supporterIds = [];
  let supporterId = data.supporterId;
  let dat12 = [10, 7, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 2, 3, 5]
  // Populate supporterIds array with supporterId for each level
  for (let i = 1; i <= 16; i++) {
    const Refflevalncome = await findOneRecord(Usermodal, {
      username: supporterId,
      isValid: true,
    });

    if (!Refflevalncome) break;

    supporterIds.push(Refflevalncome._id);
    supporterId = Refflevalncome.supporterId;
  }

  // Calculate and save staking details for each level
  for (let i = 1; i <= supporterIds.length; i++) {
    const Refflevalncome = await findOneRecord(Usermodal, {
      _id: supporterIds[i - 1],
    });

    await Stakingmodal({
      userId: Refflevalncome._id,
      WalletType: `Level ${i} plan (${decoded.profile.username})`,
      DailyReword: Number((req.body.Amount * (dat12[i])) / 1000) * 2,
      bonusAmount: 200,
      leval: i,
      Amount: (req.body.Amount * (dat12[i])) / 100,
      TotalRewordRecived: (req.body.Amount * (dat12[i])) / 100 * 2,
      transactionHash: "",
      Active: Refflevalncome.leval >= i,
    }).save();
  }
};
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
                              ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                          },
                        }
                      )
                        .then(async (res) => {
                          await Ewallateesc({
                            userId: ReffData?._id,
                            Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                            type: 1,
                            balace: res.incomeWallet,
                            Active: true,
                          }).save();
                          await Stakingbonus({
                            userId: ReffData?._id,
                            ReffId: decoded.profile._id,
                            Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                            Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                            Active: true,
                          }).save();
                        });
                    }
                    // }
                    const daat = await Usermodal.aggregate([
                      {
                        '$match': {
                          'mainId': ReffData1.username
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
                    await SCBupdate({ decoded, daat, ReffData1 })
                    await CCBupdate({ daat })

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
                        const ReffData1 = await findOneRecord(Usermodal, {
                          username: data.mainId,
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
                                    ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                                },
                              }
                            )
                              .then(async (res) => {
                                await Ewallateesc({
                                  userId: ReffData?._id,
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                                  type: 1,
                                  balace: res.incomeWallet,
                                  Active: true,
                                }).save();
                                await Stakingbonus({
                                  userId: ReffData?._id,
                                  ReffId: decoded.profile._id,
                                  Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * 5) / 100),
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Active: true,
                                }).save();
                              });
                          }
                          // }
                          const daat = await Usermodal.aggregate([
                            {
                              '$match': {
                                'mainId': ReffData1.username
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
                          await SCBupdate({ decoded, daat, ReffData1 })
                          await CCBupdate({ daat })

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
          // const StakingDataqq = await Stakingmodal.find({})
          // const withdrawalmodalqq = await withdrawalmodal.find({})

          // const last15DaysData = StakingDataqq.filter(doc => moment(doc.createdAt).isAfter(moment().subtract(15, 'days')));

          // // Create an object to hold daily totals
          // const dailyTotals = {};

          // // Aggregate total amount day by day
          // last15DaysData.forEach(entry => {
          //   const dateKey = moment(entry.createdAt).format('DD/MM/YYYY'); // Format date as 'DD/MM/YYYY'
          //   console.log("dailyTotals[dateKey]", dailyTotals[dateKey] || 0);
          //   dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.Amount;
          // });

          // // Create an array of formatted data for the last 15 days
          // const formattedData = Object.entries(dailyTotals).map(([date, total, total2]) => ({
          //   date,
          //   total2, total
          // }));


          // // Ensure all dates in the last 15 days are represented, even if the amount is 0
          // const today = moment();
          // for (let i = 14; i >= 0; i--) {
          //   const date = today.subtract(i, 'days').format('DD/MM/YYYY');
          //   if (!dailyTotals[date]) {
          //     formattedData.push({ date, total: 0, total2: 0 });
          //   }
          // }
          // withdrawalmodalqq.forEach(entry => {
          //   const dateKey = moment(entry.createdAt).format('DD/MM/YYYY'); // Format date as 'DD/MM/YYYY'
          //   console.log("dailyTotalssss[dateKey]", dailyTotals);
          //   dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.Amount; // Assuming 'amount2' is the field containing withdrawal amounts
          // });



          // // Sort formatted data by date in ascending order
          // formattedData.sort((a, b) => moment(a.date, 'DD/MM/YYYY') - moment(b.date, 'DD/MM/YYYY'));

          const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            SIRprice: SIRprice.price,
            // formattedData: formattedData
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
          leval: 0
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
          }, {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
              as: "amount21",
              pipeline: [
                {
                  $match: {
                    leval: 0,
                    createdAt: {
                      $gte: new Date(todayIST),
                      $lt: new Date(nextDayIST)
                    }
                  }
                }
              ]
            }
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
              total3: {
                $reduce: {
                  input: "$amount21",
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
              todaymyteam: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$amount2",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $gte: ["$$item.createdAt", new Date(todayIST)],
                          },
                          {
                            $lt: ["$$item.createdAt", new Date(nextDayIST)],
                          },
                        ],
                      },
                    },
                  },
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              }, todaymy: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$amount",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $gte: ["$$item.createdAt", new Date(todayIST)],
                          },
                          {
                            $lt: ["$$item.createdAt", new Date(nextDayIST)],
                          },
                        ],
                      },
                    },
                  },
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
                  },
                },
              },
              // todaytotal1: {
              //   $reduce: {
              //     input: "$amount2",
              //     initialValue: 0,
              //     in: {
              //       $add: ["$$value", "$$this.Amount"],
              //     },
              //   },
              // },
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
                    Removed: false
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
              }, amountupcommin12: {
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
                          "$$this.TotalRewordRecived"
                        ]
                      }
                    ]
                  },
                },
              }
              , holdincomeSCB: {
                $reduce: {
                  input: "$amountupcoming1",
                  initialValue: 0,
                  in: {
                    $add: ["$$value",
                      "$$this.TotalRewordRecived"],
                  },
                },
              },
              holdincome: {
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
                                  28,
                                ],
                              },
                              "You have received your level",
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
                              {
                                $substr: [
                                  "$$this.Note",
                                  0,
                                  15,
                                ],
                              },
                              "You Got Staking",
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
                  input: {
                    $filter: {
                      input: "$amount131",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $gte: ["$$item.createdAt", new Date(todayIST)],
                          },
                          {
                            $lt: ["$$item.createdAt", new Date(nextDayIST)],
                          }
                        ],
                      },
                    },
                  },
                  initialValue: 0,
                  in: {
                    $add: ["$$value", "$$this.Amount"],
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
        todaytotal1: aggregatedUserData[0].todaymyteam,
        todaymy: aggregatedUserData[0].todaymy,
        lockamount: aggregatedUserData[0].total2,
        teamtotalstack: aggregatedUserData[0].total1 + aggregatedUserData[0].total / 90 * SIRprice.price,
        ReffData: data[0].referBYCount,
        ReffData1: data1,
        ReffData2: data22,
        income: data123,
        stakingData: stakingData,
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
                      Note: `You have received coin from ${decoded.profile.username}`,
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
  holdcbbs: async (req, res) => {
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
          let data = await findAllRecord(holdcbbs, {
            userId: decoded.profile._id, Active: false
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
