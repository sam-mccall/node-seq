var fs = require('fs');
var exec = require('child_process').exec;

var Seq = require('seq');
Seq()
    .seq(function () {
        exec('whoami', this);
    })
    .par(function (who) {
        exec('groups ' + who[0], this);
    })
    .par(function () {
        fs.readFile(__filename, 'ascii', this);
    })
    .seq(function (who, groups, src) {
        console.log('Groups: ' + groups.trim());
        console.log('This file has ' + src.length + ' bytes');
    })
    .catch(function (err) {
        console.log('An error!');
        console.dir(err);
    })
;
