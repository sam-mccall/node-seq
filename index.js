var EventEmitter = require('events').EventEmitter;
var Hash = require('traverse/hash');
var Chainsaw = require('chainsaw');

module.exports = Seq;
function Seq () {
    var xs = [].slice.call(arguments);
    var ch = Chainsaw(function (saw) {
        builder.call(this, saw, xs);
    });
    process.nextTick(function () {
        ch.catch(function (err) {
            console.error(err.stack ? err.stack : err)
        });
    });
    return ch;
}

function builder (saw, xs) {
    var context = this.context = {
        vars : {},
        args : {},
        stack : xs,
        error : null,
    };
    context.stack_ = context.stack;
    
    function action (step, key, f, g) {
        var cb = function (err) {
            var args = [].slice.call(arguments, 1);
            if (err) {
                context.error = { message : err, key : key };
                saw.step = step;
                saw.down('catch');
            }
            else {
                if (typeof key == 'number') {
                    context.stack_[key] = args[0];
                    context.args[key] = args;
                }
                else {
                    context.stack_.push.apply(context.stack_, args);
                    if (key !== undefined) {
                        context.vars[key] = args[0];
                        context.args[key] = args;
                    }
                }
                if (g) g(args, key);
            }
        };
        Hash(context).forEach(function (v,k) { cb[k] = v });
        
        cb.into = function (k) {
            key = k;
            return cb;
        };
        
        cb.next = function (err, xs) {
            context.stack_.push.apply(context.stack_, xs);
            cb.apply(cb, [err].concat(context.stack));
        };
        
        cb.pass = function (err) {
            cb.apply(cb, [err].concat(context.stack));
        };
        f.apply(cb, context.stack);
    }
    
    var running = 0;
    
    this.seq = function (key, cb) {
        if (cb === undefined) { cb = key; key = undefined }
        if (running == 0) {
            action(saw.step, key,
                function () {
                    context.stack_ = [];
                    cb.apply(this, arguments);
                }, function () {
                    context.stack = context.stack_;
                    saw.next()
                }
            );
        }
    };
    
    var lastPar = null;
    this.par = function (key, cb) {
        lastPar = saw.step;
        
        if (running == 0) {
            // empty the active stack for the first par() in a chain
            context.stack_ = [];
        }
        
        if (cb === undefined) {
            cb = key;
            key = context.stack_.length;
            context.stack_.push(null);
        }
        
        running ++;
        
        var step = saw.step;
        process.nextTick(function () {
            action(step, key, cb, function () {
                running --;
                if (running == 0) {
                    context.stack = context.stack_.slice();
                    
                    saw.step = lastPar;
                    saw.next();
                }
            });
        });
        saw.next();
    };
    
    this.catch = function (cb) {
        if (context.error) {
            context.stack = [ context.error.message, context.error.key ];
            action(saw.step, undefined, function () {
                context.stack_ = [];
                cb.apply(this, arguments);
                context.stack = context.stack_;
                
                context.error = null;
                running = 0;
                process.nextTick(saw.next);
            });
        }
        else saw.next();
    };
    
    this.forEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var end = context.stack.length;
            context.stack.forEach(function (x, i) {
                action(saw.step, i, function () {
                    cb.call(this, x, i);
                    if (i == end - 1) saw.next();
                });
            });
        });
    };
    
    this.seqEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var xs = context.stack.slice();
            if (xs.length === 0) this(null);
            else (function next (i) {
                action(
                    saw.step, i,
                    function () { cb.call(this, xs[i], i) },
                    function () {
                        if (i === xs.length - 1) saw.next();
                        else next(i + 1);
                    }
                );
            }).bind(this)(0);
        });
    };
    
    this.parEach = function (limit, cb) {
        var xs = context.stack.slice();
        if (cb === undefined) { cb = limit; limit = xs.length }
        context.stack_ = [];
        
        var active = 0;
        var finished = 0;
        var queue = [];
        
        xs.forEach(function call (x, i) {
            if (active >= limit) {
                queue.push(call.bind(this, x, i));
            }
            else {
                active ++;
                action(saw.step, i,
                    function () {
                        cb.call(this, x, i);
                    },
                    function () {
                        active --;
                        finished ++;
                        if (queue.length > 0) queue.shift()();
                        else if (finished === xs.length) {
                            saw.next();
                        }
                    }
                );
            }
        });
    };
    
    this.parMap = function (limit, cb) {
        var res = [];
        var len = context.stack.length;
        if (cb === undefined) { cb = limit; limit = len }
        var res = [];
        
        Seq()
            .extend(context.stack)
            .parEach(limit, function (x, i) {
                cb.apply((function () {
                    res[i] = arguments[1];
                    this.apply(this, arguments);
                }).bind(this), arguments);
            })
            .seq(function () {
                context.stack = res;
                saw.next();
            })
        ;
    };
    
    this.seqMap = function (cb) {
        var res = [];
        var len = context.stack.length;
        
        this.seqEach(function (x, i) {
            var self = (function () {
                res[i] = arguments[1];
                if (i == len - 1) context.stack = res;
                this.apply(this, arguments);
            }).bind(this);
            cb.apply(self, arguments);
        });
    };
    
    ['push','pop','shift','unshift','splice']
        .forEach((function (name) {
            this[name] = function () {
                context.stack[name].apply(
                    context.stack,
                    [].slice.call(arguments)
                );
                saw.next();
                return this;
            };
        }).bind(this))
    ;
    
    this.extend = function (xs) {
        context.stack.push.apply(context.stack, xs);
        saw.next();
    };
    
    this.flatten = function () {
        var xs = [];
        context.stack.forEach(function f (x) {
            if (Array.isArray(x)) x.forEach(f);
            else xs.push(x);
        });
        context.stack = xs;
        saw.next();
    };
    
    this.empty = function () {
        context.stack = [];
        saw.next();
    };
    
    this.set = function () {
        context.stack = [].slice.call(arguments);
        saw.next();
    };
    
    this.do = function (cb) {
        saw.nest(cb, context);
    };
}
