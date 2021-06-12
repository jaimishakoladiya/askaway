const mongoose = require('mongoose')
var mongodbErrorHandler = require('mongoose-mongodb-errors')
mongoose.plugin(mongodbErrorHandler);
mongoose.Promise = global.Promise;
mongoose.connect(process.env.mongodburl, {useUnifiedTopology: true, useNewUrlParser: true ,useFindAndModify:false})
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
