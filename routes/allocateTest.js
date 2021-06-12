const router = require('express').Router();
const interview = require('../../askaway/models/interview-record')
const passport = require('passport');
var uniqid = require('uniqid');
const url = require('url');
const fs = require('fs')


router.get('/disable-interview/:token', async (req, res) => {
    const tokenVal = req.params.token;
    interview.find({ 'token': tokenVal }, async (err, result) => {
        if (err) { return res.json({ status: false, message: err.message }) }
        if (result.length <= 0) {
            return res.json({ status: false, message: "Interview not found" })
        }
        if (result[0]['candidate-data'].status !== "Assigned") {
            return res.redirect('/');
        }
        interview.findOneAndUpdate({ 'token': tokenVal }, {
            $set: {
                "candidate-data.status": "declined",
                "candidate-data.completedOn": new Date(new Date().toUTCString().slice(0, -3))
            }
        }, function (err, result) {
            if (err) { throw err }
            else {
                res.sendFile('public/views/decline-interview.html', { 'root': './' });

            }
        })
    })
})

module.exports = router;
