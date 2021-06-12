const passportJWT = require('passport-jwt');
const passport = require('passport');
// const adminTable = require('../askaway/models/registerSchema');
const adminTable = require('../models/registerSchema');
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = "top_secret"

const strategy = new JwtStrategy(jwtOptions, async function (payload, next) {
    const query = {};
    if (payload.type === 'manager') { query['hiring_manager.manager_token'] = payload.id; }
    if (payload.type === 'admin') { query['adminKey'] = payload.id; }


    await adminTable.findOne(query, function (err, result) {

        if (err) {
            return next(null, false);
        } else {
            if (result) return next(null, payload);
            if (!result) return next(null, false);
        }
    });
});

module.exports = passport.use(strategy)
