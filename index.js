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

const every24hours = "*/10 * * * *";
schedule.scheduleJob(every24hours, async () => {
  try {
    const stakingRecords = await findAllRecord(Stakingmodal, { Active: true });
    for (const record of stakingRecords) {
      if (record) {
        const StakingData = await findAllRecord(Stakingmodal, {
          userId: record.userId,
        });
        if (StakingData.length > 0) {

          const StakingData9 = await Stakingmodal.find({
            userId: record.userId,
            leval: 0,
          });
          const withdrawalmodal1 = await Wallet.find({
            userId: record.userId,
          });
          let totalstaking = 0;
          for (let i = 0; i < StakingData9.length; i++) {
            totalstaking += StakingData9[i].Amount;
          }
          const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });
          // if (totalstaking * 2 / 90 * SIRprice.price >= withdrawalmodal1.mainWallet) {
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
       h     // }
        }
      }
    }
  }
  catch (error) {
    console.log(error);
  }
});
const updateRank = async (user, newRank, rewardAmount, teamtotalstack) => {
  let data = await findOneRecord(Usermodal, {
    _id: user._id,
    Rank: user.Rank,
  });
  let data1 = await findAllRecord(Usermodal, {
    mainId: data.username,
  });

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  if (new Date(data.createdAt) < fifteenDaysAgo) {
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
        let d = await Stakingmodal.find({ userId: element.userId });
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

      data1.sort((a, b) => {
        let data = b.teamtotalstack + b.mystack
        let data1 = a.teamtotalstack + a.mystack
        return data - data1
      });
      let lastteamtotalstack = 0;
      let lastteamtotalstack1 = 0;
      console.log(data1);
      const lastThreeObjects = data1.slice(-3);
      for (let index = 0; index < lastThreeObjects.length; index++) {
        lastteamtotalstack += lastThreeObjects[index].teamtotalstack;
        lastteamtotalstack1 += lastThreeObjects[index].mystack;
      }
      let fastlag = data1[0].teamtotalstack + data1[0].mystack
      let seclag = data1[1].teamtotalstack + data1[1].mystack
      let lastlag = lastteamtotalstack1 + lastteamtotalstack
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
    }
  }
};
schedule.scheduleJob("*/10 * * * *", async () => {
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
      ]).then(async (res) => {
        // console.log("resresresresresresresresresresresresresresresresresres", res);
        const StakingData9 = await Stakingmodal.find({
          userId: userId._id,
          leval: 0,
        });
        const withdrawalmodal1 = await Wallet.find({
          userId: userId._id,
        });
        let totalstaking = 0;
        for (let i = 0; i < StakingData9.length; i++) {
          totalstaking += StakingData9[i].Amount;
        }
        if (totalstaking * 3 >= withdrawalmodal1.incomeWallet) {
          let HoldCBBdata = await findAllRecord(HoldCBB, {
            userId: res[0]._id,
            leval: { $lte: res[0].leval },
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
                await Ewallateesc({
                  userId: element.userId,
                  Note: `You have received your level ${element.leval} CBB holding coins`,
                  Amount: element.Amount,
                  balace: HoldCBBdata1.incomeWallet,
                  type: 1,
                  Active: true,
                }).save();
              });
            }
          }
        }
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
              await updateRank(res[0], "COMMANDER", "WAGONR/$6000", 150000);
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
schedule.scheduleJob("*/10 * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
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