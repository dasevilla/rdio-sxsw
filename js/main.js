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

Artist = Backbone.Model.extend({
  updateSimilarArtists: function() {
    var that = this;
    var nameEsacped = encodeURIComponent(this.get('name'))
    var requestUrl = 'http://api.musicgraph.com/api/v1/artist/search?api_key=a1c31a4eb0f2b5f1224ead8794c0de24&similar_to=' + nameEsacped;

    $.getJSON(requestUrl, function(x) {
      similarBands = _.pluck(x.data, 'name');
      similarBandsLowecase = _.map(similarBands, function(name) { return name.toLowerCase() });
      that.set('similarArtists', similarBandsLowecase);
    });
  },

  getSimilarArtistsIntersection: function(artistNames) {
    return _.intersection(artistNames, this.get('similarArtists'));
  }
});


ArtistCollection = Backbone.Collection.extend({
  model: Artist,

  getArtistNames: function() {
    return this.pluck('name');
  },

  updateSimilarArtists: function() {
    var getSimilarBandNamesRateLimited = _.rateLimit(function(artist) {
      artist.updateSimilarArtists()
    }, 500);

    this.each(getSimilarBandNamesRateLimited);
  }
});

SuggestionView = Backbone.View.extend({
  tagName: 'div',

  template: _.template($('#suggestion-template').html()),

  initialize: function(options) {
    this.options = options;
    this.listenTo(this.model, 'change:similarArtists', this.render);
  },

  render: function() {

    var artistSuggestions = _.map(this.options.suggestedArtistNames, function(name) {
      nameEncoded = encodeURIComponent(name)
      return '<a href="http://schedule.sxsw.com/search?conferences%5B%5D=music&q='
        + nameEncoded + '">' + name + '</a>';
    })
    this.$el.html(this.template({
        'name': this.model.get('name'),
        'artistSuggestions': artistSuggestions.join(', ')
    }));

    return this;
  }
});

SuggestionListView = Backbone.View.extend({
  el: '#the-list',

  collection: null,

  sxswBands: null,

  initialize: function() {
    this.listenTo(this.collection, 'change:similarArtists', this.addOne);
  },

  addOne: function(artist, collection, options) {
      artistName = artist.get('name');
      similarArtistsAtSXSW = artist.getSimilarArtistsIntersection(sxswBands);

      console.log(artistName, similarArtistsAtSXSW);

      if (similarArtistsAtSXSW.length > 0) {
        var suggestionView = new SuggestionView({
          model: artist,
          suggestedArtistNames: similarArtistsAtSXSW
        })
        $(this.el).prepend(suggestionView.render().el);
      }
  },

  render: function() {
    var that = this;
    $(this.el).empty();
    this.collection.each(function(artist) {
      var suggestionView = new SuggestionView({
        model: artist
      })
      $(this.el).prepend(suggestionView.render().el);
    })
  }
})

var sxswBands = _.map(bandsAndUrls, function(band) {
  return band['name'].toLowerCase()
});

artistCollection = new ArtistCollection();
suggestionListView = new SuggestionListView({
  collection: artistCollection,
  sxswBands: sxswBands
});
suggestionListView.render();

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

        var myArtists = [];
        var foundArtists = {}
        collection.each(function(album) {
          if(_.has(foundArtists, album.artistKey)) {
            return
          }

          foundArtists[album.artistKey] = true;
          myArtists.push({
            'name': album.artist.toLowerCase(),
            'key': album.artistKey
          });
        });
        artistCollection.add(myArtists);
        artistCollection.updateSimilarArtists();
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
