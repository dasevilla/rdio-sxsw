// https://gist.github.com/mattheworiordan/1084831
_.rateLimit = function(func, rate, async) {
  var queue = [];
  var timeOutRef = false;
  var currentlyEmptyingQueue = false;

  var emptyQueue = function() {
    if (queue.length) {
      currentlyEmptyingQueue = true;
      _.delay(function() {
        if (async) {
          _.defer(function() { queue.shift().call(); });
        } else {
          queue.shift().call();
        }
        emptyQueue();
      }, rate);
    } else {
      currentlyEmptyingQueue = false;
    }
  };

  return function() {
    var args = _.map(arguments, function(e) { return e; }); // get arguments into an array
    queue.push( _.bind.apply(this, [func, this].concat(args)) ); // call apply so that we can pass in arguments as parameters as opposed to an array
    if (!currentlyEmptyingQueue) { emptyQueue(); }
  };
};

var getSimilarBands = function(bandName, callback) {
  var bandNameEscaped = encodeURIComponent(bandName)
  var requestUrl = 'http://api.musicgraph.com/api/v1/artist/search?api_key=a1c31a4eb0f2b5f1224ead8794c0de24&similar_to=' + bandNameEscaped;
  $.getJSON(requestUrl, function(x) {
    similarBands = _.pluck(x.data, 'name');
    similarBandsLowecase = _.map(similarBands, function(name) { return name.toLowerCase() });
    callback(similarBandsLowecase);
  });
};

var main = function() {
  if (!rdioUtils.startupChecks()) {
    return;
  }

  R.ready(function() {
    rdioUtils.authWidget($('#authenticate'));

    var collection = rdioUtils.collectionAlbums({
      localStorage: true, // Highly recommended.
      onAlbumsLoaded: function(albums) {
        // Called during the initial load with an array of albums. When loading
        // from the Rdio database, you'll get a number of these; when loading
        // from localStorage, it'll come in one bunch.
      },
      onLoadComplete: function() {
        // Called when the initial load is complete.
        var sxswBands = _.map(bandsAndUrls, function(band) {
          return band['name'].toLowerCase()
        });

        var myBands = {};
        collection.each(function(album) {
          myBands[album.artistKey] = album.artist;
        });
        // console.log('myBands', myBands);

        myBandNames = _.map(myBands, function(x) { return x.toLowerCase(); });
        // console.log('myBandNames', myBandNames);

        myBandsAtSXSW = _.intersection(sxswBands, myBandNames);
        console.log('myBandsAtSXSW', myBandsAtSXSW);

        var similarBands = {};

        var getSimilarBandNames = function(bandName) {
          getSimilarBands(bandName, function(foundBands) {
            similarBandsAtSXSW = _.intersection(sxswBands, foundBands)
            similarBands[bandName] = similarBandsAtSXSW;
            if (similarBandsAtSXSW.length > 0) {
              $('#the-list').append('<li>' + bandName + ' - ' + similarBandsAtSXSW.join(', ') + '</li>');
            }
            console.log(bandName, similarBandsAtSXSW);
          })
        }
        var getSimilarBandNamesRateLimited = _.rateLimit(getSimilarBandNames, 1000);

        _.map(myBandNames, getSimilarBandNamesRateLimited);
      },
      onError: function(message) {
        // Called with any loading errors.
      },
      onAdded: function(albums) {
        // Called after the initial load when the user adds additional albums to
        // their collection.
      },
      onRemoved: function(albums) {
        // Called after the initial load when the user removes albums from their
        // collection.
      }
    });

  });
}

main();
