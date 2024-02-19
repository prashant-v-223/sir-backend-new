require("dotenv").config();
require("./config/db");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");
const app = express();
app.use(cors());
const routes = require("./routes/index");
const Usermodal = require("./models/user");
const Ewallateesc = require("./models/Ewallate");
const V4XpriceSchemaDetails = require("./models/TokenDetails");
const withdrawalmodal = require("./models/withdrawalhistory");
const Stakingmodal = require("./models/Staking");
const {
  findAllRecord,
  updateRecord,
  findOneRecord,
} = require("./library/commonQueries");
const Walletmodal = require("./models/Wallet");
const Stakingbonus = require("./models/Stakingbonus");
const HoldCBB = require("./models/HoldCBB");
const Mainwallatesc = require("./models/Mainwallate");
const Achivement = require("./models/Achivement");
const path = require("path");
const { ObjectId } = require("mongodb");
const Passive = require("./models/Passive");
const Wallet = require("./models/Wallet");
const { isMoment } = require("moment");
const Royalty = require("./models/Royalty");
const Staking = require("./models/Staking");

app.use(
  express.json({
    limit: "100024mb",
  })
);
app.use(
  express.urlencoded({
    limit: "100024mb",
    extended: true,
  })
);
app.use("/api", routes);
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint to display the image
app.get('/show-image', (req, res) => {
  const imagePath = path.join(__dirname, 'uploads', 'search-img.jpg');
  res.sendFile(imagePath);
});

const every24hours = "35 18 * * *";
const every24hours1 = "30 19 * * *";
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (let index = 0; index < Userdata.length; index++) {
      const element = Userdata[index];

      const stakingRecords = await findAllRecord(Stakingmodal, { Active: true, userId: ObjectId(element._id) });
      console.log("stakingRecordsstakingRecordsstakingRecords", stakingRecords);
      for (const record of stakingRecords) {
        if (record) {
          const StakingData = await findAllRecord(Stakingmodal, {
            userId: record.userId,
          });
          console.log(record);
          if (StakingData.length > 0) {
            // const StakingData9 = await Stakingmodal.find({
            //   userId: record.userId,
            //   leval: 0,
            // });
            // let totalstaking = 0;
            // for (let i = 0; i < StakingData9.length; i++) {
            //   totalstaking += StakingData9[i].Amount;
            // }
            // let totalgetrewords = await Mainwallatesc.aggregate([
            //   {
            //     $match: {
            //       userId: record.userId,
            //       type: 1,
            //     },
            //   },
            //   {
            //     $group: {
            //       _id: "$userId",
            //       totalAmount: { $sum: "$Amount" },
            //     },
            //   },
            // ]);
            // console.log(totalstaking * 2);
            // console.log(totalgetrewords[0].totalAmount);
            // if (totalstaking * 2 >= totalAmount[0].totalAmount) {
            if (record.TotalRewordRecived >= 0) {
              const updatedWallet = await updateRecord(
                Walletmodal,
                { userId: record.userId },
                { $inc: { mainWallet: record.DailyReword } }
              );
              if (updatedWallet) {
                await Promise.all([
                  Mainwallatesc({
                    userId: record.userId,
                    Note: "You Got Staking Bonus Income.",
                    Amount: record.DailyReword,
                    type: 1,
                    balace: updatedWallet.mainWallet,
                    Active: true,
                  }).save(),
                  Stakingbonus({
                    userId: record.userId,
                    rewordId: record._id,
                    Amount: record.DailyReword,
                    Note: "You Got Staking Bonus Income.",
                    Active: true,
                  }).save(),
                  updateRecord(
                    Stakingmodal,
                    { _id: record._id },
                    {
                      TotalRewordRecived:
                        record.TotalRewordRecived - record.DailyReword,
                      TotaldaysTosendReword: record.TotaldaysTosendReword - 1,
                      $inc: { Totalsend: 1 },
                    }
                  ),
                ]);
              }
            } else {
              await Promise.all([
                Stakingbonus({
                  userId: record.userId,
                  rewordId: record._id,
                  Amount: 0,
                  Note: "Your staking plan period is completed. You have received your bonus as per the return.",
                  Active: false,
                }).save(),
                updateRecord(
                  Stakingmodal,
                  { userId: record.userId },
                  {
                    Active: false,
                  }
                ),
              ]);
            }
            // }s
          }
        }
      }
    }
  }
  catch (error) {
    console.log(error);
  }
});
// schedule.scheduleJob("0 0 1 * *", async () => {
//   try {
//     // Find all documents where Active is true
//     const activeStakings = await Staking.find({ Active: true });

//     // Update documents and set Active to false, Removed to true, and reset Totalsend to 0
//     await Promise.all(activeStakings.map(async (staking) => {
//       await Staking.findByIdAndUpdate(staking._id, {
//         Active: false,
//         Removed: true,
//         Totalsend: 0,
//       });
//     }));
//     const result = await HoldCBB.deleteMany({});

//     console.log("Monthly check completed successfully.");
//   } catch (error) {
//     console.error("Error during the monthly check:", error);
//   }
// });
const updateRank = async (user, newRank, rewardAmount, teamtotalstack) => {
  let data = await findOneRecord(Usermodal, {
    _id: user._id,
    Rank: user.Rank,
  });

  let data1 = await findAllRecord(Usermodal, {
    mainId: data.username,
  });
  data1.sort((a, b) => {
    let data = b.cbbteamtotalstack + b.mystack
    let data1 = a.cbbteamtotalstack + a.mystack
    return data - data1
  });
  let lastteamtotalstack = 0;

  const resultArray = [];
  for (const obj of data1) {
    if (obj) {
      resultArray.push({
        totalInvestment: obj.cbbteamtotalstack,
        username: obj.username,
      });
    }
  }
  let data123 = resultArray.sort(
    (e, s) => s.totalInvestment - e.totalInvestment
  );
  // const lastThreeObjects = data123.slice(-3);
  const startIndex = 2;
  const endIndex = startIndex + 2;
  const lastThreeObjects = data123.slice(startIndex, endIndex);
  for (let index = 0; index < lastThreeObjects.length; index++) {
    lastteamtotalstack += lastThreeObjects[index].totalInvestment;
  }
  let fastlag = data123[0]?.totalInvestment
  let seclag = data123[1]?.totalInvestment
  let lastlag = lastteamtotalstack
  console.log("lastlag", teamtotalstack * 0.5, fastlag);
  console.log("lastlag", teamtotalstack * 0.25, seclag);
  console.log("lastlag", teamtotalstack * 0.25, lastlag);
  if (teamtotalstack * 0.5 <= fastlag) {
    if (teamtotalstack * 0.25 <= seclag) {
      if (teamtotalstack * 0.25 <= lastlag) {
        console.log("useruseruseruser", user);
        await updateRecord(
          Usermodal,
          {
            _id: user._id,
            Rank: user.Rank,
          },
          { Rank: newRank }
        );
        const da = await findAllRecord(Usermodal, {
          _id: user._id,
          Rank: newRank,
        });

        if (da.length > 0) {
          let data = {
            userId: user._id,
            Note: `You Have Acheicer New ${rewardAmount}`,
            Amount: rewardAmount,
          };
          const da1 = await findAllRecord(Usermodal, {
            userId: user._id,
            Note: `You Have Acheicer New ${rewardAmount}`,
          });
          if (da1.length === 0) {
            await Achivement(data).save();
          }
        }
      }
    }
  }


  const filteredData = data1.filter((data) => {
    let fifteenDaysAgo = new Date(user.createdAt);
    const fifteenDaysInMilliseconds = 15 * 24 * 60 * 60 * 1000;
    let d1 = new Date(fifteenDaysAgo.getTime() + fifteenDaysInMilliseconds)
    const userCreatedAtDate = new Date(data.createdAt);
    return d1.getTime() >= userCreatedAtDate.getTime();
  });


  if (filteredData.length >= 5) {
    console.log("data1", filteredData);

    let filteredDatasort = filteredData.sort(
      (e, s) => s.totalInvestment - e.totalInvestment
    );
    if (data.mystack <= filteredDatasort[0].mystack) {
      if (data.mystack <= filteredDatasort[1].mystack) {
        if (data.mystack <= filteredDatasort[2].mystack) {
          if (data.mystack <= filteredDatasort[3].mystack) {
            if (data.mystack <= filteredDatasort[4].mystack) {
              if (user.STAKINGBOOSTER === false) {
                await Usermodal.findByIdAndUpdate(
                  { _id: user._id },
                  {
                    STAKINGBOOSTER: true,
                  }
                );
                let data = await Stakingmodal.find({ userId: user._id });
                for (let index = 0; index < data.length; index++) {
                  const element = data[index];
                  let d = await Stakingmodal.find({ userId: element.userId });
                  for (let index = 0; index < d.length; index++) {
                    const element123 = d[index];
                    let a = 500 - element123.Totalsend;
                    await Stakingmodal.findOneAndUpdate(
                      { _id: element123._id },
                      {
                        DailyReword: element123.Amount * element123.bonusAmount / 100 / 1000 * 2,
                        TotaldaysTosendReword: a,
                      }
                    );
                  }
                }
              }
            } else {
              console.log("done11");
            }
          }
        }
      }
    }
  }

};
schedule.scheduleJob("*/5 * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      const { _id: userId, username } = user;
      console.log(username);
      console.log(userId);
      await amountupdate(username)
      let HoldCBBdata = await findAllRecord(HoldCBB, {
        userId: user._id,
        leval: { $lte: user.leval },
        Active: false
      });
      if (HoldCBBdata.length >= 0) {
        for (let index = 0; index < HoldCBBdata.length; index++) {
          const element = HoldCBBdata[index];
          const updatedWallet = await updateRecord(
            Walletmodal,
            { userId: element.userId },
            { $inc: { incomeWallet: element.Amount } }
          ).then(async (res) => {

            let HoldCBBdata1 = await findAllRecord(Walletmodal,
              { userId: element.userId }
            );
            await updateRecord(
              HoldCBB,
              { _id: element._id },
              { Active: true }
            );
            let data2 = {
              userId: element.userId,
              Note: `You Got Level ${element.leval} Income`,
              Usernameby: element.Usernameby,
              Amount: element.Amount,
            };
            await Communitymodal(data2).save();
            await Ewallateesc({
              userId: element.userId,
              Note: `You have received your level ${element.leval} CBB holding coins`,
              Amount: element.Amount,
              balace: element.incomeWallet + element.Amount,
              type: 1,
              Active: true,
            }).save();
          });
        }
      }
      if (user) {
        console.log(user);
        switch (user?.Rank) {
          case "Trainee":
            await updateRank(user, "ACE", "SMART WATCH", 1000);
            break;
          case "ACE":
            await updateRank(user, "WARRIOR", "SMART PHONE", 8000);
            break;
          case "WARRIOR":
            await updateRank(user, "CADET", "INTERNATIONAL TRIP", 28000);
            break;
          case "CADET":
            await updateRank(user, "CAPTAIN", "MAC BOOK", 78000);
            break;
          case "CAPTAIN":
            await updateRank(user, "COMMANDER", "WAGONR/$6000", 228000);
            break;
          case "COMMANDER":
            await updateRank(user, "PIONEER", "BREEZA/$12500", 528000);
            break;
          case "PIONEER":
            await updateRank(user, "MASTERMIND", "2BHK FLAT/$30000", 12528000);
            break;
          case "MASTERMIND":
            await updateRank(user, "RULER", "MERCEDEZ/$48000", 14028000);
            break;
          case "RULER":
            await updateRank(
              user,
              "AMBASSADOR",
              "3/4 BHK APARTMENT/$100000",
              17428000
            );
            break;
          case "AMBASSADOR":
            await updateRank(user, "CROWN", "VILLA/ $300000", 24428000);
            break;
          case "CROWN":
            await updateRank(
              user,
              "CROWN AMBASSADOR",
              "ROLLS ROYCE/ $400000",
              39428000
            );
            break;
            break;
          default:
            break;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});
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
          cbbtotal1: {
            $reduce: {
              input: "$amountaa2",
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
      console.log("username", username);
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
          { userId: data1[0]._id, leval: data1[0].leval, Removed: false },
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
schedule.scheduleJob(every24hours1, async () => {
  try {
    let data = await Usermodal.aggregate([
      {
        $match: {
          Rank: "WARRIOR",
        },
      },
      {
        $graphLookup: {
          from: "users",
          startWith: "$username",
          connectFromField: "username",
          maxDepth: 0,
          depthField: "depthlevel",
          connectToField: "mainId",
          as: "referBY",
        },
      },
      {
        $unwind: "$referBY",
      },
      {
        $lookup: {
          from: "ewallates",
          localField: "referBY._id",
          foreignField: "userId",
          as: "ewallatesData",
        },
      },
      {
        $addFields: {
          ewallatesData: {
            $filter: {
              input: "$ewallatesData",
              as: "ewallate",
              cond: {
                $and: [
                  {
                    $gte: ["$$ewallate.createdAt", new Date(new Date().getTime() - 24 * 60 * 60 * 1000)],
                  },
                  {
                    $lt: ["$$ewallate.createdAt", new Date()],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          // referBY: {
          //   $push: {
          //     $mergeObjects: [
          //       "$referBY",
          //       { ewallatesData: "$ewallatesData" },
          //     ],
          //   },
          // },
          referBY: {
            $push: {
              $mergeObjects: [
                "$referBY",
                {
                  totalAmountSum: {
                    $sum: {
                      $sum: "$ewallatesData.Amount", // Calculate the sum of amounts within ewallatesData array
                    },
                  },
                },
              ],
            },
          },

        },
      },
    ]
    )
    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      const Userdata1 = await findAllRecord(Usermodal, { _id: element._id });
      for (let index = 0; index < element.referBY.length; index++) {
        const element1 = element.referBY[index];
        console.log("datadatadatadatadatadatadatadatadatadatadatadatadatadata", element1.totalAmountSum * 10 / 100,
          Userdata1[0].username);
        await updateRecord(
          Walletmodal,
          {
            userId: Userdata1[0]?._id,
          },
          {
            $inc: {
              incomeWallet:
                element1.totalAmountSum * 10 / 100,
            },
          }
        ).then(async (res) => {
          if (element1.totalAmountSum > 0) {
            await Royalty({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.totalAmountSum * 10 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
            await Ewallateesc({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.totalAmountSum * 10 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
          }
        });
      }
    }
    let data1 = await Usermodal.aggregate([
      {
        $match: {
          Rank: "CAPTAIN",
        },
      },
      {
        $graphLookup: {
          from: "users",
          startWith: "$username",
          connectFromField: "username",
          maxDepth: 1,
          depthField: "depthlevel",
          connectToField: "mainId",
          as: "referBY",
        },
      },
      {
        $unwind: "$referBY",
      },
      {
        $lookup: {
          from: "ewallates",
          localField: "referBY._id",
          foreignField: "userId",
          as: "ewallatesData",
        },
      },
      {
        $addFields: {
          ewallatesData: {
            $filter: {
              input: "$ewallatesData",
              as: "ewallate",
              cond: {
                $and: [
                  {
                    $gte: ["$$ewallate.createdAt", new Date(new Date().getTime() - 24 * 60 * 60 * 1000)],
                  },
                  {
                    $lt: ["$$ewallate.createdAt", new Date()],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          // referBY: {
          //   $push: {
          //     $mergeObjects: [
          //       "$referBY",
          //       { ewallatesData: "$ewallatesData" },
          //     ],
          //   },
          // },
          referBY: {
            $push: {
              $mergeObjects: [
                "$referBY",
                {
                  totalAmountSum: {
                    $sum: {
                      $sum: "$ewallatesData.Amount", // Calculate the sum of amounts within ewallatesData array
                    },
                  },
                },
              ],
            },
          },

        },
      },
    ]
    )
    for (let index = 0; index < data1.length; index++) {
      const element = data1[index];
      console.log("element", element);
      const Userdata1 = await findAllRecord(Usermodal, { _id: element._id });
      for (let index = 0; index < element.referBY.length; index++) {
        const element1 = element.referBY[index];
        await updateRecord(
          Walletmodal,
          {
            userId: Userdata1[0]?._id,
          },
          {
            $inc: {
              incomeWallet:
                element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
            },
          }
        ).then(async (res) => {
          if (element1.totalAmountSum > 0) {
            await Royalty({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
            await Ewallateesc({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
          }
        });
      }

    }
    let data2 = await Usermodal.aggregate([
      {
        $match: {
          Rank: "PIONEER",
        },
      },
      {
        $graphLookup: {
          from: "users",
          startWith: "$username",
          connectFromField: "username",
          maxDepth: 2,
          depthField: "depthlevel",
          connectToField: "mainId",
          as: "referBY",
        },
      },
      {
        $unwind: "$referBY",
      },
      {
        $lookup: {
          from: "ewallates",
          localField: "referBY._id",
          foreignField: "userId",
          as: "ewallatesData",
        },
      },
      {
        $addFields: {
          ewallatesData: {
            $filter: {
              input: "$ewallatesData",
              as: "ewallate",
              cond: {
                $and: [
                  {
                    $gte: ["$$ewallate.createdAt", new Date(new Date().getTime() - 24 * 60 * 60 * 1000)],
                  },
                  {
                    $lt: ["$$ewallate.createdAt", new Date()],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          // referBY: {
          //   $push: {
          //     $mergeObjects: [
          //       "$referBY",
          //       { ewallatesData: "$ewallatesData" },
          //     ],
          //   },
          // },
          referBY: {
            $push: {
              $mergeObjects: [
                "$referBY",
                {
                  totalAmountSum: {
                    $sum: {
                      $sum: "$ewallatesData.Amount", // Calculate the sum of amounts within ewallatesData array
                    },
                  },
                },
              ],
            },
          },

        },
      },
    ]
    )
    for (let index = 0; index < data2.length; index++) {
      const element = data2[index];
      const Userdata1 = await findAllRecord(Usermodal, { _id: element._id });
      for (let index = 0; index < element.referBY.length; index++) {
        const element1 = element.referBY[index];
        console.log("datadatadatadatadatadatadatadatadatadatadatadatadatadata", element1.totalAmountSum * 5 / 100,
          Userdata1[0].username);
        await updateRecord(
          Walletmodal,
          {
            userId: Userdata1[0]?._id,
          },
          {
            $inc: {
              incomeWallet:

                element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
            },
          }
        ).then(async (res) => {
          if (element1.totalAmountSum > 0) {
            await Royalty({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
            await Ewallateesc({
              userId: Userdata1[0]?._id,
              Note: `You Got Royalty Income From ${element1.username}`,
              Amount: element1.depthlevel === 0 ? element1.totalAmountSum * 10 / 100 : element1.totalAmountSum * 5 / 100,
              type: 1,
              balace: res.incomeWallet,
              Active: true,
            }).save();
          }
        });
      }

    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      if (user.isValid !== true) {
        await Usermodal.findByIdAndDelete({ _id: user._id });
      }
    }
  } catch (error) {
    console.log(error);
  }
});
app.get("/", async (req, res) => {
  console.log("Transaction is valid within 5 minutes.");
});
const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});
