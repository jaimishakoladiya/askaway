const router = require('express').Router();
var uniqid = require('uniqid');
// require('/askaway/connection.js')
const adminUser = require('../../askaway/models/registerSchema.js')
const contactDetailSchema = require('../../askaway/models/contact.js')
const nodemailer = require('nodemailer');
var cors = require('cors');
var jwt = require('jsonwebtoken')
var Crypto = require("simple-crypto-js").default;
const Email = require('email-templates');
var _secretKey = "some-unique-key";
var simpleCrypto = new Crypto(_secretKey);
const passport = require('passport');
var link;   
var mailOptions;
router.use(cors({
    origin: '*' 
}));
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'quickaskeinterview@gmail.com',
        pass: 'quickask@4'
    }
});
const email = new Email({
    message: 'from: AskAway',
    preview: false,
    transport: { jsonTransport: false },
})

router.post('/login', async (req, res) => {
    // console.log("called");
    const target = await adminUser.findOne({ 'admin.email': req.body.email });
    if (!target) {
        const managerTK = await adminUser.findOne({ 'hiring_manager.email': req.body.email });

        if (managerTK) {
            for (i = 0; i < managerTK.hiring_manager.length; i++) {
                const managerCrypt = managerTK.hiring_manager[i];
                if (managerCrypt.email === req.body.email) {
                    if (managerCrypt.password) {
                        var dicrypt = simpleCrypto.decrypt(managerCrypt.password)
                        if (dicrypt === req.body.password) {
                            const payload = { id: managerCrypt.manager_token, type: 'manager', data: managerCrypt }
                            const token = jwt.sign(payload, "top_secret", { expiresIn: 86400 })
                            const responseData = { manager: managerCrypt, m_token: managerCrypt.manager_token, type: 'manager' }
                            return res.json({ success: true, token: `bearer ${token}`, data: responseData });
                        } else {
                            return res.json({ success: false, message: "Password Was Wrong" });
                        }
                    } else {
                        return res.json({ success: false, message: "Please Set Your Password" })
                    }
                }
            }
        } else {
            return res.json({ success: false, message: "User Does Not Exist" })
        }
    } else {
        if (target.admin.password) {
            var dicrypt = simpleCrypto.decrypt(target.admin.password)
            if (dicrypt === req.body.password) {
                const payload = { id: target.adminKey, type: 'admin', data: target.admin }
                const token = jwt.sign(payload, "top_secret", { expiresIn: 86400 })
                const responseData = { admin: target.admin, adminKey: target.adminKey, type: 'admin' }
                return res.json({ success: true, token: `bearer ${token}`, data: responseData });
            } else {
                return res.json({ success: false, message: "Password Was Wrong" })
            }
        } else {
            return res.json({ success: false, message: "Please Set Your Password" })
        }
    }
})
router.post("/contact", async (req, res) => {
    const data = req.body
    if (data) {
        await contactDetailSchema.create(data)
        return res.json({ data: data, status: true })
    }
    else {
        return res.json({ status: false, message: "Something Went wrong" })
    }
})
router.post("/register", async (req, res) => {
    console.log(req.body.email, "req.body.email");
    req.body.status = 'pending';
    const data = {
        admin: req.body,
        adminKey: uniqid()
    }
    // console.log(data);
    async function mail() {
        const url = `${req.protocol}://${req.get('host')}`;
        //  link = `${url}/verifyemail?id=` + data.adminKey;
        link = 'http://localhost:3000/reset-password?id=' + data.adminKey
        email.send({
            template: 'adminVerify',
            message: {
                subject: 'Verify your AskAway admin account',
                to: req.body.email,
                auth: {
                    user: 'quickaskeinterview@gmail.com',
                },
            },
            locals: {
                name: `${req.body.firstname} ${req.body.lastname}`,
                adminLink: link,
                logo: `${url}/public/assets/email-image/logo.png`,
                headerBanner: `${url}/public/assets/email-image/email-banner.png`,
            },
        }).then(result => {
            transporter.sendMail(result.originalMessage, (error) => {
                console.log("error", error);
            });
        });
    } const target = await adminUser.findOne({ 'admin.email': req.body.companyemail });
    if (target == null) {
        const managerTarget = await adminUser.findOne({ 'hiring_manager.email': req.body.email });
        if (managerTarget == null) {
            await adminUser.create(data, (err, result) => {
                if (err) return res.json({ status: false, message: err.message })
                else {
                    mail()
                    return res.json({ status: true, data: result, message: "verification mail was sent on your email." })
                }
            })
        } else {
            return res.send("Manager Email Already Exist");
        }
    } else {
        return res.send("Admin Email Already Exist");
    }
})
router.get('/verifyemail', async function (req, res) {
    const tokenVal = req.query.id;
    const target = await adminUser.findOne({ adminKey: tokenVal })
    if (!target) {
        const managerTk = await adminUser.findOne({ 'hiring_manager.manager_token': tokenVal })

        if (managerTk) {
            managerTk.hiring_manager.forEach(function (val, index) {
                if (val.manager_token === tokenVal && managerTk.hiring_manager[index].new === undefined) {
                    managerTk.hiring_manager[index]['registration_status'] = 'REGISTERED';
                    managerTk.hiring_manager[index]['new'] = true;
                } else if (val.manager_token === tokenVal && managerTk.hiring_manager[index].new === false) {
                    managerTk.hiring_manager[index]['new'] = true;
                }
            });
            adminUser.updateOne({ 'hiring_manager.manager_token': tokenVal }, managerTk, function (err, res) {
                if (err) {
                    return res.send('<h1>Cannot send review invitation.</h1>');
                }
            })
        } else {
            return res.send('<h1>Email is not verify</h1>');
        }
    } else {
        await adminUser.findOneAndUpdate({ adminKey: tokenVal },
            {
                'admin.status': "verify",
            }, {
            new: true, runValidators: true
        })
    }


    return res.send({ success: true, message: "user varify successfully." })

});

router.get(`/admin/:uniqid`, async function (req, res) {
    var token = req.params.uniqid
    const target = await adminUser.findOne({ adminKey: token });
    if (!target) {
        const managerTk = await adminUser.findOne({ 'hiring_manager.manager_token': token });
        for (i = 0; i < managerTk.hiring_manager.length; i++) {
            const managerCrypt = managerTk.hiring_manager[i];
            if (managerCrypt.manager_token === token) {
                return res.send(managerCrypt)
            }
        }
    } else {
        return res.send(target)
    }
})

router.post('/reset/:uniqid', async (req, res) => {
    var token = req.params.uniqid
    console.log(token)
    const target1 = await adminUser.findOne({ adminKey: token })

    if (!target1) {
        const managerTk = await adminUser.findOne({ 'hiring_manager.manager_token': token })
        if (managerTk) {
            managerTk.hiring_manager.forEach(function (val, index) {
                if (val.manager_token === token) {
                    managerTk.hiring_manager[index]['password'] = simpleCrypto.encrypt(req.body.password);
                }
            });
            adminUser.updateOne({ 'hiring_manager.manager_token': token }, managerTk, function (err, data) {
                if (err) {
                    // console.log('Cannot send review invitation.');
                } else {
                    return res.send(managerTk);
                }
            })
        } else {
            return res.send('<h1>Email is not verify</h1>');
        }
    } else {
        const target = await adminUser.findOneAndUpdate({ adminKey: token }, {
            'admin.password': simpleCrypto.encrypt(req.body.password),
        }, {
            new: true, runValidators: true
        });
        return res.send(target);
    }

})

router.post("/forgot", async (req, res) => {
    var target = await adminUser.findOne({ 'admin.email': req.body.email });
    async function mail() {
        const url = `${req.protocol}://${req.get('host')}`;
        const link = `${url}/verifyemail?id=` + target.adminKey;
        email.send({
            template: 'resetPassword',
            message: {
                subject: 'Reset your AskAway account password',
                to: req.body.email,
                auth: {
                    user: 'quickaskeinterview@gmail.com',
                },
            },
            locals: {
                name: `${target.admin.firstname} ${target.admin.lastname}`,
                resetPasswordLink: link,
                logo: `${url}/public/assets/email-image/logo.png`,
                headerBanner: `${url}/public/assets/email-image/email-banner.png`,
            },
        }).then(result => {
            transporter.sendMail(result.originalMessage, (error) => {
            });
        })
    }
    if (target) {
        mail();
        res.send(target)
    } else {
        res.send("User Not Found")
    }
})
router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

router.post('/contact', async function (req, res) {
    const data = req.body;
    if (data) {
        await contactDetailSchema.create(data)
        return res.json({ status: true, data: data })
    } else {
        return res.json({ status: false, message: "Something went wrong" })
    }


})
module.exports = router;
