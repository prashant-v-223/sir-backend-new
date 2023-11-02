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
    supporterId: data.username,
  });
  console.log(
    "data1.lengthdata1.lengthdata1.lengthdata1.lengthdata1.lengthdata1.length",
    data1.length
  );
  if (data1.length >= 5) {
    await Usermodal.findByIdAndUpdate(
      { _id: user._id },
      {
        STAKINGBOOSTER: true,
      }
    );
    let data = await Stakingmodal.find({ userId: user._id });
    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      let d = await Stakingmodal.find({ userId: element.userId, leval: 0 });
      for (let index = 0; index < d.length; index++) {
        const element123 = d[index];
        let a = 500 - element123.Totalsend;
        let b = element123.Amount / 1000 * 2;
        await Stakingmodal.findOneAndUpdate(
          { _id: element123._id },
          {
            DailyReword: b,
            TotaldaysTosendReword: a,
          }
        );
      }
    }

    data1.sort((a, b) => b.teamtotalstack - a.teamtotalstack);
    let lastteamtotalstack = 0;
    let lastteamtotalstack1 = 0;
    const lastThreeObjects = data1.slice(-3);
    for (let index = 0; index < lastThreeObjects.length; index++) {
      lastteamtotalstack += lastThreeObjects[index].teamtotalstack;
      lastteamtotalstack1 += lastThreeObjects[index].mystack;
    }
    let fastlag = data1[0].teamtotalstack + data1[0].mystack
    let seclag = data1[0].teamtotalstack + data1[0].mystack
    let lastlag = lastteamtotalstack1 + lastteamtotalstack
    console.log(fastlag);
    console.log(teamtotalstack * 0.5);
    console.log(seclag);
    console.log(teamtotalstack * 0.25);
    console.log(lastlag);
    console.log(teamtotalstack * 0.25);
    console.log(user);
    if (teamtotalstack * 0.5 <= fastlag) {
      if (teamtotalstack * 0.25 <= seclag) {
        if (teamtotalstack * 0.25 <= lastlag) {
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
            await Achivement(data).save();
          }
        }
      }
    }
  }
};
schedule.scheduleJob("*/58 * * * * *", async () => {
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
            case "Trainee":
              await updateRank(res[0], "ACE", "SMART WATCH", 1000);
              break;
            case "ACE":
              await updateRank(res[0], "WARRIOR", "SMART PHONE", 7000);
              break;
            case "WARRIOR":
              await updateRank(res[0], "CADET", "INTERNATIONAL TRIP", 20000);
              break;
            case "CADET":
              await updateRank(res[0], "CAPTAIN", "MAC BOOK", 50000);
              break;
            case "CAPTAIN":
              await updateRank(res[0], "COMMANDER", "WAGONR/$6000", 50000);
              break;
            case "COMMANDER":
              await updateRank(res[0], "PIONEER", "BREEZA/$12500", 300000);
              break;
            case "PIONEER":
              await updateRank(res[0], "MASTERMIND", "2BHK FLAT/$30000", 700000);
              break;
            case "MASTERMIND":
              await updateRank(res[0], "RULER", "MERCEDEZ/$48000", 1500000);
              break;
            case "RULER":
              await updateRank(
                res[0],
                "AMBASSADOR",
                "3/4 BHK APARTMENT/$100000",
                3400000
              );
              break;
            case "AMBASSADOR":
              await updateRank(res[0], "CROWN", "VILLA/ $300000", 7000000);
              break;
            case "CROWN":
              await updateRank(
                res[0],
                "CROWN AMBASSADOR",
                "ROLLS ROYCE/ $400000",
                15000000
              );
              break;
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
schedule.scheduleJob("*/58 * * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      const { _id: userId, username } = user;
      await Usermodal.aggregate([
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
            pipeline: [
              {
                $match: {
                  Active: true,
                  WalletType: { $in: ["main-Wallet", "DAPP-WALLET"] },
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
                  WalletType: { $in: ["main-Wallet", "DAPP-WALLET"] },
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
            amount: 1
          },
        },
      ]).then(async (aggregatedUserData) => {
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
