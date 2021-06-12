const express = require("express")
const app = express();
require("dotenv").config({ path: './config/.env' })
const bodyparser = require("body-parser")
const cors = require('cors')
const passport = require('passport');
// console.log(__dirname);

app.use('/', express.static(`${__dirname}/`, { maxAge: 864000000 }));
app.use('/public', express.static(`${__dirname}/public`, { maxAge: 864000000 }));
app.use(express.static(`${__dirname}`, { maxAge: 864000000 }));
app.use('/uploads', express.static(`${__dirname}/uploads`, { maxAge: 864000000 }));
app.use('/hardwareTest', express.static(`${__dirname}/hardwareTest`, { maxAge: 864000000 }));
app.use(bodyparser.json());

require('express-async-errors')
require('../askaway/connection.js')
require('./config/passport');
app.use('/', require('./routes/home'));
app.use('/', require('./routes/login'));
app.use('/', require('./routes/manager'));
app.use('/', require('./routes/manager-dashboard'))
app.use('/', require('./routes/stream-video'))
app.use('/', require('./routes/department'));
app.use('/', require('./routes/jobtitle'));
app.use('/', require('./routes/allocateTest'));
app.use('/', require('./routes/videoUpload'));
app.use('/', require('./routes/shared-grid'));
app.use('/', require('./routes/admin'));
app.use(passport.initialize());

app.use(cors({
    origin: '*',
}));

app.use((req, res, next) => {
    req.status = 404;
    const err = new Error("Routes not found");
    next(err);
})
app.use((error, req, res, next) => {
    res.status(req.status || 500).send({
        message: error.message,
        stack: error.stack
    })
})

app.all('*', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

const port = process.env.port
app.listen(port, () => {
    console.log(`port run on ${port}`);
})
