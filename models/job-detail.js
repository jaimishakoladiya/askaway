const mongoose = require('mongoose');
const jobDetailSchema = new mongoose.Schema({
	'manager_token': String,
	'adminKey': String,
	'job-title': [],
	'questions': Array,
});

const collectionName = "job-detail";
module.exports = mongoose.model('job-detail', jobDetailSchema, collectionName);

