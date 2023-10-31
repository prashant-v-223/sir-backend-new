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
const Stakingmodal = require("../models/Staking");
const Walletmodal = require("../models/Wallet");
const Usermodal = require("../models/user");
const Stakingbonus = require("../models/Stakingbonus");
const Transactionmodal = require("../models/Transaction");
const Communitymodal = require("../models/Community");
const Achivementmodal = require("../models/Achivement");
const Passivemodal = require("../models/Passive");
const V4Xpricemodal = require("../models/V4XLiveRate");
const Achivement = require("../models/Achivement");
const Mainwallatesc = require("../models/Mainwallate");
const Ewallateesc = require("../models/Ewallate");
const env = require("../env");
const Web3 = require("web3");
const otp = require("../models/otp");
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

    if (refExists.mainId === null) {
      if (refExists.referred.length < 5) {
        const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
          $set: {
            supporterId: refExists.supporterId || refExists.refId,
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
    } else {
      await getRef(refId, refId, id);
      const refIdExistsInReferred = await Usermodal.findOne({ referred: { $elemMatch: { $eq: refId } } });
      if (refIdExistsInReferred) {
        refIdExistsInReferred.nextRefIdsToBeSkipped.push(refId);
        await refIdExistsInReferred.save();
      }
    }

  }


}
exports.stack = {
  Buystack: async (req, res) => {
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
          const WalletData = await findOneRecord(Walletmodal, {
            userId: decoded.profile._id,
          })
          if (req.body.WalletType !== "dappwalletstacking") {
            let data1 = await otp.find({
              userId: decoded.profile._id,
              otp: Number(req.body.otp),
            });
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
                  if (ReffData?._id !== null) {

                    const StakingData = await findAllRecord(Stakingmodal, {
                      userId: ReffData._id,
                    });
                    if (StakingData.length > 0) {
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
                                (req.body.Amount * 5) / 100,
                            },
                          }
                        )
                          .then(async (res) => {
                            await Ewallateesc({
                              userId: ReffData?._id,
                              Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                              Amount: (req.body.Amount * 5) / 100,
                              type: 1,
                              balace: res.incomeWallet,
                              Active: true,
                            }).save();
                            await Stakingbonus({
                              userId: ReffData?._id,
                              ReffId: decoded.profile._id,
                              Amount: (req.body.Amount * 5) / 100,
                              Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                              Active: true,
                            }).save();
                          });
                      }
                    }
                    const daat = await Usermodal.find({ mainId: ReffData.username })
                    await updateRecord(
                      Usermodal,
                      { _id: ReffData?._id },
                      {
                        leval: Number(daat.length),
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
                          let data1 = {
                            userId: Refflevalncomex1._id,
                            Note: `You Got Level ${1} Income`,
                            Usernameby: decoded.profile.username,
                            Amount: (req.body.Amount * 3) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex1._id,
                            },
                            { $inc: { incomeWallet: (req.body.Amount * 3) / 100 } }
                          ).then(async (res) => {
                            await Ewallateesc({
                              userId: Refflevalncomex1._id,
                              Note: `You Got Level ${1} Income`,
                              Amount: (req.body.Amount * 3) / 100,
                              Usernameby: decoded.profile.username,
                              balace: res.mainWallet,
                              type: 1,
                              Active: true,
                            }).save();
                          });
                          await Communitymodal(data1).save();
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
                            Amount: (req.body.Amount * 2) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex2._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex2._id,
                              Note: `You Got Level ${2} Income`,
                              Amount: (req.body.Amount * 2) / 100,
                              Usernameby: decoded.profile.username,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 2) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex3._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex3._id,
                              Note: `You Got Level ${3} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 2) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex4._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex4._id,
                              Note: `You Got Level ${4} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 1) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncome5?._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncome5?._id,
                              Note: `You Got Level ${5} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex6._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex6._id,
                              Note: `You Got Level ${6} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex7._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex7._id,
                              Note: `You Got Level ${7} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex8._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex8._id,
                              Note: `You Got Level ${8} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex9._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex9._id,
                              Note: `You Got Level ${9} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex10._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex10._id,
                              Note: `You Got Level ${10} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex11._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex11._id,
                              Note: `You Got Level ${11} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex12._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex12._id,
                              Note: `You Got Level ${12} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex13._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex13._id,
                              Note: `You Got Level ${13} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 0.5) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex14._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex14._id,
                              Note: `You Got Level ${14} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 0.5) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 1) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex15._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex15._id,
                              Note: `You Got Level ${15} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 1) / 100,
                              balace: res.mainWallet,
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
                            Amount: (req.body.Amount * 2) / 100,
                          };
                          await updateRecord(
                            Walletmodal,
                            {
                              userId: Refflevalncomex16._id,
                            },
                            { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                          ).then(async (res) => {
                            await Mainwallatesc({
                              userId: Refflevalncomex16._id,
                              Note: `You Got Level ${16} Income`,
                              Usernameby: decoded.profile.username,
                              Amount: (req.body.Amount * 2) / 100,
                              balace: res.mainWallet,
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
                    })
                    const Refflevalncome1 = await findOneRecord(Usermodal, {
                      username: data.supporterId,
                    });
                    console.log("Refflevalncome", Refflevalncome1);
                    if (Refflevalncome1) {
                      await Stakingmodal({
                        userId: Refflevalncome1?._id,
                        WalletType: `Level ${1} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 10) / 100 / 1000),
                        leval: 1,
                        bonusAmount: 100,
                        Amount: (req.body.Amount * 10) / 100,
                        TotalRewordRecived: (req.body.Amount * 10) / 100,
                        transactionHash: "",
                        Active: Refflevalncome1.leval >= 1,
                      }).save();
                    }
                    const Refflevalncome2 = await findOneRecord(Usermodal, {
                      username: Refflevalncome1?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome2) {
                      await Stakingmodal({
                        userId: Refflevalncome2?._id,
                        WalletType: `Level ${2} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 7) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 2,
                        Amount: (req.body.Amount * 7) / 100,
                        TotalRewordRecived: (req.body.Amount * 7) / 100,
                        transactionHash: "",
                        Active: Refflevalncome2.leval >= 2,
                      }).save();
                    }
                    const Refflevalncome3 = await findOneRecord(Usermodal, {
                      username: Refflevalncome2?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome3) {
                      await Stakingmodal({
                        userId: Refflevalncome3?._id,
                        WalletType: `Level ${3} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                        leval: 3,
                        bonusAmount: 100,
                        Amount: (req.body.Amount * 5) / 100,
                        TotalRewordRecived: (req.body.Amount * 5) / 100,
                        transactionHash: "",
                        Active: Refflevalncome3.leval >= 3,
                      }).save();
                    }
                    const Refflevalncome4 = await findOneRecord(Usermodal, {
                      username: Refflevalncome3?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome4) {
                      await Stakingmodal({
                        userId: Refflevalncome4?._id,
                        WalletType: `Level ${4} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 4) / 100 / 1000),
                        leval: 4,
                        bonusAmount: 100,
                        Amount: (req.body.Amount * 4) / 100,
                        TotalRewordRecived: (req.body.Amount * 4) / 100,
                        transactionHash: "",
                        Active: Refflevalncome4.leval >= 4,
                      }).save();
                    }
                    const Refflevalncome5 = await findOneRecord(Usermodal, {
                      username: Refflevalncome4?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome5) {
                      await Stakingmodal({
                        userId: Refflevalncome5?._id,
                        WalletType: `Level ${5} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                        leval: 5,
                        bonusAmount: 100,
                        Amount: (req.body.Amount * 3) / 100,
                        TotalRewordRecived: (req.body.Amount * 3) / 100,
                        transactionHash: "",
                        Active: Refflevalncome5.leval >= 5,
                      }).save();
                    }
                    const Refflevalncome6 = await findOneRecord(Usermodal, {
                      username: Refflevalncome5?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome6) {
                      await Stakingmodal({
                        userId: Refflevalncome6?._id,
                        WalletType: `Level ${6} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 6,
                        Amount: (req.body.Amount * 2) / 100,
                        TotalRewordRecived: (req.body.Amount * 2) / 100,
                        transactionHash: "",
                        Active: Refflevalncome6.leval >= 6,
                      }).save();
                    }
                    const Refflevalncome7 = await findOneRecord(Usermodal, {
                      username: Refflevalncome6?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome7) {
                      await Stakingmodal({
                        userId: Refflevalncome7?._id,
                        WalletType: `Level ${7} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 7,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome7.leval >= 7,
                      }).save();
                    }
                    const Refflevalncome8 = await findOneRecord(Usermodal, {
                      username: Refflevalncome7?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome8) {
                      await Stakingmodal({
                        userId: Refflevalncome8?._id,
                        WalletType: `Level ${8} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 8,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome8.leval >= 8,
                      }).save();
                    }
                    const Refflevalncome9 = await findOneRecord(Usermodal, {
                      username: Refflevalncome8?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome9) {
                      await Stakingmodal({
                        userId: Refflevalncome9?._id,
                        WalletType: `Level ${9} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 9,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome9.leval >= 9,
                      }).save();
                    }
                    const Refflevalncome10 = await findOneRecord(Usermodal, {
                      username: Refflevalncome9?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome10) {

                      await Stakingmodal({
                        userId: Refflevalncome10?._id,
                        WalletType: `Level ${10} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 10,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome10.leval >= 10,
                      }).save();
                    }
                    const Refflevalncome11 = await findOneRecord(Usermodal, {
                      username: Refflevalncome10?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome11) {
                      await Stakingmodal({
                        userId: Refflevalncome11?._id,
                        WalletType: `Level ${11} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 11,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome11.leval >= 11,
                      }).save();
                    }
                    const Refflevalncome12 = await findOneRecord(Usermodal, {
                      username: Refflevalncome11?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome12) {

                      await Stakingmodal({
                        userId: Refflevalncome12?._id,
                        WalletType: `Level ${12} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 12,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome12.leval >= 12,
                      }).save();
                    }

                    const Refflevalncome13 = await findOneRecord(Usermodal, {
                      username: Refflevalncome12?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome13) {
                      await Stakingmodal({
                        userId: Refflevalncome13?._id,
                        WalletType: `Level ${13} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 13,
                        Amount: (req.body.Amount * 1) / 100,
                        TotalRewordRecived: (req.body.Amount * 1) / 100,
                        transactionHash: "",
                        Active: Refflevalncome13.leval >= 13,
                      }).save();
                    }
                    const Refflevalncome14 = await findOneRecord(Usermodal, {
                      username: Refflevalncome13?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome14) {
                      await Stakingmodal({
                        userId: Refflevalncome14?._id,
                        WalletType: `Level ${14} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 14,
                        Amount: (req.body.Amount * 2) / 100,
                        TotalRewordRecived: (req.body.Amount * 2) / 100,
                        transactionHash: "",
                        Active: Refflevalncome14.leval >= 14,
                      }).save();
                    }
                    const Refflevalncome15 = await findOneRecord(Usermodal, {
                      username: Refflevalncome14?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome15) {
                      await Stakingmodal({
                        userId: Refflevalncome15?._id,
                        WalletType: `Level ${15} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 15,
                        Amount: (req.body.Amount * 3) / 100,
                        TotalRewordRecived: (req.body.Amount * 3) / 100,
                        transactionHash: "",
                        Active: Refflevalncome15.leval >= 15,
                      }).save();
                    }
                    const Refflevalncome16 = await findOneRecord(Usermodal, {
                      username: Refflevalncome15?.supporterId,
                      isValid: true, mystack: { $gt: 0 },
                    });
                    if (Refflevalncome16) {
                      await Stakingmodal({
                        userId: Refflevalncome16?._id,
                        WalletType: `Level ${16} plan (${decoded.profile.username})`,
                        DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                        bonusAmount: 100,
                        leval: 16,
                        Amount: (req.body.Amount * 5) / 100,
                        TotalRewordRecived: (req.body.Amount * 5) / 100,
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
                    // const ReffData = await findOneRecord(Usermodal, {
                    //   username: decoded.profile.supporterId,
                    // });
                    // if (ReffData._id !== null) {
                    //   const StakingData = await findAllRecord(Stakingmodal, {
                    //     userId: ReffData._id,
                    //   });
                    //   if (StakingData.length > 0) {
                    //     const data123 = await Stakingbonus.find({ Note: `You Got Refer and Earn Income From ${decoded.profile.username}` })
                    //     if (data123.length <= 0) {
                    //       await updateRecord(
                    //         Walletmodal,
                    //         {
                    //           userId: ReffData._id,
                    //         },
                    //         {
                    //           $inc: {
                    //             incomeWallet:
                    //               (req.body.Amount * 5) / 100,
                    //           },
                    //         }
                    //       )
                    //         .then(async (res) => {
                    //           await Ewallateesc({
                    //             userId: ReffData?._id,
                    //             Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    //             Amount: (req.body.Amount * 5) / 100,
                    //             type: 1,
                    //             balace: res.incomeWallet,
                    //             Active: true,
                    //           }).save();
                    //           await Stakingbonus({
                    //             userId: ReffData?._id,
                    //             ReffId: decoded.profile._id,
                    //             Amount: (req.body.Amount * 5) / 100,
                    //             Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //     }
                    //   }
                    //   const daat = await Usermodal.find({ mainId: ReffData.username })
                    //   console.log(ReffData);
                    //   await updateRecord(
                    //     Usermodal,
                    //     { _id: ReffData?._id },
                    //     {
                    //       leval: Number(daat.length),
                    //     }
                    //   ).then(async () => {
                    //     const Refflevalncome = await findOneRecord(Usermodal, {
                    //       username: decoded.profile.username,
                    //       isValid: true,
                    //     });

                    //     if (!Refflevalncome) {
                    //       return;
                    //     }
                    //     const Refflevalncomex1 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncome.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex1) {
                    //       return;
                    //     }
                    //     console.log("Refflevalncome1", Refflevalncomex1);
                    //     if (Refflevalncomex1.leval >= 1) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex1._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data1 = {
                    //           userId: Refflevalncomex1._id,
                    //           Note: `You Got Level ${1} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 3) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex1._id,
                    //           },
                    //           { $inc: { incomeWallet: (req.body.Amount * 3) / 100 } }
                    //         ).then(async (res) => {
                    //           await Ewallateesc({
                    //             userId: Refflevalncomex1._id,
                    //             Note: `You Got Level ${1} Income`,
                    //             Amount: (req.body.Amount * 3) / 100,
                    //             Usernameby: decoded.profile.username,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data1).save();
                    //       }
                    //     }
                    //     const Refflevalncomex2 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex1.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex2) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex2.leval >= 2) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex2._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data2 = {
                    //           userId: Refflevalncomex2._id,
                    //           Note: `You Got Level ${2} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 2) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex2._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex2._id,
                    //             Note: `You Got Level ${2} Income`,
                    //             Amount: (req.body.Amount * 2) / 100,
                    //             Usernameby: decoded.profile.username,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });

                    //         await Communitymodal(data2).save();
                    //         console.log("===============>22", {
                    //           Refflevalncomex2,
                    //           data2,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex3 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex2.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex3) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex3.leval >= 3) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex3._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data3 = {
                    //           userId: Refflevalncomex3._id,
                    //           Note: `You Got Level ${3} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 2) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex3._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex3._id,
                    //             Note: `You Got Level ${3} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 2) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data3).save();

                    //         console.log("===============>33", {
                    //           Refflevalncomex3,
                    //           data3,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex4 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex3.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex4) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex4.leval >= 4) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex4._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data4 = {
                    //           userId: Refflevalncomex4._id,
                    //           Note: `You Got Level ${4} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 1) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex4._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex4._id,
                    //             Note: `You Got Level ${4} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 1) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data4).save();

                    //         console.log("===============>44", {
                    //           Refflevalncomex4,
                    //           data4,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex5 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex4.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex5) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex5.leval >= 5) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex5._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data5 = {
                    //           userId: Refflevalncomex5._id,
                    //           Note: `You Got Level ${5} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncome5?._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncome5?._id,
                    //             Note: `You Got Level ${5} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data5).save();

                    //         console.log("===============>55", {
                    //           Refflevalncomex5,
                    //           data5,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex6 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex5.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex6) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex6.leval >= 6) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex6._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data6 = {
                    //           userId: Refflevalncomex6._id,
                    //           Note: `You Got Level ${6} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex6._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex6._id,
                    //             Note: `You Got Level ${6} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data6).save();

                    //         console.log("===============>66", {
                    //           Refflevalncomex6,
                    //           data6,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex7 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex6.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex7) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex7.leval >= 7) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex7._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data7 = {
                    //           userId: Refflevalncomex7._id,
                    //           Note: `You Got Level ${7} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex7._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex7._id,
                    //             Note: `You Got Level ${7} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data7).save();

                    //         console.log("===============>77", {
                    //           Refflevalncomex7,
                    //           data7,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex8 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex7.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncome8) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex8.leval >= 8) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex8._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data8 = {
                    //           userId: Refflevalncomex8._id,
                    //           Note: `You Got Level ${8} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex8._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex8._id,
                    //             Note: `You Got Level ${8} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data8).save();

                    //         console.log("===============>88", {
                    //           Refflevalncomex8,
                    //           data8,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex9 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncome8.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex9) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex9.leval >= 9) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex9._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data9 = {
                    //           userId: Refflevalncomex9._id,
                    //           Note: `You Got Level ${9} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex9._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex9._id,
                    //             Note: `You Got Level ${9} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data9).save();

                    //         console.log("===============>99", {
                    //           Refflevalncomex9,
                    //           data9,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex10 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex9.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex10) {
                    //       return;
                    //     }

                    //     if (Refflevalncomex10.leval >= 10) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex10._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data10 = {
                    //           userId: Refflevalncomex10._id,
                    //           Note: `You Got Level ${10} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex10._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex10._id,
                    //             Note: `You Got Level ${10} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data10).save();

                    //         console.log("===============>1010", {
                    //           Refflevalncomex10,
                    //           data10,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex11 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex10.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex11) {
                    //       return;
                    //     }

                    //     if (Refflevalncomex11.leval >= 11) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex11._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data11 = {
                    //           userId: Refflevalncomex11._id,
                    //           Note: `You Got Level ${11} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex11._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex11._id,
                    //             Note: `You Got Level ${11} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data11).save();

                    //         console.log("===============>1111", {
                    //           Refflevalncomex11,
                    //           data11,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex12 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex11.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex12) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex12.leval >= 12) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex12._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data12 = {
                    //           userId: Refflevalncomex12._id,
                    //           Note: `You Got Level ${12} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex12._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex12._id,
                    //             Note: `You Got Level ${12} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data12).save();

                    //         console.log("===============>1212", {
                    //           Refflevalncomex12,
                    //           data12,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex13 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex12.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex13) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex13.leval >= 13) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex13._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data13 = {
                    //           userId: Refflevalncomex13._id,
                    //           Note: `You Got Level ${13} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex13._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex13._id,
                    //             Note: `You Got Level ${13} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data13).save();

                    //         console.log("===============>1313", {
                    //           Refflevalncomex13,
                    //           data13,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex14 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex13.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex14) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex14.leval >= 14) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex14._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data14 = {
                    //           userId: Refflevalncomex14._id,
                    //           Note: `You Got Level ${14} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 0.5) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex14._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex14._id,
                    //             Note: `You Got Level ${14} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 0.5) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data14).save();

                    //         console.log("===============>1414", {
                    //           Refflevalncomex14,
                    //           data14,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex15 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex14.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex15) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex15.leval >= 15) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex15._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data15 = {
                    //           userId: Refflevalncomex15._id,
                    //           Note: `You Got Level ${15} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 1) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex15._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex15._id,
                    //             Note: `You Got Level ${15} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 1) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data15).save();

                    //         console.log("===============>1515", {
                    //           Refflevalncomex15,
                    //           data15,
                    //         });
                    //       }
                    //     }
                    //     const Refflevalncomex16 = await findOneRecord(Usermodal, {
                    //       username: Refflevalncomex15.mainId,
                    //       isValid: true,
                    //     });
                    //     if (!Refflevalncomex16) {
                    //       return;
                    //     }
                    //     if (Refflevalncomex16.leval >= 16) {
                    //       const StakingData = await findAllRecord(Stakingmodal, {
                    //         userId: Refflevalncomex16._id,
                    //       });
                    //       if (StakingData.length > 0) {
                    //         let data16 = {
                    //           userId: Refflevalncomex16._id,
                    //           Note: `You Got Level ${16} Income`,
                    //           Usernameby: decoded.profile.username,
                    //           Amount: (req.body.Amount * 2) / 100,
                    //         };
                    //         await updateRecord(
                    //           Walletmodal,
                    //           {
                    //             userId: Refflevalncomex16._id,
                    //           },
                    //           { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                    //         ).then(async (res) => {
                    //           await Mainwallatesc({
                    //             userId: Refflevalncomex16._id,
                    //             Note: `You Got Level ${16} Income`,
                    //             Usernameby: decoded.profile.username,
                    //             Amount: (req.body.Amount * 2) / 100,
                    //             balace: res.mainWallet,
                    //             type: 1,
                    //             Active: true,
                    //           }).save();
                    //         });
                    //         await Communitymodal(data16).save();

                    //         console.log("===============>1616", {
                    //           Refflevalncome16,
                    //           data16,
                    //         });
                    //       }
                    //     }
                    //   })
                    //   const Refflevalncome1 = await findOneRecord(Usermodal, {
                    //     username: decoded.profile.supporterId,
                    //     isValid: true,
                    //   });
                    //   console.log("Refflevalncome", Refflevalncome1);
                    //   if (Refflevalncome1) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome1?._id,
                    //       WalletType: `Level ${1} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 10) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 1,
                    //       Amount: (req.body.Amount * 10) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 10) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome1.leval >= 1,
                    //     }).save();
                    //   }
                    //   const Refflevalncome2 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome1?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome2) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome2?._id,
                    //       WalletType: `Level ${2} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 7) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 2,
                    //       Amount: (req.body.Amount * 7) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 7) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome2.leval >= 2,
                    //     }).save();
                    //   }
                    //   const Refflevalncome3 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome2?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome3) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome3?._id,
                    //       WalletType: `Level ${3} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 3,
                    //       Amount: (req.body.Amount * 5) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 5) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome3.leval >= 3,
                    //     }).save();
                    //   }
                    //   const Refflevalncome4 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome3?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome4) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome4?._id,
                    //       WalletType: `Level ${4} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 4) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 4,
                    //       Amount: (req.body.Amount * 4) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 4) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome4.leval >= 4,
                    //     }).save();
                    //   }
                    //   const Refflevalncome5 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome4?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome5) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome5?._id,
                    //       WalletType: `Level ${5} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 5,
                    //       Amount: (req.body.Amount * 3) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 3) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome5.leval >= 5,
                    //     }).save();
                    //   }
                    //   const Refflevalncome6 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome5?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome6) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome6?._id,
                    //       WalletType: `Level ${6} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 6,
                    //       Amount: (req.body.Amount * 2) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 2) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome6.leval >= 6,
                    //     }).save();
                    //   }
                    //   const Refflevalncome7 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome6?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome7) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome7?._id,
                    //       WalletType: `Level ${7} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 7,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome7.leval >= 7,
                    //     }).save();
                    //   }
                    //   const Refflevalncome8 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome7?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome8) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome8?._id,
                    //       WalletType: `Level ${8} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 8,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome8.leval >= 8,
                    //     }).save();
                    //   }
                    //   const Refflevalncome9 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome8?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome9) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome9?._id,
                    //       WalletType: `Level ${9} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 9,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome9.leval >= 9,
                    //     }).save();
                    //   }
                    //   const Refflevalncome10 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome9?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome10) {

                    //     await Stakingmodal({
                    //       userId: Refflevalncome10?._id,
                    //       WalletType: `Level ${10} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 10,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome10.leval >= 10,
                    //     }).save();
                    //   }
                    //   const Refflevalncome11 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome10?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome11) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome11?._id,
                    //       WalletType: `Level ${11} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 11,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome11.leval >= 11,
                    //     }).save();
                    //   }
                    //   const Refflevalncome12 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome11?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome12) {

                    //     await Stakingmodal({
                    //       userId: Refflevalncome12?._id,
                    //       WalletType: `Level ${12} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 12,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome12.leval >= 12,
                    //     }).save();
                    //   }

                    //   const Refflevalncome13 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome12?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome13) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome13?._id,
                    //       WalletType: `Level ${13} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 13,
                    //       Amount: (req.body.Amount * 1) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 1) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome13.leval >= 13,
                    //     }).save();
                    //   }
                    //   const Refflevalncome14 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome13?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome14) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome14?._id,
                    //       WalletType: `Level ${14} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 14,
                    //       Amount: (req.body.Amount * 2) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 2) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome14.leval >= 14,
                    //     }).save();
                    //   }
                    //   const Refflevalncome15 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome14?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome15) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome15?._id,
                    //       WalletType: `Level ${15} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 15,
                    //       Amount: (req.body.Amount * 3) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 3) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome15.leval >= 15,
                    //     }).save();
                    //   }
                    //   const Refflevalncome16 = await findOneRecord(Usermodal, {
                    //     username: Refflevalncome15?.supporterId,
                    //     isValid: true,
                    //   });
                    //   if (Refflevalncome16) {
                    //     await Stakingmodal({
                    //       userId: Refflevalncome16?._id,
                    //       WalletType: `Level ${16} plan (${decoded.profile.username})`,
                    //       DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                    //       bonusAmount: 100,
                    //       leval: 16,
                    //       Amount: (req.body.Amount * 5) / 100,
                    //       TotalRewordRecived: (req.body.Amount * 5) / 100,
                    //       transactionHash: "",
                    //       Active: Refflevalncome16.leval >= 16,
                    //     }).save();
                    //   }
                    // }
                    await cronHandler(decoded.profile.username).then(async () => {
                      const data = await findOneRecord(Usermodal, {
                        username: decoded.profile.username,
                      });
                      const ReffData = await findOneRecord(Usermodal, {
                        username: data.supporterId,
                      });
                      if (ReffData._id !== null) {

                        const StakingData = await findAllRecord(Stakingmodal, {
                          userId: ReffData._id,
                        });
                        if (StakingData.length > 0) {
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
                                    (req.body.Amount * 5) / 100,
                                },
                              }
                            )
                              .then(async (res) => {
                                await Ewallateesc({
                                  userId: ReffData?._id,
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Amount: (req.body.Amount * 5) / 100,
                                  type: 1,
                                  balace: res.incomeWallet,
                                  Active: true,
                                }).save();
                                await Stakingbonus({
                                  userId: ReffData?._id,
                                  ReffId: decoded.profile._id,
                                  Amount: (req.body.Amount * 5) / 100,
                                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                                  Active: true,
                                }).save();
                              });
                          }
                        }
                        const daat = await Usermodal.find({ mainId: ReffData.username })
                        console.log(ReffData);
                        await updateRecord(
                          Usermodal,
                          { _id: ReffData?._id },
                          {
                            leval: Number(daat.length),
                          }
                        ).then(async () => {
                          const Refflevalncome = await findOneRecord(Usermodal, {
                            username: decoded.profile.username,
                            isValid: true,
                          });

                          if (!Refflevalncome) {
                            return;
                          }
                          const Refflevalncomex1 = await findOneRecord(Usermodal, {
                            username: Refflevalncome.mainId,
                            isValid: true,
                            mystack: { $gt: 0 },
                          });
                          if (!Refflevalncomex1) {
                            return;
                          }
                          console.log("Refflevalncome1", Refflevalncomex1);
                          if (Refflevalncomex1.leval >= 1) {
                            const StakingData = await findAllRecord(Stakingmodal, {
                              userId: Refflevalncomex1._id,
                            });
                            if (StakingData.length > 0) {
                              let data1 = {
                                userId: Refflevalncomex1._id,
                                Note: `You Got Level ${1} Income`,
                                Usernameby: decoded.profile.username,
                                Amount: (req.body.Amount * 3) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex1._id,
                                },
                                { $inc: { incomeWallet: (req.body.Amount * 3) / 100 } }
                              ).then(async (res) => {
                                await Ewallateesc({
                                  userId: Refflevalncomex1._id,
                                  Note: `You Got Level ${1} Income`,
                                  Amount: (req.body.Amount * 3) / 100,
                                  Usernameby: decoded.profile.username,
                                  balace: res.mainWallet,
                                  type: 1,
                                  Active: true,
                                }).save();
                              });
                              await Communitymodal(data1).save();
                            }
                          }
                          const Refflevalncomex2 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex1.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 2) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex2._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex2._id,
                                  Note: `You Got Level ${2} Income`,
                                  Amount: (req.body.Amount * 2) / 100,
                                  Usernameby: decoded.profile.username,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex3 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex2.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 2) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex3._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex3._id,
                                  Note: `You Got Level ${3} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 2) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex4 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex3.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 1) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex4._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex4._id,
                                  Note: `You Got Level ${4} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 1) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex5 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex4.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncome5?._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncome5?._id,
                                  Note: `You Got Level ${5} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex6 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex5.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex6._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex6._id,
                                  Note: `You Got Level ${6} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex7 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex6.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex7._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex7._id,
                                  Note: `You Got Level ${7} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex8 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex7.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex8._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex8._id,
                                  Note: `You Got Level ${8} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex9 = await findOneRecord(Usermodal, {
                            username: Refflevalncome8.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex9._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex9._id,
                                  Note: `You Got Level ${9} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex10 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex9.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex10._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex10._id,
                                  Note: `You Got Level ${10} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex11 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex10.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex11._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex11._id,
                                  Note: `You Got Level ${11} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex12 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex11.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex12._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex12._id,
                                  Note: `You Got Level ${12} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex13 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex12.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex13._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex13._id,
                                  Note: `You Got Level ${13} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex14 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex13.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 0.5) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex14._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 0.5) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex14._id,
                                  Note: `You Got Level ${14} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 0.5) / 100,
                                  balace: res.mainWallet,
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
                          }
                          const Refflevalncomex15 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex14.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 1) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex15._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 1) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex15._id,
                                  Note: `You Got Level ${15} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 1) / 100,
                                  balace: res.mainWallet,
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
                          const Refflevalncomex16 = await findOneRecord(Usermodal, {
                            username: Refflevalncomex15.mainId,
                            isValid: true, mystack: { $gt: 0 },
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
                                Amount: (req.body.Amount * 2) / 100,
                              };
                              await updateRecord(
                                Walletmodal,
                                {
                                  userId: Refflevalncomex16._id,
                                },
                                { $inc: { mainWallet: (req.body.Amount * 2) / 100 } }
                              ).then(async (res) => {
                                await Mainwallatesc({
                                  userId: Refflevalncomex16._id,
                                  Note: `You Got Level ${16} Income`,
                                  Usernameby: decoded.profile.username,
                                  Amount: (req.body.Amount * 2) / 100,
                                  balace: res.mainWallet,
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
                        })
                        const Refflevalncome1 = await findOneRecord(Usermodal, {
                          username: data.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        console.log("Refflevalncome", Refflevalncome1);
                        if (Refflevalncome1) {
                          await Stakingmodal({
                            userId: Refflevalncome1?._id,
                            WalletType: `Level ${1} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 10) / 100 / 1000),
                            leval: 1,
                            bonusAmount: 100,
                            Amount: (req.body.Amount * 10) / 100,
                            TotalRewordRecived: (req.body.Amount * 10) / 100,
                            transactionHash: "",
                            Active: Refflevalncome1.leval >= 1,
                          }).save();
                        }
                        const Refflevalncome2 = await findOneRecord(Usermodal, {
                          username: Refflevalncome1?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome2) {
                          await Stakingmodal({
                            userId: Refflevalncome2?._id,
                            WalletType: `Level ${2} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 7) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 2,
                            Amount: (req.body.Amount * 7) / 100,
                            TotalRewordRecived: (req.body.Amount * 7) / 100,
                            transactionHash: "",
                            Active: Refflevalncome2.leval >= 2,
                          }).save();
                        }
                        const Refflevalncome3 = await findOneRecord(Usermodal, {
                          username: Refflevalncome2?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome3) {
                          await Stakingmodal({
                            userId: Refflevalncome3?._id,
                            WalletType: `Level ${3} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                            leval: 3,
                            bonusAmount: 100,
                            Amount: (req.body.Amount * 5) / 100,
                            TotalRewordRecived: (req.body.Amount * 5) / 100,
                            transactionHash: "",
                            Active: Refflevalncome3.leval >= 3,
                          }).save();
                        }
                        const Refflevalncome4 = await findOneRecord(Usermodal, {
                          username: Refflevalncome3?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome4) {
                          await Stakingmodal({
                            userId: Refflevalncome4?._id,
                            WalletType: `Level ${4} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 4) / 100 / 1000),
                            leval: 4,
                            bonusAmount: 100,
                            Amount: (req.body.Amount * 4) / 100,
                            TotalRewordRecived: (req.body.Amount * 4) / 100,
                            transactionHash: "",
                            Active: Refflevalncome4.leval >= 4,
                          }).save();
                        }
                        const Refflevalncome5 = await findOneRecord(Usermodal, {
                          username: Refflevalncome4?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome5) {
                          await Stakingmodal({
                            userId: Refflevalncome5?._id,
                            WalletType: `Level ${5} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                            leval: 5,
                            bonusAmount: 100,
                            Amount: (req.body.Amount * 3) / 100,
                            TotalRewordRecived: (req.body.Amount * 3) / 100,
                            transactionHash: "",
                            Active: Refflevalncome5.leval >= 5,
                          }).save();
                        }
                        const Refflevalncome6 = await findOneRecord(Usermodal, {
                          username: Refflevalncome5?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome6) {
                          await Stakingmodal({
                            userId: Refflevalncome6?._id,
                            WalletType: `Level ${6} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 6,
                            Amount: (req.body.Amount * 2) / 100,
                            TotalRewordRecived: (req.body.Amount * 2) / 100,
                            transactionHash: "",
                            Active: Refflevalncome6.leval >= 6,
                          }).save();
                        }
                        const Refflevalncome7 = await findOneRecord(Usermodal, {
                          username: Refflevalncome6?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome7) {
                          await Stakingmodal({
                            userId: Refflevalncome7?._id,
                            WalletType: `Level ${7} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 7,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome7.leval >= 7,
                          }).save();
                        }
                        const Refflevalncome8 = await findOneRecord(Usermodal, {
                          username: Refflevalncome7?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome8) {
                          await Stakingmodal({
                            userId: Refflevalncome8?._id,
                            WalletType: `Level ${8} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 8,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome8.leval >= 8,
                          }).save();
                        }
                        const Refflevalncome9 = await findOneRecord(Usermodal, {
                          username: Refflevalncome8?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome9) {
                          await Stakingmodal({
                            userId: Refflevalncome9?._id,
                            WalletType: `Level ${9} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 9,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome9.leval >= 9,
                          }).save();
                        }
                        const Refflevalncome10 = await findOneRecord(Usermodal, {
                          username: Refflevalncome9?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome10) {

                          await Stakingmodal({
                            userId: Refflevalncome10?._id,
                            WalletType: `Level ${10} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 10,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome10.leval >= 10,
                          }).save();
                        }
                        const Refflevalncome11 = await findOneRecord(Usermodal, {
                          username: Refflevalncome10?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome11) {
                          await Stakingmodal({
                            userId: Refflevalncome11?._id,
                            WalletType: `Level ${11} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 11,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome11.leval >= 11,
                          }).save();
                        }
                        const Refflevalncome12 = await findOneRecord(Usermodal, {
                          username: Refflevalncome11?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome12) {

                          await Stakingmodal({
                            userId: Refflevalncome12?._id,
                            WalletType: `Level ${12} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 12,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome12.leval >= 12,
                          }).save();
                        }

                        const Refflevalncome13 = await findOneRecord(Usermodal, {
                          username: Refflevalncome12?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome13) {
                          await Stakingmodal({
                            userId: Refflevalncome13?._id,
                            WalletType: `Level ${13} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 1) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 13,
                            Amount: (req.body.Amount * 1) / 100,
                            TotalRewordRecived: (req.body.Amount * 1) / 100,
                            transactionHash: "",
                            Active: Refflevalncome13.leval >= 13,
                          }).save();
                        }
                        const Refflevalncome14 = await findOneRecord(Usermodal, {
                          username: Refflevalncome13?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome14) {
                          await Stakingmodal({
                            userId: Refflevalncome14?._id,
                            WalletType: `Level ${14} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 2) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 14,
                            Amount: (req.body.Amount * 2) / 100,
                            TotalRewordRecived: (req.body.Amount * 2) / 100,
                            transactionHash: "",
                            Active: Refflevalncome14.leval >= 14,
                          }).save();
                        }
                        const Refflevalncome15 = await findOneRecord(Usermodal, {
                          username: Refflevalncome14?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome15) {
                          await Stakingmodal({
                            userId: Refflevalncome15?._id,
                            WalletType: `Level ${15} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 3) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 15,
                            Amount: (req.body.Amount * 3) / 100,
                            TotalRewordRecived: (req.body.Amount * 3) / 100,
                            transactionHash: "",
                            Active: Refflevalncome15.leval >= 15,
                          }).save();
                        }
                        const Refflevalncome16 = await findOneRecord(Usermodal, {
                          username: Refflevalncome15?.supporterId,
                          isValid: true, mystack: { $gt: 0 },
                        });
                        if (Refflevalncome16) {
                          await Stakingmodal({
                            userId: Refflevalncome16?._id,
                            WalletType: `Level ${16} plan (${decoded.profile.username})`,
                            DailyReword: Number((req.body.Amount * 5) / 100 / 1000),
                            bonusAmount: 100,
                            leval: 16,
                            Amount: (req.body.Amount * 5) / 100,
                            TotalRewordRecived: (req.body.Amount * 5) / 100,
                            transactionHash: "",
                            Active: Refflevalncome16.leval >= 16,
                          }).save();
                        }
                      }
                      return successResponse(res, {
                        message: "You have successfully staked SIR Tokens",
                      });
                    })
                    await Stakingmodal({
                      userId: decoded.profile._id,
                      WalletType: "DAPP-Wallet",
                      DailyReword: Number(req.body.Amount / 1000) * 2,
                      bonusAmount: 200,
                      Amount: req.body.Amount,
                      TotalRewordRecived: req.body.Amount * 2,
                      transactionHash: req.body.transactionHash,
                    }).save();
                    return successResponse(res, {
                      message: "You have successfully staked SIR Tokens",
                    });
                  } else {
                    return badRequestResponse(res, {
                      message: 'Transaction is not valid within 5 minutes.',
                    });
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
          const StakingData = await findAllRecord(Stakingmodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            V4Xtokenprice: 0,
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

      const { profile: { _id: userId, username } } = decoded;

      const [
        stakingData,
        WalletData,
        userData,
        aggregatedUserData,
        data1,
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
              as: "amount2",
            },
          },
          {
            $lookup: {
              from: "stakings",
              localField: "_id",
              foreignField: "userId",
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
            $project: {
              StakingBonusIncome: {
                $reduce: {
                  input: "$amount3",
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
                  input: "$amount3",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $cond: {
                          if: {
                            $eq: [
                              { $substr: ["$$this.Note", 0, 29] },
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
                              { $substr: ["$$this.Note", 0, 13] },
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
            },
          },
        ]),
        findAllRecord(V4Xpricemodal, {}),
      ]);
      console.log(aggregatedUserData);
      return successResponse(res, {
        message: "Wallet data retrieved successfully",
        data: WalletData,
        profile: userData,
        lockeddate: 0,
        mystack: aggregatedUserData[0].total,
        lockamount: aggregatedUserData[0].total2,
        teamtotalstack: aggregatedUserData[0].total1,
        ReffData: data[0].referBYCount,
        ReffData1: data1,
        income: data123,
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
            profile: decoded.profile,
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
                      { $inc: { v4xWallet: req.body.Amount } }
                    )
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
                if (data.v4xWallet >= req.body.Amount) {
                  let amount = Number(data.v4xWallet - req.body.Amount);

                  if (req.body.Username !== "") {

                    let abc = await Usermodal.find({
                      username: req.body.Username,
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
                        v4xWallet: amount,
                      }
                    ).then(async (res) => {
                      await Ewallateesc({
                        userId: decoded.profile._id,
                        Note: `You Transfer coin from ${abc[0].username}`,
                        Amount: req.body.Amount,
                        balace: res?.v4xWallet,
                        type: 0,
                        Active: true,
                      }).save();
                    });
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: abc[0]._id,
                      },
                      { $inc: { v4xWallet: req.body.Amount } }
                    )
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
