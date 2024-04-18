const express = require('express')

const router = express.Router()

const register = require('./register')

const staking = require('./staking')

const Withdraw = require('./Withdraw')

const admin = require('./admin')

const user = require('./user')

const profile = require('./profile')

const Admin1Controller = require("../controllers/Adminlogin");
router.use('/profile', profile)

router.use('/registration', register)

router.use('/staking', staking)

router.use('/user', user)

router.use('/Withdraw', Withdraw)

router.use('/admin', admin)

router.use('/adminlogin', Admin1Controller)

module.exports = router