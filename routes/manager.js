const router = require('express').Router();
var uniqid = require('uniqid');
require('../../askaway/connection.js')
const adminUser = require('../../askaway/models/registerSchema')
const nodemailer = require('nodemailer');
var cors = require('cors');
var Crypto = require("simple-crypto-js").default;
var _secretKey = "some-unique-key";
const Email = require('email-templates');
var simpleCrypto = new Crypto(_secretKey);
const passport = require('passport');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'quickaskeinterview@gmail.com',
        pass: 'quickask@4'
    }
});

const emails = new Email({
    message: 'from: QuickAsk',
    preview: false,
    transport: { jsonTransport: false },
})
router.use(cors({
    origin: '*'
}));

router.get("/get-company", passport.authenticate('jwt', { session: false }), async (req, res) => {
    const adminkey = req.user.id;
    const data = await adminUser.findOne({ adminKey: adminkey })
    return res.send(data)
})

router.get('/get-manager', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const type = req.user.type;
    const query = {}
    if (type === 'admin') { query['adminKey'] = req.user.id }
    adminUser.find(query, async function (err, managerResult) {
        if (err) {
            return res.json({ status: false, message: err.message })
        }
        else {
            if (managerResult.length >= 0) {
                const hiringManager = managerResult[0]['hiring_manager']
                return res.json({ status: true, data: hiringManager })
            }
            else {
                return res.json({ status: false, message: 'Data not found' })
            }
        }
    })
})

router.post("/save-manager", passport.authenticate('jwt', { session: false }), async (req, res) => {
    const adminKey = req.user.id
    console.log(adminKey);

    const data = req.body;
    const firstname = data.firstname;
    const lastname = data.lastname;
    const email = data.email;
    const questions = data.question;
    const token = uniqid();
    const checkEmailExist = await adminUser.find({ $and: [{ 'hiring_manager.email': email }, { 'adminKey': adminKey, 'hiring_manager.isDeleted': false }] });

    let company_name;
    let admin_name;
    if (checkEmailExist && checkEmailExist.length > 0) {
        return res.json({ status: false, message: 'Already exist' });
    }
    adminUser.find({ 'adminKey': adminKey }, async function (err, adminResult) {
        if (err) {
            return res.json({ status: false, message: err.message })
        }
        else {
            company_name = adminResult[0].admin.company_name
            admin_name = `${adminResult[0].admin.firstname}${adminResult[0].admin.lastname}`
            if (adminResult.length > 0) {
                const hiringManager = adminResult[0]['hiring_manager'];
                const manager = {
                    'firstname': firstname,
                    'lastname': lastname,
                    'email': email,
                    'manager_token': token,
                    'registration_status': "UNREGISTERED",
                    'isDeleted': false,
                    'created_at': new Date(new Date().toUTCString().slice(0, -3)),
                }
                hiringManager.push(manager);
                if (questions && questions.length > 0) {
                    questions.forEach(async x => {
                        x.token = token
                        x.id = uniqid()
                        await adminUser.findOneAndUpdate({ 'adminKey': adminKey }, { $push: { 'questions': x } });
                    })
                }
                await adminUser.findOneAndUpdate({ 'adminKey': adminKey }, { $set: { 'hiring_manager': hiringManager } }, function (err, result) {
                    if (err) {
                        return res.json({ status: false, message: err.message });
                    } else {
                        mail();
                        return res.json({ status: true, data: result, message: 'Manager added successfully' });
                    }
                });
            }
            else {
                return res.json({ status: false, message: 'Mananger not found' })
            }
        }
    })

    async function mail() {
        const url = `${req.protocol}://${req.get('host')}`;
        // const link = `${url}/verifyemail?id=` + token;
        const link = 'http://localhost:3000/reset-password?id=' + token

        emails.send({
            template: 'managerSetPassword',
            message: {
                subject: 'An QuickAsk account was created for you',
                to: req.body.email,
                auth: {
                    user: 'quickaskeinterview@gmail.com',
                },
            },
            locals: {
                managerName: `${firstname} ${lastname}`,
                adminName: admin_name,
                companyName: company_name,
                setPasswordLink: link,
                logo: `${url}/public/assets/email-image/logo.png`,
                headerBanner: `${url}/public/assets/email-image/email-banner.png`,
            },
        }).then(result => {
            transporter.sendMail(result.originalMessage, (error) => {
            });
        })
    }
})
router.post('/delete-manager/:managerId/:isDeleted', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const adminKey = req.user.id
    const managerId = req.params['managerId'];
    if (!managerId) {
        return res.json({ status: false, message: 'Something went wrong. please try again' });
    }
    const isDeleted = (/true/i).test(req.params['isDeleted']);
    const result = await adminUser.findOne({ 'adminKey': adminKey });
    if (result) {
        await adminUser.updateOne({ 'hiring_manager.manager_token': managerId }, { $set: { 'hiring_manager.$.isDeleted': isDeleted } });
        const message = isDeleted ? 'Manager deactivate successfully' : 'Data deleted successfully';
        return res.json({ status: true, data: result, message: message });
    } else {
        return res.json({ status: false, message: 'Something went wrong' });
    }


});
router.get('/view-manager-question/:token', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;

    let adminKey = type === 'admin' ? req.user.id : '';
    const token = type === 'admin' ? req.params.token : req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }
    const admin = await adminUser.findOne({ 'adminKey': adminKey });
    if (admin) {
        if (admin.questions && admin.questions.length > 0) {
            const getManagerQuestion = admin.questions.filter(x => x.token === token);
            return res.json({ status: true, data: getManagerQuestion, message: 'Get data successfully' });
        } else {
            return res.json({ status: true, data: [], message: 'Question not found!!' });
        }
    } else {
        return res.json({ status: false, message: 'Manager not found!!' });
    }
});
router.get('/get-manager', passport.authenticate('jwt', { session: false }), function (req, res) {
    const type = req.user.type;
    const query = {};
    if (type === 'manager') { query['hiring_manager.manager_token'] = req.user.id; }
    if (type === 'admin') { query['adminKey'] = req.user.id }
    adminUser.find(query, async function (err, managerResult) {
        if (err) {
            return res.json({ status: false, message: err.message });
        } else {
            if (managerResult.length >= 0) {
                const hiringManager = managerResult[0]['hiring_manager'];
                return res.json({ status: true, data: hiringManager });
            } else {
                return res.json({ status: false, message: 'Data not found' });
            }
        }
    });
})
router.post('/manager/save-question/:token', passport.authenticate('jwt', { session: false }), async function (req, res) {

    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const token = type === 'admin' ? req.params.token : req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }

    const question = req.body.question;

    if (!question) {
        return res.json({ status: false, message: 'Please enter all data' });
    }

    const admin = await adminUser.find({ 'adminKey': adminKey });

    if (admin.length > 0) {

        if (!admin[0].questions) { admin[0].questions = []; }
        const data = { 'question': question, 'token': token, 'id': uniqid() };

        adminUser.findOneAndUpdate({ 'adminKey': admin[0].adminKey }, { $push: { 'questions': data } },
            { new: true, safe: true }, (err, result) => {
                if (err) {
                    return res.json({ status: false, message: 'Something went wrong' });
                } else {
                    return res.json({ status: true, data: result, message: 'Question added successfully' });
                }
            });
    } else {
        return res.json({ status: false, message: 'Manager not found!!' });
    }
});

router.get('/remove-department-question/:token/:id', passport.authenticate('jwt', { session: false }), async function (req, res) {

    const type = req.user.type;
    let adminKey = type === 'admin' ? req.user.id : '';
    const token = type === 'admin' ? req.params.token : req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }

    const questionId = req.params.id;

    const admin = await adminUser.findOne({ 'adminKey': adminKey })

    const question = admin.questions;
    const index = await question.findIndex((qu) => {
        return qu.id === questionId
    })

    question.splice(index, 1);
    await adminUser.findOneAndUpdate({ adminKey: adminKey }, { $set: { 'questions': question } }, function (err, result) {
        if (err) { res.send({ status: false, message: "Something went wrong" }) }
        else {
            res.send({ status: true, data: result, message: "question removed successfully" })
        }
    })

})
module.exports = router;


