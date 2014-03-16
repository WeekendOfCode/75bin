var express = require('express');
var app = express();
var log = require('winston');
var redis = require('redis');
var validator = require('validator');
var fs = require('fs');
var db = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
if (process.env.REDIS_PASS) {
    db.auth(process.env.REDIS_PASS);
}
log.info('Starting 75bin');
app.use(express.bodyParser());
log.info('Connecting to Redis backend...');
db.once('ready', function () {
    log.info('Connected to Redis backend');
    app.get('/', function (req, res, next) {
        res.writeHead(200);
        fs.readFile('./README', 'utf8', function (err, data) {
            res.write('<html><head></head><body>');
            res.write('<pre style="word-wrap: break-word; white-space: pre-wrap;background-color: #fff;border: none;">');
            res.write(data);
            res.write('</pre></body></html>');
            res.end();
        });
    });
    app.post('/', function (req, res, next) {
        if (!req.body || !req.body.bin) {
            res.writeHead(400);
            res.end('Invalid request. Please make sure you are providing a "bin" parameter.');
        } else {
            db.incr('bins', function (err, id) {
                if (err) {
                    res.writeHead(500);
                    res.end('Internal server error.');
                    log.error('500! ' + err);
                    return;
                } else {
                    db.set('bin:' + id, validator.escape(req.body.bin), function (err) {
                        if (err) {
                            res.writeHead(500);
                            res.end('Internal server error.');
                            log.error('500! ' + err);
                            return;
                        }
                        res.writeHead(200);
                        res.end('http://75bin.me/' + id);
                    });
                }
            })
        }
    });
    app.get('/:name', function (req, res, next) {
        db.get('bin:' + req.param('name'), function (err, data) {
            if (err) {
                res.writeHead(500);
                res.end('Internal server error.');
                log.error('500! ' + err);
                return;
            }
            if (!data) {
                res.writeHead(404);
                res.end('Not found.');
                return;
            }
            res.writeHead(200);
            res.write('<html><head></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">');
            res.write(data);
            res.write('</pre></body></html>');
            res.end();
        })
    });
    app.listen(process.env.PORT);
    log.info('Listening on port ' + process.env.PORT);
});
db.on('error', function (err) {
    log.error(err);
});