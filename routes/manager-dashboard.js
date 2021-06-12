const router = require('express').Router();
const adminUser = require('../../askaway/models/registerSchema.js')
const jobTitle = require('../../askaway/models/job-detail')
const departmemt = require('../../askaway/models/department')
const interview = require('../../askaway/models/interview-record')
const videoData = require('../../askaway/models/video-data');
var Crypto = require("simple-crypto-js").default;
var _secretKey = "some-unique-key";
var simpleCrypto = new Crypto(_secretKey);
const passport = require('passport');
var uniqid = require('uniqid');
const nodemailer = require('nodemailer');
const Email = require('email-templates');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'quickaskeinterview@gmail.com',
        pass: 'quickask@4'
    }
});
const email = new Email({
    message: " from: QuickAsk",
    preview: false,
    transport: { jsonTransport: false },
});
router.get('/get-company-info', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.type === 'admin') {
        adminUser.find({ 'adminKey': req.user.id }, function (err, adminResult) {
            if (err) {
                return res.json({ status: false, message: err.message });
            } else {
                return res.json({ status: true, data: adminResult });
            }
        });
    } else {
        return res.json({ status: false, message: 'You arent allowed for get company information' });
    }
});

router.post('/update-company', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const token = req.user.id;
    if (req.user.type === 'admin') {
        const compdetail = await adminUser.find({ $and: [{ 'admin.company_name': req.body.company_name }, { 'adminKey': { $ne: token } }] });
        if (compdetail.length > 0) {
            return res.json({ status: false, message: 'A company with the same name already exists', name: compdetail[0].admin.first_name + ' ' + compdetail[0].admin['last-name'], compName: compdetail[0].admin.company_name, email: compdetail[0].admin.email });
        }
        adminUser.find({ 'adminKey': token }, async function (err, adminResult) {
            if (err) { res.json({ status: false, message: err.message }); } else {
                if (adminResult.length > 0) {
                    adminUser.findOneAndUpdate({ 'adminKey': token }, {
                        $set: {
                            'admin.firstname': req.body.firstname,
                            'admin.lastname': req.body['lastname'],
                            'admin.company_name': req.body.company_name,
                            'admin.address': req.body.address,
                            'admin.address2': req.body.address2,
                            'admin.city': req.body.city,
                            'admin.state': req.body.state,
                            'admin.zip': req.body.zip,
                        },

                    }, function (err, result) {
                        if (err) res.json({ status: false, message: err.message })
                        else { res.json({ status: true, message: 'Update successfully', data: result }) }
                    });
                }
            }
        });
    } else {
        return res.json({ status: false, message: 'You arent allowed for update company information' });
    }
});
router.get('/getManager', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const managerToken = type === 'manager' ? req.user.id : '';
    if (type === 'manager') {
        const getManagerDetail = await adminUser.find({ 'hiring_manager.manager_token': managerToken })
        adminKey = getManagerDetail[0].adminKey
    }
    adminUser.findOne({ 'adminKey': adminKey }, async function (err, adminResult) {
        if (err) {
            res.json({ status: false, message: err.message })
        } else {
            if (adminResult) {
                const adminKey = adminResult.adminKey;
                const jobTitleResult = await jobTitle.find({ 'adminKey': adminKey })
                const departmentResult = await departmemt.find({ 'adminKey': adminKey })
                const managerdata = adminResult.hiring_manager;
                const questions = adminResult.questions && adminResult.questions.length > 0 ? adminResult.questions.filter(x => x.token === req.user.id) : [];
                if (managerdata && managerdata.length > 0) {
                    for (let i = 0; i < managerdata.length; i++) {
                        managerdata[i].questions = adminResult.questions && adminResult.questions.length > 0 ? adminResult.questions.filter(x => x.token === managerdata[i].manager_token) : [];
                    }
                }
                const finalResponse = { user: req.user, departmentResult, jobTitleResult, managerdata, questions }
                return res.json({ status: true, data: finalResponse })
            } else {
                res.json({ status: false, message: "Manager not found" })
            }

        }
    })

})

router.post('/manager-added-interview', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const data = req.body
    const type = req.user.type
    let adminKey = type === 'admin' ? req.user.id : '';
    let token = req.user.id;
    if (req.user.data.email !== data.managers[0].email || type === 'manager') {
        let getAdminData
        if (type === 'admin') {
            getAdminData = await adminUser.find({ 'adminKey': adminKey, 'hiring_manager.email': data.managers[0].email, 'hiring_manager.isDeleted': false })
        }
        else {
            getAdminData = await adminUser.find({ 'hiring_manager.email': data.managers[0].email, 'hiring_manager.isDeleted': false })
        }
        adminKey = getAdminData[0].adminKey;
        if (getAdminData) {
            getAdminData[0].hiring_manager.forEach(manager => {
                if (manager.email === data.managers[0].email) {
                    token = manager.manager_token
                }
            })
        }
    }
    const adminData = await adminUser.findOne({ 'adminKey': adminKey })
    if (data.candidate && data.candidate.length > 0) {
        data.candidate.forEach(async (candidate) => {
            const randomId = uniqid()
            const dataToWrite = {}
            dataToWrite['questions'] = []
            for (const i in data.question_bank.test) {
                const qu = data.question_bank.test[i]
                qu['order'] = i;
                qu['is_answered'] = 'N'
                dataToWrite['questions'].push(qu)
            }
            candidate['status'] = 'Assigned';
            candidate['role'] = data.question_bank.department;
            candidate['department'] = data.managers[0].department;
            candidate['completedOn'] = Date.now();

            if (dataToWrite) {
                dataToWrite['token'] = randomId;
                dataToWrite['manager-token'] = token;
                dataToWrite['candidate-data'] = candidate;
                mail();
                await interview.create(dataToWrite)
            }

            if (data.panel && data.panel.length > 0) {
                data.panel.forEach(async (participant) => {
                    const objShared = participant;
                    objShared.fromManagerToken = token;
                    objShared.candidateToken = randomId;
                    objShared.jobName = '';
                    objShared.sharedOn = new Date(new Date().toUTCString().slice(0, -3));
                    objShared.sharedId = uniqid();
                    objShared.type = 'single';
                    const getAllSharedEmail = await adminUser.findOneAndUpdate({ 'adminKey': adminKey }, { $push: { 'shared_interview': objShared } });
                    await sharedInterviewManager(`${adminData.admin.firstname} ${adminData.admin.lastname}`, `${participant.firstName} ${participant.lastName}`, participant.email, `shared-single-grid/${objShared.sharedId}`, adminData.admin.company_name, data.question_bank.department);
                })
            }

            async function sharedInterviewManager(adminNm, participantNm, mailId, sharedUrl, cmpName, deptName) {
                const url = `${req.protocol}://${req.get('host')}`;
                email.send({
                    template: 'sharedGrid',
                    message: {
                        subject: 'You have been invited to review interview',
                        to: mailId,
                        auth: {
                            user: 'quickaskeinterview@gmail.com',
                        },
                    },
                    locals: {
                        assigneeName: adminNm,
                        reviewerName: participantNm,
                        companyName: cmpName,
                        jobName: deptName.replace(/_/g, ' '),
                        sharedGridURL: `${url}/${sharedUrl}`,
                        logo: `${url}/public/assets/email-image/logo.png`,
                        headerBanner: `${url}/public/assets/email-image/email-banner.png`,
                    },
                }).then(result => {
                    transporter.sendMail(result.originalMessage, (error, data) => {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ', data.response);
                        }
                    });
                });

            }
            function mail() {
                const url = `${req.protocol}://localhost:3000`;

                email.send({
                    template: 'invitedEmailer',
                    message: {
                        subject: 'You have been invited to take an interview in AskAway',
                        to: candidate.email,
                        auth: {
                            user: 'quickaskeinterview@gmail.com',
                        },
                    },
                    locals: {
                        candidateName: `${candidate.first_name} ${candidate.last_name}`,
                        jobTitle: data.question_bank.department.replace(/_/g, ' '),
                        adminName: `${adminData.admin.firstname} ${adminData.admin.lastname}`,
                        companyName: `${adminData.admin.company_name}`,
                        adminEmail: data.managers[0].email,
                        managerName: `${data.managers[0].first_name} ${data.managers[0].last_name}`,
                        inviteLink: `${url}/start/${randomId}`,
                        practiceInterviewLink: `${url}/start/${randomId}/0000000000`,
                        disableInterviewLink: `${url}/disable-interview/${randomId}`,
                        logo: `/public/assets/email-image/logo.png`,
                        footerimgurl: `${url}/public/assets/img/bestcompany.png`,
                        headerBanner: `${url}/public/assets/email-image/email-banner.png`,
                    },
                }).then(result => {
                    transporter.sendMail(result.originalMessage, (error, data) => {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ', data.response);
                        }
                    });
                });
            }
            return res.json({ 'status': true, message: "Interview assigned successfully" })
        });
    } else {
        return res.json({ 'status': false, message: "Enter candidate data" })
    }
})

router.get(`/manager/candidates/information/:isArchive`, passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
        const isArchive = req.params.isArchive;
        const type = req.user.type;
        const query = {};
        if (type === 'manager') { query['hiring_manager.manager_token'] = req.user.id; }
        if (type === 'admin') { query['adminKey'] = req.user.id; }
        const getAllUser = await adminUser.findOne(query);
        if (!getAllUser) {
            return res.json({ status: false, message: "User not found" })
        }
        const getAllToken = [];
        if (type === 'admin') {

            getAllUser.hiring_manager.forEach(function (data) {
                getAllToken.push(data.manager_token)
            })
            getAllToken.push(req.user.id);
        } else {
            getAllToken.push(req.user.id);
        }
        interview.find({ $and: [{ 'manager-token': { $in: getAllToken } }, { 'archive': { $ne: isArchive } }] }, async function (err, data) {
            if (err) {
                return res.json({ status: false, message: err.message })
            } else {
                const dataToWrite = [];
                if (data.length > 0) {
                    const interviews = data;
                    for (let index = 0; index < interviews.length; index++) {
                        const interviewData = interviews[index];
                        let finalRating = 0;
                        let givenReviewbyUser = 0;
                        const result = await videoData.find({ 'token': interviewData.token });

                        if (result.length > 0) {
                            for (let videoI = 0; videoI < result.length; videoI++) {
                                const video = result[videoI].video;
                                if (video !== undefined && video.length > 0) {
                                    for (let videoIndex = 0; videoIndex < video.length; videoIndex++) {
                                        const videoReview = video[videoIndex]['mreviews'];
                                        if (videoReview !== undefined && videoReview.length > 0) {
                                            givenReviewbyUser += 1;
                                            finalRating += videoReview.reduce((prev, next) => prev + next.rating, 0) / videoReview.length;
                                        }
                                    }
                                }
                            }
                        }

                        const data = {
                            'archive': interviewData.archive ? interviewData.archive : null,
                            'token': interviewData.token,
                            'manager-token': interviewData['manager-token'],
                            'candidate-data': interviewData['candidate-data'],
                            'rating': finalRating && givenReviewbyUser ? parseFloat(finalRating / givenReviewbyUser).toFixed(2) : 0,
                        }
                        dataToWrite.push(data);
                    }
                    return res.json({ status: true, message: "Data get successfully", data: dataToWrite })
                } else {
                    return res.json({ status: true, message: "Data get successfully", data: dataToWrite })
                }
            }
        })
    } catch (error) {
    }
})


router.post('/archiveCandidate', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const data = req.body.candidates;
        if (!data) {
            return res.json({ status: false, message: 'Please select candidates' })
        }
        const candidates = data.split(',');
        candidates.forEach(async (id) => {
            await interview.updateOne({ 'token': id.toString().trim() }, { $set: { 'archive': true } }, { upsert: true }).exec();
        });
        return res.json({ status: true, message: 'Candidates archived successfully' });
    } catch (err) {
        return res.json({ status: false, message: err.message });
    }
});


router.post('/deleteCandidate', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const data = req.body.candidates;
        if (!data) {
            return res.json({ status: false, message: 'Please select candidates' })
        }
        const candidates = data.split(',');

        candidates.forEach(async (id) => {

            await interview.deleteOne({ 'token': id.toString().trim() });
        });

        return res.json({ status: true, message: 'Candidates deleted successfully' });
    } catch (err) {
        return res.json({ status: false, message: err.message });
    }
});

module.exports = router;
