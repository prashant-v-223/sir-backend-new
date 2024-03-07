'use strict'
const mongoose = require('mongoose')

mongoose.set("strictQuery", false)

try {

    mongoose.connect("mongodb+srv://UUDT:Qk08zFG1nL91QVXz@cluster0.bftwyzt.mongodb.net/SIRnewFinal", {
        useUnifiedTopology: true,
        useNewUrlParser: true
    })

    const db = mongoose.connection

    db.once('open', function () {
        console.log('Database connected successfully!')
    })

} catch (error) {
    db.on('error', console.error.bind(console, 'Database connection failed'))
}
