require("dotenv").config();
require("./config/db");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");
const app = express();
app.use(cors());
const routes = require("./routes/index");
const Usermodal = require("./models/user");
const Stakingmodal = require("./models/Staking");
const {
  findAllRecord,
  updateRecord,
  findOneRecord,
} = require("./library/commonQueries");
const Walletmodal = require("./models/Wallet");
const Stakingbonus = require("./models/Stakingbonus");
const Mainwallatesc = require("./models/Mainwallate");
const Achivement = require("./models/Achivement");
const { ObjectId } = require("mongodb");
const Passive = require("./models/Passive");

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
const every24hours = "0 19 * * *";
schedule.scheduleJob(every24hours, async () => {
  try {
    const stakingRecords = await findAllRecord(Stakingmodal, { Active: true });
    console.log("stakingRecords");
    console.log(stakingRecords);
    console.log("stakingRecords");
    for (const record of stakingRecords) {
      if (record) {
        console.log(record);
        const elapsedTimeInDays = await Stakingbonus.aggregate([
          {
            $match: {
              rewordId: ObjectId(record._id),
              Note: "You Got Staking Bonus Income.",
            },
          },
        ]);
        if (elapsedTimeInDays.length < 1000) {
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
      }
    }
  } catch (error) {
    console.log(error);
  }
});
const updateRank = async (user, newRank, rewardAmount, teamtotalstack) => {
  let data = await findOneRecord(Usermodal, {
    _id: user._id,
    Rank: user.Rank,
  });
  let data1 = await findAllRecord(Usermodal, {
    supporterId: data.username

  });
  if (data1.length >= 5) {
    await Usermodal.findByIdAndUpdate({ _id: user._id, }, {
      STAKINGBOOSTER: true
    })
    data1.sort((a, b) => b.teamtotalstack - a.teamtotalstack);
    let lastteamtotalstack = 0
    const lastThreeObjects = data1.slice(-3);
    for (let index = 0; index < lastThreeObjects.length; index++) {
      lastteamtotalstack += lastThreeObjects[index].teamtotalstack;
    }
    console.log(teamtotalstack * 0.25);
    console.log(lastteamtotalstack * 0.25);
    if (teamtotalstack * 0.50 <= data1[0].teamtotalstack * 0.50) {
      if (teamtotalstack * 0.25 <= data1[1].teamtotalstack * 0.25) {
        let lastteamtotalstack = 0
        const lastThreeObjects = data1.slice(-3);
        for (let index = 0; index < lastThreeObjects.length; index++) {
          lastteamtotalstack += lastThreeObjects[index].teamtotalstack;
        }
        if (teamtotalstack * 0.25 <= lastteamtotalstack * 0.25) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: user.Rank,
              teamtotalstack: { $gt: teamtotalstack },
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
            await Achivement(data).save();
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
      await Usermodal.aggregate([
        {
          $match: {
            username: user.username,
          },
        },
      ]).then(async (res) => {
        if (res.length > 0) {
          switch (res[0]?.Rank) {
            case "DIRECT":
              await updateRank(res[0], "EXECUTIVE", "SMART WATCH", 1000);
              break;
            case "EXECUTIVE":
              await updateRank(res[0], "SR. EXECUTIVE", "SMART PHONE", 7000);
              break;
            case "SR. EXECUTIVE":
              await updateRank(res[0], "MANAGER", "INTERNATIONAL TRIP", 20000);
              break;
            case "MANAGER":
              await updateRank(res[0], "SR. MANAGER", "MAC BOOK", 50000);
              break;
            case "SR. MANAGER":
              await updateRank(res[0], "PEARL", "WAGONR/$6000", 50000);
              break;
            case "PEARL":
              await updateRank(
                res[0],
                "SAPPHIRE",
                "BREEZA/$12500",
                300000
              );
              break;
            case "SAPPHIRE":
              await updateRank(
                res[0],
                "RUBY",
                "2BHK FLAT/$30000",
                700000
              );
              break;
            case "RUBY":
              await updateRank(res[0], "DIAMOND", "MERCEDEZ/$48000", 1500000);
              break;
            case "DIAMOND":
              await updateRank(res[0], "BLUE DIAMOND", "3/4 BHK APARTMENT/$100000", 3400000);
              break;
            case "BLUE DIAMOND":
              await updateRank(res[0], "CROWN", "VILLA/ $300000", 7000000);
              break;
            case "CROWN":
              await updateRank(res[0], "CROWN DIAMOND", "ROLLS ROYCE/ $400000", 15000000);
              break;
            case "CROWN DIAMOND":
              await updateRank(res[0], "KING", "PRIVATE JET/ $1000000", 30000000);
              break;
            default:
              break;
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});
// schedule.scheduleJob("*/30 * * * * *", async () => {
//   try {
//     const Userdata = await findAllRecord(Usermodal, {});
//     for (const user of Userdata) {
//       await Usermodal.aggregate([
//         {
//           $match: {
//             username: user.username,
//           },
//         },
//       ]).then(async (res) => {
//         if (res.length > 0) {
//           switch (res[0]?.Rank) {
//             case "DIRECT":
//               const Refflevalncome = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "DIRECT",
//               });
//               if (Refflevalncome.length >= 4) {
//                 console.log(Refflevalncome);
//                 await updateRank(res[0], "EXECUTIVE", 50, 2500);
//               }
//               break;
//             case "EXECUTIVE":
//               const Refflevalncome1 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "EXECUTIVE",
//               });
//               if (Refflevalncome1.length >= 2) {
//                 await updateRank(res[0], "Sales EXECUTIVE", 100, 10000);
//               }
//               break;
//             case "Sales EXECUTIVE":
//               const Refflevalncome2 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "Sales EXECUTIVE",
//               });
//               if (Refflevalncome2.length >= 2) {
//                 await updateRank(res[0], "AREA SALES MANAGER", 250, 40000);
//               }
//               break;
//             case "AREA SALES MANAGER":
//               const Refflevalncome3 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "AREA SALES MANAGER",
//               });
//               if (Refflevalncome3.length >= 2) {
//                 await updateRank(res[0], "Zonal HEAD", 500, 160000);
//               }
//               break;
//             case "Zonal HEAD":
//               const Refflevalncome4 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "Zonal HEAD",
//               });
//               if (Refflevalncome4.length >= 2) {
//                 await updateRank(res[0], "PROJECT HEAD", 1500, 5000000);
//               }
//               break;
//             case "PROJECT HEAD":
//               const Refflevalncome5 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "PROJECT HEAD",
//               });
//               if (Refflevalncome5.length >= 2) {
//                 await updateRank(
//                   res[0],
//                   "Sr. Project Head",
//                   5000,
//                   308480
//                 );
//               }
//               break;
//             case "Sr. Project Head":
//               const Refflevalncome6 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "Sr. Project Head",
//               });
//               if (Refflevalncome6.length >= 2) {
//                 await updateRank(res[0], "COM-B", 15000, 10000000);
//               }
//               break;
//             case "COM-B":
//               const Refflevalncome7 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "COM-B",
//               });
//               if (Refflevalncome7.length >= 2) {
//                 await updateRank(res[0], "COM-A", 75000, 30000000);
//               }
//               break;
//             case "COM-A":
//               const Refflevalncome8 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "COM-A",
//               });
//               if (Refflevalncome8.length >= 2) {
//                 await updateRank(res[0], "TRUST", 150000, 6000000);
//               }
//               break;
//             case "TRUST":
//               const Refflevalncome9 = await findAllRecord(Usermodal, {
//                 refferalBy: res[0].username,
//                 Rank: "TRUST",
//               });
//               if (Refflevalncome9.length >= 2) {
//                 await updateRank(res[0], "CORE TEAM", 500000, 10000000);
//               }
//               break;
//             default:
//               break;
//           }
//         }
//       });
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });
schedule.scheduleJob("*/5 * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
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
                  Active: true, WalletType: { $in: ["main-Wallet", "DAPP-WALLET"] }

                }
              }
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
                  Active: true, WalletType: { $in: ["main-Wallet", "DAPP-WALLET"] }

                }
              }
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
            email: 1,
            username: 1,
            level: 1,
          },
        },
      ]).then(async (aggregatedUserData) => {
        console.log(aggregatedUserData);
        if (aggregatedUserData.length > 0) {
          let data1 = await Usermodal.find({ username: aggregatedUserData[0].username })
          await Stakingmodal.updateMany(
            { userId: data1[0]._id, leval: data1[0].leval }, {
            Active: true
          }
          );
          await Usermodal.findOneAndUpdate(
            { _id: ObjectId(userId) },
            {
              teamtotalstack: aggregatedUserData[0].total1,
              mystack: aggregatedUserData[0].total,
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
const maxTimeDifference = 5 * 60 * 1000;
app.get("/", async (req, res) => {
  console.log("Transaction is valid within 5 minutes.");
});
const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});
