const router = require('express').Router();
const adminUser = require('../../askaway/models/registerSchema');
const interview = require('../../askaway/models/interview-record');
var uniqid = require('uniqid');

const passport = require('passport');
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

router.post('/check-grid-assign/:sharedid/:type', async function (req, res) {

    const sharedid = req.params.sharedid;
    const type = req.params.type;

    if (type === 'single') {
        const checkExist = await adminUser.findOne({ 'shared_interview.sharedId': sharedid, 'shared_interview.type': type });
        return checkExist ? res.json({ status: true })
            : res.json({ status: false, message: 'You are not assigned interview grid' });
    } else {
        const checkExist = await adminUser.findOne({ 'shared_interview.sharedId': sharedid, 'shared_interview.type': type });
        return checkExist ? res.json({ status: true })
            : res.json({ status: false, message: 'You are not assigned interview grid' });
    }
});

router.post('/manager/share', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    const lastname = req.user.data['lastname'];
    const objShared = req.body;
    objShared.sharedOn = new Date(new Date().toUTCString().slice(0, -3));
    objShared.sharedId = uniqid()
    const query = {};
    if (type === 'manager') { query['hiring_manager.manager_token'] = req.user.id; }
    if (type === 'admin') {
        objShared.fromManagerToken = query['adminKey'] = req.user.id;
    }
    const admin = await adminUser.findOne(query);
    let jobTitle = objShared.type !== 'single' ? objShared.jobName : null;
    if (objShared.type === 'single') {
        const interviews = await interview.findOne({ 'token': objShared.candidateToken });
        const roles = `${interviews['candidate-data']['role']}`;
        jobTitle = roles;
    }
    const url = objShared.type === 'single' ? `shared-single-grid/${objShared.sharedId}` : `shared-multiple-grid/${objShared.sharedId}`
    const job = jobTitle.replace(/_/g, ' ');
    await sharedInterviewManager(req, `${req.user.data.firstname} ${lastname}`, `${objShared.firstName} ${objShared.lastName}`,
        objShared.email, url, admin.admin.company_name, job);
    adminUser.findOneAndUpdate(query, { $push: { 'shared_interview': objShared } }, function (err) {
        return err ? res.json({ status: false, message: 'something went wrong' }) : res.json({ status: true, message: 'Grid shared successfully' });
    });
});

async function sharedInterviewManager(req, adminNm, participantNm, mailId, sharedUrl, cmpName, deptName) {
    const url = `${req.protocol}://${req.get('host')}`;
    console.log(url);

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
                console.log("error", error);
            } else {
                console.log('Email sent: ', data.response);
            }
        });
    });

}


module.exports = router;
