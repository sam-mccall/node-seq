var Hash = require('traverse/hash');

module.exports = Seq;
function Seq (xs) {
    var self = {};
    if (arguments.length == 0) xs = [];
    
    var actions = [];
    function next (errs, acc) {
        var action = actions.shift();
        
        if (!action) return;
        else if (action.type == 'catch') {
            if (Hash(errs).length) {
                handlers.catch(acc, action.cb, errs);
            }
            else next(errs, acc);
        }
        else if (Hash(errs).length) {
            next(errs, acc);
        }
        else {
            handlers[action.type](acc, action.cb);
        }
    }
    
    setTimeout(function () {
        self.catch(function (err) {
            // default error handler at the end if no catch already fired
            console.error(err.stack ? err.stack : err);
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
        var that = function (key) {
            if (key == undefined) key = i++;
            keys[key] = 1;
            
            return function () {
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
                            args[i] = x.length <= 2 ? x[1] : x.slice(1);
                            if (x[0]) errs[i] = x[0];
                        });
                        next(errs, args);
                    }
                    else {
                        next(
                            Hash.map(res, function (x) { return x[0] }),
                            Hash.map(res, function (x) {
                                return x.length <= 2 ? x[1] : x.slice(1);
                            })
                        )
                    }
                }
            };
        };
        cb.apply(that, acc.concat([that]));
    };
    
    handlers.seq = function (acc, cb) {
        var that = function () {
            var args = [].slice.call(arguments);
            next(args[0] ? args.slice(0,1) : [], args.slice(1));
        };
        cb.apply(that, acc.concat([that]));
    };
    
    handlers.catch = function (acc, cb, errs) {
        Hash(errs).forEach(function (err, key) {
            if (err) handlers.seq([ err, key ], cb);
        });
    };
    
    handlers.forEach = function (acc, cb) {
        if (Array.isArray(acc)) {
            acc.forEach(cb);
        }
        else {
            Hash(acc).forEach(cb);
        }
        next([], acc);
    };
    
    handlers.seqEach = function (acc, cb) {
        if (Array.isArray(acc)) {
            var res = [];
            
            actions.unshift({
                type : 'seq',
                cb : function () { this(null, res) },
            });
            
            acc.reverse().forEach(function (x, ii) {
                var i = acc.length - ii - 1;
                actions.unshift({
                    type : 'seq',
                    cb : function () {
                        var that = this;
                        var that_ = function (err, v) {
                            res[i] = v;
                            that(err);
                        };
                        cb.call(that_, x, i, that_)
                    },
                });
            });
        }
        else {
            Object.keys(acc).reverse().forEach(function (x, i) {
                actions.unshift({
                    type : 'seq',
                    cb : function () {
                        var that = this;
                        var that_ = function (err, v) {
                            res[i] = v;
                            that(err);
                        };
                        cb.call(that_, x, i, that_)
                    },
                });
            });
        }
        next([], acc);
    };
    
    handlers.parEach = function (acc, cb) {
        actions.unshift({
            type : 'seq',
            cb : function () {
                this(null, [].slice.call(arguments, 0, -1));
            },
        });
        
        actions.unshift({
            type : 'par',
            cb : function () {
                var acc = [].slice.call(arguments, 0, -1);
                if (Array.isArray(acc)) {
                    acc.forEach((function (x, i) {
                        var par = this();
                        cb.call(par, x, i, par);
                    }).bind(this));
                }
                else {
                    Hash(acc).forEach((function (x, i) {
                        var par = this();
                        cb.call(par, x, i, par);
                    }).bind(this));
                }
            },
        });
        next([], acc);
    };
    
    return self;
};
