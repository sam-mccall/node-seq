var Hash = require('traverse/hash');

module.exports = Seq;
function Seq (xs) {
    var self = {};
    if (arguments.length == 0) xs = [];
    
    var actions = [];
    function next (errs, acc) {
        var action = actions.shift();
        
        if (Hash(errs).length && action.type != 'catch') {
            next(errs, acc);
        }
        else handlers[action.type](acc, action.cb, errs);
    }
    
    setTimeout(function () {
        self.catch(function (errs) {
            // default error handler at the end if no catch already fired
            Hash(errs).forEach(function (err) {
                console.error(err.stack ? err.stack : err);
            });
        });
        next([], Array.isArray(xs) ? xs : [xs]);
    }, 1);
    
    'par seq forEach parEach seqEach catch'
        .split(' ')
        .forEach(function (type) {
            self[type] = function (cb) {
                actions.push({ type : type, cb : cb });
                return self;
            };
        })
    ;
    
    var handlers = {};
    
    handlers.par = function (acc, cb) {
        var res = {}, keys = {};
        var i = 0;
        cb.apply(function (key) {
            if (key == undefined) key = i++;
            keys[key] = 1;
            
            return fns.push(function () {
                res[key] = [].slice.call(arguments);
                delete keys[key];
                
                if (Hash(keys).length == 0) {
                    var isNums = Object.keys(res).every(function (k) {
                        return parseInt(k, 10).toString() === k
                    });
                    
                    if (isNums) {
                        var errs = [];
                        var args = [];
                        Hash(res).forEach(function (x,i) {
                            args[i] = x.slice(1);
                            if (x[0]) errs[i] = x[0];
                        });
                        next(errs, args);
                    }
                    else {
                        next(
                            Hash.map(res, function (x) { return x[0] }),
                            Hash.map(res, function (x) { return x.slice(1) })
                        )
                    }
                }
            });
        }, acc);
    };
    
    handlers.seq = function (acc, cb) {
        cb.apply(function () {
            var args = [].slice.call(arguments);
            next(args[0] ? args.slice(0,1) : [], args.slice(1));
        }, acc);
    };
    
    handlers.catch = function (acc, cb, errs) {
        handlers.seq(errs, cb);
    };
};
