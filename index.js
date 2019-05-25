const express = require('express');
const _ = require('lodash');
const os = require('os');
const Promise = require('bluebird');
const figlet = Promise.promisify(require('figlet'));


const http = require('http');
const https = require('https');

const app = express();

const body_parser = require('body-parser');
const fs = require('fs');

const Sequelize = require('sequelize');

const FIGLET_SERVER_DB_URL = _.get(process.env, 'FIGLET_SERVER_DB_URL');
const FIGLET_SERVER_PORT = _.toInteger(_.get(process.env, 'FIGLET_SERVER_PORT'));
const FIGLET_SERVER_TLS_KEY = _.get(process.env, 'FIGLET_SERVER_TLS_KEY');
const FIGLET_SERVER_TLS_CERT = _.get(process.env, 'FIGLET_SERVER_TLS_CERT');

const nodePath = require('path');

const morgan = require('morgan');
const cors = require('cors');

const router = express.Router();

class FigletText extends Sequelize.Model {
}


const words = require('./adjectives.json');

let sequelize;
if (!_.isEmpty(FIGLET_SERVER_DB_URL)) {
    sequelize = new Sequelize(FIGLET_SERVER_DB_URL);


    FigletText.init({
        word: Sequelize.STRING(10485760),
        output: Sequelize.TEXT
    }, {sequelize: sequelize, modelName: 'figletText'});

} else {
    sequelize = null;
}


let https_config = null;
let port;
if (!_.isEmpty(FIGLET_SERVER_TLS_KEY) && !_.isEmpty(FIGLET_SERVER_TLS_CERT)) {
    https_config = {
        key: fs.readFileSync(FIGLET_SERVER_TLS_KEY),
        cert: fs.readFileSync(FIGLET_SERVER_TLS_CERT)
    };
    port = 443;
} else {
    port = 80;
}


app.use(morgan('combined'));


app.use(body_parser.json({limit: '100MB'}));
app.use(body_parser.urlencoded({extended: true, limit: '100MB'}));

let CORS_WHITELISTED_DOMAINS = _.get(process.env, 'FIGLET_SERVER_CORS_WHITELISTED_DOMAINS', '');


if (_.isEmpty(CORS_WHITELISTED_DOMAINS)) {
    app.use(cors());
} else {
    let whitelist = _.map(CORS_WHITELISTED_DOMAINS.split(/[ ,]+/), _.toLower);
    app.use(cors({


        origin: function (origin, callback) {
            if (_.contains(whitelist, _.toLower(origin))) {
                callback(null, true);
            } else {
                callback(new Error(`${origin} not allowed by CORS`));
            }
        }
    }))
}


app.use(express.static(nodePath.resolve(process.cwd(), 'static')));

router.get('/status', function (req, res, next) {
    return res.jsonp({status: 'OK', hostname: os.hostname()});
});

function list_figlets(req, res, next) {
    let figletPromise;
    if (!_.isNil(sequelize)) {
        figletPromise = FigletText.findAll();
    } else {
        figletPromise = Promise.resolve();
    }

    return figletPromise
        .then(function (figletTexts) {
            return res.jsonp({
                hostname: os.hostname(),
                figletTexts: figletTexts
            });
        })
        .catch(function (err) {
            return next(err);
        });


}

router.get('/figlet', list_figlets);


function delete_figlet(req, res, next) {
    let word = _.toString(_.get(req.params, 'word'));

    let figletPromise;
    if (!_.isNil(sequelize)) {
        figletPromise = FigletText.destroy({where: {word: word}});
    } else {
        figletPromise = Promise.resolve();
    }

    return figletPromise
        .then(function (figletText) {
            return res.jsonp({hostname: os.hostname(), figletText: figletText})
        })
        .catch(function (err) {
            return next(err);
        });


}

router.delete('/figlet/:word', delete_figlet);


function create_figlet(req, res, next) {
    let word = _.toString(_.get(req.params, 'word'));

    if (word === "_random") {
        word = _.sample(words);
    }

    return figlet(word)
        .then(function (output) {
            if (!_.isNil(sequelize)) {
                return FigletText.findOrCreate({
                    where: {word: word},
                    defaults: {output: output}
                })
                    .then(function (props) {
                        return {
                            word: props[0].word,
                            output: props[0].output,
                            created: props[1]
                        }
                    })
            } else {
                return {word: word, output: output, created: true};
            }
        })
        .then(function (props) {
            return res.jsonp({hostname: os.hostname(), figletText: props});
        })
        .catch(function (err) {
            return next(err);
        })
}

router.get('/figlet/:word', create_figlet);
router.put('/figlet/:word', create_figlet);

app.use('/api', router);

app.use(function (req, res, next) {
    let error = new Error('Not Found');
    error.status = 404;
    return next(error);
});

app.use(function (err, req, res, next) {

    console.error(err.stack);

    res.status(err.status || 500);
    return res.jsonp({
        status: err.status || 500,
        message: err.message
    });

});

let syncPromise = Promise.resolve(sequelize !== null ? sequelize.sync() : null);

syncPromise
    .then(function () {
        let server;
        if (!_.isNil(https_config)) {
            server = https.createServer(https_config, app);
        } else {
            server = http.createServer(app);
        }

        server.listen(port, function () {
            console.log(`Listening on port ${port}`);
        });
    });



