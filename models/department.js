const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new Schema({
	'manager_token': String,
	'adminKey': String,
	'departments': Array,
	'questions': Array,
});

const collectionName = 'department';

module.exports = mongoose.model('department', departmentSchema, collectionName);
