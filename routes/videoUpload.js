const router = require('express').Router();
const url = require('url');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const util = require('util');
const videoDataTable = require('../../askaway/models/video-data');
const admin = require('../../askaway/models/registerSchema');
const interview = require('../../askaway/models/interview-record');
const hbjs = require('handbrake-js');
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
    message: "from: QuickAsk",
    preview: false,
    transport: { jsonTransport: false },
});

async function uploadFile(req, res) {
    const form = new formidable.IncomingForm()
    let dir = !!process.platform.match(/^win/) ? '\\Upload\\' : '/Upload/'
    let newpath = path.resolve('.') + dir;
    if (!fs.existsSync(newpath)) {
        fs.mkdirSync(newpath);
    }
    let data = req.headers.referer.split('/start/')[1]
    console.log(data)
    const interviewData = await interview.findOne({ 'token': data })

    let adminData = await admin.findOne({ "hiring_manager.manager_token": interviewData['manager-token'] })
    if (!adminData) {
        adminData = await admin.findOne({ "adminKey": interviewData['manager-token'] })
    }
    let companyName = adminData.admin['company_name'].replace(/ /g, '-')
    if (companyName !== undefined) {
        if (!fs.existsSync(`${newpath}/${companyName}`)) {
            fs.mkdirSync(`${newpath}/${companyName}`);
        }
    }
    const departmentName = interviewData['candidate-data']['department'].replace(' ', '-');
    let fname = companyName || 'uploads';
    if (fname !== 'uploads') {
        newpath = `${newpath}/${companyName}`;
    }
    if (departmentName !== undefined) {
        if (!fs.existsSync(`${newpath}/${departmentName}`)) {
            fs.mkdirSync(`${newpath}/${departmentName}`);
        }
    }
    fname += departmentName ? '/' + departmentName : ''
    if (fname !== 'uploads') {
        dir += !!process.platform.match(/^win/) ? `${fname}\\` : `${fname}/`;
    }
    form.uploadDir = path.resolve('.') + dir;
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024;
    form.maxFields = 1000;
    form.multiples = false;
    form.parse(req, async function (err, fields, files) {

        const key = data
        const file = util.inspect(files)
        const fileName = file.split('path:')[1].split('\',')[0].split('\\' + departmentName + '\\')[1].toString().replace(/\\/g, '').replace(/\//g, '');
        const fileURL = './Upload/' + fname + '/' + fileName;

        const finalURL = './Upload/' + fname + '/' + fileName;
        const saveURL = '/Upload/' + fname + '/' + fileName;
        const mp4Link = fileURL.replace('.webm', '.mp4');



        hbjs.spawn({ input: fileURL, output: finalURL.replace('.webm', '.mp4') })
            .on('error', err => {
                console.log("errr", err);
            })
            .on('end', err => {
                if (fs.existsSync(mp4Link.replace('.mp4', '.webm'))) {
                    fs.unlink(mp4Link.replace('.mp4', '.webm'), function (err) { });
                }

                videoDataTable.find({ 'token': key }, function (err, data) {
                    console.log("called", data);
                    if (!data.length) {
                        const toSaved = {
                            token: key,
                            video: [{ question_number: 1, question: fields.question, path: saveURL.replace('.webm', '.mp4') }]
                        }
                        videoDataTable.create(toSaved, function (err) {
                        });
                    } else {
                        const toSave = data[0];
                        const video = data[data.length - 1].video;
                        const questionNumber = parseInt(video[video.length - 1].question_number);
                        toSave['video'].push({ question_number: questionNumber + 1, question: fields.question, path: saveURL.replace('.webm', '.mp4') })
                        videoDataTable.updateOne({ token: key }, toSave, function (err) {
                        })
                    }
                })


            });
        res.writeHead(200, getHeaders('Content-Type', 'application/json'));
        res.write(JSON.stringify({ message: "Saved Successfully." }));
        res.end();
    })
}

function uploadTestFile(req, res) {
    const form = new formidable.IncomingForm()
    const dir = !!process.platform.match(/^win/) ? '\\hardwareTest\\' : '/hardwareTest/'
    form.uploadDir = path.resolve('.') + dir;
    if (!fs.existsSync(form.uploadDir)) {
        fs.mkdirSync(form.uploadDir);
    }
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024;
    form.maxFields = 1000;
    form.multiples = false;
    form.parse(req, function (err, fields, files) {
        const file = util.inspect(files)
        const fileName = file.split('path:')[1].split('\',')[0].split(dir)[1].toString().replace(/\\/g, '').replace(/\//g, '');
        const fileURL = './hardwareTest/' + fileName;
        const mp4Link = fileURL.replace('.webm', '.mp4');
        const finalURL = './../../../hardwareTest/' + fileName;
        hbjs.spawn({ input: fileURL, output: fileURL.replace('.webm', '.mp4') })
            .on('error', err => { })
            .on('end', err => {
                if (fs.existsSync(fileURL)) {
                    fs.unlink(fileURL, function (err) { });
                }
                res.writeHead(200, getHeaders('Content-Type', 'application/json'));
                res.write(JSON.stringify({
                    fileURL: mp4Link,
                    finalLink: finalURL.replace('.webm', '.mp4'),
                }));
                res.end();
            });
    });
}

function getHeaders(opt, val) {
    try {
        const headers = {};
        headers['Access-Control-Allow-Origin'] = '';
        headers['Access-Control-Allow-Methods'] = 'POST, GET, PUT, DELETE, OPTIONS';
        headers['Access-Control-Allow-Credentials'] = true;
        headers['Access-Control-Max-Age'] = '86400'; // 24 hours
        headers['Access-Control-Allow-Headers'] = 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept';

        if (opt) {
            headers[opt] = val;
        }

        return headers;
    } catch (e) {
        return {};
    }
}



router.get('/start/*', function (req, res) {
    const tokenVal = url.parse(req.url).pathname.split('/start/')[1];
    const token = tokenVal.split('/')[1];
    if (token === '0000000000') {
        fs.readFile('./start-test.html', 'binary', function (err, file) {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.write(err + '\n');
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(file, 'binary');
                res.end();
            }
        });
    } else {
        interview.findOne({ token: tokenVal }, function (err, data) {
            if (err) {
                return false;
            } else {
                if (data && data['candidate-data'].status) {
                    if (data['candidate-data'].status === 'declined') {

                        return res.sendFile('public/views/interviewDecline.html', { 'root': './' });
                    }

                    fs.readFile('./start-test.html', 'binary', function (err, file) {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.write(err + '\n');
                            res.end();
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.write(file, 'binary');
                            res.end();
                        }
                    });
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write(err + '\n');
                    res.end();
                }
            }
        })
    }
});

router.post('/videoUpload/configure', function (req, res) {
    const uri = url.parse(req.url).pathname;
    const filename = path.join(process.cwd(), uri);
    const isWin = !!process.platform.match(/^win/);
    if (filename && filename.toString().indexOf(isWin ? '\\configure' : '/configure') !== -1 && req.method.toLowerCase() === 'post') {
        uploadTestFile(req, res);
    }
});

router.post('/start/videoUpload/uploadFile', async (req, res) => {
    const uri = url.parse(req.url).pathname
    const filename = path.join(process.cwd(), uri);
    const isWin = !!process.platform.match(/^win/);
    if (filename && filename.toString().indexOf(isWin ? '\\uploadFile' : '/uploadFile') !== -1 && req.method.toLowerCase() === 'post') {
        uploadFile(req, res);

    }
})

router.get('/getManagerDataByInterviewid/:token', function (req, res) {
    const token = req.params.token;
    interview.findOne({ token: token }, async function (err, attemptData) {
        if (attemptData) {
            const managerdata = {
                email: '',
                firstName: '',
                lastName: ''
            };
            let manager = await admin.findOne({ 'adminKey': attemptData['manager-token'] })
            if (!manager) {
                manager = await admin.findOne({ 'hiring_manager.manager_token': attemptData['manager-token'] })
                for (const data of manager.hiring_manager) {
                    if (data.manager_token === attemptData['manager-token']) {
                        managerdata['email'] = data.email,
                            managerdata['firstName'] = data.firstname,
                            managerdata['lastName'] = data.lastname
                    }
                }
            } else {
                managerdata['email'] = manager.admin.email,
                    managerdata['firstName'] = manager.admin.firstname,
                    managerdata['lastName'] = manager.admin.lastname
            }
            return res.send({ status: true, data: managerdata })
        }
    })
})

router.get('/addattempt/:token', function (req, res) {
    const token = req.params.token;
    interview.findOne({ token: token }, async function (err, attemptData) {
        attemptData.attempt = (attemptData.attempt || 0) + 1;
        attemptData.save()
        return res.send({ status: true })
    })
})

router.get('/getquestion/*/:iscount', async (req, res) => {
    const iscount = req.params['iscount']
    const toke = (req.url).split('/getquestion/')[1]
    const token = (toke).split('/')[1]
    const tokenVal = (toke).split('/')[0]
    let parsedQuestion;
    let questionListToServe = [];
    if (token === "0000000000") {
        const filename = './practiceQuestion.json';
        const jsonData = fs.readFileSync(filename)
        const data = JSON.parse(jsonData);
        return res.json(data)
    } else {
        interview.findOne({ 'token': tokenVal }, async function (err, data) {
            if (err) { res.writeHead(500, { 'Content-Type': 'text/plain' }); }

            parsedQuestion = data;
            questionListToServe = parsedQuestion.questions.filter(x => { return x.is_answered === "N" });

            if (questionListToServe.length > 0) {
                if (data.attempt >= 2) {
                    res.status(200);
                    return res.send({ status: false, msg: 'This interview has been started twice.  Please contact the hiring manager to schedule another one' })
                }

                const toSaved = data;

                const qu = toSaved.questions;
                for (i = 0; i < qu.length; i++) {

                    if (qu[i].order === questionListToServe[0].order) {

                        toSaved.questions[i].is_answered = "Y"
                        toSaved['candidate-data'].status = "Started"

                    }
                }
                interview.updateOne({ 'token': tokenVal }, toSaved, function (err) {
                })
                res.writeHead(200, {
                    'Content-Type': 'application/javascript',
                });
                const updatedQuestionToServe = questionListToServe[0]
                res.write(JSON.stringify(updatedQuestionToServe));
                res.end();
            } else {
                const dataToWrite = data;
                if (dataToWrite['candidate-data']['status'] !== 'Completed') {
                    let admindata = await admin.findOne({ 'adminKey': data['manager-token'] });

                    if (admindata) {
                        const revieverdata = {}
                        revieverdata.firstname = admindata.admin.firstname;
                        revieverdata.lastname = admindata.admin.lastname;
                        revieverdata.email = admindata.admin.email;
                        await ReviewInterviewManager(req, revieverdata, data['candidate-data'], data['token'], data['candidate-data']['role'])
                    } else {
                        admindata = await admin.findOne({ 'hiring_manager.manager_token': data['manager-token'] });
                        if (admindata) {
                            for (var managerdatanew of admindata.hiring_manager) {
                                if (managerdatanew.manager_token === data['manager-token']) {
                                    await ReviewInterviewManager(req, managerdatanew, data['candidate-data'], data['token'], data['candidate-data']['role'])
                                }
                            }
                        }
                    }
                }
                dataToWrite['candidate-data']['status'] = 'Completed';
                dataToWrite['candidate-data']['completedOn'] = new Date(new Date().toUTCString().slice(0, -3));
                interview.update({ token: tokenVal }, dataToWrite, function (err, data) {
                })
                res.writeHead(204, { 'Content-Type': 'text/plain' });
                res.write('You have completed the test!');
                res.end();
            }


        })
    }
})


ReviewInterviewManager = function (req, manager, candidate, urltoken, jobtitle) {
    const url = `${req.protocol}://${req.get('host')}`;
    email.send({
        template: 'viewinterview',
        message: {
            subject: 'You have been invited to review interview',
            to: manager.email,
            auth: {
                user: 'quickaskeinterview@gmail.com',
            },
        },
        locals: {
            managerName: `${manager.firstname} ${manager.lastname}`,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobName: jobtitle.replace(/_/g, ' '),
            sharedGridURL: `${url}/single-candidate/${urltoken}`,
            logo: `${url}/quickaskwebsite/src/component/images/logo2.png`,
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
    })
}
module.exports = router;

