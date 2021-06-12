const mongoose = require('mongoose');

const schema = new mongoose.Schema(
    {
        adminKey: String,
        admin: {},
        hiring_manager: [],
        question_bank: {},
        questions: {},
        shared_interview: [],
    })
const collectionName = 'admin-user';

module.exports = mongoose.model("adminlogin", schema, collectionName)