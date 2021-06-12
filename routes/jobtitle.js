const router = require('express').Router();
var uniqid = require('uniqid');
require('../../askaway/connection.js')
const jobDetail = require('../../askaway/models/job-detail.js')
const adminUser = require('../../askaway/models/registerSchema')
var cors = require('cors');
const passport = require('passport');
router.use(cors({
    origin: '*'
}));
router.post('/update-job-detail/:jobDetailId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;

    const data = req.body;
    let adminKey = type === 'admin' ? req.user.id : '';
    const title = data.title;
    const department = data.department;
    const questions = data.questions;
    const managerToken = req.user.id;
    const jobDetailId = req.params['jobDetailId'];

    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken })
        adminKey = getAdminDetail[0].adminKey;
    }
    jobDetail.find({ 'adminKey': adminKey, 'job-title.job_detail_id': jobDetailId }, async function (err, jobDetailResult) {

        if (err) {
            res.json({ status: false, message: err.message })
        } else {
            const jobDetails = jobDetailResult[0]['job-title'];

            const checkjobDetailExist = jobDetails.filter(x => x.title === title && x.job_detail_id !== jobDetailId);
            if (checkjobDetailExist.length > 0) {
                return res.json({ status: false, message: 'job title already exist' })
            }
            const jobDetailIndex = await jobDetails.findIndex((ind) => {
                return ind.job_detail_id === jobDetailId
            })
            jobDetails[jobDetailIndex]['title'] = title;
            jobDetails[jobDetailIndex]['department'] = department;
            jobDetails[jobDetailIndex]['manager_token'] = managerToken;
            jobDetails[jobDetailIndex]['questions'] = questions;

            jobDetail.findOneAndUpdate({ 'job-title.job_detail_id': jobDetailId }, { $set: { 'job-title': jobDetails } }, function (err, result) {
                if (err) {
                    res.json({ status: false, message: "Something went wrong" });
                } else {
                    res.json({ status: true, message: "Job detail updated successfully", data: result })
                }
            })

        }
    })
})
router.post('/save-job-detail', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    const data = req.body;
    const title = data.title;
    const department = data.department;
    const questions = data.questions;
    let adminKey = type === 'admin' ? req.user.id : '';
     const managerToken = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken });
        adminKey = getAdminDetail[0].adminKey;
    }
    jobDetail.find({ 'adminKey': adminKey }, async function (err, jobDetailResult) {
        if (err) {
            res.json({ status: false, message: err.message });
        } else {
            if (jobDetailResult.length < 1) {
                const randomId = uniqid()

                const data = {
                    'manager_token': adminKey,
                    'adminKey': adminKey,
                    'job-title': [],
                }

                data['job-title'] = [{
                    'title': title,
                    'department': department,
                    'job_detail_id': randomId,
                    'questions': questions,
                    'manager_token': req.user.type === 'manager' ? managerToken : adminKey,
                }];

                jobDetail.create(data, (err, result) => {
                    return err ? res.json({ status: false, message: 'something went wrong' })
                        : res.json({ status: true, data: result, message: 'Data inserted successfully' });
                });
            } else {
                const randomId = uniqid()
                const jobDetails = jobDetailResult[0]['job-title'];

                const checkjobDetailExist = jobDetails.filter(x => x.title === title);
                if (checkjobDetailExist.length > 0) {
                    return res.json({ status: false, message: 'Data already exists' });
                }

                jobDetails.push({
                    'title': title,
                    'department': department,
                    'job_detail_id': randomId,
                    'questions': questions,
                    'manager_token': req.user.type === 'manager' ? managerToken : adminKey,
                });
                jobDetail.findOneAndUpdate({ 'adminKey': adminKey }, {
                    $set: { 'job-title': jobDetails },
                }, function (err, result) {
                    return err ? res.json({ status: false, message: 'something went wrong' })
                        : res.json({ status: true, data: result, message: 'Data inserted successfully' });
                });
            }
        }
    });
});
router.get('/get-job-detail', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const managerToken = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken });
        adminKey = getAdminDetail[0].adminKey;
    }
    jobDetail.findOne({ 'adminKey': adminKey }, async function (err, jobDetailResult) {
        if (err) {
            return res.json({ status: false, message: err.message });
        } else {
            if (jobDetailResult && jobDetailResult['job-title'].length >= 0) {
                const result = jobDetailResult['job-title'];
                return res.json({ status: true, message: 'Data get successfully', result })
            } else {
                return res.json({ status: false, message: 'Data not found' })
            }
        }
    })
})
router.post('/delete-job-detail/:jobDetailId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const managerToken = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken });
        adminKey = getAdminDetail[0].adminKey;
    }
    const jobDetailId = req.params['jobDetailId'];
    jobDetail.find({ 'adminKey': adminKey, 'job-title.job_detail_id': jobDetailId }, async function (err, jobDetailResult) {
        if (err) {
            res.json({ status: false, message: err.message });
        } else {
            let jobDetails = jobDetailResult[0]['job-title'];
            jobDetails = jobDetails.filter(item => item.job_detail_id !== jobDetailId);
            jobDetail.findOneAndUpdate({ 'adminKey': adminKey }, { $set: { 'job-title': jobDetails } }, function (err, result) {
                if (err) {
                    res.json({ status: false, message: err.message });
                } else {
                    res.json({ status: true, data: result, message: 'Data deleted successfully' });
                }
            });
        }
    });
});
router.get('/view-job-question/:jobId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const managerToken = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken });
        adminKey = getAdminDetail[0].adminKey;
    }
    const jobId = req.params['jobId'];
    jobDetail.find({ 'adminKey': adminKey, 'job-title.job_detail_id': jobId }, async function (err, jobDetailResult) {

        if (err) {
            res.json({ status: false, message: 'Job not found' });
        } else {
            if (jobDetailResult.length > 0) {

                let jobTitles = jobDetailResult[0]['job-title'];
                jobTitles = jobTitles.filter(item => item.job_detail_id === jobId);
                res.json({ status: true, message: 'Data get successfully', data: jobTitles })
            } else {
                res.json({ status: false, message: 'Job not found' });
            }
        }
    })

})
module.exports = router;




