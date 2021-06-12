const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var interviewSchema = new Schema({
	'questions': [],
	'token': String,
	'manager-token': String,
	'allocated-date': String,
	'candidate-data': {},
	'archive': Boolean,
	'attempt': Number,
});

var collectionName = 'interview-records';

module.exports = mongoose.model('interview-records', interviewSchema, collectionName);
