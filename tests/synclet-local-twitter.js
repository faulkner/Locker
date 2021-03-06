var fakeweb = require(__dirname + '/fakeweb.js');
var friends = require('../Connectors/Twitter/friends');
var timeline = require('../Connectors/Twitter/timeline');
var tweets = require('../Connectors/Twitter/tweets');
var mentions = require('../Connectors/Twitter/mentions');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Twitter Synclets");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/twitter-1';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?path=%2Faccount%2Fverify_credentials.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1&path=%2Ffriends%2Fids.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/friends.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/users/lookup.json?path=%2Fusers%2Flookup.json&user_id=1054551&include_entities=true',
                file : __dirname + '/fixtures/twitter/1054551.js' });
            fakeweb.registerUri({uri : 'http://a0.twimg.com/profile_images/299352843/Picture_82_normal.png',
                file : __dirname + '/fixtures/twitter/1054551.png',
                contentType : 'image/png' });
            process.chdir('.' + mePath);
            friends.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.contact[0].obj.id, '1054551');
            process.chdir(curDir);
        }
    }
}).addBatch({
    "Can get timeline" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?path=%2Faccount%2Fverify_credentials.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/home_timeline.json?screen_name=ctide&path=%2Fstatuses%2Fhome_timeline.json&include_entities=true&page=1',
                file : __dirname + '/fixtures/twitter/home_timeline.js' });
                fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/home_timeline.json?screen_name=ctide&path=%2Fstatuses%2Fhome_timeline.json&include_entities=true&page=2',
                    body :'[]' });
            process.chdir('.' + mePath);
            timeline.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.timeline[0].obj.id_str, '71348168469643264');
            process.chdir(curDir);
        }
    }
    
}).addBatch({
    "Can get mentions" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?path=%2Faccount%2Fverify_credentials.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/mentions.json?screen_name=ctide&path=%2Fstatuses%2Fmentions.json&include_entities=true&page=1',
                file : __dirname + '/fixtures/twitter/home_timeline.js' });
                fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/mentions.json?screen_name=ctide&path=%2Fstatuses%2Fmentions.json&include_entities=true&page=2',
                    body :'[]' });
            process.chdir('.' + mePath);
            mentions.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.mentions[0].obj.id_str, '71348168469643264');
            process.chdir(curDir);
        }
    }
    
}).addBatch({
    "Can get tweets" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?path=%2Faccount%2Fverify_credentials.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?screen_name=ctide&path=%2Fstatuses%2Fuser_timeline.json&include_entities=true&page=1',
                file : __dirname + '/fixtures/twitter/home_timeline.js' });
                fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?screen_name=ctide&path=%2Fstatuses%2Fuser_timeline.json&include_entities=true&page=2',
                    body :'[]' });
            process.chdir('.' + mePath);
            tweets.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.tweets[0].obj.id_str, '71348168469643264');
            process.chdir(curDir);
        }
    }
})

suite.export(module);