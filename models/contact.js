const mongoose = require('mongoose');
var contactDetailSchema= new mongoose.Schema({
    'name':String,
    'subject':String,
    'email':String,
    'description':String,
})
const collectionName = 'contact';
module.exports = mongoose.model('contact',contactDetailSchema, collectionName);