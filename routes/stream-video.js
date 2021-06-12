
const router = require('express').Router();
const interviewTable = require('../../askaway/models/interview-record.js')
const adminUserTable = require('../../askaway/models/registerSchema.js')
const videoDataTable = require('../../askaway/models/video-data.js')

router.get('/single-candidate-data/:interviewToken/:type', async function (req, res) {
    const type = req.params['type'];
    let interviewToken = req.params['interviewToken'];
    let name = '';
    if (type === 'shared') {
        const checkExist = await adminUserTable.findOne({ 'shared_interview.sharedId': interviewToken });
        if (checkExist) {
            const sharedToManagers = checkExist.shared_interview;
            if (sharedToManagers.length > 0) {
                const sharedManagers = sharedToManagers.filter(x => x.sharedId === interviewToken)[0];
                interviewToken = sharedManagers.candidateToken;
                name = `${sharedManagers.firstName} ${sharedManagers.lastName}`;
            }
        } else {
            return res.json({ status: false, message: 'Shared Grid not found.' });
        }
    }
    videoDataTable.find({ token: interviewToken }, async function (err, data) {
        if (err) {
            return res.json({ status: false, message: err.message });
        }
        if (data.length > 0) {
            const interview = await interviewTable.findOne({ token: interviewToken });
            const result = {
                data: JSON.stringify(data[0]),
                candidate: interview['candidate-data'],
                interviewToken: interviewToken,
                name: name,
            }
            return res.json({ status: true, message: 'get data successfully', data: result });
        } else {
            return res.json({ status: false, message: 'Interview is yet to complete, please notify the candidate.' });
        }
    });
});

router.get('/multiple-candidate/:token/:job_name/:isShared/:type', async (req, res) => {
    const isShared = req.params['isShared'];
    let jobName = req.params['job_name'];
    let token = req.params['token'];
    const type = req.params['type'];
    let name = '';
    if (isShared) {
        const checkExist = await adminUserTable.findOne({ 'shared_interview.sharedId': token });
        if (checkExist) {
            const sharedToManagers = checkExist.shared_interview;
            if (sharedToManagers.length > 0) {
                const sharedManagers = sharedToManagers.filter(x => x.sharedId === token)[0];
                token = sharedManagers.fromManagerToken;
                jobName = sharedManagers.jobName;
                name = `${sharedManagers.firstName} ${sharedManagers.lastName}`;
            }
        }
    }
    const query = {};

    if (type === 'manager') { query['hiring_manager.manager_token'] = token }
    if (type === 'admin') { query['adminKey'] = token }
    await adminUserTable.findOne(query, async function (err, adminData) {
        if (err) {
            res.json({ 'status': false, 'message': err.message });
        } else {
            if (adminData === null) {
                res.json({ 'status': false, 'message': 'manager not found' });
                return;
            }
            const multipleToken = type === 'admin' ? adminData.hiring_manager.map(x => x.manager_token) : [];
            multipleToken.push(token);
            const interviews = await interviewTable.find({ 'manager-token': { $in: multipleToken }, 'candidate-data.role': jobName });
            if (interviews.length < 0) {
                return res.json({ 'status': false, 'message': 'Candidate not found for this manager.' });
            }
            let questionBank = [];
            if (interviews.length > 0) {
                const allQuestion = interviews.map(x => {
                    return x.questions.map(x => x.question)
                });
                questionBank = [...new Set(allQuestion.map(x => x).reduce((x, y) => x.concat(y)))];

            }
            const returnData = [];
            const candidateToken = interviews.map(x => x.token);
            const allVideo = await videoDataTable.find({ 'token': { $in: candidateToken } });
            for (let questionIndex = 0; questionIndex < questionBank.length; questionIndex++) {
                const question = questionBank[questionIndex];
                const candidates = [];
                for (let interviewIndex = 0; interviewIndex < interviews.length; interviewIndex++) {
                    const interviewData = interviews[interviewIndex];
                    const candidateName = `${interviews[interviewIndex]['candidate-data']['first_name']} ${interviews[interviewIndex]['candidate-data']['last_name']}`;
                    const candidateStatus = `${interviews[interviewIndex]['candidate-data']['status']}`;
                    const videos = allVideo.filter(x => x.token === interviewData.token);
                    if (videos !== undefined && videos.length > 0) {
                        for (let videosIndex = 0; videosIndex < videos.length; videosIndex++) {
                            const video = videos[videosIndex].video;
                            if (video !== undefined && video.length > 0) {
                                const videoReview = video.filter(x => x.question.trim().replace(/\s+/g, '-') === question.trim().replace(/\s+/g, '-'));
                                if (videoReview !== undefined && videoReview.length > 0) {
                                    const finalReview = videoReview[0]['mreviews'];
                                    if (finalReview !== undefined && finalReview.length > 0) {
                                        const rating = finalReview.reduce((prev, next) => prev + next.rating, 0);
                                        candidates.push({
                                            'name': candidateName, 'status': candidateStatus, 'rating': parseFloat(rating / finalReview.length).toFixed(2), 'path': videoReview[0]['path'], 'id': interviewData.token, 'isArchive': interviewData.archive ? interviewData.archive : false,
                                        });
                                    } else candidates.push({ 'name': candidateName, 'status': candidateStatus, 'rating': 0, 'id': interviewData.token, 'path': videoReview[0]['path'], 'isArchive': interviewData.archive ? interviewData.archive : false });
                                } else candidates.push({ 'name': candidateName, 'status': candidateStatus, 'rating': 0, 'id': interviewData.token, 'isArchive': interviewData.archive ? interviewData.archive : false });
                            } else candidates.push({ 'name': candidateName, 'status': candidateStatus, 'rating': 0, 'id': interviewData.token, 'isArchive': interviewData.archive ? interviewData.archive : false });
                        }
                    } else candidates.push({ 'name': candidateName, 'status': candidateStatus, 'rating': 0, 'id': interviewData.token, 'isArchive': interviewData.archive ? interviewData.archive : false });
                }
                returnData.push({ 'question': question, 'candidate': candidates });
            }
            const getAllCandidate = returnData.map(x => x.candidate);
            interviews.map(a => a['candidate-data']).forEach(function (interviews, candidateIndex) {

                let finalRating = 0;
                let givenReviewbyUser = 0;
                for (let index = 0; index < getAllCandidate.length; index++) {
                    var data = getAllCandidate[index][candidateIndex].rating;

                    if (data) {
                        givenReviewbyUser += 1;
                        finalRating += parseFloat(data);
                    }
                    interviews.token = getAllCandidate[index][candidateIndex].id;
                }
                interviews.finalRating = finalRating && givenReviewbyUser ? parseFloat(finalRating / givenReviewbyUser).toFixed(2) : 0;
                returnData.forEach((obj, index) => {
                    getAllCandidate[index][candidateIndex].finalRating = interviews.finalRating;
                });
            });
            for (let i = 0; i < interviews.length; i++) {
                const isArchive = interviews[i] ? interviews[i].archive ? interviews[i].archive : false : false;
                interviews[i]['candidate-data']['isArchive'] = isArchive;
            }
            res.json({
                success: true,
                data: {
                    candidate: interviews.map(a => a['candidate-data']),
                    questionGrid: returnData,
                    jobName: jobName,
                    name: name,
                },
            });
        }
    });
});

router.get('/interview/:token/reviews/*', async function (req, res) {
    const tokenVal = req.params['token'];
    const videoUrl = (req.url).split('/reviews/')[1]


    videoDataTable.find({ 'token': tokenVal }, function (err, data) {
        if (err) {
            res.json({ status: false, message: 'Nothing found' });
        } else {
            if (data) {
                const toFindReview = data[0].video;
                const findRw = toFindReview.filter(x => x.path === videoUrl)
                if (findRw[0].hasOwnProperty('mreviews')) {
                    res.json({ status: true, data: findRw[0].mreviews });
                } else {
                    res.json({ status: false, message: 'Review not found' });
                }
            }
        }
    });

});

router.post('/post-video-review', function (req, res) {
    const reviewData = req.body;
    videoDataTable.find({ 'token': reviewData.candidateToken }).then(videoData => {
        if (videoData && videoData.length > 0) {
            const videos = videoData[0].video;
            const findVideo = videos.filter(x => x.path === reviewData.videoPath);
            const video = findVideo[0];
            const getReview = video.mreviews && video.mreviews.length > 0 ? video.mreviews.filter(x => x.manager_token === reviewData.managerToken) : [];
            if (getReview.length > 0) {
                const videoData = video.mreviews;
                const videoIndex = videoData.findIndex(function (video) {
                    return video.manager_token === reviewData.managerToken
                });
                videoData[videoIndex].rating = parseFloat(reviewData.rating);
                videoData[videoIndex].review = reviewData.review;
                videoDataTable.findOneAndUpdate({ 'token': reviewData.candidateToken, 'video.path': reviewData.videoPath },
                    { $set: { 'video.$.mreviews': videoData } }, (err, data) => {
                        if (err) {
                            res.json({ message: err.message, status: false });
                        } else {
                            res.json({ message: 'Review added successfully', status: true });
                        }
                    });
            } else {
                const updateReview = {
                    manager_token: reviewData.managerToken,
                    rating: parseFloat(reviewData.rating),
                    name: reviewData.name,
                    review: reviewData.review,
                    createdAt: new Date(new Date().toUTCString().slice(0, -3)),
                };
                videoDataTable.findOneAndUpdate({ 'token': reviewData.candidateToken, 'video.path': reviewData.videoPath },
                    { $push: { 'video.$.mreviews': updateReview } }, { new: true, safe: true }, (err, data) => {
                        if (err) {
                            res.json({ message: err.message, status: false });
                        } else {
                            res.json({ message: 'Review added successfully', status: true });
                        }
                    });
            }
        }
    });
});
module.exports = router;
