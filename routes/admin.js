const router = require('express').Router();
const adminUser = require('../../askaway/models/registerSchema.js')
const interview = require('../../askaway/models/interview-record')
const jobTitle = require('../../askaway/models/job-detail')
const passport = require('passport');
function groupby(list, keyGetter) {
    const map = new Map()
    list.forEach((item) => {
        const key = keyGetter(item)
        // console.log(key);

        const collection = map.get(key)
        if (!collection) {
            map.set(key, [item])
        } else {
            collection.push(item)
        }

    });
    // console.log(map);

    return map;
}
function getStatusName(statusName) {
    if (statusName === 'Assigned') {
        return 'INVITED'
    }
    if (statusName === 'Started') {
        return 'IN PROGRESS'
    }
    if (statusName === 'Completed') {
        return 'SUBMITTED'
    }
    if (statusName === 'declined') {
        return 'DECLINED'
    }
}

router.get('/getChart', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const type = req.user.type
    const query = {}
    if (type === 'manager') {
        query['hiring_manager.manager_token'] = req.user.id;
    }
    if (type === 'admin') {
        query['adminKey'] = req.user.id;
    }
    adminUser.find(query, async function (err, adminResult) {
        if (err) {
            res.json({ status: false, message: err.message })
        }
        else {
            if (adminResult.length > 0) {
                const adminKey = adminResult[0].adminKey;
                let managers = adminResult[0].hiring_manager;
                if (type === 'manager') {
                    managers = managers.filter(x => x.manager_token === req.user.id)
                }
                const managerIds = managers.map(x => x.manager_token)
                if (type === 'admin') {
                    managerIds.push(req.user.id);
                }
                const interviews = await interview.find({ 'manager-token': { $in: managerIds } })
                if (interviews.length < 0) {
                    res.json({ status: true, message: "Interview not found", data: null })
                }
                const interviewStatus = ['Assigned', 'Started', 'Completed', 'declined']
                const jobDetails = await jobTitle.find({ 'adminKey': adminKey }).select('job-title.title job-title.department')
                // console.log(jobDetails);
                // console.log(jobDetails[0]['job-title']);

                if (jobDetails && jobDetails.length > 0) {
                    const roles = jobDetails[0]['job-title'].map(x => x.title)
                    // console.log(roles);
                    
                    const jobs = jobDetails[0]['job-title']
                    const departments = [...new Set(jobs.map(x => x.department))]

                    const jobData = [];
                    const departmentData = [];
                    interviewStatus.forEach(objInterview => {
                        const statusName = objInterview
                        const departmentStatusCount = [];
                        const jobStatusCount = [];
                        const getJobByDepartment = groupby(jobs, objJob => objJob.department);

                        getJobByDepartment.forEach(objJob => {
                            const jobTitles = objJob.map(objJob => objJob.title)
                            // console.log(jobTitles);

                            let count = 0
                            jobTitles.forEach(objJobTitles => {
                                // console.log(objJobTitles);

                                const roleName = objJobTitles.replace(/ /g, '_')
                                count += interviews.filter(x => x['candidate-data']['role'] === roleName && x['candidate-data']['status'] === statusName).length;
                                // console.log(count);
                            })
                            departmentStatusCount.push(parseInt(count))

                            // console.log("departmentStatusCount", departmentStatusCount);

                        })
                        roles.forEach(objRoles => {
                            const role = objRoles.replace(/ /g, '_');
                            const count = interviews.filter(x => x['candidate-data']['role'] === role && x['candidate-data']['status'] === statusName).length;
                            jobStatusCount.push(parseInt(count));
                        })
                        departmentData.push({ name: getStatusName(statusName), data: departmentStatusCount })
                        jobData.push({ name: getStatusName(statusName), data: jobStatusCount })
                    })
                    const objDepartment = { status: departments, seriesData: departmentData };
                    const objJobDetailData = { status: roles, seriesData: jobData };

                    // console.log(JSON.stringify(objDepartment));
                    // console.log(objJobDetailData);

                    return res.json({ status: true, message: 'Data get successfully', objDepartment, objJobDetailData });
                } else {
                    return res.json({ status: false, message: 'Data not found' });
                }

            }
        }
    })
})
module.exports = router;


