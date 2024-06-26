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
  if (refSelected.referred.length < 5) {
    const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
      $set: {
        supporterId: refSelected.refId
      }
    });
    refSelected.referred.push(newRef.refId);
    refSelected.save();
  } else {
    // If not, send left to right and return
    let a = []
    for (const referredId of refSelected.referred) {
      const refSelected = await Usermodal.findOne({ refId: referredId });
      const ref1 = await Usermodal.aggregate([
        {
          $match: {
            refId: referredId,
          },
        },
        {
          $graphLookup: {
            from: "users",
            startWith: "$refId",
            connectFromField: "refId",
            connectToField: "supporterId",
            as: "refers_to",
          },
        },
      ]);

      a.push({ referred: referredId, referredlegth: refSelected.referred?.length || 0, team: ref1[0].refers_to?.length || 0, refId: refId });
    }
    a.sort((a, b) => a.team - b.team);
    console.log("aaaaa", a);
    const index = refSelected.referred.indexOf(a[0].referred);
    console.log("aaaaa", index);
    refSelected.nextRefIndex = index;
    await getRef(refSelected.referred[index], refId, id);
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
    const id = user.refId;
    const refId = user.mainId;
    const refExists = await Usermodal.findOne({ refId: user.mainId, mystack: { $gt: 0 } });
    console.log("refExists", refExists);
    if (!refExists) return res.send('Invalid referral link');
    if (refExists.mainId === null) {
      if (refExists.referred.length < 5) {
        const newRef = await Usermodal.findOneAndUpdate({ refId: id }, {
          $set: {
            supporterId: refExists.supporterId || refExists.refId
          }
        });
        refExists.referred.push(newRef.refId);
        await refExists.save();
        //   res.send(added);
      } else {
        // If not, send left to right and return
        let a = []
        for (const referredId of refSelected.referred) {
          const refSelected = await Usermodal.findOne({ refId: referredId });
          const ref1 = await Usermodal.aggregate([
            {
              $match: {
                refId: referredId,
              },
            },
            {
              $graphLookup: {
                from: "refs",
                startWith: "$refId",
                connectFromField: "refId",
                connectToField: "supporterId",
                as: "refers_to",
              },
            },
          ]);

          a.push({ referred: referredId, referredlegth: refSelected.referred?.length || 0, team: ref1[0].refers_to?.length || 0, refId: refId });
        }
        a.sort((a, b) => a.team - b.team);
        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", a);
        const index = refSelected.referred.indexOf(a[0].referred);
        console.log("aaaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxaa", index);
        refSelected.nextRefIndex = index;
        await getRef(refSelected.referred[index], refId, id);
      }
    } else {
      await getRef(refId, refId, id);
      const refIdExistsInReferred = await Usermodal.findOne({ referred: { $elemMatch: { $eq: refId } } });
      if (refIdExistsInReferred) {
        refIdExistsInReferred.nextRefIdsToBeSkipped.push(refId);
        await refIdExistsInReferred.save();
      }
      // res.send(added);
    }
  }
}

const nowIST = new Date();
nowIST.setUTCHours(nowIST.getUTCHours(), nowIST.getUTCMinutes(), 0, 0); // Convert to IST

const todayIST = new Date(nowIST);
todayIST.setHours(0, 0, 0, 0);

const nextDayIST = new Date(todayIST);
nextDayIST.setDate(nextDayIST.getDate() + 1);
nextDayIST.setHours(0, 0, 0, 0);

const nowIST1 = new Date();
nowIST1.setUTCHours(nowIST1.getUTCHours() , nowIST1.getUTCMinutes(), 0, 0); // Convert to IST
// Set time to midnight for the current day in IST
const startOfDayIST = new Date(nowIST1);
startOfDayIST.setHours(0, 0, 0, 0);

const endOfDayIST = new Date(nowIST1);
endOfDayIST.setDate(endOfDayIST.getDate() + 1);
endOfDayIST.setHours(0, 0, 0, 0);
console.log("startOfDayIST", startOfDayIST);
console.log("endOfDayIST", endOfDayIST);
console.log("Start of Day (IST):", startOfDayIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
console.log("End of Day (IST):", endOfDayIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

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
const SCBupdate = async ({ decoded, data, ReffData1, req }) => {

  const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });

  const mainIds = [];
  let mainId = data.mainId;
  let dat12 = [3, 2, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1];

  // Populate supporterIds array with supporterId for each level
  for (let i = 1; i <= 16; i++) {
    const Refflevalncome = await findOneRecord(Usermodal, {
      username: mainId,
      isValid: true,
    });

    if (!Refflevalncome) break;

    mainIds.push(Refflevalncome._id);
    mainId = Refflevalncome.supporterId;
  }
  for (let i = 0; i < mainIds.length; i++) {
    if (mainIds[i - 1] != null) {
      const Refflevalncome = await findOneRecord(Usermodal, {
        _id: mainIds[i - 1],
      });
      console.log({ "data": Refflevalncome, "amount": (req.body.Amount * (dat12[i - 1])) / 100, "leval": i, "%": dat12[i] });
      if (Refflevalncome.leval >= i) {
        const StakingData = await findAllRecord(Stakingmodal, {
          userId: Refflevalncome._id,
        });

        if (StakingData.length > 0) {
          const StakingData1 = await Stakingmodal.find({
            userId: Refflevalncome._id,
            leval: 0,
          });
          let totalstaking = 0;
          for (let i = 0; i < StakingData1.length; i++) {
            totalstaking += StakingData1[i].Amount;
          }

          let data1 = {
            userId: Refflevalncome._id,
            Note: `You Got Level ${i} Income`,
            Usernameby: decoded.profile.username,
            Amount: (Math.ceil(req.body.Amount / 90 * SIRprice.price) * (dat12[i - 1])) / 100,
          };
          const a1 = await Walletmodal.findOne({ userId: Refflevalncome._id })
          await updateRecord(
            Walletmodal,
            {
              userId: Refflevalncome._id,
            },
            { $inc: { incomeWallet: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * (dat12[i - 1])) / 100) } }
          ).then(async (res) => {
            await Ewallateesc({
              userId: Refflevalncome._id,
              Note: `You Got Level ${i} Income`,
              Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * (dat12[i - 1])) / 100),
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
          userId: Refflevalncome._id,
          Usernameby: decoded.profile.username,
          Amount: ((Math.ceil(req.body.Amount / 90 * SIRprice.price) * (dat12[i - 1])) / 100),
          leval: i,
          Active: false
        }).save()
      }
    }
  }
}
const CCBupdate = async ({ data, decoded, req, liveprice1 }) => {
  const SIRprice = await V4XpriceSchemaDetails.findOne().sort({ createdAt: -1 });

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

  for (let i = 1; i <= supporterIds.length; i++) {
    if ((req.body.Amount * (dat12[i])) / 100 != null) {
      const Refflevalncome = await findOneRecord(Usermodal, {
        _id: supporterIds[i - 1],
      });
      console.log({ "data": Refflevalncome, "amount": (req.body.Amount * (dat12[i])) / 100, "leval": i, "%": dat12[i] });
      await Stakingmodal({
        userId: Refflevalncome._id,
        WalletType: `Level ${i} plan (${decoded.profile.username})`,
        DailyReword: (req.body.Amount * (dat12[i - 1])) / 100 * 2 / 1000,
        bonusAmount: 200,
        leval: i,
        Amount: (req.body.Amount * (dat12[i - 1])) / 100,
        TotalRewordRecived: (req.body.Amount * (dat12[i - 1])) / 100 * 2,
        transactionHash: "",
        Active: Refflevalncome.leval >= i,
        liveprice: SIRprice.price
      }).save();
    }
  }
};

const handleStaking = async (decoded, WalletData, SIRprice, amount, transactionHash, req) => {
  const data = await findOneRecord(Usermodal, { username: decoded.profile.username });
  const ReffData = await findOneRecord(Usermodal, { username: data.supporterId });
  const ReffData1 = await findOneRecord(Usermodal, { username: data.mainId });
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
  await updateRecord(
    Usermodal,
    { username: ReffData1.username },
    {
      leval: Number(decoded.profile.mystack === 0 ? daat.length + 1 : daat.length),
    }
  )
  if (ReffData1?._id !== null) {
    const data123 = await Stakingbonus.findOne({ Note: `You Got Refer and Earn Income From ${decoded.profile.username}` });
    if (!data123) {
      const income = Math.ceil(amount / 90 * SIRprice.price) * 5 / 100;
      await updateRecord(Walletmodal, { userId: ReffData1._id }, { $inc: { incomeWallet: income } });

      const res = await Walletmodal.findOne({ userId: ReffData1._id });
      if (res) {
        await Promise.all([
          Ewallateesc({
            userId: ReffData1._id,
            Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
            Amount: income,
            type: 1,
            balace: res.incomeWallet - income,
            Active: true,
          }).save(),
          Stakingbonus({
            userId: ReffData1._id,
            ReffId: decoded.profile._id,
            Amount: income,
            Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
            Active: true,
          }).save()
        ]);
      }
    }

    await Promise.all([
      ({ decoded, data, ReffData1, req }),
      SCBupdate({ decoded, data, ReffData1, req }),
      CCBupdate({ data, decoded, req, SIRprice })
    ]);

    await Stakingmodal({
      userId: decoded.profile._id,
      WalletType: "main-Wallet",
      DailyReword: Number(amount / 1000) * 2,
      bonusAmount: 200,
      Amount: amount,
      TotalRewordRecived: amount * 2,
      transactionHash: transactionHash,
      liveprice: SIRprice.price
    }).save();
  }
}

// Helper function to deduct amount from main wallet and save to Mainwallatesc
const deductMainWallet = async (decoded, WalletData, amount) => {
  await updateRecord(Walletmodal, { userId: decoded.profile._id }, { $inc: { mainWallet: -amount } })
    .then(async (res) => {
      await Mainwallatesc({
        userId: decoded.profile._id,
        Note: `Staking Charge`,
        Amount: amount,
        balace: res.mainWallet,
        type: 0,
        Active: true,
      }).save();
    });
}
function getLast6Months() {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentDate = new Date();
  const last6Months = [];

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentDate.getMonth() - i + 12) % 12;
    last6Months.push(months[monthIndex]);
  }

  return last6Months;
} function formatDate(date) {
  const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if needed
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (Note: January is 0)
  return `${day}-${month}`;
}

function getLast10WeeksDates() {
  const dates = [];
  const today = new Date(); // Get today's date

  // Loop through the last 10 weeks
  for (let i = 0; i < 10; i++) {
    const startDate = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000); // Calculate start date of week
    const endDate = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000); // Calculate end date of week
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    dates.push(`${formattedStartDate} To ${formattedEndDate}`); // Push formatted date range to the array
  }

  return dates;
}

const last6MonthsArray = getLast6Months();
console.log(last6MonthsArray);

async function calculateWeeklyWithdrawals1(data, dataType) {
  const currentDate = new Date();
  const tenWeeksAgo = new Date(currentDate.getTime() - (10 * 7 * 24 * 60 * 60 * 1000));

  const weeklyAmounts = [];
  for (let i = 0; i < 10; i++) {
    const weekStart = new Date(tenWeeksAgo.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
    console.log("data", data);
    const weeklyTotal = data.reduce((total, item) => {
      const itemDate = new Date(item.createdAt); // Access the createdAt field directly
      if (itemDate >= weekStart && itemDate <= weekEnd) {
        return total + item[dataType];
      }
      return total;
    }, 0);
    weeklyAmounts.push(weeklyTotal);

  }

  return weeklyAmounts;
}

async function calculateWeeklyWithdrawals(data, dataType) {
  const currentDate = new Date();
  const tenWeeksAgo = new Date(currentDate.getTime() - (10 * 7 * 24 * 60 * 60 * 1000));

  const weeklyAmounts = [];
  for (let i = 0; i < 10; i++) {
    const weekStart = new Date(tenWeeksAgo.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
    const weeklyTotal = data.reduce((total, item) => {
      const itemDate = new Date(item.createdAt); // Access the createdAt field directly
      if (itemDate >= weekStart && itemDate <= weekEnd) {
        return total + item[dataType];
      }
      return total;
    }, 0);
    weeklyAmounts.push(weeklyTotal);

  }

  return weeklyAmounts;
}
async function getLast6MonthsData() {
  const currentDate = new Date();
  const stakingarray = []
  const withdrawalarray = []
  // Fetch staking and withdrawal data from MongoDB for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59, 999);

    // Fetch staking and withdrawal data for the current month
    const stakingData = await Stakingmodal.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('Amount');

    const withdrawalData = await withdrawalmodal.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('withdrawalAmount');

    const usdtPriceDocument = await V4XpriceSchemaDetails.findOne({});
    const usdtPrice = usdtPriceDocument.price; // Assuming the price is stored in the 'price' field
    // Calculate total staking and withdrawal amounts for the current month

    const stakingAmount = stakingData.reduce((total, item) => total + (item.Amount * usdtPrice) / 90, 0);
    const withdrawalAmount = withdrawalData.reduce((total, item) => total + item.withdrawalAmount, 0);
    stakingarray.push(stakingAmount)
    withdrawalarray.push(withdrawalAmount)
  }

  return [{ name: 'staking', data: stakingarray }, { name: 'withdrawal', data: withdrawalarray }];
}
async function getStakingAmountSumForLevalGreaterThanZero() {
  try {
    const stakingSum = await Stakingmodal.aggregate([
      {
        $match: { leval: { $gt: 0 } } // Filter documents where leval is greater than 0
      },
      {
        $group: {
          _id: null,
          totalStaking: { $sum: "$Amount" } // Calculate sum of Amount field
        }
      }
    ]);

    return stakingSum[0]?.totalStaking || 0;
  } catch (error) {
    console.error('Error fetching staking amount sum:', error);
    return 0;
  }
}
async function getTotalStakingAndWithdrawalAmounts(usdtPriceDocument) {
  try {
    const usdtPrice = usdtPriceDocument.price;
    // Fetch total staking amount
    console.log(usdtPrice);
    const totalStaking = await Stakingmodal.aggregate([
      {
        $match: {
          Removed: !true
        }
      },
      {
        $group: {
          _id: null,
          totalStaking: { $sum: "$Amount" }
        }
      }
    ]);   // Fetch total staking amount
    const totalStaking1 = await Stakingmodal.aggregate([
      {
        $match: {
          leval: 0
        }
      },
      {
        $group: {
          _id: null,
          totalStaking: { $sum: "$Amount" }
        }
      }
    ]);   // Fetch total staking amount
    const totalWithdrawal = await withdrawalmodal.aggregate([
      {
        $group: {
          _id: null,
          totalWithdrawal: { $sum: "$withdrawalAmount" }
        }
      }
    ]);

    return {
      totalStaking: (totalStaking[0]?.totalStaking * usdtPrice) / 90 || 0,
      totalStaking1: (totalStaking1[0]?.totalStaking * usdtPrice) / 90 || 0,
      totalWithdrawal: totalWithdrawal[0]?.totalWithdrawal || 0
    };
  } catch (error) {
    console.error('Error fetching total staking and withdrawal amounts:', error);
    return {
      totalStaking: 0,
      totalWithdrawal: 0
    };
  }
}
async function getUsersWithNewRanksToday() {
  try {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);

    const newRankAchievements = await Achivementmodal.find({
      achievedAt: { $gte: todayStart, $lte: todayEnd }
    }).populate('userId').select('userId -_id');
    console.log(newRankAchievements);
    return newRankAchievements.map(achievement => ({
      userId: achievement.userId._id,
      userName: achievement.userId.username,
      Fullname: achievement.userId.Fullname,
      newRank: achievement.userId.Rank
    }));
  } catch (error) {
    console.error('Error fetching users with new ranks:', error);
    return [];
  }
}
async function getUsersStakedToday() {
  try {
    // Get the start and end of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find staking transactions created today and group by userId
    const todayStakedUsers = await Usermodal.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
    ]);

    // Extract user IDs from the result

    return todayStakedUsers;
  } catch (error) {
    console.error('Error fetching users who staked today:', error);
    return [];
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
                let data1 = await otp.find({ userId: decoded.profile._id, otp: Number(req.body.otp) });

                if (data1.length !== 0) {
                  await otp.remove({ userId: decoded.profile._id });
                  return notFoundResponse(res, { message: "Transaction failed" });
                } else {
                  await otp.remove({ userId: decoded.profile._id });
                  if (WalletData.mainWallet < req.body.Amount) {
                    return validarionerrorResponse(res, { message: "Insufficient main wallet balance" });
                  } else {
                    await cronHandler(decoded.profile.username).then(async (res) => {
                      // Concurrently execute staking updates and main wallet deduction
                      await Promise.all([
                        deductMainWallet(decoded, WalletData, req.body.Amount),
                        handleStaking(decoded, WalletData, SIRprice, req.body.Amount, "", req)
                      ]);
                    })
                  }
                  await amountupdate(decoded.profile.username);
                }
                return successResponse(res, { message: "You have successfully staked SIR Tokens" });
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
                  const blockTimestamp = timestamp * 30000;
                  const timeDifference = currentTimestamp - blockTimestamp;
                  if (timeDifference <= maxTimeDifference) {
                    const transactionHash = req.body.transactionHash;
                    // Concurrently execute staking updates and main wallet deduction
                    await cronHandler(decoded.profile.username).then(async (res) => {
                      // Concurrently execute staking updates and main wallet deduction
                      await Promise.all([
                        handleStaking(decoded, WalletData, SIRprice, req.body.Amount, transactionHash, req),
                        deductMainWallet(decoded, WalletData, req.body.Amount)
                      ]);
                    })
                    await amountupdate(decoded.profile.username);
                    return successResponse(res, { message: "You have successfully staked SIR Tokens" });
                  }
                })
                .catch((err) => {
                  return badRequestResponse(res, {
                    message: "something went to wrong please try again",
                    err: err,
                  });
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
              as: "amount2122",
              pipeline: [
                {
                  $match: {
                    leval: 0,
                  }
                }
              ]
            }
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
                    $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: ["$$this.liveprice", 90] }] }],
                  },
                },
              },
              total3: {
                $reduce: {
                  input: "$amount21",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: ["$$this.liveprice", 90] }] }],
                  },
                },
              },
              total1: {
                $reduce: {
                  input: "$amount2",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: ["$$this.liveprice", 90] }] }],
                  },
                },
              },
              todaymyteam: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$amount2122",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $gt: ["$$item.createdAt", new Date(startOfDayIST)],
                          }
                        ],
                      },
                    },
                  },
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: ["$$this.liveprice", 90] }] }],
                  },
                },
              },
              todaymy: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$amount",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $gte: ["$$item.createdAt", new Date(startOfDayIST)],
                          },
                        ],
                      },
                    },
                  },
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $multiply: ["$$this.Amount", { $divide: ["$$this.liveprice", 90] }] }],
                  },
                },
              },
              todaymyinsir: {
                $reduce: {
                  input: "$amount",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $multiply: ["$$this.Amount"] }],
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
                    $add: ["$$value", "$$this.Amount"],
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
              // pipeline: [
              //   {
              //     $match: {
              //       Removed: true,
              //     },
              //   },
              // ],
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
                    Active: false
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
              },
              holdincomeSCB: {
                $reduce: {
                  input: "$amountupcoming1",
                  initialValue: 0,
                  in: {
                    $add: ["$$value",
                      "$$this.TotalRewordRecived"],
                  },
                },
              },
              stakingsize: { $size: "$amountupcoming1" }, // Adding the Size field

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
                  input: "$amount3",
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
              TodaStakingBonusIncome: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$amount131",
                      as: "item",
                      cond: {
                        $and: [
                          {
                            $eq: [
                              {
                                $substr: [
                                  "$$item.Note",
                                  0,
                                  13,
                                ],
                              },
                              "You Got Staki",
                            ],
                          },
                          {
                            $gt: ["$$item.createdAt", new Date(startOfDayIST)],
                          },
                          {
                            $lt: ["$$item.createdAt", new Date(endOfDayIST)],
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
        todaymyinsir: aggregatedUserData[0].todaymyinsir,
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
  Admindeshbord: async (req, res) => {
    try {
      const [withdrawalsData, stakingModalData, usdtPriceDocument, Usermodaldata] = await Promise.all([
        withdrawalmodal.find({}),
        Stakingmodal.find({ leval: 0 }),
        V4XpriceSchemaDetails.findOne({}),
        Usermodal.find({})
      ]);
      console.log("withdrawalsData", withdrawalsData);

      const [weeklyWithdrawals, weeklyStakingModal, last6MonthsData, totalStaking, newRankAchievements, usersStakedToday] = await Promise.all([
        calculateWeeklyWithdrawals1(withdrawalsData, 'withdrawalAmount'),
        calculateWeeklyWithdrawals(stakingModalData, 'Amount'),
        getLast6MonthsData(),
        getTotalStakingAndWithdrawalAmounts(usdtPriceDocument),
        getUsersWithNewRanksToday(),
        getUsersStakedToday()
      ]);

      const usdtPrice = usdtPriceDocument.price;

      const stakingAmountsInUSDT = weeklyStakingModal.map(amount => (amount * usdtPrice) / 90);

      return successResponse(res, {
        message: "staking data get successfully",
        weeklyWithdrawals,
        weeklyStakingmodal: stakingAmountsInUSDT,
        getLast6Month: getLast6Months(),
        getLast6Months: last6MonthsData,
        totalStaking,
        newRankAchievements,
        Usermodaldata1: Usermodaldata?.length,
        usdtPriceinr: usdtPrice,
        usdtPrice: usdtPrice / 90,
        UsersStakedToday: usersStakedToday, Last10WeeksDates: getLast10WeeksDates()
      });
    } catch (error) {
      console.error("Error in Admindeshbord:", error);
      return errorResponse(res, "Error processing data");
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
                    )
                    await updateRecord(
                      Walletmodal,
                      {
                        userId: abc[0]._id,
                      },
                      { $inc: { mainWallet: req.body.Amount } }
                    )

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
