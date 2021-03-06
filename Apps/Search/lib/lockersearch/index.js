var request = require('request');
var locker = require('../../../../Common/node/locker.js');

exports.map = function(type) { };

exports.index = function(id, type, body, callback) {
    console.log('not implemented');
    callback(null, {result: 'ok'});
};

exports.search = function(type, term, offset, limit, callback) {
    
    locker.providers('search', function(error, providers) {
        if (!providers || providers.length === 0) {
            callback('No Locker search providers found', null);
        }
        
        var fetchURL = providers[0].uri + 'query?q='+term;
        if (type !== '') {
          fetchURL += '&type=' + type;
        }

        request.get({url:fetchURL}, function(error, request, result) {
            if (error || !result) {
                callback('Failed calling provider GET at ' + fetchURL, null);
            }

            var results = {};
            results.took = '10';
            results.hits = {};
            results.hits.hits = JSON.parse(result);
            results.hits.total = null;
            callback(null, results);
        });
    });
};