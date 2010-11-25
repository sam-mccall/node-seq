module.exports = Seq;
function Seq (xs) {
    var self = {};
    if (arguments.length == 0) xs = [];
    
    var actions = [];
    function next (acc) {
        var action = actions.shift();
        if (!action) return;
        else handlers[action.type](acc, action.cb);
    }
    setTimeout(function () {
        next(Array.isArray(xs) ? xs : [xs]);
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
    
    var handlers = {
        par : function (acc, cb) {
            var res = {}, keys = {};
            var i = 0;
            cb.apply(function (key) {
                if (key == undefined) key = i++;
                keys[key] = 1;
                
                return fns.push(function () {
                    res[key] = [].slice.call(arguments);
                    delete keys[key];
                    
                    if (Object.keys(keys).length == 0) {
                        var isNums = Object.keys(res).every(function (k) {
                            return parseInt(k, 10).toString() === k
                        });
                        
                        if (isNums) {
                            var args = Object.keys(res)
                                .reduce(function (acc, i) {
                                    acc[i] = res;
                                    return acc;
                                }, {})
                            ;
                            next.apply({}, args);
                        }
                        else next(res)
                    }
                });
            }, acc);
        },
        seq : function (acc, cb) {
            cb.apply(function () {
                
            }, acc);
        },
    };
};
