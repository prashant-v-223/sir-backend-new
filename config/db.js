'use strict'
const mongoose = require('mongoose')
mongoose.set("strictQuery", false)
const Projectsetting = require("../models/Projectsetting");


try {
    mongoose.connect("mongodb+srv://UUDT:Qk08zFG1nL91QVXz@cluster0.bftwyzt.mongodb.net/SIRnewFinal", { bufferMaxEntries: 0, useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 3000 })
    const db = mongoose.connection

    db.once('open', async function () {
        console.log('Database connected successfully!')
        const data = await Projectsetting.findOne({})
        if (data === null) {
            const newSetting = new Projectsetting({
                scbtotallevaldistribution: 16,
                scbtPercentage: [3, 2, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1],
                ccbtotallevaldistribution: 16,
                reffPercentage: 5,
                ccbtPercentage: [10, 7, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 2, 3, 5]
            });
            // Save the new document
            newSetting.save()
                .then(savedSetting => {
                    console.log("Setting added successfully:", savedSetting);
                })
                .catch(error => {
                    console.error("Error adding setting:", error);
                });
        }
    })

} catch (error) {
    db.on('error', console.error.bind(console, 'Database connection failed'))
}
