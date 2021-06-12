const router = require('express').Router();
router.get("/", async (req, res) => {
    res.sendFile('/askaway/index.html')
})
// router.get("/contact", async (req, res) => {
//     res.sendFile('/askaway/contact.html')
// })
// router.get("/login", async (req, res) => {
//     res.sendFile('/askaway/public/login/login.html')
// })
// router.get("/register", async (req, res) => {
//     res.sendFile('/askaway/public/login/admin-register.html')
// })
// router.get("/forgot", async (req, res) => {
//     res.sendFile('/askaway/public/login/forgot_password.html')
// })
// router.get("/company-profile", async (req, res) => {
//     res.sendFile('/askaway/public/managers/company-profile.html')
// })
// router.get("/manager-view", async (req, res) => {
//     res.sendFile('/askaway/public/managers/manager-view.html')
// })
// router.get('/shared-multiple-grid/:jobName', function (req, res) {
//     res.sendFile('/askaway/public/video-stream/multiple-candidate-grid.html');
// });
// router.get('/single-candidate/:interviewToken', function (req, res) {
//     res.sendFile('/askaway/public/video-stream/single-candidate-grid.html');
// }); 
// router.get('/multiple-candidate/:job_names', function (req, res) {
//     res.sendFile('/askaway/public/video-stream/multiple-candidate-grid.html');
// });
// router.get('/interview-dashboard', function (req, res) {
//     res.sendFile('/askaway/public/managers/interview-dashboard.html');
// });
// router.get('/shared-multiple-grid/:jobName', function (req, res) {
//     res.sendFile('public/video-stream/multiple-candidate-grid.html', { 'root': './' });
// });
// router.get('/shared-single-grid/:candidateToken', function (req, res) {
//     res.sendFile('public/video-stream/single-candidate-grid.html', { 'root': './' });
// });

// router.get('/interview-dashboard', function (req, res) {
//     res.sendFile('/askaway/public/managers/interview-dashboard.html');
// });

module.exports = router;

