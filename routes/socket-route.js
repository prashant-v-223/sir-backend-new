'use strict';
const Stakingmodal = require("../models/Staking");
const withdrawalmodal = require("../models/withdrawalhistory");
const V4XpriceSchemaDetails = require("../models/TokenDetails");
const Usermodal = require("../models/user");
const Achivementmodal = require("../models/Achivement");
const Projectsetting = require("../models/Projectsetting");
const { findAllRecord } = require("../library/commonQueries");

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

async function calculateWeeklyWithdrawals1(data, dataType) {
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
    return newRankAchievements.length > 0 ? newRankAchievements.map(achievement => ({
      userId: achievement.userId._id,
      userName: achievement.userId.username,
      Fullname: achievement.userId.Fullname,
      newRank: achievement.userId.Rank
    })) : [];
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
module.exports = function (io) {
  io.on('connection', async (socket) => {
    try {
      const [
        withdrawalsData,
        stakingModalData,
        usdtPriceDocument,
        Usermodaldata,
        settings
      ] = await Promise.all([
        await findAllRecord(withdrawalmodal, {}),
        await findAllRecord(Stakingmodal, { leval: 0 }),
        V4XpriceSchemaDetails.findOne({}),
        Usermodal.find({}),
        Projectsetting.findOne({})
      ]);

      const usdtPrice = usdtPriceDocument.price;

      const [
        weeklyWithdrawals,
        weeklyStakingModal,
        last6MonthsData,
        totalStaking,
        newRankAchievements,
        usersStakedToday
      ] = await Promise.all([
        calculateWeeklyWithdrawals1(withdrawalsData, 'withdrawalAmount'),
        calculateWeeklyWithdrawals(stakingModalData, 'Amount'),
        getLast6MonthsData(),
        getTotalStakingAndWithdrawalAmounts(usdtPriceDocument),
        getUsersWithNewRanksToday(),
        getUsersStakedToday()
      ]);

      const stakingAmountsInUSDT = weeklyStakingModal.map(amount => (amount * usdtPrice) / 90);

      // Emit events to the client
      socket.emit('Last10WeeksDates', {
        message: "staking data get successfully",
        weeklyStakingmodal: stakingAmountsInUSDT,
        weeklyWithdrawals,
        Last10WeeksDates: getLast10WeeksDates()
      });
      socket.emit('weeklyData', {
        message: "staking data get successfully",
        getLast6Month: getLast6Months(),
        getLast6Months: last6MonthsData,
        totalStaking,
        newRankAchievements,
        Usermodaldata1: Usermodaldata?.length,
        usdtPriceinr: usdtPrice,
        usdtPrice: usdtPrice / 90,
        UsersStakedToday: usersStakedToday,
      });
      socket.on("FromAPI", (userId) => {
        console.log("userId", userId);
      });
      socket.on('getSettings', async (data) => {
        const { updatedSetting } = data;
        console.log("updatedSettingupdatedSettingupdatedSetting", updatedSetting);
        // try {
        //   await Projectsetting.updateMany({}, { $set: updatedSetting });
        // } catch (error) {
        //   console.error('Error updating project setting:', error);
        // }
      });

      socket.emit('getSettings', { data: settings });

    } catch (error) {
      console.error('Error handling client connection:', error);
    }
  });

};
