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
                handlers.catch(acc, action, errs);
            }
            else next(errs, acc);
        }
        else if (Hash(errs).length) {
            next(errs, acc);
        }
        else {
            handlers[action.type](acc, action);
        }
    }
    
    setTimeout(function () {
        self.catch(function (err) {
            // default error handler at the end if no catch already fired
            console.error(err.stack ? err.stack : err);
        });
        next([], Array.isArray(xs) ? xs : [xs]);
    }, 1);
    
    'par parEach'
        .split(' ')
        .forEach(function (type) {
            self[type] = function (limit, cb) {
                if (cb === undefined) { cb = limit; limit = 0 }
                actions.push({ type : type, cb : cb, limit : limit });
                return self;
            };
        })
    ;
    
    'seq forEach seqEach catch'
        .split(' ')
        .forEach(function (type) {
            self[type] = function (cb) {
                actions.push({ type : type, cb : cb });
                return self;
            };
        })
    ;
    
    var handlers = {};
    
    handlers.par = function (acc, action) {
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
                            Hash(res)
                                .map(function (x) { return x[0] })
                                .filter(Boolean)
                                .items
                            ,
                            Hash.map(res, function (x) {
                                return x.length <= 2 ? x[1] : x.slice(1);
                            })
                        );
                    }
                }
            };
        };
        
        if (Array.isArray(acc)) {
            action.cb.apply(that, acc.concat([that]));
        }
        else {
            action.cb.call(that, acc, that);
        }
    };
    
    handlers.seq = function (acc, action) {
        var that = function () {
            var args = [].slice.call(arguments);
            next(args[0] ? args.slice(0,1) : [], args.slice(1));
        };
        if (Array.isArray(acc)) {
            action.cb.apply(that, acc.concat([that]));
        }
        else {
            action.cb.call(that, acc, that);
        }
    };
    
    handlers.catch = function (acc, action, errs) {
        Hash(errs).forEach(function (err, key) {
            if (err) handlers.seq([ err, key ], action);
        });
    };
    
    handlers.forEach = function (acc, action) {
        if (Array.isArray(acc)) {
            acc.forEach(action.cb);
        }
        else {
            Hash(acc).forEach(action.cb);
        }
        next([], acc);
    };
    
    handlers.seqEach = function (acc, action) {
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
                        action.cb.call(that_, x, i, that_)
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
                        action.cb.call(that_, x, i, that_)
                    },
                });
            });
        }
        next([], acc);
    };
    
    handlers.parEach = function (acc, action) {
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
                        action.cb.call(this, x, i, this);
                    }).bind(this));
                }
                else {
                    Hash(acc).forEach((function (x, i) {
                        action.cb.call(this, x, i, this);
                    }).bind(this));
                }
            },
        });
        next([], acc);
    };
    
    self.flatten = function () {
        return self.seq(function (xs) {
            this.apply(this, [null].concat(xs));
        });
    };
    
    return self;
};
