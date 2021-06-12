const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoDataSchema = new Schema({
	'token': String,
	'video': [],
	'createdAt': Date,
	'updatedAt': Date,
	'createdBy': String,
	'updatedBy': String,
});

const collectionName = 'video-data';

module.exports = mongoose.model('video-data', videoDataSchema, collectionName);
