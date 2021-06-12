const router = require('express').Router();
var uniqid = require('uniqid');
require('../../askaway/connection.js')
const department = require('../../askaway/models/department.js')
const adminUser = require('../../askaway/models/registerSchema.js')
const jobDetail = require('../../askaway/models/job-detail.js')
var Crypto = require("simple-crypto-js").default;
var _secretKey = "some-unique-key";
var simpleCrypto = new Crypto(_secretKey);
const passport = require('passport');
router.get('/get-company-detail', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = req.user.id
    if (type === 'manager') {
        const token = req.user.id;
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }
    const query = {};
    if (type === 'manager') { query['hiring_manager.manager_token'] = req.user.id; }
    if (type === 'admin') { query['adminKey'] = req.user.id; }
    const managerResult = await adminUser.find(query);
    const departmentResult = await department.findOne({ 'adminKey': adminKey });
    const jobDetailResult = await jobDetail.findOne({ 'adminKey': adminKey })
    const response = {
        jobDetailResult: {
            result: jobDetailResult && jobDetailResult['job-title'].length > 0 ? jobDetailResult['job-title'] : null,
            status: jobDetailResult && jobDetailResult['job-title'].length > 0,
            message: jobDetailResult && jobDetailResult['job-title'].length > 0 ? 'Get Data Successfully' : 'Data not found',
        },
        departmentResult: {
            result: departmentResult && departmentResult.departments.length > 0 ? departmentResult.departments : null,
            status: departmentResult && departmentResult.departments.length > 0,
            message: departmentResult && departmentResult.departments.length > 0 ? 'Get Data Successfully' : 'Data not found',
        },
        managerResult: {
            data: managerResult.length > 0 ? managerResult[0]['hiring_manager'] : null,
            status: managerResult.length > 0,
            message: managerResult.length > 0 ? 'Get Data Successfully' : 'Data not found',
        },
    }

    return res.json({ status: true, data: response });
});
router.post('/save-department', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
        const data = req.body;
        const name = data.name;
        const costCenter = data.costCenter;
        const questions = data.questions;
        const type = req.user.type;
        let adminKey = req.user.type === 'admin' ? req.user.id : '';
        const token = req.user.id;
        if (type === 'manager') {
            const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
            adminKey = getAdminDetail[0].adminKey;
        }
        department.find({ 'adminKey': adminKey }, async function (err, departmentResult) {
            if (err) {
                res.json({ status: false, message: err.message });
            } else {
                if (departmentResult.length < 1) {
                    const randomId = uniqid()

                    const data = {
                        'manager_token': req.user.type === 'manager' ? token : adminKey,
                        'adminKey': adminKey,
                        'departments': [],
                    }
                    data['departments'] = [{
                        'name': name,
                        'cost_center': costCenter,
                        'departmentId': randomId,
                        'questions': questions,
                        'manager_token': req.user.type === 'manager' ? token : adminKey,
                    }];

                    department.create(data, (err, result) => {
                        return err ? res.json({ status: false, message: 'something went wrong' })
                            : res.json({ status: true, data: result, message: 'Data inserted successfully' });
                    });
                } else {
                    const randomId = uniqid()
                    const departments = departmentResult[0].departments;

                    const checkDepartmentExist = departments.filter(x => x.name === name);
                    if (checkDepartmentExist.length > 0) {
                        return res.json({ status: false, message: 'Department already exists' });
                    }

                    departments.push({
                        'name': name,
                        'cost_center': costCenter,
                        'departmentId': randomId,
                        'questions': questions,
                        'manager_token': req.user.type === 'manager' ? token : adminKey,
                    });

                    department.findOneAndUpdate({ 'adminKey': adminKey }, {
                        $set: { 'manager_token': token, 'departments': departments },
                    }, function (err, result) {
                        return err ? res.json({ status: false, message: 'Something went wrong' })
                            : res.json({ status: true, data: result, message: 'Data inserted successfully' });
                    });
                }
            }
        });
    } catch (e) {
        return res.json({ status: false, message: e.message, e: e });
    }
});

router.get('/get-department', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = req.user.id
    if (type === 'manager') {
        const token = req.user.id;
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }

    department.findOne({ 'adminKey': adminKey }, async function (err, departmentResult) {
        if (err) {
            return res.json({ status: false, message: err.message });
        } else {
            if (departmentResult && departmentResult.departments.length >= 0) {
                const result = departmentResult.departments;
                return res.json({ status: true, message: 'Data get successfully', result });
            } else {
                return res.json({ status: false, message: 'Data not found' });
            }
        }
    });
});

router.post('/update-department/:departmentId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const data = req.body;
    const type = req.user.type;

    let adminKey = req.user.id
    const token = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }
    const departmentId = req.params['departmentId'];
    const managerToken = req.user.id
    const name = data.name;
    const costCenter = data.costCenter;
    const questions = data.questions;
    department.find({ 'adminKey': adminKey, 'departments.departmentId': departmentId }, async function (err, departmentResult) {
        if (err) {
            res.json({ status: false, message: err.message });
        } else {
            const departments = departmentResult[0].departments;
            const checkDepartmentExist = departments.filter(x => x.name === name && x.departmentId !== departmentId);
            if (checkDepartmentExist.length > 0) {
                return res.json({ status: false, message: 'Department already exists' });
            }
            const departmentIndex = departments.map(function (val) { return val.departmentId; }).indexOf(departmentId);
            departments[departmentIndex]['name'] = name;
            departments[departmentIndex]['cost_center'] = costCenter;
            departments[departmentIndex]['manager_token'] = managerToken;
            departments[departmentIndex]['questions'] = questions;
            department.findOneAndUpdate({ 'departments.departmentId': departmentId }, { $set: { departments: departments } }, function (err, result) {
                if (err) {
                    res.json({ status: false, message: 'Something went wrong' });
                } else {
                    res.json({ status: true, data: result, message: 'Department updated successfully' });
                }
            });
        }
    });
});
router.post('/delete-department/:departmentId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = req.user.id
    const token = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }
    const departmentId = req.params['departmentId'];
    if (!departmentId) {
        res.json({ status: false, message: 'Something went wrong. please try again' });
    }
    department.find({ 'adminKey': adminKey, 'departments.departmentId': departmentId }, async function (err, departmentResult) {
        if (err) {
            res.json({ status: false, message: err.message });
        } else {
            let departments = departmentResult[0].departments;
            departments = departments.filter(item => item.departmentId !== departmentId);
            department.findOneAndUpdate({ 'adminKey': adminKey }, { $set: { departments: departments } }, function (err, result) {
                if (err) {
                    res.json({ status: false, message: err.message });
                } else {
                    res.json({ status: true, data: result, message: 'Data deleted successfully' });
                }
            });
        }
    });
});
router.get('/view-department-question/:departmentId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    const type = req.user.type;
    let adminKey = req.user.id
    const token = req.user.id;
    if (type === 'manager') {
        const getAdminDetail = await adminUser.find({ 'hiring_manager.manager_token': token });
        adminKey = getAdminDetail[0].adminKey;
    }
    const departmentId = req.params['departmentId'];
    if (!departmentId) {
        res.json({ status: false, message: 'Something went wrong. please try again' });
    }

    department.find({ 'adminKey': adminKey, 'departments.departmentId': departmentId }, function (err, departmentResult) {
        if (err) {
            res.json({ status: false, message: 'department not found' });
        } else {
            if (departmentResult.length > 0) {
                let departments = departmentResult[0].departments;

                departments = departments.filter(item => item.departmentId === departmentId);

                res.json({ status: true, data: departments, message: 'Question get successfully' });
            } else {
                res.json({ status: false, message: 'Department not found' });
            }
        }
    });
});

module.exports = router;