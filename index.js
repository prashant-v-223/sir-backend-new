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

const every24hours = "0 19 * * *";
// const every24hours = "*/10 * * * * *";
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
          let totalstaking = 0;
          for (let i = 0; i < StakingData9.length; i++) {
            totalstaking += StakingData9[i].Amount;
          }
          let totalgetrewords = await Mainwallatesc.aggregate([
            {
              $match: {
                userId: record.userId,
                type: 1,
              },
            },
            {
              $group: {
                _id: "$userId",
                totalAmount: { $sum: "$Amount" },
              },
            },
          ]);
          if (totalstaking * 2 >= totalgetrewords[0].totalAmount) {
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
          }
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
  data1.sort((a, b) => {
    let data = b.teamtotalstack + b.mystack
    let data1 = a.teamtotalstack + a.mystack
    return data - data1
  });
  let lastteamtotalstack = 0;

  const resultArray = [];
  for (const obj of data1) {
    if (obj) {
      resultArray.push({
        totalInvestment: obj.teamtotalstack,
        username: obj.username,
      });
    }
  }
  let data123 = resultArray.sort(
    (e, s) => s.totalInvestment - e.totalInvestment
  );
  // const lastThreeObjects = data123.slice(-3);
  const startIndex = 1;
  const endIndex = startIndex + 2;
  const lastThreeObjects = data123.slice(startIndex, endIndex);
  for (let index = 0; index < lastThreeObjects.length; index++) {
    lastteamtotalstack += lastThreeObjects[index].totalInvestment;
  }
  let fastlag = data1[0]?.teamtotalstack
  let seclag = data1[1]?.teamtotalstack
  let lastlag = lastteamtotalstack
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
  const fifteenDaysAgo = new Date();
  console.log("data1", data1);
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() + 15);
  if (data1.length >= 5) {
    console.log("data1", fifteenDaysAgo);
    console.log("data1", new Date(data.createdAt));
    // if (new Date(data.createdAt) < fifteenDaysAgo) {
    console.log("data1data1===1", data.mystack <= data1[0].mystack, data1[0].mystack);
    console.log("data1data1===2", data.mystack <= data1[1].mystack, data1[1].mystack);
    console.log("data1data1===3", data.mystack <= data1[2].mystack, data1[2].mystack);
    console.log("data1data1===4", data.mystack <= data1[3].mystack, data1[3].mystack);
    console.log("data1data1===5", data.mystack <= data1[4].mystack, data1[4].mystack);
    console.log("datadatadata", data.mystack);
    if (data.mystack <= data1[0].mystack) {

      if (data.mystack <= data1[1].mystack) {
        if (data.mystack <= data1[2].mystack) {
          if (data.mystack <= data1[3].mystack) {
            if (data.mystack <= data1[4].mystack) {
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
              }
            } else {
              console.log("done11");
            }
          }
        }
      }
    }
    // }
  }

};
schedule.scheduleJob("*/10 * * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, { username: "SIR63514" });
    for (const user of Userdata) {
      const { _id: userId, username } = user;
      console.log(username);
      console.log(userId);
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
            await Ewallateesc({
              userId: element.userId,
              Note: `You have received your level ${element.leval} CBB holding coins`,
              Amount: element.Amount,
              balace: res.incomeWallet,
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
schedule.scheduleJob("*/10 * * * * *", async () => {
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